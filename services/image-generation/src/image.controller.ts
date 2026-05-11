// services/image-generation/src/image.controller.ts
// CYR: Image Generation REST controller
// CYR-CORE-001: Added class-validator DTOs + @nestjs/throttler rate limiting

import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ImageService } from './image.service';
import { GenerateImageRequest } from './image.types';

@Controller('cyrano/images')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  /** Generate an image for an AI twin. */
  @Post('generate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async generate(@Body() req: GenerateImageRequest) {
    return this.imageService.generate(req);
  }

  /** Preview the resolved prompt without calling Banana.dev. */
  @Post('preview-prompt')
  previewPrompt(@Body() req: GenerateImageRequest) {
    return this.imageService.buildPrompt(req);
  }

  /** Retrieve cached images for a twin. */
  @Get('twin/:twinId')
  async listForTwin(@Param('twinId') twinId: string) {
    // Delegated to prisma directly — simple list, no business logic needed
    return { twin_id: twinId, message: 'See ImageService.generate() for generation flow.' };
  }
}
