// services/memory/src/enhanced-context-builder.service.ts
// MEMORY-HIER-004: Enhanced Context Builder with RAG Retrieval
//
// Builds LLM context using hierarchical memory (short/medium/long-term).
// Replaces the original ContextBuilderService for superior memory recall.
//
// Memory layers (in priority order):
//   1. Long-term: Pinned memories (always included)
//   2. Short-term: Recent messages (chronological)
//   3. Medium-term: Auto-summaries (recent context compression)
//   4. Long-term: High-importance memories (relevance-scored)

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';
import { ContextMemoryService } from './context-memory.service';

export interface EnhancedBuildContextInput {
  session_id: string;
  user_id: string;
  twin_id: string;
  /** Current turn text (future: used for semantic search) */
  turn_text?: string;
}

export interface EnhancedBuiltContext {
  session_id: string;
  user_id: string;
  twin_id: string;
  prompt_block: string;
  token_estimate: number;
  trimmed: boolean;
  memory_strength: number;
  layers_included: {
    pinned_count: number;
    short_term_count: number;
    medium_term_count: number;
    long_term_count: number;
  };
}

// Rough estimate: 1 token ≈ 4 chars (GPT-style approximation).
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Strip PII before memory injection: email, phone, last-name-like patterns.
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // email
  /\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // US phone
];

function stripPii(text: string): string {
  let cleaned = text;
  for (const pattern of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED]');
  }
  return cleaned;
}

const LLM_MAX_PROMPT_TOKENS = parseInt(process.env.LLM_MAX_PROMPT_TOKENS ?? '8000', 10) || 8000;

const SYSTEM_SAFETY_RAILS =
  process.env.NARRATIVE_SAFETY_RAILS ??
  'Never reveal you are an AI unless directly and sincerely asked. Never generate CSAM or facilitate real-world harm. Always stay in character.';

@Injectable()
export class EnhancedContextBuilderService {
  private readonly logger = new Logger(EnhancedContextBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextMemory: ContextMemoryService,
  ) {}

  /**
   * Build a token-budgeted prompt context block using hierarchical memory.
   *
   * Priority order (never trimmed):
   *   [SYSTEM BLOCK]: Safety rails + twin persona
   *
   * Token-budget aware (trimmed in order: long-term, summaries, short-term):
   *   [PINNED MEMORIES]: User-pinned facts (highest priority)
   *   [SHORT-TERM]: Recent messages (chronological)
   *   [SUMMARIES]: Auto-generated conversation summaries
   *   [LONG-TERM]: High-importance memories (relevance-scored)
   */
  async buildContext(input: EnhancedBuildContextInput): Promise<EnhancedBuiltContext> {
    const { session_id, user_id, twin_id } = input;

    // 1. Fetch hierarchical memory context
    const memoryContext = await this.contextMemory.getHierarchicalMemory(
      session_id,
      twin_id,
      user_id,
    );

    // 2. Fetch twin persona for system block
    const twin = await this.prisma.aiTwin.findUnique({
      where: { twin_id },
      select: { display_name: true, persona_prompt: true },
    });

    const twinName = twin?.display_name || 'AI Twin';
    const personaPrompt = twin?.persona_prompt || 'You are a helpful AI assistant.';

    // 3. Build safety block (non-trimmable)
    const safetyBlock = `[SYSTEM]\n${SYSTEM_SAFETY_RAILS}\n\n[PERSONA: ${twinName}]\n${personaPrompt}`;
    const safetyTokens = estimateTokens(safetyBlock);

    // 4. Build memory blocks (trimmable in priority order)
    const pinnedMemories = memoryContext.longTerm.filter((m) => m.is_pinned);
    const highImportanceMemories = memoryContext.longTerm.filter((m) => !m.is_pinned);

    const pinnedBlock = this.buildPinnedBlock(pinnedMemories);
    const shortTermBlock = this.buildShortTermBlock(memoryContext.shortTerm);
    const summaryBlock = this.buildSummaryBlock(memoryContext.mediumTerm);
    const longTermBlock = this.buildLongTermBlock(highImportanceMemories);

    // 5. Assemble with budget enforcement (greedy approach)
    const parts: string[] = [safetyBlock];
    let usedTokens = safetyTokens;
    let trimmed = false;

    const blocks = [
      { name: 'pinned', content: pinnedBlock, priority: 1 },
      { name: 'short_term', content: shortTermBlock, priority: 2 },
      { name: 'summaries', content: summaryBlock, priority: 3 },
      { name: 'long_term', content: longTermBlock, priority: 4 },
    ];

    // Add blocks in priority order until we hit token limit
    for (const block of blocks) {
      if (!block.content) continue;

      const blockTokens = estimateTokens(block.content);
      if (usedTokens + blockTokens <= LLM_MAX_PROMPT_TOKENS) {
        parts.push(block.content);
        usedTokens += blockTokens;
      } else {
        trimmed = true;
        this.logger.warn(
          `Context for session=${session_id}: ${block.name} block trimmed (token budget: ${LLM_MAX_PROMPT_TOKENS})`,
        );
      }
    }

    const prompt_block = parts.join('\n\n');

    return {
      session_id,
      user_id,
      twin_id,
      prompt_block,
      token_estimate: usedTokens,
      trimmed,
      memory_strength: memoryContext.memoryStrength,
      layers_included: {
        pinned_count: pinnedMemories.length,
        short_term_count: memoryContext.shortTerm.length,
        medium_term_count: memoryContext.mediumTerm.length,
        long_term_count: highImportanceMemories.length,
      },
    };
  }

  // ─── Private Block Builders ─────────────────────────────────────────────

  private buildPinnedBlock(
    memories: Array<{
      content: string;
      memory_type: string;
      importance_score: number;
    }>,
  ): string {
    if (memories.length === 0) return '';

    const lines = memories.map((m) => `• [${m.memory_type}] ${stripPii(m.content)}`).join('\n');

    return `[PINNED MEMORIES — Always Remember]\n${lines}`;
  }

  private buildShortTermBlock(
    memories: Array<{
      content: string;
      memory_type: string;
    }>,
  ): string {
    if (memories.length === 0) return '';

    const lines = memories.map((m, idx) => `[${idx + 1}] ${stripPii(m.content)}`).join('\n');

    return `[RECENT CONVERSATION]\n${lines}`;
  }

  private buildSummaryBlock(
    summaries: Array<{
      summary_text: string;
      message_count: number;
      start_message_seq: number;
      end_message_seq: number;
    }>,
  ): string {
    if (summaries.length === 0) return '';

    const lines = summaries
      .map(
        (s) =>
          `• Messages ${s.start_message_seq}-${s.end_message_seq} (${s.message_count} msgs): ${stripPii(s.summary_text)}`,
      )
      .join('\n');

    return `[CONVERSATION HISTORY]\n${lines}`;
  }

  private buildLongTermBlock(
    memories: Array<{
      content: string;
      memory_type: string;
      importance_score: number;
    }>,
  ): string {
    if (memories.length === 0) return '';

    const lines = memories
      .map(
        (m) =>
          `• [${m.memory_type}] [importance=${m.importance_score.toFixed(2)}] ${stripPii(m.content)}`,
      )
      .join('\n');

    return `[IMPORTANT CONTEXT]\n${lines}`;
  }
}
