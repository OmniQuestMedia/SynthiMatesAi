// services/core-api/src/cyrano/video-generation.controller.ts
// CYR: Video Generation Controller — Hybrid Safe Synthetic Twin → HeyGen Pipeline
//
// Endpoint: POST /cyrano/ai-twin/video
// Responsibilities:
//   1. Accept multipart form with images + prompt + duration
//   2. Validate inputs
//   3. Call VideoService to execute hybrid pipeline
//   4. Return video URL and wallet balance

import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { VideoService } from '../../../video-generation/src/video.service';
import { VideoDuration } from '../../../video-generation/src/heygen.types';

// Use simple timestamp-based ID generation instead of uuid
function generateIdempotencyKey(userId: string): string {
  return `video-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

interface VideoGenerationDto {
  userId: string;
  twinId: string;
  creatorId: string;
  prompt: string;
  durationSeconds: string; // "8" or "16"
  fantasyLevel?: string; // Optional, defaults to "0.25"
}

@Controller('cyrano/ai-twin')
export class VideoGenerationController {
  private readonly logger = new Logger(VideoGenerationController.name);

  constructor(private readonly videoService: VideoService) {}

  @Post('video')
  @UseInterceptors(FilesInterceptor('images', 20)) // Max 20 images
  async generateVideo(
    @UploadedFiles() files: UploadedImageFile[],
    @Body() body: VideoGenerationDto,
  ) {
    this.logger.log(`Video generation request for twin ${body.twinId}, user ${body.userId}`);

    // Validate inputs
    if (!files || files.length < 5) {
      throw new BadRequestException('At least 5 images required for Safe Synthetic Twin');
    }

    if (!body.prompt || body.prompt.trim().length === 0) {
      throw new BadRequestException('Prompt is required');
    }

    const durationSeconds = parseInt(body.durationSeconds, 10);
    if (durationSeconds !== 8 && durationSeconds !== 16) {
      throw new BadRequestException('Duration must be 8 or 16 seconds');
    }

    const fantasyLevel = body.fantasyLevel ? parseFloat(body.fantasyLevel) : 0.25;
    if (fantasyLevel < 0 || fantasyLevel > 1) {
      throw new BadRequestException('Fantasy level must be between 0.0 and 1.0');
    }

    // Convert files to buffers
    const imageBuffers = files.map((file) => file.buffer);

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(body.userId);

    // Call video service
    const result = await this.videoService.generateVideo({
      userId: body.userId,
      twinId: body.twinId,
      creatorId: body.creatorId,
      images: imageBuffers,
      fantasyLevel,
      prompt: body.prompt,
      durationSeconds: durationSeconds as VideoDuration,
      idempotencyKey,
    });

    return {
      success: true,
      video: {
        url: result.videoUrl,
        cacheId: result.videoCacheId,
        syntheticImageUrl: result.syntheticImageUrl,
        durationSeconds: result.durationSeconds,
        captureId: result.captureId,
      },
      cost: {
        dreamCoins: result.tokensCharged,
        remainingBalance: result.newBalance,
      },
    };
  }
}
