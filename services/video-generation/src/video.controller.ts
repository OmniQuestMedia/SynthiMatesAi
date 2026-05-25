// services/video-generation/src/video.controller.ts
// CYR: Video Generation Controller — Hybrid Safe Synthetic Twin + Vidu
//
// Responsibilities:
//   1. REST endpoints for hybrid video generation
//   2. Rate limiting with @Throttle decorator
//   3. Request validation
//   4. Correlation ID generation

import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { HybridVideoService } from './hybrid-video.service';
import { GenerateVideoRequest, GenerateVideoResponse } from './video.types';
import { randomUUID } from 'node:crypto';

@Controller('cyrano/videos')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class VideoController {
  constructor(private readonly hybridVideo: HybridVideoService) {}

  /**
   * Generate a hybrid video: Safe Synthetic Twin image → Vidu animation.
   *
   * Rate limit: 5 requests per 60 seconds per client to prevent abuse.
   * Video generation is expensive (60-120 DreamCoins + API costs).
   */
  @Post('generate')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async generate(@Body() req: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    // Generate correlation ID if not provided
    const correlationId = req.correlation_id ?? `video-gen-${randomUUID()}`;
    const idempotencyKey = req.idempotency_key ?? `video-gen-${req.user_id}-${Date.now()}`;

    // For MVP, we need to fetch reference images from the twin.
    // In production, this would come from the request or twin's stored images.
    // For now, throw error if twin doesn't have photos.
    const twin = await this.hybridVideo['prisma'].aiTwin.findUnique({
      where: { twin_id: req.twin_id },
      include: { photos: { take: 10 } },
    });

    if (!twin || twin.photos.length < 5) {
      throw new Error(
        'Twin must have at least 5 reference photos for Safe Synthetic video generation',
      );
    }

    // Fetch photo buffers from storage
    // For now, use placeholder buffers (in production, fetch from S3/CDN)
    const referenceImages: Buffer[] = await Promise.all(
      twin.photos.slice(0, 10).map(async (_photo) => {
        // In production: fetch from S3 using photo.storage_key
        // For now: return empty buffer as placeholder
        return Buffer.from('placeholder-image-data');
      }),
    );

    return this.hybridVideo.generate({
      twin_id: req.twin_id,
      creator_id: req.creator_id,
      user_id: req.user_id,
      reference_images: referenceImages,
      fantasy_level: req.fantasy_level,
      prompt: req.prompt,
      duration_seconds: req.duration_seconds,
      resolution: req.resolution,
      correlation_id: correlationId,
      idempotency_key: idempotencyKey,
    });
  }
}
