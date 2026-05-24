// services/ai-twin/src/ai-twin.controller.ts
// CYR: AI Twin REST controller — wizard upload/train endpoints
// CYR-CORE-001: Added class-validator DTOs + @nestjs/throttler rate limiting

import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString } from 'class-validator';
import { CuratorService } from './curator.service';
import { SyntheticPipelineService } from './synthetic-pipeline.service';
import { AiTwinService } from './ai-twin.service';
import { CreateTwinRequest, TrainingJobResult } from './ai-twin.types';

class RecordPhotoDto {
  @IsString()
  @IsNotEmpty()
  photo_id: string;

  @IsString()
  @IsNotEmpty()
  storage_key: string;
}

class StartTrainingDto {
  @IsString()
  @IsNotEmpty()
  correlation_id: string;
}

@Controller('cyrano/ai-twin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AiTwinController {
  constructor(
    private readonly aiTwinService: AiTwinService,
    private readonly curatorService: CuratorService,
  ) {}

  /** Create a new twin record (pre-training). */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() req: CreateTwinRequest) {
    return this.aiTwinService.createTwin(req);
  }

  /** Record a photo upload completion event. */
  @Post(':twinId/photos')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async recordPhoto(@Param('twinId') twinId: string, @Body() body: RecordPhotoDto) {
    return this.aiTwinService.recordPhotoUpload(twinId, body.photo_id, body.storage_key);
  }

  /** Kick off LoRA training for a twin that has uploads complete. */
  @Post(':twinId/train')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async train(@Param('twinId') twinId: string, @Body() body: StartTrainingDto) {
    return this.aiTwinService.startTraining(twinId, body.correlation_id);
  }

  /** Banana.dev webhook: training job result callback. */
  @Post('training-callback')
  async trainingCallback(@Body() result: TrainingJobResult) {
    await this.aiTwinService.handleTrainingResult(result);
    return { ok: true };
  }

  /** List the curator embedding gallery for admin UI. */
  @Get('curator/embeddings')
  async listCuratorEmbeddings() {
    return this.curatorService.listEmbeddings();
  }

  /** Manually trigger a curator gallery refresh. */
  @Post('curator/refresh')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async refreshCuratorGallery() {
    return this.curatorService.refreshGallery();
  }

  /** List all twins for a creator. */
  @Get('creator/:creatorId')
  async listForCreator(@Param('creatorId') creatorId: string) {
    return this.aiTwinService.listTwinsForCreator(creatorId);
  }

  /** List all house models (platform-internal, 100% revenue). */
  @Get('house-models')
  async listHouseModels() {
    return this.aiTwinService.listHouseModels();
  }
}

@Controller('api/ai-twin')
export class AiTwinApiController {
  constructor(private readonly syntheticPipelineService: SyntheticPipelineService) {}

  @Get('test-synthetic')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async testSynthetic() {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    const placeholderImages = Array.from({ length: 5 }, (_, index) => ({
      name: `placeholder-${index + 1}.png`,
      buffer: Buffer.from([index + 1, 255 - index, 64 + index]),
    }));

    const result = await this.syntheticPipelineService.createSyntheticModel(
      placeholderImages.map((image) => image.buffer),
      0.25,
    );

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    return {
      route: '/api/ai-twin/test-synthetic',
      testCommand: 'curl http://localhost:3000/api/ai-twin/test-synthetic',
      fantasyLevel: 0.25,
      placeholderImages: placeholderImages.map((image) => image.name),
      timing: {
        startedAt,
        completedAt,
        durationMs,
      },
      result,
    };
  }
}
