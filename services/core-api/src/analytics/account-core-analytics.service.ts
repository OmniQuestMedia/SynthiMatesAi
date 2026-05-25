// WO: WO-PHASE5-002
// Account-Core Analytics Service - DreamCoins, Memberships, Payouts, Synthetic Twins
import { Injectable } from '@nestjs/common';
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
  constructor(private prisma: PrismaClient) {}

  /**
   * Get DreamCoins usage trends over time
   */
  async getTokenUsageTrends(
    startDate: Date,
    endDate: Date,
    creatorId?: string,
  ): Promise<TokenUsageTrend[]> {
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
    const trendMap = new Map<string, TokenUsageTrend>();

    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0];

      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          date: dateKey,
          purchased: 0n,
          spent: 0n,
          membershipAllocated: 0n,
          bonusAwarded: 0n,
        });
      }

      const trend = trendMap.get(dateKey)!;

      if (entry.entry_type === 'TOKEN_PURCHASE') {
        trend.purchased += entry.net_amount_cents;
      } else if (
        entry.entry_type === 'TOKEN_SPEND' ||
        entry.entry_type === 'SYNTHETIC_GENERATION'
      ) {
        trend.spent += entry.net_amount_cents;
      } else if (entry.entry_type === 'MEMBERSHIP_ALLOCATION') {
        trend.membershipAllocated += entry.net_amount_cents;
      } else if (entry.entry_type === 'BONUS_AWARD') {
        trend.bonusAwarded += entry.net_amount_cents;
      }
    }

    return Array.from(trendMap.values());
  }

  /**
   * Get synthetic twin generation volume statistics
   */
  async getSyntheticTwinVolume(
    creatorId?: string,
    limit: number = 10,
  ): Promise<SyntheticTwinVolume[]> {
    this.logger.log(`Fetching synthetic twin volume metrics`);

    // This is a placeholder - actual implementation would query AiTwin and generation logs
    // For now, return aggregated data from ledger entries tagged with synthetic generation

    const volumes = await this.prisma.$queryRaw<
      Array<{
        twin_id: string;
        twin_name: string;
        generation_count: bigint;
        total_tokens_spent: bigint;
        image_count: bigint;
        voice_count: bigint;
      }>
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_created,
        COALESCE(SUM(CASE WHEN training_status IN ('TRAINING_QUEUED', 'TRAINING_COMPLETE', 'TRAINING_FAILED') THEN 1 ELSE 0 END), 0) as trainings_started,
        COALESCE(SUM(CASE WHEN training_status = 'TRAINING_COMPLETE' THEN 1 ELSE 0 END), 0) as trainings_completed,
        COALESCE(SUM(CASE WHEN training_status = 'TRAINING_FAILED' THEN 1 ELSE 0 END), 0) as trainings_failed,
        COALESCE(SUM(CASE WHEN is_safe_synthetic = true THEN 1 ELSE 0 END), 0) as safe_mode_twins
      FROM "AiTwin"
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    return volumes.map((v) => ({
      twinId: v.twin_id || 'unknown',
      twinName: v.twin_name || 'Unknown Twin',
      generationCount: Number(v.generation_count),
      totalTokensSpent: v.total_tokens_spent,
      imageGenerations: Number(v.image_count),
      voiceGenerations: Number(v.voice_count),
    }));
  }

  /**
   * Get membership tier distribution
   */
  async getMembershipDistribution(): Promise<MembershipTierDistribution[]> {
    this.logger.log(`Fetching membership tier distribution`);

    // Query subscription/membership data
    // Placeholder - would query actual Subscription or Membership model
    const distribution = await this.prisma.$queryRaw<
      Array<{
        tier: string;
        active_users: bigint;
        total_revenue_cents: bigint;
      }>
    >`
      SELECT
        tier,
        COUNT(*) as active_count,
        COALESCE(SUM(price_cents), 0) as total_revenue_cents
      FROM "MembershipSubscription"
      WHERE status = 'ACTIVE'
      GROUP BY tier
    `;

    const totalActive = rawData.reduce((sum, row) => sum + Number(row.active_count), 0);

    return distribution.map((d) => ({
      tier: d.tier || 'FREE',
      activeUsers: Number(d.active_users),
      totalRevenueCents: d.total_revenue_cents,
      percentage: total > 0 ? (Number(d.active_users) / total) * 100 : 0,
    }));
  }

  /**
   * Get payout request summary
   */
  async getPayoutSummary(creatorId?: string): Promise<PayoutSummary> {
    this.logger.log(`Fetching payout summary`);

    const result = await this.prisma.$queryRaw<
      Array<{
        total_requests: bigint;
        pending_count: bigint;
        approved_count: bigint;
        declined_count: bigint;
        total_amount_cents: bigint;
      }>
    >`
      SELECT
        COUNT(*) as total_requests,
        COALESCE(SUM(ABS(amount_cents)), 0) as total_amount_cents
      FROM ledger_entries
      WHERE entry_type = 'PAYOUT_DEBIT'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
    `;

    // Get GateGuard decision counts
    const decisionCounts = await this.prisma.$queryRaw<
      Array<{
        decision: string;
        count: bigint;
      }>
    >`
      SELECT
        metadata->>'decision' as decision,
        COUNT(*) as count
      FROM immutable_audit_event
      WHERE event_type = 'GATEGUARD_DECISION'
        AND metadata->>'action' = 'PAYOUT'
        AND timestamp >= ${startDate}
        AND timestamp <= ${endDate}
      GROUP BY metadata->>'decision'
    `;

    const totalRequests = decisionCounts.reduce((sum, row) => sum + Number(row.count), 0);
    const approved = decisionCounts.find((r) => r.decision === 'APPROVE')?.count || 0n;
    const declined = decisionCounts.find((r) => r.decision === 'HARD_DECLINE')?.count || 0n;
    const escalated = decisionCounts.find((r) => r.decision === 'HUMAN_ESCALATE')?.count || 0n;

    const totalAmount = BigInt(rawData[0]?.total_amount_cents || 0);
    const averageAmount = totalRequests > 0 ? totalAmount / BigInt(totalRequests) : 0n;

    return {
      totalRequests,
      totalApproved: Number(approved),
      totalDeclined: Number(declined),
      totalEscalated: Number(escalated),
      totalAmountCents: totalAmount,
      averageAmountCents: averageAmount,
      approvalRate: totalRequests > 0 ? (Number(approved) / totalRequests) * 100 : 0,
    };
  }

  /**
   * Get creator-specific dashboard analytics
   */
  async getCreatorDashboardAnalytics(creatorId: string): Promise<CreatorDashboardAnalytics> {
    // Get DreamCoins earned (total credits)
    const earnedData = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(amount_cents), 0) as total
      FROM ledger_entries
      WHERE user_id = ${creatorId}::uuid
        AND amount_cents > 0
        AND bucket = 'PROMOTIONAL_BONUS'
    `;

    // Get current DreamCoins balance
    const balanceData = await this.prisma.$queryRaw<Array<{ balance: bigint }>>`
      SELECT COALESCE(SUM(amount_cents), 0) as balance
      FROM ledger_entries
      WHERE user_id = ${creatorId}::uuid
    `;

    // Get synthetic twins created
    const twinData = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "AiTwin"
      WHERE creator_id = ${creatorId}::uuid
    `;

    // Calculate total earnings from ledger
    const earningsResult = await this.prisma.$queryRaw<
      Array<{
        total_earnings: bigint;
      }>
    >`
      SELECT
        COUNT(*) as total_requested,
        COALESCE(SUM(CASE WHEN metadata->>'status' = 'APPROVED' THEN 1 ELSE 0 END), 0) as total_approved,
        COALESCE(SUM(CASE WHEN metadata->>'status' = 'ESCALATED' THEN ABS(amount_cents) ELSE 0 END), 0) as pending_amount
      FROM ledger_entries
      WHERE user_id = ${creatorId}::uuid
        AND entry_type = 'PAYOUT_DEBIT'
    `;

    // Get membership tier
    const membershipData = await this.prisma.$queryRaw<Array<{ tier: string }>>`
      SELECT tier
      FROM "MembershipSubscription"
      WHERE user_id = ${creatorId}::uuid
        AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // TODO: Get creator profile and integrate with FFS score service for heat score

    return {
      creatorId,
      dreamCoinsEarned: BigInt(earnedData[0]?.total || 0),
      dreamCoinsBalance: BigInt(balanceData[0]?.balance || 0),
      syntheticTwinsCreated: Number(twinData[0]?.count || 0),
      totalPayoutsRequested: Number(payoutData[0]?.total_requested || 0),
      totalPayoutsApproved: Number(payoutData[0]?.total_approved || 0),
      pendingPayoutCents: BigInt(payoutData[0]?.pending_amount || 0),
      heatScore: 0, // TODO: Integrate with FFS score service
      membershipTier: membershipData[0]?.tier || 'GUEST',
    };
  }

  /**
   * Get top creators by earnings
   */
  async getAdminAnalytics(startDate: Date, endDate: Date): Promise<AdminAnalytics> {
    this.logger.log(`Fetching platform-wide admin analytics`);

    const [platformTokenUsage, membershipDistribution, topSyntheticTwins, payoutQueue] =
      await Promise.all([
        this.getTokenUsageTrends(startDate, endDate),
        this.getMembershipDistribution(),
        this.getSyntheticTwinVolume(undefined, 20),
        this.getPayoutSummary(),
      ]);

    // Calculate total active users and revenue
    const statsResult = await this.prisma.$queryRaw<
      Array<{
        active_users: bigint;
        total_revenue: bigint;
      }>
    >`
      SELECT
        COUNT(DISTINCT user_id) as active_users,
        SUM(gross_amount_cents) as total_revenue
      FROM ledger_entries
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND entry_type IN ('TOKEN_PURCHASE', 'MEMBERSHIP_PURCHASE')
    `;

    const stats = statsResult[0] || { active_users: 0n, total_revenue: 0n };

    return {
      dreamCoinsUsage,
      syntheticTwinVolume,
      membershipDistribution,
      payoutSummary,
      topCreators,
    };
  }
}
