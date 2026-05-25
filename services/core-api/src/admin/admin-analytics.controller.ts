// CHORE: Admin Analytics Controller (Phase 5 Item 2)
// Provides platform-wide analytics and monitoring for administrators

import { Controller, Get, Query, Logger } from '@nestjs/common';
import {
  AccountCoreAnalyticsService,
  AdminAnalytics,
} from '../analytics/account-core-analytics.service';

@Controller('admin/analytics')
export class AdminAnalyticsController {
  private readonly logger = new Logger(AdminAnalyticsController.name);

  constructor(private readonly analyticsService: AccountCoreAnalyticsService) {}

  /**
   * Get platform-wide admin analytics
   */
  @Get()
  async getAdminAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<AdminAnalyticsSummary> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    this.logger.log(`Fetching admin analytics from ${start} to ${end}`);

    return this.analyticsService.getAdminAnalyticsSummary(start, end);
  }

  /**
   * Get token usage trends
   */
  @Get('token-usage')
  async getTokenUsage(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    this.logger.log(`Fetching token usage trends`);

    return this.analyticsService.getDreamCoinsUsageTrends(start, end);
  }

  /**
   * Get membership distribution
   */
  @Get('membership-distribution')
  async getMembershipDistribution() {
    this.logger.log(`Fetching membership distribution`);

    return this.analyticsService.getMembershipDistribution();
  }

  /**
   * Get top synthetic twins by usage
   */
  @Get('top-synthetic-twins')
  async getTopSyntheticTwins(@Query('limit') limit: string = '20') {
    const limitNum = parseInt(limit, 10) || 20;
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date();

    this.logger.log(`Fetching top ${limitNum} synthetic twins`);

    return this.analyticsService.getSyntheticTwinVolume(start, end);
  }

  /**
   * Get payout queue summary
   */
  @Get('payout-queue')
  async getPayoutQueue() {
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date();

    this.logger.log(`Fetching payout queue summary`);

    return this.analyticsService.getPayoutSummary(start, end);
  }
}
