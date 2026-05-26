// services/core-api/src/cyrano/ai-twin-synthetic.controller.ts
// POST /cyrano/ai-twin/synthetic — Safe Synthetic Twin creation endpoint.
// Accepts multipart/form-data: field "images" (≥5 files) + optional "fantasyLevel".
// PHASE 2 ITEM 4: Integrated with DreamCoins wallet - deducts cost from user balance.

import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SyntheticPipelineService } from '../../../ai-twin/src/synthetic-pipeline.service';
import { PrismaService } from '../prisma.service';

class CreateSyntheticDto {
  fantasyLevel?: string | string[];
  userId: string; // PHASE 2 ITEM 4: Required for wallet deduction
  twinId?: string; // PHASE 6 ITEM 1: Optional twin_id to track which AI twin generated this
  creatorId?: string; // PHASE 6 ITEM 1: Optional creator_id for revenue share
}

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
};

// PHASE 2 ITEM 4: Safe Synthetic Twin pricing (in DreamCoins/CZT)
const SYNTHETIC_GENERATION_COST = 50; // 50 DreamCoins per generation

// PHASE 6 ITEM 1: Creator revenue share from synthetic twin generations
const CREATOR_REVENUE_SHARE_PERCENT = 40; // 40% of tokens go to creator (30-50% range)

@Controller('cyrano/ai-twin')
export class AiTwinSyntheticController {
  private readonly logger = new Logger(AiTwinSyntheticController.name);

  constructor(
    private readonly syntheticPipeline: SyntheticPipelineService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('synthetic')
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per image
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are accepted.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async createSynthetic(
    @UploadedFiles() files: UploadedImageFile[],
    @Body() body: CreateSyntheticDto,
  ) {
    const startedAtMs = Date.now();

    if (!Array.isArray(files) || files.length < 5) {
      throw new BadRequestException('At least 5 images are required for Safe Synthetic mode.');
    }

    // PHASE 2 ITEM 4: Validate userId is provided
    if (!body.userId) {
      throw new BadRequestException('userId is required for Safe Synthetic generation');
    }

    const rawFantasyLevel = Array.isArray(body.fantasyLevel)
      ? body.fantasyLevel[0]
      : body.fantasyLevel;
    const parsedFantasyLevel =
      typeof rawFantasyLevel === 'string' ? Number.parseFloat(rawFantasyLevel) : Number.NaN;
    const fantasyLevel = Number.isFinite(parsedFantasyLevel)
      ? Math.min(1.0, Math.max(0.0, parsedFantasyLevel))
      : 0.25;

    this.logger.log(
      `Synthetic request: ${files.length} images, fantasyLevel=${fantasyLevel}, userId=${body.userId}`,
    );

    // PHASE 2 ITEM 4: Check user wallet balance and deduct cost
    const wallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: body.userId },
    });

    if (!wallet) {
      throw new ForbiddenException(
        'No wallet found. Please purchase DreamCoins to use Safe Synthetic Twin generation.',
      );
    }

    // Calculate total available tokens across all buckets
    const totalTokens = wallet.purchased_tokens + wallet.membership_tokens + wallet.bonus_tokens;

    if (totalTokens < SYNTHETIC_GENERATION_COST) {
      throw new ForbiddenException(
        `Insufficient DreamCoins. Required: ${SYNTHETIC_GENERATION_COST}, Available: ${totalTokens}. Please purchase more DreamCoins.`,
      );
    }

    // Deduct from buckets in priority order: purchased > membership > bonus
    let remaining = SYNTHETIC_GENERATION_COST;
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
    const correlationId = `synthetic-${Date.now()}-${body.userId.slice(0, 8)}`;
    for (const deduction of deductions) {
      await this.prisma.canonicalLedgerEntry.create({
        data: {
          wallet_id: wallet.id,
          correlation_id: correlationId,
          reason_code: 'SYNTHETIC_GENERATION',
          amount: -deduction.amount, // negative = debit
          bucket: deduction.bucket,
          token_type: 'CZT',
          hash_prev: null, // Simplified - proper hash-chain would be computed
          hash_current: `hash-${correlationId}-${deduction.bucket}`,
          metadata: {
            userId: body.userId,
            fantasy_level: fantasyLevel,
            input_count: files.length,
            cost_total: SYNTHETIC_GENERATION_COST,
          },
        },
      });
    }

    this.logger.log(`Deducted ${SYNTHETIC_GENERATION_COST} DreamCoins for synthetic generation`, {
      userId: body.userId,
      deductions,
      new_balance: totalTokens - SYNTHETIC_GENERATION_COST,
      correlation_id: correlationId,
    });

    // PHASE 6 ITEM 1: Credit creator with revenue share if creatorId is provided
    if (body.creatorId) {
      const creatorShareTokens = Math.floor(
        SYNTHETIC_GENERATION_COST * (CREATOR_REVENUE_SHARE_PERCENT / 100),
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
          reason_code: 'CREATOR_EARNINGS_SYNTHETIC',
          amount: creatorShareTokens, // positive = credit
          bucket: 'bonus',
          token_type: 'CZT',
          hash_prev: null,
          hash_current: `hash-${creatorCorrelationId}`,
          metadata: {
            source_user_id: body.userId,
            twin_id: body.twinId,
            total_cost: SYNTHETIC_GENERATION_COST,
            revenue_share_percent: CREATOR_REVENUE_SHARE_PERCENT,
            fantasy_level: fantasyLevel,
            transaction_type: 'synthetic_generation',
          },
        },
      });

      this.logger.log(`Credited ${creatorShareTokens} DreamCoins to creator ${body.creatorId}`, {
        creatorId: body.creatorId,
        revenue_share_percent: CREATOR_REVENUE_SHARE_PERCENT,
        tokens_earned: creatorShareTokens,
        correlation_id: creatorCorrelationId,
      });
    }

    let analyticsOutcome: 'success' | 'failure' = 'failure';
    try {
      const buffers = files.map((f) => {
        if (!Buffer.isBuffer(f.buffer)) {
          throw new BadRequestException('Only valid image files are accepted.');
        }
        return f.buffer;
      });
      const result = await this.syntheticPipeline.createSyntheticModel(buffers, fantasyLevel, {
        characterId: body.twinId,
      });
      analyticsOutcome = 'success';

      // PHASE 2 ITEM 4: Include cost and balance info in response
      return {
        ...result,
        cost: {
          dreamCoins: SYNTHETIC_GENERATION_COST,
          deductions,
          remainingBalance: totalTokens - SYNTHETIC_GENERATION_COST,
        },
      };
    } finally {
      this.logger.log(
        `SyntheticController analytics: inputCount=${files.length} fantasyLevel=${fantasyLevel} outcome=${analyticsOutcome} cost=${SYNTHETIC_GENERATION_COST} processingMs=${Date.now() - startedAtMs}`,
      );
    }
  }
}
