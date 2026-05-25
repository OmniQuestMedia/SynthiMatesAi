// WO: WO-INIT-001
// CHORE: Enhanced with Account-Core analytics (Phase 5 Item 2)
import { Injectable, Controller, Get, Query, Req, Logger } from '@nestjs/common';
import {
  AccountCoreAnalyticsService,
  CreatorDashboardAnalytics,
} from '../analytics/account-core-analytics.service';
import { Request } from 'express';

type DashboardRequest = Request & {
  user?: { id?: string };
};

export interface DashboardSummary {
  creatorId: string;
  totalEarningsCents: bigint;
  pendingPayoutCents: bigint;
  syntheticTwinCount: number;
  recentGenerations: number;
  analytics?: CreatorDashboardAnalytics;
}

interface CreatorDashboardRequest {
  user?: {
    id?: string;
  };
  headers?: Record<string, string | string[] | undefined>;
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
    @Req() req: CreatorDashboardRequest,
    @Query('days') _days: string = '30',
  ): Promise<DashboardSummary> {
    const creatorHeader = req.headers?.['x-user-id'];
    const creatorId =
      req.user?.id || (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId);

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
    @Req() req: CreatorDashboardRequest,
    @Query('startDate') _startDate: string,
    @Query('endDate') _endDate: string,
  ): Promise<CreatorDashboardAnalytics> {
    const headerUserId = req.headers?.['x-user-id'];
    const creatorId =
      req.user?.id || (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId);

    if (!creatorId) {
      throw new Error('Creator ID is required');
    }

    this.logger.log(`Fetching detailed analytics for creator ${creatorId}`);

    return this.analyticsService.getCreatorDashboardAnalytics(creatorId);
  }
}
