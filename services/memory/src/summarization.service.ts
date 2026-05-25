// services/memory/src/summarization.service.ts
// MEMORY-HIER-002: Auto-Summarization Engine
//
// Automatically generates summaries of conversation segments using an LLM.
// Triggers every 20-30 messages or on user request.
// Stores summaries in MemorySummary table for medium-term recall.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface SummarizationInput {
  session_id: string;
  twin_id: string;
  user_id: string;
  /** Force summarization even if threshold not reached */
  force?: boolean;
}

export interface SummarizationResult {
  summary_id: string;
  summary_text: string;
  message_count: number;
  start_message_seq: number;
  end_message_seq: number;
  created_at: Date;
}

// Configurable summarization threshold
const SUMMARIZATION_THRESHOLD = parseInt(process.env.SUMMARIZATION_THRESHOLD ?? '25', 10) || 25;

// LLM configuration
const LLM_API_ENDPOINT = process.env.LLM_API_ENDPOINT || '';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Attempt to generate a summary for a session.
   * Returns null if summarization threshold not met (unless force=true).
   */
  async summarizeIfNeeded(input: SummarizationInput): Promise<SummarizationResult | null> {
    const { session_id, twin_id, user_id, force = false } = input;

    // Get last summarized sequence
    const lastSummary = await this.prisma.memorySummary.findFirst({
      where: { session_id },
      orderBy: { end_message_seq: 'desc' },
      select: { end_message_seq: true },
    });

    const lastSummarizedSeq = lastSummary?.end_message_seq ?? 0;

    // Get total message count
    const totalMessages = await this.prisma.memoryBank.count({
      where: { session_id },
    });

    const messagesSinceLastSummary = totalMessages - lastSummarizedSeq;

    // Check if we should summarize
    if (!force && messagesSinceLastSummary < SUMMARIZATION_THRESHOLD) {
      this.logger.debug(
        `Summarization not needed: session=${session_id} messages_since_last=${messagesSinceLastSummary} threshold=${SUMMARIZATION_THRESHOLD}`,
      );
      return null;
    }

    // Get messages to summarize
    const messagesToSummarize = await this.prisma.memoryBank.findMany({
      where: {
        session_id,
        message_seq: {
          gt: lastSummarizedSeq,
        },
      },
      orderBy: { message_seq: 'asc' },
      select: {
        content: true,
        memory_type: true,
        message_seq: true,
        created_at: true,
      },
    });

    if (messagesToSummarize.length === 0) {
      this.logger.warn(`No messages to summarize for session=${session_id}`);
      return null;
    }

    // Generate summary using LLM
    const summaryText = await this.generateSummary(messagesToSummarize.map((m) => m.content));

    const startSeq = messagesToSummarize[0].message_seq ?? lastSummarizedSeq + 1;
    const endSeq = messagesToSummarize[messagesToSummarize.length - 1].message_seq ?? totalMessages;

    // Store summary
    const summary = await this.prisma.memorySummary.create({
      data: {
        session_id,
        twin_id,
        user_id,
        summary_text: summaryText,
        message_count: messagesToSummarize.length,
        start_message_seq: startSeq,
        end_message_seq: endSeq,
        summary_type: force ? 'MANUAL' : 'AUTO',
        correlation_id: `summary_${uuidv4()}`,
        reason_code: 'MEMORY_SUMMARY',
        rule_applied_id: 'MEMORY-HIER-002',
      },
    });

    this.logger.log(
      `Summary created: session=${session_id} id=${summary.id} messages=${messagesToSummarize.length} seq=${startSeq}-${endSeq}`,
    );

    return {
      summary_id: summary.id,
      summary_text: summaryText,
      message_count: messagesToSummarize.length,
      start_message_seq: startSeq,
      end_message_seq: endSeq,
      created_at: summary.created_at,
    };
  }

  /**
   * Generate summary text using LLM.
   * Falls back to simple concatenation if LLM unavailable.
   */
  private async generateSummary(messages: string[]): Promise<string> {
    // If no LLM configured, use simple fallback
    if (!LLM_API_ENDPOINT || !LLM_API_KEY) {
      return this.generateFallbackSummary(messages);
    }

    try {
      // Build prompt for LLM
      const prompt = this.buildSummarizationPrompt(messages);

      // Call LLM API (OpenAI-compatible endpoint)
      const response = await fetch(LLM_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that creates concise, accurate summaries of conversations. Focus on key facts, preferences, and important moments. Be brief but comprehensive.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const summaryText = data.choices?.[0]?.message?.content?.trim();

      if (!summaryText) {
        throw new Error('No summary text in LLM response');
      }

      return summaryText;
    } catch (error) {
      this.logger.error(`LLM summarization failed: ${error}. Using fallback.`);
      return this.generateFallbackSummary(messages);
    }
  }

  /**
   * Build a prompt for the LLM to generate a summary.
   */
  private buildSummarizationPrompt(messages: string[]): string {
    const conversationText = messages.map((msg, idx) => `[${idx + 1}] ${msg}`).join('\n');

    return `Summarize the following conversation segment in 2-3 sentences. Focus on key facts, preferences, emotions, and important moments:\n\n${conversationText}\n\nSummary:`;
  }

  /**
   * Fallback summary when LLM is unavailable.
   * Extracts key information and creates a simple summary.
   */
  private generateFallbackSummary(messages: string[]): string {
    // Extract key facts (simple heuristic: capitalize first letter, look for patterns)
    const keyPhrases: string[] = [];

    // Look for preference/fact patterns
    const patterns = [
      /I (love|like|enjoy|prefer|hate|dislike)/i,
      /My (name|birthday|favorite|hobby) (is|are)/i,
      /I (am|was|will be|have been)/i,
    ];

    for (const message of messages) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          // Extract the sentence
          const sentences = message.split(/[.!?]+/);
          for (const sentence of sentences) {
            if (pattern.test(sentence)) {
              keyPhrases.push(sentence.trim());
              break;
            }
          }
        }
      }
    }

    // If we found key phrases, use them; otherwise use a generic summary
    if (keyPhrases.length > 0) {
      const uniquePhrases = [...new Set(keyPhrases)].slice(0, 3);
      return `User shared: ${uniquePhrases.join('. ')}.`;
    }

    // Generic fallback
    return `Conversation covered ${messages.length} messages discussing various topics.`;
  }

  /**
   * Manually trigger summarization for a session (user-requested).
   */
  async manualSummarize(
    session_id: string,
    twin_id: string,
    user_id: string,
  ): Promise<SummarizationResult | null> {
    return this.summarizeIfNeeded({
      session_id,
      twin_id,
      user_id,
      force: true,
    });
  }

  /**
   * Get all summaries for a session.
   */
  async getSessionSummaries(session_id: string) {
    return this.prisma.memorySummary.findMany({
      where: { session_id },
      orderBy: { created_at: 'desc' },
    });
  }
}
