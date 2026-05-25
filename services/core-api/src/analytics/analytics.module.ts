// services/core-api/src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { FfsScoreService } from './ffs-score.service';
import { AccountCoreAnalyticsService } from './account-core-analytics.service';
import { AccountCoreAnalyticsController } from './account-core-analytics.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [AccountCoreAnalyticsController],
  providers: [
    FfsScoreService,
    AccountCoreAnalyticsService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [FfsScoreService, AccountCoreAnalyticsService],
})
export class AnalyticsModule {}
