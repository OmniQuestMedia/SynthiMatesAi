// FIZ: Membership Purchase Service
// REASON: Phase 2 Item 2 - Implement membership purchasing with tier upgrades and benefit activation
// IMPACT: Enables users to purchase/upgrade membership tiers with automatic coin bonuses
// CORRELATION_ID: PHASE2-ITEM2-MEMBERSHIP-PURCHASE

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MembershipService } from '../membership/membership.service';
import { MembershipTier, BillingInterval } from '@prisma/client';

export interface PurchaseMembershipRequest {
  userId: string;
  tier: MembershipTier;
  billingInterval: BillingInterval;
  paymentMethodId?: string;
  idempotencyKey: string;
}

export interface PurchaseMembershipResponse {
  success: boolean;
  subscriptionId: string;
  tier: MembershipTier;
  billingInterval: BillingInterval;
  bonusTokens: number;
  priceCents: bigint;
  currentPeriodEnd: Date;
}

// Membership pricing (simplified - would come from governance config in production)
const MEMBERSHIP_PRICING: Record<MembershipTier, Record<BillingInterval, number>> = {
  GUEST: {
    MONTHLY: 0,
    QUARTERLY: 0,
    SEMI_ANNUAL: 0,
    ANNUAL: 0,
  },
  VIP: {
    MONTHLY: 0,
    QUARTERLY: 0,
    SEMI_ANNUAL: 0,
    ANNUAL: 0,
  },
  VIP_SILVER: {
    MONTHLY: 999, // $9.99
    QUARTERLY: 2497, // $24.97 (savings)
    SEMI_ANNUAL: 4497, // $44.97 (savings)
    ANNUAL: 8988, // $89.88 (savings)
  },
  VIP_GOLD: {
    MONTHLY: 1999, // $19.99
    QUARTERLY: 4997, // $49.97
    SEMI_ANNUAL: 8997, // $89.97 (savings)
    ANNUAL: 17988, // $179.88
  },
  VIP_PLATINUM: {
    MONTHLY: 3999, // $39.99
    QUARTERLY: 9997, // $99.97
    SEMI_ANNUAL: 17997, // $179.97 (savings)
    ANNUAL: 35988, // $359.88
  },
  VIP_DIAMOND: {
    MONTHLY: 7999, // $79.99
    QUARTERLY: 19997, // $199.97
    SEMI_ANNUAL: 35997, // $359.97 (savings)
    ANNUAL: 71988, // $719.88
  },
};

// Bonus tokens granted on membership purchase (per tier, not interval)
const MEMBERSHIP_BONUS_TOKENS: Record<MembershipTier, number> = {
  GUEST: 0,
  VIP: 0,
  VIP_SILVER: 100, // 100 DreamCoins bonus on purchase
  VIP_GOLD: 250, // 250 DreamCoins bonus
  VIP_PLATINUM: 500, // 500 DreamCoins bonus
  VIP_DIAMOND: 1000, // 1000 DreamCoins bonus
};

@Injectable()
export class MembershipPurchaseService {
  private readonly logger = new Logger(MembershipPurchaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipService: MembershipService,
  ) {}

  /**
   * Purchase or upgrade a membership tier.
   * PHASE 2 ITEM 2: Complete flow with tier upgrade, bonus activation, and benefit grants.
   *
   * Flow:
   * 1. Validate tier and billing interval
   * 2. Check if user has existing subscription (upgrade or new purchase)
   * 3. Calculate price and bonus tokens
   * 4. Create/update subscription via MembershipService
   * 5. Grant bonus tokens to membership bucket
   * 6. Create audit ledger entry
   */
  async purchaseMembership(
    request: PurchaseMembershipRequest,
  ): Promise<PurchaseMembershipResponse> {
    const { userId, tier, billingInterval, idempotencyKey } = request;

    this.logger.log('Membership purchase request initiated', {
      userId,
      tier,
      billingInterval,
      correlation_id: idempotencyKey,
    });

    // Validate tier (GUEST and VIP are not purchasable, they're earned)
    if (tier === 'GUEST' || tier === 'VIP') {
      throw new BadRequestException(`Tier ${tier} cannot be purchased directly`);
    }

    // Calculate price
    const priceCents = BigInt(MEMBERSHIP_PRICING[tier][billingInterval]);
    const bonusTokens = MEMBERSHIP_BONUS_TOKENS[tier];

    this.logger.log('Membership pricing calculated', {
      tier,
      billingInterval,
      priceCents: priceCents.toString(),
      bonusTokens,
      correlation_id: idempotencyKey,
    });

    // Check for existing subscription
    const existingSubscription = await this.prisma.membershipSubscription.findFirst({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
    });

    // If upgrading, cancel existing subscription first
    if (existingSubscription) {
      this.logger.log('Cancelling existing subscription for upgrade', {
        userId,
        existingTier: existingSubscription.tier,
        newTier: tier,
        correlation_id: idempotencyKey,
      });

      await this.prisma.membershipSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'CANCELLED',
          updated_at: new Date(),
        },
      });
    }

    // Create new subscription
    const subscription = await this.membershipService.createSubscription({
      userId,
      tier,
      billingInterval,
      organizationId: 'default',
      tenantId: 'default',
    });

    this.logger.log('Membership subscription created', {
      subscriptionId: subscription.id,
      userId,
      tier,
      correlation_id: idempotencyKey,
    });

    // PHASE 2 ITEM 2: Grant bonus tokens to membership bucket
    if (bonusTokens > 0) {
      // Find or create wallet
      let wallet = await this.prisma.canonicalWallet.findUnique({
        where: { user_id: userId },
      });

      if (!wallet) {
        wallet = await this.prisma.canonicalWallet.create({
          data: {
            user_id: userId,
            user_type: 'guest',
            organization_id: 'default',
            tenant_id: 'default',
            purchased_tokens: 0,
            membership_tokens: bonusTokens, // Add to membership bucket
            bonus_tokens: 0,
          },
        });
      } else {
        // Update existing wallet - add tokens to membership bucket
        await this.prisma.canonicalWallet.update({
          where: { id: wallet.id },
          data: {
            membership_tokens: { increment: bonusTokens },
          },
        });
      }

      // Create ledger entry for membership bonus
      await this.prisma.canonicalLedgerEntry.create({
        data: {
          wallet_id: wallet.id,
          correlation_id: idempotencyKey,
          reason_code: 'MEMBERSHIP_BONUS',
          amount: bonusTokens,
          bucket: 'membership',
          token_type: 'CZT',
          hash_prev: null, // Simplified - proper hash-chain would be computed
          hash_current: `hash-${idempotencyKey}-membership`,
          metadata: {
            userId,
            tier,
            billingInterval,
            subscription_id: subscription.id,
            bonus_source: 'membership-purchase',
          },
        },
      });

      this.logger.log('Membership bonus tokens granted', {
        userId,
        bonusTokens,
        wallet_id: wallet.id,
        correlation_id: idempotencyKey,
      });
    }

    // Get the created subscription to return full details
    const createdSubscription = await this.prisma.membershipSubscription.findUnique({
      where: { id: subscription.id },
    });

    if (!createdSubscription) {
      throw new BadRequestException('Failed to retrieve created subscription');
    }

    return {
      success: true,
      subscriptionId: subscription.id,
      tier,
      billingInterval,
      bonusTokens,
      priceCents,
      currentPeriodEnd: createdSubscription.current_period_end,
    };
  }
}
