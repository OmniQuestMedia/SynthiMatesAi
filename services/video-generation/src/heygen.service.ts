// services/video-generation/src/heygen.service.ts
// CYR: HeyGen Service — Talking Video Generation via HeyGen API
//
// Responsibilities:
//   1. Call HeyGen API to generate talking-head videos from images + prompts
//   2. Support both Business Grade and Enterprise API keys
//   3. Implement retry logic and error handling
//   4. Cache video results to avoid redundant API calls
//   5. Emit NATS events for video lifecycle

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';
import { NatsService } from '../../core-api/src/nats/nats.service';
import { HttpClient } from '../../core-api/src/common/http-client';
import { getCircuitBreaker } from '../../core-api/src/common/circuit-breaker';
import {
  GenerateTalkingVideoRequest,
  GenerateTalkingVideoResult,
  HeyGenApiResponse,
  HeyGenTier,
} from './heygen.types';

const NATS_VIDEO_GENERATED = 'cyrano.video.generated';
const NATS_VIDEO_FAILED = 'cyrano.video.failed';

// Environment configuration
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY ?? '';
const HEYGEN_ENTERPRISE_API_KEY = process.env.HEYGEN_ENTERPRISE_API_KEY ?? '';
const HEYGEN_API_BASE_URL = process.env.HEYGEN_API_BASE_URL ?? 'https://api.heygen.com/v1';
const VIDEO_TIER = (process.env.VIDEO_TIER as HeyGenTier) ?? 'business';

// Circuit breaker and HTTP client for HeyGen
const heygenHttpClient = new HttpClient({ provider: 'heygen', timeoutMs: 90_000 });
const heygenCircuitBreaker = getCircuitBreaker('heygen');

@Injectable()
export class HeyGenService {
  private readonly logger = new Logger(HeyGenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nats: NatsService,
  ) {}

  /**
   * Generate talking video from image and prompt.
   * Checks cache first to avoid redundant API calls.
   */
  async generateTalkingVideo(
    request: GenerateTalkingVideoRequest,
  ): Promise<GenerateTalkingVideoResult> {
    const tier = request.tier ?? VIDEO_TIER;

    // Check cache first — hash based on image + prompt + duration
    const cacheKey = await this.buildCacheKey(
      request.imageUrl ?? request.imageBuffer.toString('base64').slice(0, 64),
      request.prompt,
      request.durationSeconds,
    );

    const cached = await this.prisma.videoCacheVidu.findFirst({
      where: {
        twin_id: request.twinId,
        provider: 'heygen',
        prompt_hash: cacheKey,
        generated_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24h TTL
      },
    });

    if (cached) {
      this.logger.log(`Cache hit for twin ${request.twinId}, cache_key ${cacheKey}`);
      return {
        videoUrl: cached.video_url ?? '',
        videoCacheId: cached.video_cache_id,
        durationSeconds: request.durationSeconds,
        tokensCharged: 0, // No charge for cached result
        generatedAt: cached.generated_at.toISOString(),
        heygenVideoId: cached.heygen_video_id ?? undefined,
        fromCache: true,
      };
    }

    // Call HeyGen API
    let videoUrl: string;
    let heygenVideoId: string | undefined;

    try {
      const result = await this.callHeyGenApi(request, tier);
      videoUrl = result.videoUrl;
      heygenVideoId = result.heygenVideoId;
    } catch (err) {
      await this.nats.publish(NATS_VIDEO_FAILED, {
        twin_id: request.twinId,
        creator_id: request.creatorId,
        user_id: request.userId,
        correlation_id: request.correlationId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // Store in cache
    const record = await this.prisma.videoCacheVidu.create({
      data: {
        twin_id: request.twinId,
        creator_id: request.creatorId,
        user_id: request.userId,
        prompt_hash: cacheKey,
        prompt_used: request.prompt,
        model: 'heygen',
        provider: 'heygen',
        duration_seconds: request.durationSeconds,
        video_url: videoUrl,
        heygen_video_id: heygenVideoId,
        tier,
        correlation_id: request.correlationId,
        reason_code: 'VIDEO_GEN_HEYGEN',
      },
    });

    await this.nats.publish(NATS_VIDEO_GENERATED, {
      video_cache_id: record.video_cache_id,
      twin_id: request.twinId,
      creator_id: request.creatorId,
      user_id: request.userId,
      duration_seconds: request.durationSeconds,
    });

    return {
      videoUrl,
      videoCacheId: record.video_cache_id,
      durationSeconds: request.durationSeconds,
      tokensCharged: 0, // Tokens charged by caller (hybrid service)
      generatedAt: record.generated_at.toISOString(),
      heygenVideoId,
      fromCache: false,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async callHeyGenApi(
    request: GenerateTalkingVideoRequest,
    tier: HeyGenTier,
  ): Promise<{ videoUrl: string; heygenVideoId?: string }> {
    const apiKey = tier === 'enterprise' ? HEYGEN_ENTERPRISE_API_KEY : HEYGEN_API_KEY;

    if (!apiKey) {
      throw new Error(
        `HeyGen API key not configured for tier: ${tier}. Set HEYGEN_API_KEY or HEYGEN_ENTERPRISE_API_KEY.`,
      );
    }

    // Prepare payload for HeyGen API
    // Note: Actual HeyGen API structure may differ - this is a placeholder
    const payload = {
      image: request.imageUrl ?? `data:image/png;base64,${request.imageBuffer.toString('base64')}`,
      text: request.prompt,
      duration: request.durationSeconds,
      avatar_style: 'talking_photo',
    };

    const { data } = await heygenCircuitBreaker.execute(() =>
      heygenHttpClient.request<HeyGenApiResponse>(
        `${HEYGEN_API_BASE_URL}/video/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify(payload),
        },
        request.correlationId,
      ),
    );

    if (data.error) {
      throw new Error(`HeyGen API error: ${data.error} - ${data.message ?? 'Unknown error'}`);
    }

    if (!data.video_url) {
      // If video generation is async, we might need to poll for status
      if (data.video_id && data.status === 'processing') {
        this.logger.log(`HeyGen video ${data.video_id} is processing, polling for completion...`);
        const finalUrl = await this.pollForCompletion(data.video_id, apiKey, request.correlationId);
        return { videoUrl: finalUrl, heygenVideoId: data.video_id };
      }

      throw new Error('HeyGen API returned no video URL');
    }

    return { videoUrl: data.video_url, heygenVideoId: data.video_id };
  }

  /**
   * Poll HeyGen API for video completion (if generation is async)
   */
  private async pollForCompletion(
    videoId: string,
    apiKey: string,
    correlationId: string,
    maxAttempts = 30,
  ): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3s between polls

      const { data } = await heygenCircuitBreaker.execute(() =>
        heygenHttpClient.request<HeyGenApiResponse>(
          `${HEYGEN_API_BASE_URL}/video/status/${videoId}`,
          {
            method: 'GET',
            headers: {
              'X-Api-Key': apiKey,
            },
          },
          correlationId,
        ),
      );

      if (data.status === 'completed' && data.video_url) {
        return data.video_url;
      }

      if (data.status === 'failed') {
        throw new Error(`HeyGen video generation failed: ${data.error ?? 'Unknown error'}`);
      }

      this.logger.log(`Polling attempt ${attempt + 1}/${maxAttempts} for video ${videoId}...`);
    }

    throw new Error(`HeyGen video generation timed out after ${maxAttempts} attempts`);
  }

  private async buildCacheKey(
    imageIdentifier: string,
    prompt: string,
    duration: number,
  ): Promise<string> {
    const { createHash } = await import('node:crypto');
    return createHash('sha256')
      .update(`${imageIdentifier}:${prompt}:${duration}`)
      .digest('hex')
      .slice(0, 64);
  }
}
