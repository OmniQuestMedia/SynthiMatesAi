// FIZ: Creator Payout Service
// REASON: Implement creator payout list and request endpoints (Phase 1 Item 5b)
// IMPACT: Enables creators to view and request payouts
// CORRELATION_ID: PHASE1-ITEM5B-CREATOR-PAYOUTS

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface PayoutRecord {
  id: string;
  creatorId: string;
  amountCents: bigint;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  requestedAt: Date;
  processedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface PayoutRequestInput {
  creatorId: string;
  amountCents: bigint;
  idempotencyKey: string;
}

export interface PayoutRequestResponse {
  success: boolean;
  payoutId: string;
  status: string;
  amountCents: bigint;
}

@Injectable()
export class CreatorPayoutService {
  private readonly logger = new Logger(CreatorPayoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all payouts for a creator.
   * Lists both pending and completed payouts.
   */
  async getCreatorPayouts(creatorId: string): Promise<PayoutRecord[]> {
    // Query ledger entries where performer received payouts
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        performer_id: creatorId,
        performer_amount_cents: { gt: 0 },
      },
      orderBy: { created_at: 'desc' },
      take: 100, // Limit to last 100 payouts
    });

    // Map to PayoutRecord format
    return entries.map((entry) => ({
      id: entry.id,
      creatorId: creatorId,
      amountCents: entry.performer_amount_cents,
      status: entry.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      requestedAt: entry.created_at,
      processedAt: entry.status === 'COMPLETED' ? entry.created_at : undefined,
      metadata: entry.metadata as Record<string, unknown> | undefined,
    }));
  }

  /**
   * Request a payout for a creator.
   * This creates a pending payout request that would be processed by batch payout system.
   */
  async requestPayout(input: PayoutRequestInput): Promise<PayoutRequestResponse> {
    const { creatorId, amountCents, idempotencyKey } = input;

    // Validate amount
    if (amountCents <= 0) {
      throw new BadRequestException('Payout amount must be positive');
    }

    // Verify creator exists
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException(`Creator ${creatorId} not found`);
    }

    // Find creator's wallet
    const wallet = await this.prisma.canonicalWallet.findFirst({
      where: { user_id: creatorId, user_type: 'creator' },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for creator ${creatorId}`);
    }

    // Check available balance (bonus bucket typically holds creator earnings)
    const availableTokens = wallet.bonus_tokens;
    // Estimate if available tokens can cover payout (simplified)
    // In production, this would use actual rate card calculations
    const estimatedValueCents = availableTokens * 7.5; // ~$0.075/token average

    if (estimatedValueCents < Number(amountCents)) {
      throw new BadRequestException(
        `Insufficient balance. Available: ~${estimatedValueCents} cents, Requested: ${amountCents} cents`,
      );
    }

    // Debit tokens from bonus bucket
    const tokensToDebit = Math.floor(Number(amountCents) / 7.5);

    await this.prisma.canonicalWallet.update({
      where: { id: wallet.id },
      data: {
        bonus_tokens: { decrement: tokensToDebit },
      },
    });

    // Create ledger entry for payout
    const ledgerEntry = await this.prisma.canonicalLedgerEntry.create({
      data: {
        wallet_id: wallet.id,
        correlation_id: idempotencyKey,
        reason_code: 'PAYOUT',
        amount: -tokensToDebit, // negative = debit
        bucket: 'bonus',
        token_type: 'CZT',
        hash_prev: null, // Simplified - proper hash-chain would be computed
        hash_current: `hash-${idempotencyKey}`, // Simplified hash
        metadata: {
          creatorId,
          payoutAmountCents: amountCents.toString(),
          source: 'creator-payout-request',
        },
      },
    });

    return {
      success: true,
      payoutId: ledgerEntry.id,
      status: 'PENDING',
      amountCents,
    };
  }
}
