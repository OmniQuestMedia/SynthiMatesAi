// services/video-generation/src/video.module.ts
// CYR: Video Generation Module — NestJS Module Registration

import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { HybridVideoService } from './hybrid-video.service';
import { ViduService } from './vidu.service';
import { HeyGenService } from './heygen.service';
import { VideoService } from './video.service';
import { PrismaService } from '../../core-api/src/prisma.service';
import { NatsService } from '../../core-api/src/nats/nats.service';
import { SyntheticPipelineService } from '../../ai-twin/src/synthetic-pipeline.service';

@Module({
  controllers: [VideoController],
  providers: [
    HybridVideoService,
    ViduService,
    HeyGenService,
    VideoService,
    SyntheticPipelineService,
    PrismaService,
    NatsService,
  ],
  exports: [HybridVideoService, ViduService, HeyGenService, VideoService],
})
export class VideoModule {}
