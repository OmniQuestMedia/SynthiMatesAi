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
  async getDreamCoinsUsageTrends(startDate: Date, endDate: Date): Promise<DreamCoinsUsageTrend[]> {
    const rawData = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        purchased_amount: bigint;
        spent_amount: bigint;
        active_users: bigint;
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

    let runningBalance = 0n;
    return rawData.map((row) => {
      const purchased = BigInt(row.purchased_amount || 0);
      const spent = BigInt(row.spent_amount || 0);
      const netChange = purchased - spent;
      runningBalance += netChange;

      return {
        date: row.date.toISOString().split('T')[0],
        purchasedAmount: purchased,
        spentAmount: spent,
        netBalance: runningBalance,
        activeUsers: Number(row.active_users),
      };
    });
  }

  /**
   * Get synthetic twin generation volume statistics
   */
  async getSyntheticTwinVolume(startDate: Date, endDate: Date): Promise<SyntheticTwinVolume[]> {
    const rawData = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        total_created: bigint;
        trainings_started: bigint;
        trainings_completed: bigint;
        trainings_failed: bigint;
        safe_mode_twins: bigint;
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

    return rawData.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      totalCreated: Number(row.total_created),
      trainingsStarted: Number(row.trainings_started),
      trainingsCompleted: Number(row.trainings_completed),
      trainingsFailed: Number(row.trainings_failed),
      safeModeTwins: Number(row.safe_mode_twins),
    }));
  }

  /**
   * Get membership tier distribution
   */
  async getMembershipDistribution(): Promise<MembershipDistribution[]> {
    const rawData = await this.prisma.$queryRaw<
      Array<{
        tier: string;
        active_count: bigint;
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

    return rawData.map((row) => ({
      tier: row.tier as 'GUEST' | 'MEMBER' | 'DIAMOND',
      activeCount: Number(row.active_count),
      percentage: totalActive > 0 ? (Number(row.active_count) / totalActive) * 100 : 0,
      totalRevenueCents: BigInt(row.total_revenue_cents),
    }));
  }

  /**
   * Get payout request summary
   */
  async getPayoutSummary(startDate: Date, endDate: Date): Promise<PayoutSummary> {
    const rawData = await this.prisma.$queryRaw<
      Array<{
        total_requests: bigint;
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

    // Get payout statistics
    const payoutData = await this.prisma.$queryRaw<
      Array<{
        total_requested: bigint;
        total_approved: bigint;
        pending_amount: bigint;
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
  async getTopCreators(limit: number = 10): Promise<CreatorDashboardAnalytics[]> {
    const topCreatorIds = await this.prisma.$queryRaw<
      Array<{ user_id: string; total_earned: bigint }>
    >`
      SELECT
        user_id,
        SUM(amount_cents) as total_earned
      FROM ledger_entries
      WHERE amount_cents > 0
        AND bucket = 'PROMOTIONAL_BONUS'
      GROUP BY user_id
      ORDER BY total_earned DESC
      LIMIT ${limit}
    `;

    const analytics = await Promise.all(
      topCreatorIds.map((row) => this.getCreatorDashboardAnalytics(row.user_id)),
    );

    return analytics;
  }

  /**
   * Get comprehensive admin analytics summary
   */
  async getAdminAnalyticsSummary(startDate: Date, endDate: Date): Promise<AdminAnalyticsSummary> {
    const [
      dreamCoinsUsage,
      syntheticTwinVolume,
      membershipDistribution,
      payoutSummary,
      topCreators,
    ] = await Promise.all([
      this.getDreamCoinsUsageTrends(startDate, endDate),
      this.getSyntheticTwinVolume(startDate, endDate),
      this.getMembershipDistribution(),
      this.getPayoutSummary(startDate, endDate),
      this.getTopCreators(10),
    ]);

    return {
      dreamCoinsUsage,
      syntheticTwinVolume,
      membershipDistribution,
      payoutSummary,
      topCreators,
    };
  }
}
