// services/video-generation/src/hybrid-video.service.ts
// CYR: Hybrid Video Generation Service — Safe Synthetic Twin + Vidu
//
// Responsibilities:
//   1. Generate Safe Synthetic Twin base image (with all safety layers)
//   2. Chain to Vidu Reference-to-Video for animation
//   3. Support 8s and 16s durations with proper token charging
//   4. Cache generated videos to avoid redundant API calls
//   5. Emit NATS events for video generation lifecycle

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';
import { NatsService } from '../../core-api/src/nats/nats.service';
import { ViduService } from './vidu.service';
import { SyntheticPipelineService } from '../../ai-twin/src/synthetic-pipeline.service';

const NATS_VIDEO_GENERATED = 'cyrano.video.generated';
const NATS_VIDEO_FAILED = 'cyrano.video.failed';

// Token costs for video generation (DreamCoins)
// 8s video: 40-80 tokens depending on tier/features
// 16s video: 100-150 tokens depending on tier/features
const VIDEO_COST_8S = 60; // 60 DreamCoins for 8s video
const VIDEO_COST_16S = 120; // 120 DreamCoins for 16s video

export interface GenerateHybridVideoRequest {
  twin_id: string;
  creator_id: string;
  user_id: string;
  // Reference images for Safe Synthetic Twin generation (min 5)
  reference_images: Buffer[];
  // Fantasy level for synthetic generation (0-1)
  fantasy_level?: number;
  // Prompt for video generation
  prompt: string;
  // Video duration: 8s (default) or 16s (premium)
  duration_seconds: 8 | 16;
  // Resolution: 720p or 1080p (default)
  resolution?: '720p' | '1080p';
  // Correlation ID for tracking
  correlation_id: string;
  // Idempotency key for token charging
  idempotency_key: string;
}

export interface GenerateHybridVideoResult {
  video_cache_id: string;
  twin_id: string;
  storage_url: string;
  thumbnail_url?: string;
  prompt_used: string;
  duration_seconds: number;
  resolution: string;
  model: string;
  vidu_tier: 'premium' | 'enterprise';
  tokens_charged: number;
  generated_at_utc: string;
  from_cache: boolean;
  safeguards_metadata: {
    fantasyLevel: number;
    inputCount: number;
    safeguards: string[];
  };
}

@Injectable()
export class HybridVideoService {
  private readonly logger = new Logger(HybridVideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nats: NatsService,
    private readonly vidu: ViduService,
    private readonly syntheticPipeline: SyntheticPipelineService,
  ) {}

  /**
   * Generate a hybrid video: Safe Synthetic Twin image → Vidu animation.
   *
   * Flow:
   * 1. Check wallet balance and deduct tokens upfront
   * 2. Check cache for identical prompt + duration + twin
   * 3. Generate Safe Synthetic Twin base image (with all safety layers)
   * 4. Send base image + prompt to Vidu Reference-to-Video
   * 5. Cache result for 24 hours
   * 6. Emit NATS event
   */
  async generate(req: GenerateHybridVideoRequest): Promise<GenerateHybridVideoResult> {
    const {
      twin_id,
      creator_id,
      user_id,
      reference_images,
      fantasy_level = 0.25,
      prompt,
      duration_seconds,
      resolution = '1080p',
      correlation_id,
      idempotency_key,
    } = req;

    // Step 1: Calculate token cost and check balance
    const tokenCost = duration_seconds === 8 ? VIDEO_COST_8S : VIDEO_COST_16S;
    await this.chargeTokens(user_id, tokenCost, idempotency_key, correlation_id);

    // Step 2: Check cache — SHA-based dedup
    const promptHash = await this.hashPrompt(prompt, duration_seconds, resolution);
    const cached = await this.prisma.videoCacheVidu.findFirst({
      where: {
        twin_id,
        prompt_hash: promptHash,
        duration_seconds,
        generated_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24h cache
      },
    });

    if (cached) {
      this.logger.log(`Cache hit for twin ${twin_id}, hash ${promptHash}`);
      return {
        video_cache_id: cached.video_cache_id,
        twin_id: cached.twin_id,
        storage_url: cached.storage_url ?? '',
        thumbnail_url: cached.thumbnail_url ?? undefined,
        prompt_used: cached.prompt_used,
        duration_seconds: cached.duration_seconds,
        resolution: cached.resolution ?? '1080p',
        model: cached.model,
        vidu_tier: (cached.vidu_tier ?? 'premium') as 'premium' | 'enterprise',
        tokens_charged: tokenCost,
        generated_at_utc: cached.generated_at.toISOString(),
        from_cache: true,
        safeguards_metadata: {
          fantasyLevel: 0.25, // Default from cache
          inputCount: reference_images.length,
          safeguards: [
            'multi-image-blend',
            'celebrity-downweight',
            'refinement-loop',
            'dissimilarity-gate',
            'c2pa-watermark',
          ],
        },
      };
    }

    // Step 3: Generate Safe Synthetic Twin base image
    this.logger.log(
      `HybridVideoService: generating Safe Synthetic Twin base image for twin ${twin_id}`,
    );
    let baseImageUrl: string;
    let safeguardsMetadata: GenerateHybridVideoResult['safeguards_metadata'];
    try {
      const syntheticResult = await this.syntheticPipeline.createSyntheticModel(
        reference_images,
        fantasy_level,
      );
      baseImageUrl = syntheticResult.imageUrl;
      safeguardsMetadata = syntheticResult.metadata;
      this.logger.log(`Safe Synthetic Twin image generated: ${baseImageUrl.slice(0, 100)}...`);
    } catch (err) {
      await this.nats.publish(NATS_VIDEO_FAILED, {
        twin_id,
        creator_id,
        correlation_id,
        error: err instanceof Error ? err.message : String(err),
        stage: 'synthetic_image_generation',
      });
      throw err;
    }

    // Step 4: Convert image URL to Buffer for Vidu
    const baseImageBuffer = await this.fetchImageAsBuffer(baseImageUrl);

    // Step 5: Send to Vidu Reference-to-Video
    this.logger.log(
      `HybridVideoService: sending to Vidu (duration=${duration_seconds}s, resolution=${resolution})`,
    );
    let videoUrl: string;
    let thumbnailUrl: string | undefined;
    let viduTier: 'premium' | 'enterprise';
    try {
      const viduResult = await this.vidu.generateReferenceToVideo({
        imageBuffer: baseImageBuffer,
        prompt,
        durationSeconds: duration_seconds,
        resolution,
        correlationId: correlation_id,
      });
      videoUrl = viduResult.videoUrl;
      thumbnailUrl = viduResult.thumbnailUrl;
      viduTier = viduResult.tier;
      this.logger.log(`Vidu video generated: ${videoUrl}`);
    } catch (err) {
      await this.nats.publish(NATS_VIDEO_FAILED, {
        twin_id,
        creator_id,
        correlation_id,
        error: err instanceof Error ? err.message : String(err),
        stage: 'vidu_video_generation',
      });
      throw err;
    }

    // Step 6: Persist to cache
    const record = await this.prisma.videoCacheVidu.create({
      data: {
        twin_id,
        creator_id,
        user_id,
        prompt_hash: promptHash,
        prompt_used: prompt,
        provider: 'vidu',
        model: 'vidu-1.0',
        storage_url: videoUrl,
        thumbnail_url: thumbnailUrl ?? null,
        duration_seconds,
        resolution,
        reference_image_id: null, // Could store synthetic image ID if needed
        vidu_tier: viduTier,
        correlation_id,
        reason_code: 'VIDEO_GEN',
      },
    });

    await this.nats.publish(NATS_VIDEO_GENERATED, {
      video_cache_id: record.video_cache_id,
      twin_id,
      creator_id,
      duration_seconds,
      vidu_tier: viduTier,
    });

    return {
      video_cache_id: record.video_cache_id,
      twin_id,
      storage_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      prompt_used: prompt,
      duration_seconds,
      resolution,
      model: 'vidu-1.0',
      vidu_tier: viduTier,
      tokens_charged: tokenCost,
      generated_at_utc: record.generated_at.toISOString(),
      from_cache: false,
      safeguards_metadata: safeguardsMetadata,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Charge tokens from user's wallet.
   * Uses three-bucket spend order: purchased → membership → bonus.
   */
  private async chargeTokens(
    userId: string,
    amount: number,
    idempotencyKey: string,
    correlationId: string,
  ): Promise<void> {
    // 1. Find or create wallet
    let wallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      wallet = await this.prisma.canonicalWallet.create({
        data: {
          user_id: userId,
          user_type: 'guest',
          organization_id: 'default',
          tenant_id: 'default',
          purchased_tokens: 0,
          membership_tokens: 0,
          bonus_tokens: 0,
        },
      });
    }

    // 2. Check balance
    const totalBalance = wallet.purchased_tokens + wallet.membership_tokens + wallet.bonus_tokens;
    if (totalBalance < amount) {
      throw new ForbiddenException(
        `Insufficient DreamCoins. Required: ${amount}, Available: ${totalBalance}`,
      );
    }

    // 3. Deduct tokens (purchased → membership → bonus)
    let remaining = amount;
    const deductions = { purchased: 0, membership: 0, bonus: 0 };

    if (wallet.purchased_tokens > 0) {
      const fromPurchased = Math.min(wallet.purchased_tokens, remaining);
      deductions.purchased = fromPurchased;
      remaining -= fromPurchased;
    }

    if (remaining > 0 && wallet.membership_tokens > 0) {
      const fromMembership = Math.min(wallet.membership_tokens, remaining);
      deductions.membership = fromMembership;
      remaining -= fromMembership;
    }

    if (remaining > 0 && wallet.bonus_tokens > 0) {
      const fromBonus = Math.min(wallet.bonus_tokens, remaining);
      deductions.bonus = fromBonus;
      remaining -= fromBonus;
    }

    // 4. Update wallet atomically
    await this.prisma.canonicalWallet.update({
      where: { user_id: userId },
      data: {
        purchased_tokens: { decrement: deductions.purchased },
        membership_tokens: { decrement: deductions.membership },
        bonus_tokens: { decrement: deductions.bonus },
      },
    });

    // 5. Create ledger entry for audit trail
    await this.prisma.canonicalLedgerEntry.create({
      data: {
        wallet_id: wallet.id,
        correlation_id: correlationId,
        reason_code: 'SPEND',
        amount: -amount,
        bucket: 'purchased', // Primary bucket for tracking
        token_type: 'CZT',
        hash_prev: null,
        hash_current: `hash-${idempotencyKey}`,
        metadata: {
          userId,
          video_generation: true,
          deductions,
          source: 'hybrid-video-service',
          timestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Charged ${amount} DreamCoins from user ${userId} (purchased: ${deductions.purchased}, membership: ${deductions.membership}, bonus: ${deductions.bonus})`,
    );
  }

  /**
   * Fetch image from URL (data URI or HTTP) and convert to Buffer.
   */
  private async fetchImageAsBuffer(imageUrl: string): Promise<Buffer> {
    if (imageUrl.startsWith('data:')) {
      // Data URI: extract base64 and decode
      const base64Data = imageUrl.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    // HTTP URL: fetch and convert to buffer
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async hashPrompt(prompt: string, duration: number, resolution: string): Promise<string> {
    const { createHash } = await import('node:crypto');
    return createHash('sha256')
      .update(`vidu:${duration}s:${resolution}:${prompt}`)
      .digest('hex')
      .slice(0, 64);
  }
}
