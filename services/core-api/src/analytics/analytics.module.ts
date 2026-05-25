// services/core-api/src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { FfsScoreService } from './ffs-score.service';
import { AccountCoreMetricsService } from './account-core-metrics.service';
import { NatsModule } from '../nats/nats.module';

@Module({
  imports: [NatsModule],
  providers: [FfsScoreService, AccountCoreMetricsService],
  exports: [FfsScoreService, AccountCoreMetricsService],
})
export class AnalyticsModule {}
