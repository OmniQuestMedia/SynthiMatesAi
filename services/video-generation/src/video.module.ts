// services/video-generation/src/video.module.ts
// CYR: Video Generation Module

import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { HeyGenService } from './heygen.service';
import { PrismaService } from '../../core-api/src/prisma.service';
import { NatsService } from '../../core-api/src/nats/nats.service';
import { SyntheticPipelineService } from '../../ai-twin/src/synthetic-pipeline.service';

@Module({
  providers: [VideoService, HeyGenService, PrismaService, NatsService, SyntheticPipelineService],
  exports: [VideoService, HeyGenService],
})
export class VideoModule {}
