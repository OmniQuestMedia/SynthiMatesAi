// services/memory/src/context-memory.service.ts
// MEMORY-HIER-001: Superior Long-Term Context Memory System
//
// Hierarchical memory architecture with three layers:
//   1. Short-term: Last N messages from MemoryBank
//   2. Medium-term: Auto-summaries from MemorySummary table
//   3. Long-term: Pinned memories + high-importance MemoryBank entries
//
// This service orchestrates retrieval across all layers and provides
// unified context for RAG-enhanced chat generation.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';

export interface HierarchicalMemoryOptions {
  /** Number of recent messages to retrieve (short-term). Default: 10 */
  shortTermCount?: number;
  /** Number of summaries to retrieve (medium-term). Default: 3 */
  mediumTermCount?: number;
  /** Number of long-term memories to retrieve. Default: 5 */
  longTermCount?: number;
  /** Time-decay parameter in days (older memories decay). Default: 90 */
  tauDays?: number;
}

export interface MemoryContext {
  /** Short-term: Recent messages */
  shortTerm: Array<{
    memory_id: string;
    content: string;
    memory_type: string;
    importance_score: number;
    is_pinned: boolean;
    created_at: Date;
  }>;
  /** Medium-term: Auto-generated summaries */
  mediumTerm: Array<{
    id: string;
    summary_text: string;
    message_count: number;
    start_message_seq: number;
    end_message_seq: number;
    created_at: Date;
  }>;
  /** Long-term: Pinned + high-importance memories */
  longTerm: Array<{
    memory_id: string;
    content: string;
    memory_type: string;
    importance_score: number;
    is_pinned: boolean;
    created_at: Date;
  }>;
  /** Total number of memories across all layers */
  totalMemories: number;
  /** Memory strength indicator (0.0-1.0) */
  memoryStrength: number;
}

const DEFAULT_SHORT_TERM_COUNT = 10;
const DEFAULT_MEDIUM_TERM_COUNT = 3;
const DEFAULT_LONG_TERM_COUNT = 5;
const DEFAULT_TAU_DAYS = 90;

/**
 * Exponential time-decay score: exp(-age_days / tau_days).
 * More recent memories score higher.
 */
function timeDecay(createdAt: Date, tauDays: number): number {
  const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-ageDays / tauDays);
}

@Injectable()
export class ContextMemoryService {
  private readonly logger = new Logger(ContextMemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve hierarchical memory context for a user + twin + session.
   *
   * Returns three-tier memory structure optimized for RAG injection:
   * 1. Short-term: Last N messages (chronological)
   * 2. Medium-term: Auto-summaries (most recent first)
   * 3. Long-term: Pinned + high-importance memories (relevance-scored)
   */
  async getHierarchicalMemory(
    session_id: string,
    twin_id: string,
    user_id: string,
    options: HierarchicalMemoryOptions = {},
  ): Promise<MemoryContext> {
    const shortTermCount = options.shortTermCount ?? DEFAULT_SHORT_TERM_COUNT;
    const mediumTermCount = options.mediumTermCount ?? DEFAULT_MEDIUM_TERM_COUNT;
    const longTermCount = options.longTermCount ?? DEFAULT_LONG_TERM_COUNT;
    const tauDays = options.tauDays ?? DEFAULT_TAU_DAYS;

    // Short-term: Last N messages from MemoryBank
    const shortTerm = await this.prisma.memoryBank.findMany({
      where: { session_id, twin_id, user_id },
      orderBy: { created_at: 'desc' },
      take: shortTermCount,
      select: {
        memory_id: true,
        content: true,
        memory_type: true,
        importance_score: true,
        is_pinned: true,
        created_at: true,
      },
    });

    // Reverse to chronological order (oldest first)
    shortTerm.reverse();

    // Medium-term: Auto-summaries
    const mediumTerm = await this.prisma.memorySummary.findMany({
      where: { session_id, twin_id, user_id },
      orderBy: { created_at: 'desc' },
      take: mediumTermCount,
      select: {
        id: true,
        summary_text: true,
        message_count: true,
        start_message_seq: true,
        end_message_seq: true,
        created_at: true,
      },
    });

    // Long-term: Pinned memories + high-importance non-pinned
    // First get all pinned memories (always included)
    const pinnedMemories = await this.prisma.memoryBank.findMany({
      where: {
        twin_id,
        user_id,
        is_pinned: true,
      },
      orderBy: { importance_score: 'desc' },
      select: {
        memory_id: true,
        content: true,
        memory_type: true,
        importance_score: true,
        is_pinned: true,
        created_at: true,
      },
    });

    // Then get high-importance non-pinned memories to fill remaining slots
    const remainingSlots = Math.max(0, longTermCount - pinnedMemories.length);
    let highImportanceMemories: typeof pinnedMemories = [];

    if (remainingSlots > 0) {
      // Fetch non-pinned memories and score them with time-decay
      const candidates = await this.prisma.memoryBank.findMany({
        where: {
          twin_id,
          user_id,
          is_pinned: false,
          // Exclude very low importance
          importance_score: { gte: 0.6 },
        },
        orderBy: { importance_score: 'desc' },
        take: remainingSlots * 2, // Get extra for scoring
        select: {
          memory_id: true,
          content: true,
          memory_type: true,
          importance_score: true,
          is_pinned: true,
          created_at: true,
        },
      });

      // Score with time-decay and sort
      const scored = candidates.map((m) => ({
        memory: m,
        score: m.importance_score * timeDecay(m.created_at, tauDays),
      }));

      scored.sort((a, b) => b.score - a.score);
      highImportanceMemories = scored.slice(0, remainingSlots).map((s) => s.memory);
    }

    // Combine pinned + high-importance for long-term layer
    const longTerm = [...pinnedMemories, ...highImportanceMemories];

    // Calculate memory strength (0.0-1.0) based on total memories and recency
    const totalMemories = shortTerm.length + mediumTerm.length + longTerm.length;
    const avgImportance =
      shortTerm.length > 0
        ? shortTerm.reduce((sum, m) => sum + m.importance_score, 0) / shortTerm.length
        : 0.5;
    const hasSummaries = mediumTerm.length > 0 ? 0.2 : 0;
    const hasPinned = pinnedMemories.length > 0 ? 0.2 : 0;
    const memoryStrength = Math.min(1.0, avgImportance * 0.6 + hasSummaries + hasPinned);

    this.logger.debug(
      `Hierarchical memory retrieved: session=${session_id} short=${shortTerm.length} medium=${mediumTerm.length} long=${longTerm.length} strength=${memoryStrength.toFixed(2)}`,
    );

    return {
      shortTerm,
      mediumTerm,
      longTerm,
      totalMemories,
      memoryStrength,
    };
  }

  /**
   * Get the current message count for a session.
   * Used to determine when to trigger auto-summarization.
   */
  async getSessionMessageCount(session_id: string): Promise<number> {
    const count = await this.prisma.memoryBank.count({
      where: { session_id },
    });

    return count;
  }

  /**
   * Get the last summarized message sequence for a session.
   * Returns 0 if no summaries exist yet.
   */
  async getLastSummarizedSequence(session_id: string): Promise<number> {
    const lastSummary = await this.prisma.memorySummary.findFirst({
      where: { session_id },
      orderBy: { end_message_seq: 'desc' },
      select: { end_message_seq: true },
    });

    return lastSummary?.end_message_seq ?? 0;
  }

  /**
   * Check if summarization should be triggered for a session.
   * Triggers every 20-30 messages (configurable).
   */
  async shouldTriggerSummarization(
    session_id: string,
    triggerThreshold: number = 25,
  ): Promise<boolean> {
    const totalMessages = await this.getSessionMessageCount(session_id);
    const lastSummarized = await this.getLastSummarizedSequence(session_id);
    const messagesSinceLastSummary = totalMessages - lastSummarized;

    return messagesSinceLastSummary >= triggerThreshold;
  }
}
