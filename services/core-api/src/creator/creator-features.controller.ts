// services/core-api/src/creator/creator-features.controller.ts
// PHASE 3 ITEM 4: Creator feature toggle endpoints

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

class ToggleSyntheticDto {
  creatorId: string;
  enabled: boolean;
}

@Controller('creator/features')
export class CreatorFeaturesController {
  private readonly logger = new Logger(CreatorFeaturesController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get creator feature flags
   */
  @Get(':creatorId')
  async getCreatorFeatures(@Param('creatorId') creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        ai_synthetic_enabled: true,
        creator_auto: true,
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return {
      creator_id: creator.id,
      features: {
        ai_synthetic_enabled: creator.ai_synthetic_enabled,
        creator_auto: creator.creator_auto,
      },
    };
  }

  /**
   * PHASE 3 ITEM 4: Toggle AI Synthetic Twin feature for a creator
   */
  @Post('toggle-synthetic')
  async toggleSynthetic(@Body() body: ToggleSyntheticDto) {
    if (!body.creatorId) {
      throw new BadRequestException('creatorId is required');
    }

    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean');
    }

    this.logger.log(`Toggling AI Synthetic for creator ${body.creatorId} to ${body.enabled}`);

    const creator = await this.prisma.creator.findUnique({
      where: { id: body.creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const updatedCreator = await this.prisma.creator.update({
      where: { id: body.creatorId },
      data: {
        ai_synthetic_enabled: body.enabled,
      },
    });

    this.logger.log(
      `AI Synthetic ${body.enabled ? 'enabled' : 'disabled'} for creator ${body.creatorId}`,
    );

    return {
      success: true,
      creator_id: updatedCreator.id,
      ai_synthetic_enabled: updatedCreator.ai_synthetic_enabled,
      message: `AI Synthetic Twin generation ${body.enabled ? 'enabled' : 'disabled'} successfully`,
    };
  }
}
