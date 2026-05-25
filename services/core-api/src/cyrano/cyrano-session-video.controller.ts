// services/core-api/src/cyrano/cyrano-session-video.controller.ts
// CYR: In-chat Video Generation Controller
// POST /cyrano/session/:sessionId/generate-video
//
// Responsibilities:
//   1. Validate user has sufficient DreamCoins
//   2. Call existing VideoService for hybrid pipeline
//   3. Return video URL for in-chat display
//
// Note: This controller provides a simpler in-chat video generation endpoint.
// For full video generation with images upload, use POST /cyrano/ai-twin/video

import { Controller, Post, Param, Body, BadRequestException, Logger } from '@nestjs/common';
import { VideoService } from '../../../video-generation/src/video.service';

function _generateIdempotencyKey(userId: string, sessionId: string): string {
  return `in-chat-video-${sessionId}-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface GenerateSessionVideoDto {
  userId: string;
  creatorId: string;
  twinId: string;
  prompt: string; // Chat context prompt for video animation
  durationSeconds?: number; // Optional: 8 or 16 (default 8)
  // For in-chat generation, we can either:
  // 1. Use previously uploaded images for this twin (cached)
  // 2. Require images to be uploaded separately
  // For now, this is a placeholder that would need Twin lookup
}

// In-chat video generation cost: 60 DreamCoins (8s) or 120 DreamCoins (16s)
// Matches costs from VideoService

@Controller('cyrano/session')
export class CyranoSessionVideoController {
  private readonly logger = new Logger(CyranoSessionVideoController.name);

  constructor(private readonly videoService: VideoService) {}

  @Post(':sessionId/generate-video')
  async generateVideo(
    @Param('sessionId') sessionId: string,
    @Body() body: GenerateSessionVideoDto,
  ) {
    this.logger.log(`In-chat video generation request for session ${sessionId}`);

    // Validate required fields
    if (!body.userId || !body.creatorId || !body.twinId) {
      throw new BadRequestException('userId, creatorId, and twinId are required');
    }

    if (!body.prompt || body.prompt.trim().length === 0) {
      throw new BadRequestException('prompt is required for video generation');
    }

    const _durationSeconds = body.durationSeconds === 16 ? 16 : 8;

    // For in-chat generation, we need to look up the twin's reference images
    // This is a simplified placeholder - in production, you would:
    // 1. Query the AITwin table for this twinId
    // 2. Retrieve stored reference images from storage
    // 3. Pass them to the VideoService
    //
    // For now, throw an error indicating this needs to be implemented
    throw new BadRequestException(
      'In-chat video generation requires pre-uploaded reference images for this twin. ' +
        'Please use the AI Twin Creator wizard (/ai-twin) to generate videos with full image upload, ' +
        'or implement Twin image lookup in this controller.',
    );

    // Once Twin image lookup is implemented, the code would look like:
    //
    // const twin = await this.prisma.aITwin.findUnique({
    //   where: { id: body.twinId },
    //   include: { referenceImages: true }
    // });
    //
    // if (!twin || !twin.referenceImages || twin.referenceImages.length < 5) {
    //   throw new BadRequestException('Twin does not have sufficient reference images');
    // }
    //
    // const imageBuffers = await Promise.all(
    //   twin.referenceImages.map(img => fetchImageBuffer(img.storageUrl))
    // );
    //
    // const idempotencyKey = _generateIdempotencyKey(body.userId, sessionId);
    //
    // const result = await this.videoService.generateVideo({
    //   userId: body.userId,
    //   twinId: body.twinId,
    //   creatorId: body.creatorId,
    //   images: imageBuffers,
    //   fantasyLevel: 0.25,
    //   prompt: body.prompt,
    //   durationSeconds: _durationSeconds as 8 | 16,
    //   idempotencyKey,
    // });
    //
    // return {
    //   success: true,
    //   image_url: result.syntheticImageUrl,
    //   video_url: result.videoUrl,
    //   thumbnail_url: undefined, // HeyGen doesn't provide thumbnails
    //   cost: result.tokensCharged,
    //   remaining_balance: result.newBalance.total,
    //   correlation_id: idempotencyKey,
    //   message: 'Video generated successfully',
    // };
  }
}
