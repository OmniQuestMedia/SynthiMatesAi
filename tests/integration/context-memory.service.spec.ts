// tests/integration/context-memory.service.spec.ts
// MEMORY-HIER-001: Test suite for hierarchical memory retrieval

import { ContextMemoryService } from '../../services/memory/src/context-memory.service';
import { PrismaService } from '../../services/core-api/src/prisma.service';

describe('ContextMemoryService', () => {
  let service: ContextMemoryService;
  let prisma: PrismaService;

  const mockPrisma = {
    memoryBank: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    memorySummary: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    prisma = mockPrisma as unknown as PrismaService;
    service = new ContextMemoryService(prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHierarchicalMemory', () => {
    it('retrieves short-term, medium-term, and long-term memories', async () => {
      const session_id = 'sess_001';
      const twin_id = 'twin_001';
      const user_id = 'user_001';

      // Mock short-term memories
      const shortTermMemories = [
        {
          memory_id: 'm1',
          content: 'I love pizza',
          memory_type: 'PREFERENCE',
          importance_score: 0.7,
          is_pinned: false,
          created_at: new Date('2026-05-24T10:00:00Z'),
        },
        {
          memory_id: 'm2',
          content: 'My name is Alice',
          memory_type: 'FACT',
          importance_score: 0.9,
          is_pinned: false,
          created_at: new Date('2026-05-24T11:00:00Z'),
        },
      ];

      // Mock medium-term summaries
      const mediumTermSummaries = [
        {
          id: 's1',
          summary_text: 'User discussed their favorite foods and hobbies',
          message_count: 20,
          start_message_seq: 1,
          end_message_seq: 20,
          created_at: new Date('2026-05-23T10:00:00Z'),
        },
      ];

      // Mock pinned memories
      const pinnedMemories = [
        {
          memory_id: 'm3',
          content: 'My birthday is March 15th',
          memory_type: 'FACT',
          importance_score: 1.0,
          is_pinned: true,
          created_at: new Date('2026-05-20T10:00:00Z'),
        },
      ];

      // Mock high-importance memories
      const highImportanceMemories = [
        {
          memory_id: 'm4',
          content: 'I am afraid of heights',
          memory_type: 'EMOTION',
          importance_score: 0.8,
          is_pinned: false,
          created_at: new Date('2026-05-22T10:00:00Z'),
        },
      ];

      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce(shortTermMemories.slice().reverse()) // Short-term (reversed)
        .mockResolvedValueOnce(pinnedMemories) // Pinned
        .mockResolvedValueOnce(highImportanceMemories); // High-importance

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce(mediumTermSummaries);

      const result = await service.getHierarchicalMemory(session_id, twin_id, user_id);

      expect(result.shortTerm).toHaveLength(2);
      expect(result.shortTerm[0].content).toBe('I love pizza');
      expect(result.mediumTerm).toHaveLength(1);
      expect(result.mediumTerm[0].summary_text).toContain('favorite foods');
      expect(result.longTerm).toHaveLength(2);
      expect(result.longTerm[0].is_pinned).toBe(true);
      expect(result.totalMemories).toBe(5);
      expect(result.memoryStrength).toBeGreaterThan(0);
    });

    it('prioritizes pinned memories in long-term layer', async () => {
      const session_id = 'sess_002';
      const twin_id = 'twin_002';
      const user_id = 'user_002';

      const pinnedMemories = [
        {
          memory_id: 'p1',
          content: 'Pinned fact 1',
          memory_type: 'FACT',
          importance_score: 0.6,
          is_pinned: true,
          created_at: new Date('2026-05-20T10:00:00Z'),
        },
        {
          memory_id: 'p2',
          content: 'Pinned fact 2',
          memory_type: 'FACT',
          importance_score: 0.7,
          is_pinned: true,
          created_at: new Date('2026-05-21T10:00:00Z'),
        },
      ];

      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce([]) // Short-term
        .mockResolvedValueOnce(pinnedMemories) // Pinned
        .mockResolvedValueOnce([]); // High-importance

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce([]);

      const result = await service.getHierarchicalMemory(session_id, twin_id, user_id, {
        longTermCount: 5,
      });

      expect(result.longTerm).toHaveLength(2);
      expect(result.longTerm.every((m) => m.is_pinned)).toBe(true);
    });

    it('calculates memory strength correctly', async () => {
      const session_id = 'sess_003';
      const twin_id = 'twin_003';
      const user_id = 'user_003';

      const shortTermMemories = [
        {
          memory_id: 'm1',
          content: 'Recent memory',
          memory_type: 'FACT',
          importance_score: 0.9,
          is_pinned: false,
          created_at: new Date('2026-05-24T10:00:00Z'),
        },
      ];

      const mediumTermSummaries = [
        {
          id: 's1',
          summary_text: 'Summary 1',
          message_count: 25,
          start_message_seq: 1,
          end_message_seq: 25,
          created_at: new Date('2026-05-23T10:00:00Z'),
        },
      ];

      const pinnedMemories = [
        {
          memory_id: 'p1',
          content: 'Pinned memory',
          memory_type: 'FACT',
          importance_score: 1.0,
          is_pinned: true,
          created_at: new Date('2026-05-20T10:00:00Z'),
        },
      ];

      mockPrisma.memoryBank.findMany
        .mockResolvedValueOnce(shortTermMemories)
        .mockResolvedValueOnce(pinnedMemories)
        .mockResolvedValueOnce([]);

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce(mediumTermSummaries);

      const result = await service.getHierarchicalMemory(session_id, twin_id, user_id);

      // Should have high memory strength: good importance + summaries + pinned
      expect(result.memoryStrength).toBeGreaterThanOrEqual(0.7);
      expect(result.memoryStrength).toBeLessThanOrEqual(1.0);
    });
  });

  describe('getSessionMessageCount', () => {
    it('returns the total message count for a session', async () => {
      const session_id = 'sess_001';
      mockPrisma.memoryBank.count.mockResolvedValueOnce(42);

      const count = await service.getSessionMessageCount(session_id);

      expect(count).toBe(42);
      expect(mockPrisma.memoryBank.count).toHaveBeenCalledWith({
        where: { session_id },
      });
    });
  });

  describe('getLastSummarizedSequence', () => {
    it('returns the last summarized message sequence', async () => {
      const session_id = 'sess_001';
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce({
        end_message_seq: 25,
      });

      const seq = await service.getLastSummarizedSequence(session_id);

      expect(seq).toBe(25);
    });

    it('returns 0 if no summaries exist', async () => {
      const session_id = 'sess_002';
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce(null);

      const seq = await service.getLastSummarizedSequence(session_id);

      expect(seq).toBe(0);
    });
  });

  describe('shouldTriggerSummarization', () => {
    it('returns true when threshold is reached', async () => {
      const session_id = 'sess_001';
      mockPrisma.memoryBank.count.mockResolvedValueOnce(50);
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce({
        end_message_seq: 20,
      });

      const shouldTrigger = await service.shouldTriggerSummarization(session_id, 25);

      expect(shouldTrigger).toBe(true);
    });

    it('returns false when threshold is not reached', async () => {
      const session_id = 'sess_002';
      mockPrisma.memoryBank.count.mockResolvedValueOnce(30);
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce({
        end_message_seq: 20,
      });

      const shouldTrigger = await service.shouldTriggerSummarization(session_id, 25);

      expect(shouldTrigger).toBe(false);
    });

    it('handles first-time summarization correctly', async () => {
      const session_id = 'sess_003';
      mockPrisma.memoryBank.count.mockResolvedValueOnce(30);
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce(null);

      const shouldTrigger = await service.shouldTriggerSummarization(session_id, 25);

      expect(shouldTrigger).toBe(true);
    });
  });
});
