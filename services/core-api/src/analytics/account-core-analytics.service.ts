// WO: WO-PHASE5-002
// Account-Core Analytics Service - DreamCoins, Memberships, Payouts, Synthetic Twins
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface DreamCoinsUsageTrend {
  date: string;
  purchasedAmount: bigint;
  spentAmount: bigint;
  netBalance: bigint;
  activeUsers: number;
}

export interface SyntheticTwinVolume {
  date: string;
  totalCreated: number;
  trainingsStarted: number;
  trainingsCompleted: number;
  trainingsFailed: number;
  safeModeTwins: number;
}

export interface MembershipDistribution {
  tier: 'GUEST' | 'MEMBER' | 'DIAMOND';
  activeCount: number;
  percentage: number;
  totalRevenueCents: bigint;
}

export interface PayoutSummary {
  totalRequests: number;
  totalApproved: number;
  totalDeclined: number;
  totalEscalated: number;
  totalAmountCents: bigint;
  averageAmountCents: bigint;
  approvalRate: number;
}

export interface CreatorDashboardAnalytics {
  creatorId: string;
  dreamCoinsEarned: bigint;
  dreamCoinsBalance: bigint;
  syntheticTwinsCreated: number;
  totalPayoutsRequested: number;
  totalPayoutsApproved: number;
  pendingPayoutCents: bigint;
  heatScore: number;
  membershipTier: string;
}

export interface AdminAnalyticsSummary {
  dreamCoinsUsage: DreamCoinsUsageTrend[];
  syntheticTwinVolume: SyntheticTwinVolume[];
  membershipDistribution: MembershipDistribution[];
  payoutSummary: PayoutSummary;
  topCreators: CreatorDashboardAnalytics[];
}

@Injectable()
export class AccountCoreAnalyticsService {
  private readonly logger = new Logger(AccountCoreAnalyticsService.name);

  constructor(private prisma: PrismaClient) {}

  /**
   * Get DreamCoins usage trends over time
   */
  async getTokenUsageTrends(
    startDate: Date,
    endDate: Date,
    _creatorId?: string,
  ): Promise<DreamCoinsUsageTrend[]> {
    this.logger.log(`Fetching token usage trends from ${startDate} to ${endDate}`);

    // Query ledger entries for token operations
    const entries = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        entry_type: string;
        net_amount_cents: bigint;
      }>
    >`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN entry_type = 'PURCHASE' THEN amount_cents ELSE 0 END), 0) as purchased_amount,
        COALESCE(SUM(CASE WHEN entry_type = 'SPEND' THEN ABS(amount_cents) ELSE 0 END), 0) as spent_amount,
        COUNT(DISTINCT user_id) as active_users
      FROM ledger_entries
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Aggregate by date
    const trendMap = new Map<string, DreamCoinsUsageTrend>();

    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0];

      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          date: dateKey,
          purchasedAmount: 0n,
          spentAmount: 0n,
          netBalance: 0n,
          activeUsers: 0,
        });
      }

      const trend = trendMap.get(dateKey)!;

      if (entry.entry_type === 'TOKEN_PURCHASE') {
        trend.purchasedAmount += entry.net_amount_cents;
      } else if (
        entry.entry_type === 'TOKEN_SPEND' ||
        entry.entry_type === 'SYNTHETIC_GENERATION'
      ) {
        trend.spentAmount += entry.net_amount_cents;
      }
    }

    return Array.from(trendMap.values());
  }

  /**
   * Get synthetic twin generation volume statistics
   */
  async getSyntheticTwinVolume(
    _creatorId?: string,
    _limit: number = 10,
  ): Promise<SyntheticTwinVolume[]> {
    this.logger.log(`Fetching synthetic twin volume metrics`);

    // This is a placeholder - actual implementation would query AiTwin and generation logs
    // For now, return empty array as this requires proper implementation
    return [];
  }

  /**
   * Get membership tier distribution
   */
  async getMembershipDistribution(): Promise<MembershipDistribution[]> {
    this.logger.log(`Fetching membership tier distribution`);

    // Placeholder - actual implementation would query Subscription or Membership model
    return [];
  }

  /**
   * Get payout request summary
   */
  async getPayoutSummary(_creatorId?: string): Promise<PayoutSummary> {
    this.logger.log(`Fetching payout summary`);

    // Placeholder - actual implementation would query payout records
    return {
      totalRequests: 0,
      totalApproved: 0,
      totalDeclined: 0,
      totalEscalated: 0,
      totalAmountCents: 0n,
      averageAmountCents: 0n,
      approvalRate: 0,
    };
  }

  /**
   * Get creator-specific dashboard analytics
   */
  async getCreatorDashboardAnalytics(creatorId: string): Promise<CreatorDashboardAnalytics> {
    this.logger.log(`Fetching creator dashboard analytics for ${creatorId}`);

    // Placeholder - actual implementation would query ledger and membership data
    return {
      creatorId,
      dreamCoinsEarned: 0n,
      dreamCoinsBalance: 0n,
      syntheticTwinsCreated: 0,
      totalPayoutsRequested: 0,
      totalPayoutsApproved: 0,
      pendingPayoutCents: 0n,
      heatScore: 0,
      membershipTier: 'GUEST',
    };
  }

  /**
   * Get top creators by earnings
   */
  async getAdminAnalytics(startDate: Date, endDate: Date): Promise<AdminAnalyticsSummary> {
    this.logger.log(`Fetching platform-wide admin analytics`);

    const [dreamCoinsUsage, membershipDistribution, syntheticTwinVolume, payoutSummary] =
      await Promise.all([
        this.getTokenUsageTrends(startDate, endDate),
        this.getMembershipDistribution(),
        this.getSyntheticTwinVolume(undefined, 20),
        this.getPayoutSummary(),
      ]);

    // Placeholder for top creators - actual implementation would query creator data
    const topCreators: CreatorDashboardAnalytics[] = [];

    return {
      dreamCoinsUsage,
      syntheticTwinVolume,
      membershipDistribution,
      payoutSummary,
      topCreators,
    };
  }
}
