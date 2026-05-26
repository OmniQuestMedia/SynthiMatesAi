// WO: WO-INIT-001
// CHORE: Enhanced with Account-Core analytics (Phase 5 Item 2)
import { Injectable, Controller, Get, Query, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import {
  AccountCoreAnalyticsService,
  CreatorDashboardAnalytics,
} from '../analytics/account-core-analytics.service';

export interface DashboardSummary {
  creatorId: string;
  totalEarningsCents: bigint;
  pendingPayoutCents: bigint;
  syntheticTwinCount: number;
  recentGenerations: number;
  analytics?: CreatorDashboardAnalytics;
}

@Injectable()
@Controller('creator/dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly analyticsService: AccountCoreAnalyticsService) {}

  /**
   * Get creator dashboard summary with analytics
   */
  @Get('summary')
  async getSummary(
    @Req() req: Request & { user?: { id: string } },
    @Query('days') _days: string = '30',
  ): Promise<DashboardSummary> {
    const creatorIdRaw = req.user?.id || req.headers['x-user-id'];
    const creatorId = Array.isArray(creatorIdRaw) ? creatorIdRaw[0] : creatorIdRaw || '';

    this.logger.log(`Fetching dashboard summary for creator ${creatorId}`);

    if (!creatorId) {
      throw new Error('Creator ID is required');
    }

    const analytics = await this.analyticsService.getCreatorDashboardAnalytics(creatorId);

    return {
      creatorId,
      totalEarningsCents: analytics.dreamCoinsEarned,
      pendingPayoutCents: analytics.pendingPayoutCents,
      syntheticTwinCount: analytics.syntheticTwinsCreated,
      recentGenerations: 0, // Not available in current analytics
      analytics,
    };
  }

  /**
   * Get detailed analytics for date range
   */
  @Get('analytics')
  async getAnalytics(
    @Req() req: Request & { user?: { id: string } },
  ): Promise<CreatorDashboardAnalytics> {
    const creatorIdRaw = req.user?.id || req.headers['x-user-id'];
    const creatorId = Array.isArray(creatorIdRaw) ? creatorIdRaw[0] : creatorIdRaw || '';

    this.logger.log(`Fetching detailed analytics for creator ${creatorId}`);

    return this.analyticsService.getCreatorDashboardAnalytics(creatorId);
  }
}
