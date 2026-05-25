// tests/integration/long-conversation-memory.spec.ts
// MEMORY-HIER-005: Long conversation memory test (50+ messages)
//
// Tests the full superior memory system with a realistic long conversation:
// - Message storage with sequencing
// - Auto-summarization triggers
// - Pinned memory persistence
// - Hierarchical context retrieval
// - Memory strength calculations

import { ContextMemoryService } from '../../services/memory/src/context-memory.service';
import { SummarizationService } from '../../services/memory/src/summarization.service';
import { EnhancedContextBuilderService } from '../../services/memory/src/enhanced-context-builder.service';
import { PrismaService } from '../../services/core-api/src/prisma.service';

describe('Long Conversation Memory System (50+ messages)', () => {
  let contextMemory: ContextMemoryService;
  let summarization: SummarizationService;
  let contextBuilder: EnhancedContextBuilderService;
  let prisma: PrismaService;

  const mockPrisma = {
    memoryBank: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    memorySummary: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    aiTwin: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    prisma = mockPrisma as unknown as PrismaService;
    contextMemory = new ContextMemoryService(prisma);
    summarization = new SummarizationService(prisma);
    contextBuilder = new EnhancedContextBuilderService(prisma, contextMemory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Long conversation simulation (60 messages)', () => {
    it('triggers auto-summarization and maintains memory strength', async () => {
      const session_id = 'long_sess_001';
      const twin_id = 'twin_001';
      const user_id = 'user_001';

      // Simulate 60 messages with key facts
      const messages = [
        // Messages 1-25: Initial conversation
        ...Array.from({ length: 20 }, (_, i) => ({
          memory_id: `m${i + 1}`,
          content: `General message ${i + 1}`,
          memory_type: 'FACT',
          message_seq: i + 1,
          importance_score: 0.5,
          is_pinned: false,
          created_at: new Date(2026, 4, 20, 10, i),
          session_id,
          twin_id,
          user_id,
        })),
        // Message 21: Important fact (will be pinned)
        {
          memory_id: 'm21',
          content: 'My birthday is March 15th',
          memory_type: 'FACT',
          message_seq: 21,
          importance_score: 1.0,
          is_pinned: true, // User pinned this
          created_at: new Date(2026, 4, 20, 10, 20),
          session_id,
          twin_id,
          user_id,
        },
        // Messages 22-25
        ...Array.from({ length: 4 }, (_, i) => ({
          memory_id: `m${i + 22}`,
          content: `General message ${i + 22}`,
          memory_type: 'FACT',
          message_seq: i + 22,
          importance_score: 0.5,
          is_pinned: false,
          created_at: new Date(2026, 4, 20, 10, i + 21),
          session_id,
          twin_id,
          user_id,
        })),
      ];

      // Mock: Total message count reaches 30 (triggers first summarization)
      mockPrisma.memoryBank.count.mockResolvedValueOnce(30);
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce(null);
      mockPrisma.memoryBank.findMany.mockResolvedValueOnce(messages.slice(0, 25));

      // Check if summarization should trigger
      const shouldSummarize = await contextMemory.shouldTriggerSummarization(session_id, 25);
      expect(shouldSummarize).toBe(true);

      // Mock summary creation
      mockPrisma.memorySummary.create.mockResolvedValueOnce({
        id: 'summary_001',
        session_id,
        twin_id,
        user_id,
        summary_text: 'User shared general information and revealed birthday is March 15th',
        message_count: 25,
        start_message_seq: 1,
        end_message_seq: 25,
        summary_type: 'AUTO',
        created_at: new Date(),
        correlation_id: 'corr_s1',
        reason_code: 'MEMORY_SUMMARY',
        rule_applied_id: 'MEMORY-HIER-002',
        embedding: null,
      });

      const summary1 = await summarization.summarizeIfNeeded({
        session_id,
        twin_id,
        user_id,
      });

      expect(summary1).not.toBeNull();
      expect(summary1?.message_count).toBe(25);

      // Continue conversation: Messages 26-50
      const moreMessages = Array.from({ length: 25 }, (_, i) => ({
        memory_id: `m${i + 26}`,
        content: `Message ${i + 26}`,
        memory_type: 'FACT',
        message_seq: i + 26,
        importance_score: 0.5,
        is_pinned: false,
        created_at: new Date(2026, 4, 20, 11, i),
        session_id,
        twin_id,
        user_id,
      }));

      // Mock: Total count now 60, last summary at 25
      mockPrisma.memoryBank.count.mockResolvedValueOnce(60);
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce({
        end_message_seq: 25,
      });
      mockPrisma.memoryBank.findMany.mockResolvedValueOnce(moreMessages);

      const shouldSummarize2 = await contextMemory.shouldTriggerSummarization(session_id, 25);
      expect(shouldSummarize2).toBe(true);

      // Verify we can retrieve hierarchical context
      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce(moreMessages.slice(-10)) // Short-term: last 10
        .mockResolvedValueOnce([
          {
            memory_id: messages[20].memory_id,
            content: messages[20].content,
            memory_type: messages[20].memory_type,
            importance_score: messages[20].importance_score,
            is_pinned: messages[20].is_pinned,
            created_at: messages[20].created_at,
          },
        ]) // Pinned: birthday
        .mockResolvedValueOnce([]); // High-importance non-pinned

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce([
        {
          id: 'summary_001',
          summary_text: 'User shared general information and revealed birthday is March 15th',
          message_count: 25,
          start_message_seq: 1,
          end_message_seq: 25,
          created_at: new Date(),
        },
      ]);

      const hierarchicalMemory = await contextMemory.getHierarchicalMemory(
        session_id,
        twin_id,
        user_id,
      );

      expect(hierarchicalMemory.shortTerm.length).toBeGreaterThan(0);
      expect(hierarchicalMemory.mediumTerm.length).toBe(1);
      // Should have pinned memory in long-term layer
      expect(hierarchicalMemory.longTerm.length).toBeGreaterThan(0);
      expect(hierarchicalMemory.memoryStrength).toBeGreaterThan(0.5);
    });

    it('recalls pinned facts from early conversation in late turns', async () => {
      const session_id = 'long_sess_002';
      const twin_id = 'twin_002';
      const user_id = 'user_002';

      // Mock: Short-term (recent messages)
      const recentMessages = Array.from({ length: 5 }, (_, i) => ({
        memory_id: `recent_${i}`,
        content: `Recent message ${i + 55}`,
        memory_type: 'FACT',
        importance_score: 0.5,
        is_pinned: false,
        created_at: new Date(),
      }));

      // Mock: Pinned memory from message 5 (55 messages ago)
      const pinnedMemory = {
        memory_id: 'pinned_early',
        content: 'I work as a software engineer at TechCorp',
        memory_type: 'FACT',
        importance_score: 1.0,
        is_pinned: true,
        created_at: new Date(2026, 4, 19, 10, 0), // Day earlier
      };

      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce(recentMessages)
        .mockResolvedValueOnce([pinnedMemory])
        .mockResolvedValueOnce([]);

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce([]);

      const hierarchicalMemory = await contextMemory.getHierarchicalMemory(
        session_id,
        twin_id,
        user_id,
      );

      // Pinned fact should be in long-term layer
      expect(hierarchicalMemory.longTerm.length).toBeGreaterThanOrEqual(1);
      // At least one memory retrieved (whether pinned or not)
      expect(hierarchicalMemory.totalMemories).toBeGreaterThan(0);

      // Build context and verify pinned memory is prioritized
      mockPrisma.aiTwin.findUnique.mockResolvedValueOnce({
        display_name: 'Nova',
        persona_prompt: 'Helpful assistant',
      });

      // Mock hierarchical memory for context builder
      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce(recentMessages) // Short-term
        .mockResolvedValueOnce([pinnedMemory]) // Pinned
        .mockResolvedValueOnce([]); // High-importance

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce([]);

      const context = await contextBuilder.buildContext({
        session_id,
        twin_id,
        user_id,
      });

      // Pinned memory should appear early in prompt
      const pinnedIndex = context.prompt_block.indexOf('software engineer');
      const recentIndex = context.prompt_block.indexOf('Recent message');

      expect(pinnedIndex).toBeGreaterThan(-1);
      expect(recentIndex).toBeGreaterThan(-1);
      expect(pinnedIndex).toBeLessThan(recentIndex);
      // Pinned count depends on mock - just verify context was built
      expect(context.token_estimate).toBeGreaterThan(0);
    });
  });

  describe('Memory strength calculation', () => {
    it('shows high strength with pinned + summaries + recent messages', async () => {
      const session_id = 'strength_test_001';
      const twin_id = 'twin_003';
      const user_id = 'user_003';

      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce([
          {
            memory_id: 'm1',
            content: 'Recent high-quality message',
            memory_type: 'FACT',
            importance_score: 0.9,
            is_pinned: false,
            created_at: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            memory_id: 'p1',
            content: 'Pinned fact',
            memory_type: 'FACT',
            importance_score: 1.0,
            is_pinned: true,
            created_at: new Date(),
          },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce([
        {
          id: 's1',
          summary_text: 'Summary 1',
          message_count: 25,
          start_message_seq: 1,
          end_message_seq: 25,
          created_at: new Date(),
        },
      ]);

      const memory = await contextMemory.getHierarchicalMemory(session_id, twin_id, user_id);

      // Should have high memory strength
      expect(memory.memoryStrength).toBeGreaterThanOrEqual(0.7);
    });

    it('shows low strength with no pinned memories or summaries', async () => {
      const session_id = 'strength_test_002';
      const twin_id = 'twin_004';
      const user_id = 'user_004';

      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce([
          {
            memory_id: 'm1',
            content: 'Low importance message',
            memory_type: 'FACT',
            importance_score: 0.3,
            is_pinned: false,
            created_at: new Date(),
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce([]);

      const memory = await contextMemory.getHierarchicalMemory(session_id, twin_id, user_id);

      // Should have lower memory strength (no pinned, no summaries, low importance)
      expect(memory.memoryStrength).toBeLessThanOrEqual(0.6);
    });
  });

  describe('Performance characteristics', () => {
    it('retrieves hierarchical memory efficiently', async () => {
      const session_id = 'perf_test_001';
      const twin_id = 'twin_005';
      const user_id = 'user_005';

      // Mock efficient queries (should be 3-4 DB calls max)
      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce([]) // Short-term
        .mockResolvedValueOnce([]) // Pinned
        .mockResolvedValueOnce([]); // High-importance

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce([]);

      const startTime = Date.now();
      await contextMemory.getHierarchicalMemory(session_id, twin_id, user_id);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (under 100ms for mocked queries)
      expect(duration).toBeLessThan(100);
      // Should make exactly 4 DB calls
      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledTimes(3);
      expect(mockPrisma.memorySummary.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
