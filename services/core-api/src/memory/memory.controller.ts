// services/core-api/src/memory/memory.controller.ts
// MEMORY-HIER-003: Memory management API endpoints
//
// Provides user-facing API for:
// - Listing pinned memories
// - Pinning/unpinning memories
// - Deleting memories
// - Viewing memory summaries

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PinnedMemoryService } from '../../../memory/src/pinned-memory.service';
import { SummarizationService } from '../../../memory/src/summarization.service';
import { ContextMemoryService } from '../../../memory/src/context-memory.service';
import { v4 as uuidv4 } from 'uuid';

// Mock auth guard - replace with real AuthGuard in production
class AuthGuard {}

// Request interface with user property
interface AuthenticatedRequest {
  user?: {
    id: string;
  };
}

@Controller('memory')
@UseGuards(AuthGuard)
export class MemoryController {
  constructor(
    private readonly pinnedMemoryService: PinnedMemoryService,
    private readonly summarizationService: SummarizationService,
    private readonly contextMemoryService: ContextMemoryService,
  ) {}

  /**
   * GET /memory/pinned
   * List all pinned memories for user + twin
   */
  @Get('pinned')
  async listPinnedMemories(
    @Request() req: AuthenticatedRequest,
    @Query('twin_id') twin_id: string,
  ) {
    const user_id = req.user?.id || 'test_user';

    const memories = await this.pinnedMemoryService.getPinnedMemories(user_id, twin_id);
    const count = await this.pinnedMemoryService.getPinnedCount(user_id, twin_id);

    return {
      memories,
      count,
    };
  }

  /**
   * POST /memory/:memory_id/pin
   * Pin a specific memory
   */
  @Post(':memory_id/pin')
  async pinMemory(@Request() req: AuthenticatedRequest, @Param('memory_id') memory_id: string) {
    const user_id = req.user?.id || 'test_user';
    const correlation_id = `pin_${uuidv4()}`;

    await this.pinnedMemoryService.pinMemory({
      memory_id,
      user_id,
      correlation_id,
    });

    return {
      success: true,
      message: 'Memory pinned successfully',
    };
  }

  /**
   * POST /memory/:memory_id/unpin
   * Unpin a specific memory
   */
  @Post(':memory_id/unpin')
  async unpinMemory(@Request() req: AuthenticatedRequest, @Param('memory_id') memory_id: string) {
    const user_id = req.user?.id || 'test_user';
    const correlation_id = `unpin_${uuidv4()}`;

    await this.pinnedMemoryService.unpinMemory({
      memory_id,
      user_id,
      correlation_id,
    });

    return {
      success: true,
      message: 'Memory unpinned successfully',
    };
  }

  /**
   * PATCH /memory/:memory_id
   * Update memory content
   */
  @Patch(':memory_id')
  async updateMemory(
    @Request() req: AuthenticatedRequest,
    @Param('memory_id') memory_id: string,
    @Body() body: { content: string },
  ) {
    const user_id = req.user?.id || 'test_user';
    const correlation_id = `update_${uuidv4()}`;

    await this.pinnedMemoryService.updateMemoryContent(
      memory_id,
      user_id,
      body.content,
      correlation_id,
    );

    return {
      success: true,
      message: 'Memory updated successfully',
    };
  }

  /**
   * DELETE /memory/:memory_id
   * Delete a memory (soft delete)
   */
  @Delete(':memory_id')
  async deleteMemory(@Request() req: AuthenticatedRequest, @Param('memory_id') memory_id: string) {
    const user_id = req.user?.id || 'test_user';
    const correlation_id = `delete_${uuidv4()}`;

    await this.pinnedMemoryService.deleteMemory(memory_id, user_id, correlation_id);

    return {
      success: true,
      message: 'Memory deleted successfully',
    };
  }

  /**
   * GET /memory/summaries
   * List all summaries for a session
   */
  @Get('summaries')
  async listSummaries(@Query('session_id') session_id: string) {
    const summaries = await this.summarizationService.getSessionSummaries(session_id);

    return {
      summaries,
      count: summaries.length,
    };
  }

  /**
   * POST /memory/summarize
   * Manually trigger summarization for a session
   */
  @Post('summarize')
  async manualSummarize(
    @Request() req: AuthenticatedRequest,
    @Body() body: { session_id: string; twin_id: string },
  ) {
    const user_id = req.user?.id || 'test_user';

    const summary = await this.summarizationService.manualSummarize(
      body.session_id,
      body.twin_id,
      user_id,
    );

    if (!summary) {
      return {
        success: false,
        message: 'No new messages to summarize',
      };
    }

    return {
      success: true,
      summary,
    };
  }

  /**
   * GET /memory/context
   * Get hierarchical memory context for a session
   */
  @Get('context')
  async getMemoryContext(
    @Request() req: AuthenticatedRequest,
    @Query('session_id') session_id: string,
    @Query('twin_id') twin_id: string,
  ) {
    const user_id = req.user?.id || 'test_user';

    const context = await this.contextMemoryService.getHierarchicalMemory(
      session_id,
      twin_id,
      user_id,
    );

    return context;
  }
}
