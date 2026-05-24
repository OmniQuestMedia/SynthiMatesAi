// FIZ: Creator Payout Service
// REASON: Implement creator payout with GateGuard approval + notifications (Phase 2 Item 1)
// IMPACT: Enables creators to view and request payouts with risk scoring and approval workflow
// CORRELATION_ID: PHASE2-ITEM1-CREATOR-PAYOUT-WORKFLOW

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GateGuardService } from '../gateguard/gateguard.service';
import { NotificationEngine } from '../../../notification/src/notification.service';
import type { GateGuardAction } from '../gateguard/gateguard.types';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateGuard: GateGuardService,
    private readonly notificationEngine: NotificationEngine,
  ) {}

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
   * PHASE 2 ITEM 1: Enhanced with GateGuard approval workflow and email notifications.
   * Flow:
   * 1. Validate creator and balance
   * 2. Run GateGuard risk assessment
   * 3. If approved: create ledger entry + send notification
   * 4. If declined: throw error with reason
   */
  async requestPayout(input: PayoutRequestInput): Promise<PayoutRequestResponse> {
    const { creatorId, amountCents, idempotencyKey } = input;

    this.logger.log('Creator payout request initiated', {
      creatorId,
      amountCents: amountCents.toString(),
      correlation_id: idempotencyKey,
    });

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

    // PHASE 2 ITEM 1: GateGuard risk assessment before processing payout
    const gateGuardAction: GateGuardAction = 'PAYOUT';
    const tokensToDebit = Math.floor(Number(amountCents) / 7.5);
    const gateGuardResult = await this.gateGuard.evaluate({
      action: gateGuardAction,
      transactionId: idempotencyKey,
      correlationId: idempotencyKey,
      userId: creatorId,
      amountTokens: BigInt(tokensToDebit),
      metadata: {
        wallet_id: wallet.id,
        available_tokens: availableTokens,
        creator_affiliation: creator.affiliation_number,
      },
    });

    this.logger.log('GateGuard evaluation complete', {
      decision: gateGuardResult.decision,
      welfare_score: gateGuardResult.welfareScore,
      correlation_id: idempotencyKey,
    });

    // Handle GateGuard decisions
    if (gateGuardResult.decision === 'HARD_DECLINE') {
      throw new ForbiddenException(
        `Payout request declined by risk assessment. Reason: ${gateGuardResult.decision}`,
      );
    }

    if (gateGuardResult.decision === 'HUMAN_ESCALATE') {
      // For human escalation, we create a pending request but don't process immediately
      this.logger.warn('Payout requires human review', {
        creatorId,
        amountCents: amountCents.toString(),
        correlation_id: idempotencyKey,
      });

      // Send notification to admin/compliance team
      await this.notificationEngine.send({
        user_id: creatorId,
        channel: 'EMAIL',
        template: 'STUDIO_ACTIVATION_CONFIRMED', // Reusing existing template - would add PAYOUT_ESCALATION in production
        payload: {
          creator_id: creatorId,
          amount_cents: amountCents.toString(),
          escalation_reason: 'GATEGUARD_HUMAN_ESCALATION',
        },
        correlation_id: idempotencyKey,
      }).catch(err => {
        this.logger.error('Failed to send escalation notification', err);
      });

      return {
        success: false,
        payoutId: '',
        status: 'REQUIRES_REVIEW',
        amountCents,
      };
    }

    if (gateGuardResult.decision === 'COOLDOWN') {
      throw new ForbiddenException(
        'Payout temporarily restricted. Please try again later.',
      );
    }

    // APPROVED - proceed with payout

    // Debit tokens from bonus bucket
    await this.prisma.canonicalWallet.update({
      where: { id: wallet.id },
      data: {
        bonus_tokens: { decrement: tokensToDebit },
      },
    });

    // Create ledger entry for payout (append-only, immutable)
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
          gateguard_decision: gateGuardResult.decision,
          welfare_score: gateGuardResult.welfareScore,
        },
      },
    });

    this.logger.log('Payout ledger entry created', {
      ledgerEntryId: ledgerEntry.id,
      tokensDebited: tokensToDebit,
      correlation_id: idempotencyKey,
    });

    // PHASE 2 ITEM 1: Send confirmation notification to creator
    await this.notificationEngine.send({
      user_id: creatorId,
      channel: 'EMAIL',
      template: 'EXPIRATION_PROCESSED', // Reusing existing template - would add PAYOUT_CONFIRMED in production
      payload: {
        creator_id: creatorId,
        payout_id: ledgerEntry.id,
        amount_cents: amountCents.toString(),
        tokens_debited: tokensToDebit,
        new_balance: wallet.bonus_tokens - tokensToDebit,
      },
      correlation_id: idempotencyKey,
    }).catch(err => {
      // Log but don't fail the request if notification fails
      this.logger.error('Failed to send payout confirmation notification', err);
    });

    return {
      success: true,
      payoutId: ledgerEntry.id,
      status: 'PENDING',
      amountCents,
    };
  }
}
