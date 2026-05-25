// services/core-api/src/analytics/analytics.module.ts
// CHORE: Added Account-Core analytics (Phase 5 Item 2)
import { Module } from '@nestjs/common';
import { FfsScoreService } from './ffs-score.service';
import { AccountCoreMetricsService } from './account-core-metrics.service';
import { AccountCoreAnalyticsService } from './account-core-analytics.service';
import { NatsModule } from '../nats/nats.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [NatsModule],
  providers: [
    FfsScoreService,
    AccountCoreMetricsService,
    AccountCoreAnalyticsService,
    PrismaService,
  ],
  exports: [FfsScoreService, AccountCoreMetricsService, AccountCoreAnalyticsService],
})
export class AnalyticsModule {}
