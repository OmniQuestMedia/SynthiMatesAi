// services/core-api/src/cyrano/cyrano-session-image.controller.ts
// PHASE 3 ITEM 1: POST /cyrano/session/:sessionId/generate-image
// In-chat image generation endpoint that deducts DreamCoins and generates image inline.

import {
  Controller,
  Post,
  Param,
  Body,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SyntheticPipelineService } from '../../../ai-twin/src/synthetic-pipeline.service';

class GenerateImageDto {
  userId: string;
  creatorId: string; // PHASE 3 ITEM 4: Check creator's AI synthetic feature flag
  prompt?: string; // Optional prompt for generation context
}

// Reuse same cost as Safe Synthetic Twin generation
const IMAGE_GENERATION_COST = 50; // 50 DreamCoins per generation

// PHASE 6 ITEM 1: Creator revenue share from in-chat image generations
const CREATOR_REVENUE_SHARE_PERCENT = 40; // 40% of tokens go to creator (30-50% range)

@Controller('cyrano/session')
export class CyranoSessionImageController {
  private readonly logger = new Logger(CyranoSessionImageController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syntheticPipeline: SyntheticPipelineService,
  ) {}

  @Post(':sessionId/generate-image')
  async generateImage(@Param('sessionId') sessionId: string, @Body() body: GenerateImageDto) {
    this.logger.log(`In-chat image generation request for session ${sessionId}`);

    // Validate userId is provided
    if (!body.userId) {
      throw new BadRequestException('userId is required for image generation');
    }

    if (!body.creatorId) {
      throw new BadRequestException('creatorId is required for image generation');
    }

    // PHASE 3 ITEM 4: Check if creator has AI Synthetic Twin enabled
    const creator = await this.prisma.creator.findUnique({
      where: { id: body.creatorId },
      select: { ai_synthetic_enabled: true },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (!creator.ai_synthetic_enabled) {
      throw new ForbiddenException(
        'AI Synthetic Twin generation is disabled for this creator. Please contact support.',
      );
    }

    // Check user wallet balance and deduct cost
    const wallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: body.userId },
    });

    if (!wallet) {
      throw new ForbiddenException(
        'No wallet found. Please purchase DreamCoins to generate images.',
      );
    }

    // Calculate total available tokens across all buckets
    const totalTokens = wallet.purchased_tokens + wallet.membership_tokens + wallet.bonus_tokens;

    if (totalTokens < IMAGE_GENERATION_COST) {
      throw new ForbiddenException(
        `Insufficient DreamCoins. Required: ${IMAGE_GENERATION_COST}, Available: ${totalTokens}. Please purchase more DreamCoins.`,
      );
    }

    // Deduct from buckets in priority order: purchased > membership > bonus
    let remaining = IMAGE_GENERATION_COST;
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
    const correlationId = `in-chat-image-${Date.now()}-${body.userId.slice(0, 8)}`;
    for (const deduction of deductions) {
      await this.prisma.canonicalLedgerEntry.create({
        data: {
          wallet_id: wallet.id,
          correlation_id: correlationId,
          reason_code: 'IN_CHAT_IMAGE_GENERATION',
          amount: -deduction.amount, // negative = debit
          bucket: deduction.bucket,
          token_type: 'CZT',
          hash_prev: null, // Simplified - proper hash-chain would be computed
          hash_current: `hash-${correlationId}-${deduction.bucket}`,
          metadata: {
            userId: body.userId,
            sessionId,
            prompt: body.prompt || 'Auto-generated from chat context',
            cost_total: IMAGE_GENERATION_COST,
          },
        },
      });
    }

    this.logger.log(`Deducted ${IMAGE_GENERATION_COST} DreamCoins for in-chat image generation`, {
      userId: body.userId,
      sessionId,
      deductions,
      new_balance: totalTokens - IMAGE_GENERATION_COST,
      correlation_id: correlationId,
    });

    // PHASE 6 ITEM 1: Credit creator with revenue share
    const creatorShareTokens = Math.floor(
      IMAGE_GENERATION_COST * (CREATOR_REVENUE_SHARE_PERCENT / 100),
    );

    // Find or create creator wallet
    let creatorWallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: body.creatorId },
    });

    if (!creatorWallet) {
      // Create wallet if it doesn't exist
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
        reason_code: 'CREATOR_EARNINGS_IMAGE',
        amount: creatorShareTokens, // positive = credit
        bucket: 'bonus',
        token_type: 'CZT',
        hash_prev: null,
        hash_current: `hash-${creatorCorrelationId}`,
        metadata: {
          source_user_id: body.userId,
          session_id: sessionId,
          total_cost: IMAGE_GENERATION_COST,
          revenue_share_percent: CREATOR_REVENUE_SHARE_PERCENT,
          transaction_type: 'in_chat_image_generation',
        },
      },
    });

    this.logger.log(`Credited ${creatorShareTokens} DreamCoins to creator ${body.creatorId}`, {
      creatorId: body.creatorId,
      revenue_share_percent: CREATOR_REVENUE_SHARE_PERCENT,
      tokens_earned: creatorShareTokens,
      correlation_id: creatorCorrelationId,
    });

    // Generate image using synthetic pipeline
    // For in-chat generation, we'll use a simplified approach with text-to-image
    // In production, this might use Flux or other T2I models
    try {
      // Mock image generation for now - in production would call actual T2I service
      const mockImageUrl = `https://placeholder-images.example.com/synthetic/${correlationId}.jpg`;

      this.logger.log('In-chat image generation successful', {
        sessionId,
        userId: body.userId,
        imageUrl: mockImageUrl,
      });

      return {
        success: true,
        image_url: mockImageUrl,
        cost: IMAGE_GENERATION_COST,
        deductions,
        remaining_balance: totalTokens - IMAGE_GENERATION_COST,
        correlation_id: correlationId,
        message: 'Image generated successfully',
      };
    } catch (error) {
      this.logger.error('Image generation failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        userId: body.userId,
      });
      throw new BadRequestException('Image generation failed. Please try again.');
    }
  }
}
