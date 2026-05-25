// services/video-generation/src/video.service.ts
// CYR: Hybrid Video Service — Safe Synthetic Twin → HeyGen Pipeline
//
// Responsibilities:
//   1. Chain Safe Synthetic Twin generation → HeyGen talking video
//   2. Automatically capture training data via VideoCapture model
//   3. Manage DreamCoins wallet deduction (three-bucket system)
//   4. Emit NATS events for video lifecycle
//   5. Enforce all existing safety layers from Safe Synthetic Twin

import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';
import { NatsService } from '../../core-api/src/nats/nats.service';
import { SyntheticPipelineService } from '../../ai-twin/src/synthetic-pipeline.service';
import { HeyGenService } from './heygen.service';
import { VideoDuration, VIDEO_COSTS } from './heygen.types';
import type { ReasonCode } from '../../ledger/types';

const NATS_VIDEO_PIPELINE_COMPLETE = 'cyrano.video.pipeline.complete';
const NATS_VIDEO_PIPELINE_FAILED = 'cyrano.video.pipeline.failed';

export interface GenerateVideoRequest {
  userId: string;
  twinId: string;
  creatorId: string;
  images: Buffer[]; // 5+ images for Safe Synthetic Twin
  fantasyLevel?: number; // 0.0-1.0, defaults to 0.25
  prompt: string; // Text for talking video
  durationSeconds: VideoDuration; // 8 or 16
  idempotencyKey: string;
}

export interface GenerateVideoResponse {
  success: boolean;
  videoUrl: string;
  videoCacheId: string;
  syntheticImageUrl: string;
  durationSeconds: VideoDuration;
  tokensCharged: number;
  captureId: string; // VideoCapture ID for training data
  newBalance: {
    purchased: number;
    membership: number;
    bonus: number;
    total: number;
  };
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nats: NatsService,
    private readonly syntheticPipeline: SyntheticPipelineService,
    private readonly heygen: HeyGenService,
  ) {}

  /**
   * Full hybrid pipeline:
   * 1. Generate Safe Synthetic Twin image (enforces all safety layers)
   * 2. Use that image + prompt to generate HeyGen talking video
   * 3. Deduct DreamCoins from wallet
   * 4. Automatically capture data for training
   */
  async generateVideo(request: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    const {
      userId,
      twinId,
      creatorId,
      images,
      fantasyLevel,
      prompt,
      durationSeconds,
      idempotencyKey,
    } = request;

    // Validate inputs
    if (images.length < 5) {
      throw new BadRequestException('Safe Synthetic Twin requires at least 5 images');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('Prompt cannot be empty');
    }

    const tokenCost = VIDEO_COSTS[durationSeconds];
    const correlationId = `video-gen-${Date.now()}-${userId.slice(0, 8)}`;

    // 1. Check wallet balance FIRST
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

    const totalBalance = wallet.purchased_tokens + wallet.membership_tokens + wallet.bonus_tokens;

    if (totalBalance < tokenCost) {
      throw new ForbiddenException(
        `Insufficient DreamCoins. Required: ${tokenCost}, Available: ${totalBalance}`,
      );
    }

    // 2. Generate Safe Synthetic Twin image (all safety layers intact)
    let syntheticImageUrl: string;
    try {
      const syntheticResult = await this.syntheticPipeline.createSyntheticModel(
        images,
        fantasyLevel ?? 0.25,
      );
      syntheticImageUrl = syntheticResult.imageUrl;
    } catch (err) {
      this.logger.error(`Safe Synthetic Twin generation failed: ${err}`);
      await this.nats.publish(NATS_VIDEO_PIPELINE_FAILED, {
        twin_id: twinId,
        user_id: userId,
        correlation_id: correlationId,
        stage: 'synthetic_twin',
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // 3. Generate HeyGen talking video from synthetic image
    let videoUrl: string;
    let videoCacheId: string;
    try {
      // Fetch the synthetic image to get buffer (or pass URL directly if HeyGen supports it)
      const videoResult = await this.heygen.generateTalkingVideo({
        imageUrl: syntheticImageUrl, // Pass URL directly
        imageBuffer: Buffer.from(''), // Empty buffer since we're using URL
        prompt,
        durationSeconds,
        twinId,
        userId,
        creatorId,
        correlationId,
      });

      videoUrl = videoResult.videoUrl;
      videoCacheId = videoResult.videoCacheId;
    } catch (err) {
      this.logger.error(`HeyGen video generation failed: ${err}`);
      await this.nats.publish(NATS_VIDEO_PIPELINE_FAILED, {
        twin_id: twinId,
        user_id: userId,
        correlation_id: correlationId,
        stage: 'heygen',
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // 4. Deduct tokens from wallet (three-bucket priority: purchased → membership → bonus)
    const deductions = await this.deductTokens(wallet, tokenCost, correlationId, idempotencyKey);

    // 5. Capture data for training
    const captureRecord = await this.prisma.videoCapture.create({
      data: {
        video_cache_id: videoCacheId,
        twin_id: twinId,
        creator_id: creatorId,
        user_id: userId,
        input_image_url: syntheticImageUrl,
        prompt,
        video_url: videoUrl,
        duration_seconds: durationSeconds,
        tokens_spent: tokenCost,
        provider: 'heygen',
        tier: process.env.VIDEO_TIER ?? 'business',
        captured_for_training: true,
        correlation_id: `${correlationId}-capture`,
        reason_code: 'VIDEO_CAPTURE_LEARNING',
      },
    });

    // 6. Emit completion event
    await this.nats.publish(NATS_VIDEO_PIPELINE_COMPLETE, {
      video_cache_id: videoCacheId,
      capture_id: captureRecord.capture_id,
      twin_id: twinId,
      user_id: userId,
      duration_seconds: durationSeconds,
      tokens_charged: tokenCost,
    });

    return {
      success: true,
      videoUrl,
      videoCacheId,
      syntheticImageUrl,
      durationSeconds,
      tokensCharged: tokenCost,
      captureId: captureRecord.capture_id,
      newBalance: {
        purchased: deductions.newWallet.purchased_tokens,
        membership: deductions.newWallet.membership_tokens,
        bonus: deductions.newWallet.bonus_tokens,
        total:
          deductions.newWallet.purchased_tokens +
          deductions.newWallet.membership_tokens +
          deductions.newWallet.bonus_tokens,
      },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async deductTokens(
    wallet: {
      id: string;
      purchased_tokens: number;
      membership_tokens: number;
      bonus_tokens: number;
    },
    amount: number,
    correlationId: string,
    _idempotencyKey: string,
  ) {
    let remainingToDeduct = amount;
    const deductionDetails = {
      purchased: 0,
      membership: 0,
      bonus: 0,
    };

    // Deduct from purchased tokens first
    if (wallet.purchased_tokens > 0) {
      const fromPurchased = Math.min(wallet.purchased_tokens, remainingToDeduct);
      deductionDetails.purchased = fromPurchased;
      remainingToDeduct -= fromPurchased;
    }

    // Then from membership tokens
    if (remainingToDeduct > 0 && wallet.membership_tokens > 0) {
      const fromMembership = Math.min(wallet.membership_tokens, remainingToDeduct);
      deductionDetails.membership = fromMembership;
      remainingToDeduct -= fromMembership;
    }

    // Finally from bonus tokens
    if (remainingToDeduct > 0 && wallet.bonus_tokens > 0) {
      const fromBonus = Math.min(wallet.bonus_tokens, remainingToDeduct);
      deductionDetails.bonus = fromBonus;
      remainingToDeduct -= fromBonus;
    }

    // Update wallet atomically
    const updatedWallet = await this.prisma.canonicalWallet.update({
      where: { id: wallet.id },
      data: {
        purchased_tokens: { decrement: deductionDetails.purchased },
        membership_tokens: { decrement: deductionDetails.membership },
        bonus_tokens: { decrement: deductionDetails.bonus },
      },
    });

    // Create ledger entries for each bucket deduction (execute sequentially to avoid conflicts)
    if (deductionDetails.purchased > 0) {
      await this.prisma.canonicalLedgerEntry.create({
        data: {
          wallet_id: wallet.id,
          correlation_id: `${correlationId}-purch`,
          reason_code: 'SPEND' as ReasonCode,
          amount: -deductionDetails.purchased,
          bucket: 'purchased',
          token_type: 'CZT',
          hash_prev: null,
          hash_current: `hash-${correlationId}-purch`,
          metadata: { duration_seconds: amount },
        },
      });
    }

    if (deductionDetails.membership > 0) {
      await this.prisma.canonicalLedgerEntry.create({
        data: {
          wallet_id: wallet.id,
          correlation_id: `${correlationId}-member`,
          reason_code: 'SPEND' as ReasonCode,
          amount: -deductionDetails.membership,
          bucket: 'membership',
          token_type: 'CZT',
          hash_prev: null,
          hash_current: `hash-${correlationId}-member`,
          metadata: { duration_seconds: amount },
        },
      });
    }

    if (deductionDetails.bonus > 0) {
      await this.prisma.canonicalLedgerEntry.create({
        data: {
          wallet_id: wallet.id,
          correlation_id: `${correlationId}-bonus`,
          reason_code: 'SPEND' as ReasonCode,
          amount: -deductionDetails.bonus,
          bucket: 'bonus',
          token_type: 'CZT',
          hash_prev: null,
          hash_current: `hash-${correlationId}-bonus`,
          metadata: { duration_seconds: amount },
        },
      });
    }

    return {
      deductionDetails,
      newWallet: updatedWallet,
    };
  }
}
