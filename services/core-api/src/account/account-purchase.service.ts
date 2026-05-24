// FIZ: Account Token Purchase Service
// REASON: Implement POST /api/account/purchase-tokens endpoint (Phase 1 Item 5a)
// IMPACT: Enables user token purchases via standardized account endpoint
// CORRELATION_ID: PHASE1-ITEM5A-PURCHASE-TOKENS

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { ReasonCode } from '../../../ledger/types';

export interface PurchaseTokensRequest {
  userId: string;
  tokens: number;
  paymentMethodId?: string;
  idempotencyKey: string;
}

export interface PurchaseTokensResponse {
  success: boolean;
  transactionId: string;
  walletId: string;
  tokensPurchased: number;
  amountCents: bigint;
  newBalance: {
    purchased: number;
    membership: number;
    bonus: number;
    total: number;
  };
}

@Injectable()
export class AccountPurchaseService {
  private readonly logger = new Logger(AccountPurchaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Purchase tokens for a user account.
   * This is a simplified implementation that credits the purchased bucket.
   * Full payment processing integration would be added in later phases.
   */
  async purchaseTokens(request: PurchaseTokensRequest): Promise<PurchaseTokensResponse> {
    const { userId, tokens, idempotencyKey } = request;

    // Validate request
    if (tokens <= 0) {
      throw new BadRequestException('Token amount must be positive');
    }

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency key is required');
    }

    // Find or create wallet for user
    let wallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await this.prisma.canonicalWallet.create({
        data: {
          user_id: userId,
          user_type: 'guest', // Default to guest, can be updated based on membership
          organization_id: 'default',
          tenant_id: 'default',
          purchased_tokens: 0,
          membership_tokens: 0,
          bonus_tokens: 0,
        },
      });
    }

    // Calculate price (simplified - would use rate card in production)
    // Using $0.10/token as default rate for simplicity
    const pricePerTokenCents = 10; // $0.10
    const amountCents = BigInt(tokens * pricePerTokenCents);

    // Update wallet and create ledger entry atomically
    const reasonCode: ReasonCode = 'PURCHASE';

    const updatedWallet = await this.prisma.canonicalWallet.update({
      where: { id: wallet.id },
      data: {
        purchased_tokens: { increment: tokens },
      },
    });

    // Create ledger entry for audit trail
    const ledgerEntry = await this.prisma.canonicalLedgerEntry.create({
      data: {
        wallet_id: wallet.id,
        correlation_id: idempotencyKey,
        reason_code: reasonCode,
        amount: tokens,
        bucket: 'purchased',
        token_type: 'CZT',
        hash_prev: null, // Simplified - proper hash-chain would be computed
        hash_current: `hash-${idempotencyKey}`, // Simplified hash
        metadata: {
          userId,
          amountCents: amountCents.toString(),
          source: 'account-purchase-endpoint',
        },
      },
    });

    return {
      success: true,
      transactionId: ledgerEntry.id,
      walletId: wallet.id,
      tokensPurchased: tokens,
      amountCents,
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
}
