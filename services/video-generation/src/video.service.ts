// services/video-generation/src/video.service.ts
// PHASE 6 ITEM 2: Video Generation Service — Vidu Reference-to-Video
//
// Responsibilities:
//   1. Accept reference image (from Safe Synthetic Twin)
//   2. Call Vidu API or Banana.dev video generation
//   3. Cache generated videos in VideoCache table
//   4. Emit NATS events for video generation lifecycle
//   5. Track creator revenue share (50-80 DreamCoins per video)

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';
import { NatsService } from '../../core-api/src/nats/nats.service';
import { HttpClient } from '../../core-api/src/common/http-client';
import { getCircuitBreaker } from '../../core-api/src/common/circuit-breaker';

const NATS_VIDEO_GENERATED = 'cyrano.video.generated';
const NATS_VIDEO_FAILED = 'cyrano.video.failed';

// Video generation configuration
const VIDU_API_KEY = process.env.VIDU_API_KEY ?? '';
const VIDU_API_ENDPOINT = process.env.VIDU_API_ENDPOINT ?? 'https://api.vidu.ai/v1';

// Fallback to Banana.dev if Vidu is not configured
const BANANA_API_KEY = process.env.BANANA_API_KEY ?? '';
const BANANA_VIDEO_MODEL_KEY = process.env.BANANA_VIDEO_MODEL_KEY ?? '';

export interface GenerateVideoRequest {
  twin_id: string;
  creator_id: string;
  user_id: string;
  reference_image_url: string;
  prompt?: string;
  duration_seconds?: number; // 2-10 seconds
  correlation_id: string;
}

export interface GenerateVideoResult {
  video_cache_id: string;
  twin_id: string;
  storage_url: string;
  duration_seconds: number;
  generated_at_utc: string;
  from_cache: boolean;
}

// Response shape from Vidu API (mock for now)
interface ViduVideoResponse {
  video_url?: string;
  video_id?: string;
  duration?: number;
}

const videoHttpClient = new HttpClient({ provider: 'vidu', timeoutMs: 120_000 }); // 2 min timeout for video
const videoCircuitBreaker = getCircuitBreaker('vidu');

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nats: NatsService,
  ) {}

  /**
   * Generate a video from a reference image.
   * Uses Vidu API or falls back to Banana.dev video model.
   */
  async generate(req: GenerateVideoRequest): Promise<GenerateVideoResult> {
    this.logger.log(`Video generation request for twin ${req.twin_id}`, {
      reference_image: req.reference_image_url,
      duration: req.duration_seconds || 5,
    });

    // Check cache - same reference image + twin in last 24 hours
    const imageHash = await this.hashImage(req.reference_image_url);
    const cached = await this.prisma.videoCache.findFirst({
      where: {
        twin_id: req.twin_id,
        reference_image_hash: imageHash,
        generated_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (cached) {
      this.logger.log(`Cache hit for twin ${req.twin_id}, hash ${imageHash}`);
      return {
        video_cache_id: cached.video_cache_id,
        twin_id: cached.twin_id,
        storage_url: cached.storage_url,
        duration_seconds: cached.duration_seconds,
        generated_at_utc: cached.generated_at.toISOString(),
        from_cache: true,
      };
    }

    // Generate video
    const duration = req.duration_seconds ?? 5; // Default 5 seconds
    let storageUrl: string;

    try {
      if (VIDU_API_KEY) {
        storageUrl = await this.callViduApi(req, duration);
      } else if (BANANA_API_KEY && BANANA_VIDEO_MODEL_KEY) {
        storageUrl = await this.callBananaVideoModel(req, duration);
      } else {
        // Mock generation for development
        this.logger.warn('No video API configured - using mock video URL');
        storageUrl = `https://mock-videos.example.com/video-${req.correlation_id}.mp4`;
      }
    } catch (err) {
      await this.nats.publish(NATS_VIDEO_FAILED, {
        twin_id: req.twin_id,
        creator_id: req.creator_id,
        correlation_id: req.correlation_id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // Persist to cache
    const record = await this.prisma.videoCache.create({
      data: {
        twin_id: req.twin_id,
        creator_id: req.creator_id,
        user_id: req.user_id,
        reference_image_url: req.reference_image_url,
        reference_image_hash: imageHash,
        storage_url: storageUrl,
        duration_seconds: duration,
        correlation_id: req.correlation_id,
        reason_code: 'VIDEO_GEN',
      },
    });

    await this.nats.publish(NATS_VIDEO_GENERATED, {
      video_cache_id: record.video_cache_id,
      twin_id: req.twin_id,
      creator_id: req.creator_id,
    });

    return {
      video_cache_id: record.video_cache_id,
      twin_id: req.twin_id,
      storage_url: storageUrl,
      duration_seconds: duration,
      generated_at_utc: record.generated_at.toISOString(),
      from_cache: false,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async callViduApi(req: GenerateVideoRequest, duration: number): Promise<string> {
    this.logger.log('Calling Vidu API for video generation');

    const { data } = await videoCircuitBreaker.execute(() =>
      videoHttpClient.request<ViduVideoResponse>(
        `${VIDU_API_ENDPOINT}/reference-to-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${VIDU_API_KEY}`,
          },
          body: JSON.stringify({
            reference_image: req.reference_image_url,
            prompt: req.prompt || 'Bring this character to life with natural movement',
            duration_seconds: duration,
            quality: 'high',
          }),
        },
        req.correlation_id,
      ),
    );

    if (!data.video_url) {
      throw new Error('Vidu API returned no video URL');
    }

    return data.video_url;
  }

  private async callBananaVideoModel(req: GenerateVideoRequest, duration: number): Promise<string> {
    this.logger.log('Calling Banana.dev video model');

    const bananaHttpClient = new HttpClient({ provider: 'banana', timeoutMs: 120_000 });
    const { data } = await videoCircuitBreaker.execute(() =>
      bananaHttpClient.request<{ modelOutputs?: Array<{ video_url?: string }> }>(
        'https://api.banana.dev/start/v4/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BANANA_API_KEY}`,
          },
          body: JSON.stringify({
            model_key: BANANA_VIDEO_MODEL_KEY,
            pipeline_input: {
              reference_image: req.reference_image_url,
              prompt: req.prompt || 'Natural character movement',
              duration_seconds: duration,
            },
          }),
        },
        req.correlation_id,
      ),
    );

    const output = data.modelOutputs?.[0];
    if (!output?.video_url) {
      throw new Error('Banana.dev returned no video output');
    }

    return output.video_url;
  }

  private async hashImage(imageUrl: string): Promise<string> {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(imageUrl).digest('hex').slice(0, 64);
  }
}
