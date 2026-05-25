// services/core-api/src/cyrano/video-generation.controller.ts
// PHASE 6 ITEM 2: Video Generation Controller — Reference-to-Video with wallet deduction
// POST /cyrano/video/generate — Generate video from reference image with DreamCoins payment

import {
  Controller,
  Post,
  Body,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VideoService } from '../../../video-generation/src/video.service';

class GenerateVideoDto {
  userId: string;
  twinId: string;
  creatorId: string;
  referenceImageUrl: string; // URL from Safe Synthetic Twin generation
  prompt?: string;
  durationSeconds?: number; // 2-10 seconds
}

// PHASE 6 ITEM 2: Video generation pricing (50-80 DreamCoins range)
const VIDEO_GENERATION_BASE_COST = 60; // 60 DreamCoins base cost
const COST_PER_SECOND = 5; // +5 DreamCoins per second beyond 5 seconds

// PHASE 6 ITEM 2: Creator revenue share from video generations
const CREATOR_REVENUE_SHARE_PERCENT = 40; // 40% of tokens go to creator

@Controller('cyrano/video')
export class VideoGenerationController {
  private readonly logger = new Logger(VideoGenerationController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
  ) {}

  @Post('generate')
  async generateVideo(@Body() body: GenerateVideoDto) {
    this.logger.log('Video generation request', {
      userId: body.userId,
      twinId: body.twinId,
      creatorId: body.creatorId,
    });

    // Validate required fields
    if (!body.userId || !body.twinId || !body.creatorId || !body.referenceImageUrl) {
      throw new BadRequestException(
        'userId, twinId, creatorId, and referenceImageUrl are required',
      );
    }

    // Calculate cost based on duration (5 seconds base, +5 tokens per additional second)
    const duration = Math.min(10, Math.max(2, body.durationSeconds || 5));
    const additionalSeconds = Math.max(0, duration - 5);
    const totalCost = VIDEO_GENERATION_BASE_COST + additionalSeconds * COST_PER_SECOND;

    this.logger.log(`Video generation cost: ${totalCost} DreamCoins for ${duration}s`, {
      base_cost: VIDEO_GENERATION_BASE_COST,
      additional_seconds: additionalSeconds,
      total_cost: totalCost,
    });

    // Check user wallet balance and deduct cost
    const wallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: body.userId },
    });

    if (!wallet) {
      throw new ForbiddenException(
        'No wallet found. Please purchase DreamCoins to generate videos.',
      );
    }

    // Calculate total available tokens across all buckets
    const totalTokens = wallet.purchased_tokens + wallet.membership_tokens + wallet.bonus_tokens;

    if (totalTokens < totalCost) {
      throw new ForbiddenException(
        `Insufficient DreamCoins. Required: ${totalCost}, Available: ${totalTokens}. Please purchase more DreamCoins.`,
      );
    }

    // Deduct from buckets in priority order: purchased > membership > bonus
    let remaining = totalCost;
    const deductions: Array<{ bucket: string; amount: number }> = [];

    if (wallet.purchased_tokens >= remaining) {
      deductions.push({ bucket: 'purchased', amount: remaining });
      remaining = 0;
    } else if (wallet.purchased_tokens > 0) {
      deductions.push({ bucket: 'purchased', amount: wallet.purchased_tokens });
      remaining -= wallet.purchased_tokens;
    }

    if (remaining > 0 && wallet.membership_tokens >= remaining) {
      deductions.push({ bucket: 'membership', amount: remaining });
      remaining = 0;
    } else if (remaining > 0 && wallet.membership_tokens > 0) {
      deductions.push({ bucket: 'membership', amount: wallet.membership_tokens });
      remaining -= wallet.membership_tokens;
    }

    if (remaining > 0) {
      deductions.push({ bucket: 'bonus', amount: remaining });
    }

    // Apply deductions to wallet
    const updateData: Record<string, number> = {};
    for (const deduction of deductions) {
      if (deduction.bucket === 'purchased') {
        updateData.purchased_tokens = wallet.purchased_tokens - deduction.amount;
      } else if (deduction.bucket === 'membership') {
        updateData.membership_tokens = wallet.membership_tokens - deduction.amount;
      } else if (deduction.bucket === 'bonus') {
        updateData.bonus_tokens = wallet.bonus_tokens - deduction.amount;
      }
    }

    await this.prisma.canonicalWallet.update({
      where: { id: wallet.id },
      data: updateData,
    });

    // Create ledger entries for each deduction
    const correlationId = `video-${Date.now()}-${body.userId.slice(0, 8)}`;
    for (const deduction of deductions) {
      await this.prisma.canonicalLedgerEntry.create({
        data: {
          wallet_id: wallet.id,
          correlation_id: correlationId,
          reason_code: 'VIDEO_GENERATION',
          amount: -deduction.amount, // negative = debit
          bucket: deduction.bucket,
          token_type: 'CZT',
          hash_prev: null,
          hash_current: `hash-${correlationId}-${deduction.bucket}`,
          metadata: {
            userId: body.userId,
            twinId: body.twinId,
            duration_seconds: duration,
            cost_total: totalCost,
            reference_image: body.referenceImageUrl,
          },
        },
      });
    }

    this.logger.log(`Deducted ${totalCost} DreamCoins for video generation`, {
      userId: body.userId,
      deductions,
      new_balance: totalTokens - totalCost,
      correlation_id: correlationId,
    });

    // PHASE 6 ITEM 2: Credit creator with revenue share
    const creatorShareTokens = Math.floor(totalCost * (CREATOR_REVENUE_SHARE_PERCENT / 100));

    // Find or create creator wallet
    let creatorWallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: body.creatorId },
    });

    if (!creatorWallet) {
      creatorWallet = await this.prisma.canonicalWallet.create({
        data: {
          user_id: body.creatorId,
          user_type: 'creator',
          organization_id: 'OQMInc',
          tenant_id: 'default',
          purchased_tokens: 0,
          membership_tokens: 0,
          bonus_tokens: 0,
        },
      });
    }

    // Credit creator's bonus bucket with earnings
    await this.prisma.canonicalWallet.update({
      where: { id: creatorWallet.id },
      data: {
        bonus_tokens: { increment: creatorShareTokens },
      },
    });

    // Create ledger entry for creator revenue share
    const creatorCorrelationId = `creator-earnings-${correlationId}`;
    await this.prisma.canonicalLedgerEntry.create({
      data: {
        wallet_id: creatorWallet.id,
        correlation_id: creatorCorrelationId,
        reason_code: 'CREATOR_EARNINGS_VIDEO',
        amount: creatorShareTokens, // positive = credit
        bucket: 'bonus',
        token_type: 'CZT',
        hash_prev: null,
        hash_current: `hash-${creatorCorrelationId}`,
        metadata: {
          source_user_id: body.userId,
          twin_id: body.twinId,
          total_cost: totalCost,
          revenue_share_percent: CREATOR_REVENUE_SHARE_PERCENT,
          duration_seconds: duration,
          transaction_type: 'video_generation',
        },
      },
    });

    this.logger.log(`Credited ${creatorShareTokens} DreamCoins to creator ${body.creatorId}`, {
      creatorId: body.creatorId,
      revenue_share_percent: CREATOR_REVENUE_SHARE_PERCENT,
      tokens_earned: creatorShareTokens,
      correlation_id: creatorCorrelationId,
    });

    // Generate video
    try {
      const video = await this.videoService.generate({
        twin_id: body.twinId,
        creator_id: body.creatorId,
        user_id: body.userId,
        reference_image_url: body.referenceImageUrl,
        prompt: body.prompt,
        duration_seconds: duration,
        correlation_id: correlationId,
      });

      return {
        success: true,
        video_url: video.storage_url,
        video_cache_id: video.video_cache_id,
        duration_seconds: video.duration_seconds,
        cost: totalCost,
        deductions,
        remaining_balance: totalTokens - totalCost,
        creator_earned: creatorShareTokens,
        from_cache: video.from_cache,
        correlation_id: correlationId,
      };
    } catch (error) {
      this.logger.error('Video generation failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: body.userId,
        twinId: body.twinId,
      });
      throw new BadRequestException('Video generation failed. Please try again.');
    }
  }
}
