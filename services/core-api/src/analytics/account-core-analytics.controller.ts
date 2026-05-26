// WO: WO-PHASE5-002
// Account-Core Analytics Controller - API endpoints for analytics data
import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  AccountCoreAnalyticsService,
  DreamCoinsUsageTrend,
  SyntheticTwinVolume,
  MembershipDistribution,
  PayoutSummary,
  CreatorDashboardAnalytics,
  AdminAnalyticsSummary,
} from './account-core-analytics.service';

/**
 * Analytics endpoints for Account-Core features
 *
 * Creator endpoints: /api/analytics/creator/:creatorId/*
 * Admin endpoints: /api/admin/analytics/*
 */
@Controller('analytics')
export class AccountCoreAnalyticsController {
  constructor(private readonly analyticsService: AccountCoreAnalyticsService) {}

  /**
   * GET /api/analytics/dreamcoins/usage
   * Get DreamCoins usage trends
   */
  @Get('dreamcoins/usage')
  async getDreamCoinsUsage(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<DreamCoinsUsageTrend[]> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getTokenUsageTrends(start, end);
  }

  /**
   * GET /api/analytics/synthetic-twins/volume
   * Get synthetic twin generation volume
   */
  @Get('synthetic-twins/volume')
  async getSyntheticTwinVolume(): Promise<SyntheticTwinVolume[]> {
    return this.analyticsService.getSyntheticTwinVolume();
  }

  /**
   * GET /api/analytics/memberships/distribution
   * Get membership tier distribution
   */
  @Get('memberships/distribution')
  async getMembershipDistribution(): Promise<MembershipDistribution[]> {
    return this.analyticsService.getMembershipDistribution();
  }

  /**
   * GET /api/analytics/payouts/summary
   * Get payout request summary
   */
  @Get('payouts/summary')
  async getPayoutSummary(): Promise<PayoutSummary> {
    return this.analyticsService.getPayoutSummary();
  }

  /**
   * GET /api/analytics/creator/:creatorId/dashboard
   * Get creator-specific dashboard analytics
   */
  @Get('creator/:creatorId/dashboard')
  async getCreatorDashboard(
    @Param('creatorId') creatorId: string,
  ): Promise<CreatorDashboardAnalytics> {
    return this.analyticsService.getCreatorDashboardAnalytics(creatorId);
  }

  /**
   * GET /api/admin/analytics/summary
   * Get comprehensive admin analytics summary
   * Requires ADMIN role (add @UseGuards(AdminGuard) in production)
   */
  @Get('admin/summary')
  async getAdminSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<AdminAnalyticsSummary> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getAdminAnalytics(start, end);
  }

  /**
   * GET /api/admin/analytics/top-creators
   * Get top creators by earnings
   * Requires ADMIN role
   */
  @Get('admin/top-creators')
  async getTopCreators(): Promise<CreatorDashboardAnalytics[]> {
    // Return empty array - requires proper implementation
    return [];
  }
}
