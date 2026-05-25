// services/memory/src/pinned-memory.service.ts
// MEMORY-HIER-003: Pinned Memory Management
//
// User-controlled pinned memories for important facts and preferences.
// Pinned memories are always included in long-term layer during RAG retrieval.

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';

export interface PinMemoryInput {
  memory_id: string;
  user_id: string;
  correlation_id: string;
}

export interface UnpinMemoryInput {
  memory_id: string;
  user_id: string;
  correlation_id: string;
}

export interface PinnedMemoryRecord {
  memory_id: string;
  content: string;
  memory_type: string;
  importance_score: number;
  created_at: Date;
  session_id: string;
}

@Injectable()
export class PinnedMemoryService {
  private readonly logger = new Logger(PinnedMemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pin a memory for a user.
   * Pinned memories are always included in long-term context.
   */
  async pinMemory(input: PinMemoryInput): Promise<void> {
    const { memory_id, user_id, correlation_id } = input;

    // Verify memory exists and belongs to user
    const memory = await this.prisma.memoryBank.findFirst({
      where: {
        memory_id,
        user_id,
      },
    });

    if (!memory) {
      throw new NotFoundException(`Memory ${memory_id} not found for user ${user_id}`);
    }

    // Pin the memory (set is_pinned = true)
    await this.prisma.memoryBank.update({
      where: { memory_id },
      data: { is_pinned: true },
    });

    this.logger.log(
      `Memory pinned: memory_id=${memory_id} user_id=${user_id} correlation_id=${correlation_id}`,
    );
  }

  /**
   * Unpin a memory for a user.
   */
  async unpinMemory(input: UnpinMemoryInput): Promise<void> {
    const { memory_id, user_id, correlation_id } = input;

    // Verify memory exists and belongs to user
    const memory = await this.prisma.memoryBank.findFirst({
      where: {
        memory_id,
        user_id,
      },
    });

    if (!memory) {
      throw new NotFoundException(`Memory ${memory_id} not found for user ${user_id}`);
    }

    // Unpin the memory (set is_pinned = false)
    await this.prisma.memoryBank.update({
      where: { memory_id },
      data: { is_pinned: false },
    });

    this.logger.log(
      `Memory unpinned: memory_id=${memory_id} user_id=${user_id} correlation_id=${correlation_id}`,
    );
  }

  /**
   * Get all pinned memories for a user + twin.
   */
  async getPinnedMemories(user_id: string, twin_id: string): Promise<PinnedMemoryRecord[]> {
    const memories = await this.prisma.memoryBank.findMany({
      where: {
        user_id,
        twin_id,
        is_pinned: true,
      },
      orderBy: { importance_score: 'desc' },
      select: {
        memory_id: true,
        content: true,
        memory_type: true,
        importance_score: true,
        created_at: true,
        session_id: true,
      },
    });

    return memories;
  }

  /**
   * Get pinned memory count for a user + twin.
   */
  async getPinnedCount(user_id: string, twin_id: string): Promise<number> {
    return this.prisma.memoryBank.count({
      where: {
        user_id,
        twin_id,
        is_pinned: true,
      },
    });
  }

  /**
   * Delete a memory (soft delete by setting expires_at).
   * Only allows deleting user's own memories.
   */
  async deleteMemory(memory_id: string, user_id: string, correlation_id: string): Promise<void> {
    // Verify memory exists and belongs to user
    const memory = await this.prisma.memoryBank.findFirst({
      where: {
        memory_id,
        user_id,
      },
    });

    if (!memory) {
      throw new NotFoundException(`Memory ${memory_id} not found for user ${user_id}`);
    }

    // Soft delete by setting expires_at to now
    await this.prisma.memoryBank.update({
      where: { memory_id },
      data: { expires_at: new Date() },
    });

    this.logger.log(
      `Memory deleted: memory_id=${memory_id} user_id=${user_id} correlation_id=${correlation_id}`,
    );
  }

  /**
   * Update memory content (for user edits).
   * Note: This violates append-only for content, but is allowed for user-owned memories.
   */
  async updateMemoryContent(
    memory_id: string,
    user_id: string,
    new_content: string,
    correlation_id: string,
  ): Promise<void> {
    // Verify memory exists and belongs to user
    const memory = await this.prisma.memoryBank.findFirst({
      where: {
        memory_id,
        user_id,
      },
    });

    if (!memory) {
      throw new NotFoundException(`Memory ${memory_id} not found for user ${user_id}`);
    }

    // Update content
    await this.prisma.memoryBank.update({
      where: { memory_id },
      data: { content: new_content },
    });

    this.logger.log(
      `Memory updated: memory_id=${memory_id} user_id=${user_id} correlation_id=${correlation_id}`,
    );
  }
}
