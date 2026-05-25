// WO: WO-INIT-001
// CHORE: Enhanced with Account-Core analytics (Phase 5 Item 2)
import { Injectable, Controller, Get, Query, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import {
  AccountCoreAnalyticsService,
  CreatorAnalytics,
} from '../analytics/account-core-analytics.service';

export interface DashboardSummary {
  creatorId: string;
  totalEarningsCents: bigint;
  pendingPayoutCents: bigint;
  syntheticTwinCount: number;
  recentGenerations: number;
  analytics?: CreatorAnalytics;
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
    @Query('days') days: string = '30',
  ): Promise<DashboardSummary> {
    const creatorIdRaw = req.user?.id || req.headers['x-user-id'];
    const creatorId = Array.isArray(creatorIdRaw) ? creatorIdRaw[0] : creatorIdRaw || '';
    const daysNum = parseInt(days, 10) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    this.logger.log(`Fetching dashboard summary for creator ${creatorId}`);

    const analytics = await this.analyticsService.getCreatorAnalytics(
      creatorId,
      startDate,
      endDate,
    );

    return {
      creatorId,
      totalEarningsCents: analytics.totalEarningsCents,
      pendingPayoutCents: BigInt(analytics.payoutSummary.totalAmountCents),
      syntheticTwinCount: analytics.syntheticTwinUsage.length,
      recentGenerations: analytics.syntheticTwinUsage.reduce(
        (sum, twin) => sum + twin.generationCount,
        0,
      ),
      analytics,
    };
  }

  /**
   * Get detailed analytics for date range
   */
  @Get('analytics')
  async getAnalytics(
    @Req() req: Request & { user?: { id: string } },
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<CreatorAnalytics> {
    const creatorIdRaw = req.user?.id || req.headers['x-user-id'];
    const creatorId = Array.isArray(creatorIdRaw) ? creatorIdRaw[0] : creatorIdRaw || '';
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    this.logger.log(`Fetching detailed analytics for creator ${creatorId}`);

    return this.analyticsService.getCreatorAnalytics(creatorId, start, end);
  }
}
