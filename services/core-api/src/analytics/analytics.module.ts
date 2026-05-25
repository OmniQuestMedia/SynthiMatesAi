// services/core-api/src/analytics/analytics.module.ts
// CHORE: Added Account-Core analytics (Phase 5 Item 2)
import { Module } from '@nestjs/common';
import { FfsScoreService } from './ffs-score.service';
import { AccountCoreAnalyticsService } from './account-core-analytics.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [FfsScoreService, AccountCoreAnalyticsService, PrismaService],
  exports: [FfsScoreService, AccountCoreAnalyticsService],
})
export class AnalyticsModule {}
