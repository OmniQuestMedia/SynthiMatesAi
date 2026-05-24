// FIZ: Voice Chat Service
// REASON: Implement PHASE 4 ITEM 1 - Voice chat with DreamCoins deduction
// IMPACT: Enables voice messages in chat with proper wallet management
// CORRELATION_ID: PHASE4-ITEM1-VOICE-CHAT

import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { ReasonCode } from '../../../ledger/types';

// Cost configuration for voice messages
const VOICE_MESSAGE_COST_TOKENS = 5; // 5 DreamCoins per voice message

export interface SendVoiceMessageRequest {
  userId: string;
  twinId: string;
  sessionId: string;
  transcript: string; // Voice-to-text result
  audioUrl?: string; // Optional audio URL (data URI or S3 URL)
  idempotencyKey: string;
}

export interface SendVoiceMessageResponse {
  success: boolean;
  memoryId: string;
  tokensCharged: number;
  newBalance: {
    purchased: number;
    membership: number;
    bonus: number;
    total: number;
  };
}

@Injectable()
export class VoiceChatService {
  private readonly logger = new Logger(VoiceChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a voice message in chat.
   * Checks wallet balance, deducts tokens, stores message in MemoryBank.
   */
  async sendVoiceMessage(request: SendVoiceMessageRequest): Promise<SendVoiceMessageResponse> {
    const { userId, twinId, sessionId, transcript, audioUrl, idempotencyKey } = request;

    // 1. Validate request
    if (!transcript || transcript.trim().length === 0) {
      throw new BadRequestException('Voice transcript cannot be empty');
    }

    // 2. Find or create wallet for user
    let wallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await this.prisma.canonicalWallet.create({
        data: {
          user_id: userId,
          user_type: 'guest',
          organization_id: 'default',
          tenant_id: 'default',
          purchased_tokens: 0,
          membership_tokens: 0,
          bonus_tokens: 0,
        },
      });
    }

    // 3. Check if user has sufficient balance
    const totalBalance = wallet.purchased_tokens + wallet.membership_tokens + wallet.bonus_tokens;

    if (totalBalance < VOICE_MESSAGE_COST_TOKENS) {
      throw new ForbiddenException(
        `Insufficient DreamCoins. Required: ${VOICE_MESSAGE_COST_TOKENS}, Available: ${totalBalance}`,
      );
    }

    // 4. Deduct tokens from wallet (spend from purchased first, then membership, then bonus)
    let remainingToDeduct = VOICE_MESSAGE_COST_TOKENS;
    const deductions = {
      purchased: 0,
      membership: 0,
      bonus: 0,
    };

    // Deduct from purchased tokens first
    if (wallet.purchased_tokens > 0) {
      const fromPurchased = Math.min(wallet.purchased_tokens, remainingToDeduct);
      deductions.purchased = fromPurchased;
      remainingToDeduct -= fromPurchased;
    }

    // Then from membership tokens
    if (remainingToDeduct > 0 && wallet.membership_tokens > 0) {
      const fromMembership = Math.min(wallet.membership_tokens, remainingToDeduct);
      deductions.membership = fromMembership;
      remainingToDeduct -= fromMembership;
    }

    // Finally from bonus tokens
    if (remainingToDeduct > 0 && wallet.bonus_tokens > 0) {
      const fromBonus = Math.min(wallet.bonus_tokens, remainingToDeduct);
      deductions.bonus = fromBonus;
      remainingToDeduct -= fromBonus;
    }

    // 5. Update wallet atomically and create ledger entry
    const reasonCode: ReasonCode = 'SPEND';

    const updatedWallet = await this.prisma.canonicalWallet.update({
      where: { id: wallet.id },
      data: {
        purchased_tokens: { decrement: deductions.purchased },
        membership_tokens: { decrement: deductions.membership },
        bonus_tokens: { decrement: deductions.bonus },
      },
    });

    // 6. Create ledger entry for voice message spend
    await this.prisma.canonicalLedgerEntry.create({
      data: {
        wallet_id: wallet.id,
        correlation_id: idempotencyKey,
        reason_code: reasonCode,
        amount: -VOICE_MESSAGE_COST_TOKENS, // Negative for debit
        bucket: 'purchased', // Primary bucket for tracking
        token_type: 'CZT',
        hash_prev: null,
        hash_current: `hash-${idempotencyKey}`,
        metadata: {
          userId,
          twinId,
          sessionId,
          transcript_length: transcript.length,
          deductions,
          source: 'voice-chat-service',
          timestamp: new Date().toISOString(),
        },
      },
    });

    // 7. Store voice message in MemoryBank
    const memory = await this.prisma.memoryBank.create({
      data: {
        session_id: sessionId,
        twin_id: twinId,
        user_id: userId,
        memory_type: 'FACT', // Voice messages are facts
        content: transcript,
        importance_score: 0.6, // Default importance for voice messages
        is_pinned: false,
        is_voice_message: true,
        voice_audio_url: audioUrl || null,
        voice_transcript: transcript,
        correlation_id: `voice-msg-${idempotencyKey}`,
        reason_code: 'VOICE_MESSAGE_STORE',
      },
    });

    this.logger.log(
      `Voice message sent: user=${userId}, twin=${twinId}, cost=${VOICE_MESSAGE_COST_TOKENS} tokens`,
    );

    return {
      success: true,
      memoryId: memory.memory_id,
      tokensCharged: VOICE_MESSAGE_COST_TOKENS,
      newBalance: {
        purchased: updatedWallet.purchased_tokens,
        membership: updatedWallet.membership_tokens,
        bonus: updatedWallet.bonus_tokens,
        total:
          updatedWallet.purchased_tokens +
          updatedWallet.membership_tokens +
          updatedWallet.bonus_tokens,
      },
    };
  }

  /**
   * Get user's current wallet balance
   */
  async getWalletBalance(userId: string) {
    const wallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      return {
        purchased: 0,
        membership: 0,
        bonus: 0,
        total: 0,
      };
    }

    return {
      purchased: wallet.purchased_tokens,
      membership: wallet.membership_tokens,
      bonus: wallet.bonus_tokens,
      total: wallet.purchased_tokens + wallet.membership_tokens + wallet.bonus_tokens,
    };
  }
}
