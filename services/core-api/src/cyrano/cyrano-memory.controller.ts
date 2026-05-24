// services/core-api/src/cyrano/cyrano-memory.controller.ts
// PHASE 3 ITEM 2: Memory management endpoints for chat history and RAG

import { Controller, Post, Get, Param, Body, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MemoryRetrievalService } from '../../../cyrano/src/memory-retrieval.service';

class PinMemoryDto {
  userId: string;
}

class UnpinMemoryDto {
  userId: string;
}

class LogChatMessageDto {
  sessionId: string;
  twinId: string;
  userId: string;
  role: 'user' | 'twin' | 'system';
  content: string;
  isHaptic?: boolean;
}

@Controller('cyrano/memory')
export class CyranoMemoryController {
  private readonly logger = new Logger(CyranoMemoryController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryRetrieval: MemoryRetrievalService,
  ) {}

  /**
   * Get memory context for a session (for RAG)
   */
  @Get('context/:twinId/:userId')
  async getMemoryContext(@Param('twinId') twinId: string, @Param('userId') userId: string) {
    this.logger.log(`Fetching memory context for twin=${twinId}, user=${userId}`);

    const context = await this.memoryRetrieval.retrieveMemoriesForContext(
      twinId,
      userId,
      undefined, // No specific session
      20, // Max 20 memories
    );

    const formattedPrompt = this.memoryRetrieval.formatMemoriesForPrompt(context);

    return {
      context,
      formatted_prompt: formattedPrompt,
      total_count: context.total_count,
    };
  }

  /**
   * Pin a memory for RAG retrieval
   */
  @Post('pin/:memoryId')
  async pinMemory(@Param('memoryId') memoryId: string, @Body() body: PinMemoryDto) {
    if (!body.userId) {
      throw new BadRequestException('userId is required');
    }

    await this.memoryRetrieval.pinMemory(memoryId, body.userId);

    return {
      success: true,
      message: 'Memory pinned successfully',
      memory_id: memoryId,
    };
  }

  /**
   * Unpin a memory
   */
  @Post('unpin/:memoryId')
  async unpinMemory(@Param('memoryId') memoryId: string, @Body() body: UnpinMemoryDto) {
    if (!body.userId) {
      throw new BadRequestException('userId is required');
    }

    await this.memoryRetrieval.unpinMemory(memoryId, body.userId);

    return {
      success: true,
      message: 'Memory unpinned successfully',
      memory_id: memoryId,
    };
  }

  /**
   * PHASE 3 ITEM 2: Log chat message through canonical ledger for auditability
   */
  @Post('log-chat-message')
  async logChatMessage(@Body() body: LogChatMessageDto) {
    if (!body.sessionId || !body.twinId || !body.userId || !body.role || !body.content) {
      throw new BadRequestException('Missing required fields');
    }

    const correlationId = `chat-msg-${Date.now()}-${body.userId.slice(0, 8)}`;

    // Log to canonical ledger for auditability
    // Note: Chat messages don't affect wallet balance, so we log with amount=0
    const wallet = await this.prisma.canonicalWallet.findUnique({
      where: { user_id: body.userId },
    });

    if (wallet) {
      await this.prisma.canonicalLedgerEntry.create({
        data: {
          wallet_id: wallet.id,
          correlation_id: correlationId,
          reason_code: 'CHAT_MESSAGE',
          amount: 0, // No wallet impact
          bucket: 'purchased', // Dummy bucket since amount is 0
          token_type: 'CZT',
          hash_prev: null,
          hash_current: `hash-${correlationId}`,
          metadata: {
            sessionId: body.sessionId,
            twinId: body.twinId,
            userId: body.userId,
            role: body.role,
            content_length: body.content.length,
            is_haptic: body.isHaptic || false,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    this.logger.log(`Logged chat message for session ${body.sessionId}`, {
      correlation_id: correlationId,
      role: body.role,
      content_length: body.content.length,
    });

    return {
      success: true,
      correlation_id: correlationId,
    };
  }
}
