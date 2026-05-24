// services/cyrano/src/memory-retrieval.service.ts
// PHASE 3 ITEM 2: RAG-style memory retrieval service
// Retrieves relevant memories for context injection into LLM prompts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';

export interface RetrievedMemory {
  memory_id: string;
  memory_type: string;
  content: string;
  importance_score: number;
  is_pinned: boolean;
  created_at: Date;
}

export interface MemoryContext {
  pinned_memories: RetrievedMemory[];
  high_importance_memories: RetrievedMemory[];
  recent_session_memories: RetrievedMemory[];
  total_count: number;
}

@Injectable()
export class MemoryRetrievalService {
  private readonly logger = new Logger(MemoryRetrievalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve relevant memories for RAG context injection
   * @param twinId - AI Twin ID
   * @param userId - User ID
   * @param sessionId - Current session ID (optional)
   * @param maxMemories - Maximum number of memories to retrieve (default: 20)
   * @returns Memory context with pinned, high-importance, and recent memories
   */
  async retrieveMemoriesForContext(
    twinId: string,
    userId: string,
    sessionId?: string,
    maxMemories: number = 20,
  ): Promise<MemoryContext> {
    this.logger.log(`Retrieving memories for twin=${twinId}, user=${userId}, session=${sessionId}`);

    // 1. Retrieve all pinned memories (always included)
    const pinnedMemories = await this.prisma.memoryBank.findMany({
      where: {
        twin_id: twinId,
        user_id: userId,
        is_pinned: true,
        expires_at: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        importance_score: 'desc',
      },
      select: {
        memory_id: true,
        memory_type: true,
        content: true,
        importance_score: true,
        is_pinned: true,
        created_at: true,
      },
    });

    // 2. Retrieve high-importance memories (importance >= 0.7)
    const highImportanceMemories = await this.prisma.memoryBank.findMany({
      where: {
        twin_id: twinId,
        user_id: userId,
        is_pinned: false, // Don't duplicate pinned memories
        importance_score: {
          gte: 0.7,
        },
        expires_at: {
          gt: new Date(),
        },
      },
      orderBy: [{ importance_score: 'desc' }, { created_at: 'desc' }],
      take: Math.floor(maxMemories / 2), // Allocate half the budget to high-importance
      select: {
        memory_id: true,
        memory_type: true,
        content: true,
        importance_score: true,
        is_pinned: true,
        created_at: true,
      },
    });

    // 3. Retrieve recent session memories if sessionId is provided
    let recentSessionMemories: RetrievedMemory[] = [];
    if (sessionId) {
      recentSessionMemories = await this.prisma.memoryBank.findMany({
        where: {
          twin_id: twinId,
          user_id: userId,
          session_id: sessionId,
          is_pinned: false,
          importance_score: {
            lt: 0.7, // Don't duplicate high-importance memories
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: Math.floor(maxMemories / 4), // Allocate quarter budget to recent session
        select: {
          memory_id: true,
          memory_type: true,
          content: true,
          importance_score: true,
          is_pinned: true,
          created_at: true,
        },
      });
    }

    const totalCount =
      pinnedMemories.length + highImportanceMemories.length + recentSessionMemories.length;

    this.logger.log(
      `Retrieved ${totalCount} memories (${pinnedMemories.length} pinned, ${highImportanceMemories.length} high-importance, ${recentSessionMemories.length} recent)`,
    );

    return {
      pinned_memories: pinnedMemories,
      high_importance_memories: highImportanceMemories,
      recent_session_memories: recentSessionMemories,
      total_count: totalCount,
    };
  }

  /**
   * Format memory context for LLM prompt injection
   * @param context - Memory context from retrieveMemoriesForContext
   * @returns Formatted string for prompt injection
   */
  formatMemoriesForPrompt(context: MemoryContext): string {
    const sections: string[] = [];

    if (context.pinned_memories.length > 0) {
      sections.push('=== PINNED MEMORIES (User-flagged as important) ===');
      context.pinned_memories.forEach((mem) => {
        sections.push(`[${mem.memory_type}] ${mem.content}`);
      });
      sections.push('');
    }

    if (context.high_importance_memories.length > 0) {
      sections.push('=== HIGH IMPORTANCE MEMORIES ===');
      context.high_importance_memories.forEach((mem) => {
        sections.push(
          `[${mem.memory_type}] ${mem.content} (score: ${mem.importance_score.toFixed(2)})`,
        );
      });
      sections.push('');
    }

    if (context.recent_session_memories.length > 0) {
      sections.push('=== RECENT SESSION CONTEXT ===');
      context.recent_session_memories.forEach((mem) => {
        sections.push(`[${mem.memory_type}] ${mem.content}`);
      });
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Pin a memory for the user
   * @param memoryId - Memory ID to pin
   * @param userId - User ID (for authorization)
   */
  async pinMemory(memoryId: string, userId: string): Promise<void> {
    await this.prisma.memoryBank.updateMany({
      where: {
        memory_id: memoryId,
        user_id: userId, // Ensure user owns this memory
      },
      data: {
        is_pinned: true,
      },
    });

    this.logger.log(`Pinned memory ${memoryId} for user ${userId}`);
  }

  /**
   * Unpin a memory for the user
   * @param memoryId - Memory ID to unpin
   * @param userId - User ID (for authorization)
   */
  async unpinMemory(memoryId: string, userId: string): Promise<void> {
    await this.prisma.memoryBank.updateMany({
      where: {
        memory_id: memoryId,
        user_id: userId,
      },
      data: {
        is_pinned: false,
      },
    });

    this.logger.log(`Unpinned memory ${memoryId} for user ${userId}`);
  }
}
