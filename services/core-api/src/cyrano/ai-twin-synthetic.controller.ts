// services/core-api/src/cyrano/ai-twin-synthetic.controller.ts
// POST /cyrano/ai-twin/synthetic — Safe Synthetic Twin creation endpoint.
// Accepts multipart/form-data: field "images" (≥5 files) + optional "fantasyLevel".

import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SyntheticPipelineService } from '../../../ai-twin/src/synthetic-pipeline.service';

class CreateSyntheticDto {
  fantasyLevel?: string | string[];
}

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
};

@Controller('cyrano/ai-twin')
export class AiTwinSyntheticController {
  private readonly logger = new Logger(AiTwinSyntheticController.name);

  constructor(private readonly syntheticPipeline: SyntheticPipelineService) {}

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
    if (!Array.isArray(files) || files.length < 5) {
      throw new BadRequestException('At least 5 images are required for Safe Synthetic mode.');
    }

    const rawFantasyLevel = Array.isArray(body.fantasyLevel)
      ? body.fantasyLevel[0]
      : body.fantasyLevel;
    const parsedFantasyLevel =
      typeof rawFantasyLevel === 'string' ? Number.parseFloat(rawFantasyLevel) : Number.NaN;
    const fantasyLevel = Number.isFinite(parsedFantasyLevel)
      ? Math.min(1.0, Math.max(0.0, parsedFantasyLevel))
      : 0.25;

    this.logger.log(`Synthetic request: ${files.length} images, fantasyLevel=${fantasyLevel}`);

    const buffers = files.map((f) => {
      if (!Buffer.isBuffer(f.buffer)) {
        throw new BadRequestException('Only valid image files are accepted.');
      }
      return f.buffer;
    });
    return this.syntheticPipeline.createSyntheticModel(buffers, fantasyLevel);
  }
}
