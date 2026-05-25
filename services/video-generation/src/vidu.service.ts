// services/video-generation/src/vidu.service.ts
// CYR: Vidu Reference-to-Video Service — Enterprise-Ready
//
// Responsibilities:
//   1. Support for multiple API tiers (Premium vs Enterprise)
//   2. Configurable rate limits and quotas per tier
//   3. Generate video from reference image + prompt
//   4. Enterprise-grade retry logic and circuit breaking
//   5. Support for 8s and 16s video durations

import { Injectable, Logger } from '@nestjs/common';
import { HttpClient } from '../../core-api/src/common/http-client';
import { getCircuitBreaker } from '../../core-api/src/common/circuit-breaker';

// Vidu API Configuration
const VIDU_API_KEY = process.env.VIDU_API_KEY ?? '';
const VIDU_ENTERPRISE_API_KEY = process.env.VIDU_ENTERPRISE_API_KEY ?? '';
const VIDU_TIER = (process.env.VIDU_TIER ?? 'premium') as 'premium' | 'enterprise';
const VIDU_API_BASE_URL = process.env.VIDU_API_BASE_URL ?? 'https://api.vidu.ai';

// Tier configurations for Enterprise scalability
interface TierConfig {
  apiKey: string;
  maxRetries: number;
  timeoutMs: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

const TIER_CONFIGS: Record<'premium' | 'enterprise', TierConfig> = {
  premium: {
    apiKey: VIDU_API_KEY,
    maxRetries: 3,
    timeoutMs: 120_000, // 2 minutes for video generation
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
    },
  },
  enterprise: {
    apiKey: VIDU_ENTERPRISE_API_KEY,
    maxRetries: 5,
    timeoutMs: 180_000, // 3 minutes for enterprise
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerHour: 1000,
    },
  },
};

// Vidu API Request/Response types
interface ViduGenerateRequest {
  reference_image: string; // Base64 or URL
  prompt: string;
  duration_seconds: 8 | 16;
  resolution?: '720p' | '1080p';
  model?: 'vidu-1.0' | 'vidu-1.5';
}

interface ViduGenerateResponse {
  video_id: string;
  status: 'processing' | 'completed' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds: number;
  resolution: string;
  error_message?: string;
}

export interface GenerateVideoFromReferenceRequest {
  imageBuffer: Buffer;
  prompt: string;
  durationSeconds: 8 | 16;
  resolution?: '720p' | '1080p';
  correlationId: string;
}

export interface GenerateVideoFromReferenceResult {
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  resolution: string;
  tier: 'premium' | 'enterprise';
}

// Shared HttpClient + CircuitBreaker for Vidu calls (singleton per service)
let viduHttpClient: HttpClient;
let viduCircuitBreaker: ReturnType<typeof getCircuitBreaker>;

@Injectable()
export class ViduService {
  private readonly logger = new Logger(ViduService.name);
  private readonly tierConfig: TierConfig;
  private readonly tier: 'premium' | 'enterprise';

  constructor() {
    this.tier = VIDU_TIER;
    this.tierConfig = TIER_CONFIGS[this.tier];

    // Initialize singleton HTTP client and circuit breaker if not already done
    if (!viduHttpClient) {
      viduHttpClient = new HttpClient({
        provider: 'vidu',
        timeoutMs: this.tierConfig.timeoutMs,
        maxRetries: this.tierConfig.maxRetries,
      });
      viduCircuitBreaker = getCircuitBreaker('vidu');
    }

    this.logger.log(
      `ViduService initialized with tier=${this.tier}, ` +
        `rateLimit=${this.tierConfig.rateLimit.requestsPerMinute}/min, ` +
        `timeout=${this.tierConfig.timeoutMs}ms`,
    );
  }

  /**
   * Generate a video from a reference image and prompt.
   * This is the main entry point for Vidu Reference-to-Video generation.
   *
   * Flow:
   * 1. Convert image buffer to base64
   * 2. Call Vidu API with reference image + prompt
   * 3. Poll for completion (Vidu is async)
   * 4. Return video URL when ready
   */
  async generateReferenceToVideo(
    request: GenerateVideoFromReferenceRequest,
  ): Promise<GenerateVideoFromReferenceResult> {
    const { imageBuffer, prompt, durationSeconds, resolution = '1080p', correlationId } = request;

    if (!this.tierConfig.apiKey) {
      throw new Error(
        `VIDU_${this.tier.toUpperCase()}_API_KEY not configured — video generation unavailable`,
      );
    }

    this.logger.log(
      `ViduService.generateReferenceToVideo: tier=${this.tier}, ` +
        `duration=${durationSeconds}s, resolution=${resolution}, ` +
        `correlationId=${correlationId}`,
    );

    // Step 1: Convert image to base64
    const imageBase64 = imageBuffer.toString('base64');
    const imageDataUri = `data:image/png;base64,${imageBase64}`;

    // Step 2: Submit generation request
    const generateRequest: ViduGenerateRequest = {
      reference_image: imageDataUri,
      prompt,
      duration_seconds: durationSeconds,
      resolution,
      model: 'vidu-1.0',
    };

    let videoId: string;
    try {
      const { data: generateData } = await viduCircuitBreaker.execute(() =>
        viduHttpClient.request<ViduGenerateResponse>(
          `${VIDU_API_BASE_URL}/v1/generate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.tierConfig.apiKey}`,
            },
            body: JSON.stringify(generateRequest),
          },
          correlationId,
        ),
      );

      videoId = generateData.video_id;
      this.logger.log(`Vidu generation started: videoId=${videoId}`);

      // If immediate completion (rare), return early
      if (generateData.status === 'completed' && generateData.video_url) {
        return {
          videoId: generateData.video_id,
          videoUrl: generateData.video_url,
          thumbnailUrl: generateData.thumbnail_url,
          durationSeconds: generateData.duration_seconds,
          resolution: generateData.resolution,
          tier: this.tier,
        };
      }
    } catch (err) {
      this.logger.error(
        `Vidu generation request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }

    // Step 3: Poll for completion
    const result = await this.pollForCompletion(videoId, correlationId);
    return {
      ...result,
      tier: this.tier,
    };
  }

  /**
   * Poll Vidu API for video completion.
   * Vidu is async, so we need to check status until video is ready.
   */
  private async pollForCompletion(
    videoId: string,
    correlationId: string,
  ): Promise<Omit<GenerateVideoFromReferenceResult, 'tier'>> {
    const maxAttempts = 60; // 60 attempts * 5 seconds = 5 minutes max
    const pollIntervalMs = 5_000; // 5 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.sleep(pollIntervalMs);

      try {
        const { data: status } = await viduCircuitBreaker.execute(() =>
          viduHttpClient.request<ViduGenerateResponse>(
            `${VIDU_API_BASE_URL}/v1/status/${videoId}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${this.tierConfig.apiKey}`,
              },
            },
            `${correlationId}-poll-${attempt}`,
          ),
        );

        if (status.status === 'completed' && status.video_url) {
          this.logger.log(`Vidu generation completed: videoId=${videoId}, attempt=${attempt}`);
          return {
            videoId: status.video_id,
            videoUrl: status.video_url,
            thumbnailUrl: status.thumbnail_url,
            durationSeconds: status.duration_seconds,
            resolution: status.resolution,
          };
        }

        if (status.status === 'failed') {
          throw new Error(`Vidu generation failed: ${status.error_message ?? 'Unknown error'}`);
        }

        // Still processing, continue polling
        this.logger.debug(
          `Vidu generation in progress: videoId=${videoId}, attempt=${attempt}/${maxAttempts}`,
        );
      } catch (err) {
        this.logger.error(
          `Vidu status poll failed (attempt ${attempt}/${maxAttempts}): ${err instanceof Error ? err.message : String(err)}`,
        );
        if (attempt === maxAttempts) {
          throw err;
        }
        // Continue polling on transient errors
      }
    }

    throw new Error(
      `Vidu generation timed out after ${maxAttempts} attempts (${(maxAttempts * pollIntervalMs) / 1000}s)`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current tier configuration for monitoring/analytics.
   */
  getTierInfo(): {
    tier: 'premium' | 'enterprise';
    rateLimit: TierConfig['rateLimit'];
    timeoutMs: number;
  } {
    return {
      tier: this.tier,
      rateLimit: this.tierConfig.rateLimit,
      timeoutMs: this.tierConfig.timeoutMs,
    };
  }
}
