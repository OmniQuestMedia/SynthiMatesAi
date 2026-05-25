// CHORE: Account-Core Analytics Service
// Provides usage metrics and trends for creator dashboards and admin views
// Phase 5 Item 2: Analytics & Usage Dashboard

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface TokenUsageTrend {
  date: string;
  purchased: bigint;
  spent: bigint;
  membershipAllocated: bigint;
  bonusAwarded: bigint;
}

export interface SyntheticTwinVolume {
  twinId: string;
  twinName: string;
  generationCount: number;
  totalTokensSpent: bigint;
  imageGenerations: number;
  voiceGenerations: number;
}

export interface MembershipTierDistribution {
  tier: string;
  activeUsers: number;
  totalRevenueCents: bigint;
  percentage: number;
}

export interface PayoutSummary {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  declinedCount: number;
  totalAmountCents: bigint;
  averageAmountCents: bigint;
}

export interface CreatorAnalytics {
  creatorId: string;
  totalEarningsCents: bigint;
  syntheticTwinUsage: SyntheticTwinVolume[];
  tokenRevenueByPeriod: TokenUsageTrend[];
  payoutSummary: PayoutSummary;
}

export interface AdminAnalytics {
  platformTokenUsage: TokenUsageTrend[];
  membershipDistribution: MembershipTierDistribution[];
  topSyntheticTwins: SyntheticTwinVolume[];
  payoutQueue: PayoutSummary;
  totalActiveUsers: number;
  totalRevenueCents: bigint;
}

@Injectable()
export class AccountCoreAnalyticsService {
  private readonly logger = new Logger(AccountCoreAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get token usage trends over time
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param creatorId - Optional filter for specific creator
   */
  async getTokenUsageTrends(
    startDate: Date,
    endDate: Date,
    creatorId?: string,
  ): Promise<TokenUsageTrend[]> {
    this.logger.log(`Fetching token usage trends from ${startDate} to ${endDate}`);

    // Query ledger entries for token operations
    const entries = await this.prisma.$queryRaw<Array<{
      date: Date;
      entry_type: string;
      net_amount_cents: bigint;
    }>>`
      SELECT
        DATE(created_at) as date,
        entry_type,
        SUM(net_amount_cents) as net_amount_cents
      FROM ledger_entries
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        ${creatorId ? this.prisma.$queryRaw`AND performer_id = ${creatorId}::uuid` : this.prisma.$queryRaw``}
      GROUP BY DATE(created_at), entry_type
      ORDER BY DATE(created_at) ASC
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
      } else if (entry.entry_type === 'TOKEN_SPEND' || entry.entry_type === 'SYNTHETIC_GENERATION') {
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
   * Get synthetic twin generation volume and revenue
   * @param creatorId - Optional filter for specific creator
   * @param limit - Maximum number of results
   */
  async getSyntheticTwinVolume(
    creatorId?: string,
    limit: number = 10,
  ): Promise<SyntheticTwinVolume[]> {
    this.logger.log(`Fetching synthetic twin volume metrics`);

    // This is a placeholder - actual implementation would query AiTwin and generation logs
    // For now, return aggregated data from ledger entries tagged with synthetic generation

    const volumes = await this.prisma.$queryRaw<Array<{
      twin_id: string;
      twin_name: string;
      generation_count: bigint;
      total_tokens_spent: bigint;
      image_count: bigint;
      voice_count: bigint;
    }>>`
      SELECT
        metadata->>'twinId' as twin_id,
        metadata->>'twinName' as twin_name,
        COUNT(*) as generation_count,
        SUM(net_amount_cents) as total_tokens_spent,
        COUNT(*) FILTER (WHERE metadata->>'generationType' = 'IMAGE') as image_count,
        COUNT(*) FILTER (WHERE metadata->>'generationType' = 'VOICE') as voice_count
      FROM ledger_entries
      WHERE entry_type = 'SYNTHETIC_GENERATION'
        AND metadata->>'twinId' IS NOT NULL
        ${creatorId ? this.prisma.$queryRaw`AND performer_id = ${creatorId}::uuid` : this.prisma.$queryRaw``}
      GROUP BY metadata->>'twinId', metadata->>'twinName'
      ORDER BY generation_count DESC
      LIMIT ${limit}
    `;

    return volumes.map(v => ({
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
    const distribution = await this.prisma.$queryRaw<Array<{
      tier: string;
      active_users: bigint;
      total_revenue_cents: bigint;
    }>>`
      SELECT
        metadata->>'membershipTier' as tier,
        COUNT(DISTINCT user_id) as active_users,
        SUM(net_amount_cents) as total_revenue_cents
      FROM ledger_entries
      WHERE entry_type IN ('MEMBERSHIP_PURCHASE', 'MEMBERSHIP_ALLOCATION')
        AND metadata->>'membershipTier' IS NOT NULL
      GROUP BY metadata->>'membershipTier'
      ORDER BY active_users DESC
    `;

    const total = distribution.reduce((sum, d) => sum + Number(d.active_users), 0);

    return distribution.map(d => ({
      tier: d.tier || 'FREE',
      activeUsers: Number(d.active_users),
      totalRevenueCents: d.total_revenue_cents,
      percentage: total > 0 ? (Number(d.active_users) / total) * 100 : 0,
    }));
  }

  /**
   * Get payout request summary
   * @param creatorId - Optional filter for specific creator
   */
  async getPayoutSummary(creatorId?: string): Promise<PayoutSummary> {
    this.logger.log(`Fetching payout summary`);

    const result = await this.prisma.$queryRaw<Array<{
      total_requests: bigint;
      pending_count: bigint;
      approved_count: bigint;
      declined_count: bigint;
      total_amount_cents: bigint;
    }>>`
      SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as approved_count,
        COUNT(*) FILTER (WHERE status = 'FAILED') as declined_count,
        SUM(net_amount_cents) as total_amount_cents
      FROM ledger_entries
      WHERE entry_type = 'CREATOR_PAYOUT'
        ${creatorId ? this.prisma.$queryRaw`AND performer_id = ${creatorId}::uuid` : this.prisma.$queryRaw``}
    `;

    const data = result[0] || {
      total_requests: 0n,
      pending_count: 0n,
      approved_count: 0n,
      declined_count: 0n,
      total_amount_cents: 0n,
    };

    const totalRequests = Number(data.total_requests);

    return {
      totalRequests,
      pendingCount: Number(data.pending_count),
      approvedCount: Number(data.approved_count),
      declinedCount: Number(data.declined_count),
      totalAmountCents: data.total_amount_cents,
      averageAmountCents: totalRequests > 0 ? data.total_amount_cents / BigInt(totalRequests) : 0n,
    };
  }

  /**
   * Get comprehensive analytics for a creator
   */
  async getCreatorAnalytics(
    creatorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CreatorAnalytics> {
    this.logger.log(`Fetching analytics for creator ${creatorId}`);

    const [syntheticTwinUsage, tokenRevenueByPeriod, payoutSummary] = await Promise.all([
      this.getSyntheticTwinVolume(creatorId, 20),
      this.getTokenUsageTrends(startDate, endDate, creatorId),
      this.getPayoutSummary(creatorId),
    ]);

    // Calculate total earnings from ledger
    const earningsResult = await this.prisma.$queryRaw<Array<{
      total_earnings: bigint;
    }>>`
      SELECT
        SUM(performer_amount_cents) as total_earnings
      FROM ledger_entries
      WHERE performer_id = ${creatorId}::uuid
        AND entry_type IN ('SYNTHETIC_GENERATION', 'CREATOR_REVENUE_SHARE')
    `;

    const totalEarningsCents = earningsResult[0]?.total_earnings || 0n;

    return {
      creatorId,
      totalEarningsCents,
      syntheticTwinUsage,
      tokenRevenueByPeriod,
      payoutSummary,
    };
  }

  /**
   * Get platform-wide admin analytics
   */
  async getAdminAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<AdminAnalytics> {
    this.logger.log(`Fetching platform-wide admin analytics`);

    const [
      platformTokenUsage,
      membershipDistribution,
      topSyntheticTwins,
      payoutQueue,
    ] = await Promise.all([
      this.getTokenUsageTrends(startDate, endDate),
      this.getMembershipDistribution(),
      this.getSyntheticTwinVolume(undefined, 20),
      this.getPayoutSummary(),
    ]);

    // Calculate total active users and revenue
    const statsResult = await this.prisma.$queryRaw<Array<{
      active_users: bigint;
      total_revenue: bigint;
    }>>`
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
      platformTokenUsage,
      membershipDistribution,
      topSyntheticTwins,
      payoutQueue,
      totalActiveUsers: Number(stats.active_users),
      totalRevenueCents: stats.total_revenue,
    };
  }
}
