// tests/integration/summarization.service.spec.ts
// MEMORY-HIER-002: Test suite for auto-summarization engine

import { SummarizationService } from '../../services/memory/src/summarization.service';
import { PrismaService } from '../../services/core-api/src/prisma.service';

describe('SummarizationService', () => {
  let service: SummarizationService;
  let prisma: PrismaService;

  const mockPrisma = {
    memorySummary: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    memoryBank: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    prisma = mockPrisma as unknown as PrismaService;
    service = new SummarizationService(prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('summarizeIfNeeded', () => {
    it('returns null when threshold not reached', async () => {
      const session_id = 'sess_001';
      const twin_id = 'twin_001';
      const user_id = 'user_001';

      // Mock: no previous summaries
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce(null);
      // Mock: only 10 messages (below threshold of 25)
      mockPrisma.memoryBank.count.mockResolvedValueOnce(10);

      const result = await service.summarizeIfNeeded({
        session_id,
        twin_id,
        user_id,
      });

      expect(result).toBeNull();
    });

    it('creates summary when threshold reached', async () => {
      const session_id = 'sess_002';
      const twin_id = 'twin_002';
      const user_id = 'user_002';

      // Mock: no previous summaries
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce(null);
      // Mock: 30 messages (above threshold)
      mockPrisma.memoryBank.count.mockResolvedValueOnce(30);

      // Mock: messages to summarize
      const messages = Array.from({ length: 30 }, (_, i) => ({
        content: `Message ${i + 1}`,
        memory_type: 'FACT',
        message_seq: i + 1,
        created_at: new Date(),
      }));
      mockPrisma.memoryBank.findMany.mockResolvedValueOnce(messages);

      // Mock: summary creation
      const createdSummary = {
        id: 'summary_001',
        session_id,
        twin_id,
        user_id,
        summary_text: 'User shared: various topics',
        message_count: 30,
        start_message_seq: 1,
        end_message_seq: 30,
        summary_type: 'AUTO',
        created_at: new Date(),
        correlation_id: 'corr_001',
        reason_code: 'MEMORY_SUMMARY',
        rule_applied_id: 'MEMORY-HIER-002',
        embedding: null,
      };
      mockPrisma.memorySummary.create.mockResolvedValueOnce(createdSummary);

      const result = await service.summarizeIfNeeded({
        session_id,
        twin_id,
        user_id,
      });

      expect(result).not.toBeNull();
      expect(result?.message_count).toBe(30);
      expect(result?.start_message_seq).toBe(1);
      expect(result?.end_message_seq).toBe(30);
      expect(mockPrisma.memorySummary.create).toHaveBeenCalled();
    });

    it('summarizes only new messages after previous summary', async () => {
      const session_id = 'sess_003';
      const twin_id = 'twin_003';
      const user_id = 'user_003';

      // Mock: previous summary ended at message 20
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce({
        end_message_seq: 20,
      });
      // Mock: now have 50 total messages
      mockPrisma.memoryBank.count.mockResolvedValueOnce(50);

      // Mock: messages 21-50
      const messages = Array.from({ length: 30 }, (_, i) => ({
        content: `Message ${i + 21}`,
        memory_type: 'FACT',
        message_seq: i + 21,
        created_at: new Date(),
      }));
      mockPrisma.memoryBank.findMany.mockResolvedValueOnce(messages);

      // Mock: summary creation
      const createdSummary = {
        id: 'summary_002',
        session_id,
        twin_id,
        user_id,
        summary_text: 'Continued conversation',
        message_count: 30,
        start_message_seq: 21,
        end_message_seq: 50,
        summary_type: 'AUTO',
        created_at: new Date(),
        correlation_id: 'corr_002',
        reason_code: 'MEMORY_SUMMARY',
        rule_applied_id: 'MEMORY-HIER-002',
        embedding: null,
      };
      mockPrisma.memorySummary.create.mockResolvedValueOnce(createdSummary);

      const result = await service.summarizeIfNeeded({
        session_id,
        twin_id,
        user_id,
      });

      expect(result).not.toBeNull();
      expect(result?.start_message_seq).toBe(21);
      expect(result?.end_message_seq).toBe(50);
      expect(result?.message_count).toBe(30);
    });

    it('forces summarization when force=true', async () => {
      const session_id = 'sess_004';
      const twin_id = 'twin_004';
      const user_id = 'user_004';

      // Mock: no previous summaries
      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce(null);
      // Mock: only 5 messages (below threshold)
      mockPrisma.memoryBank.count.mockResolvedValueOnce(5);

      // Mock: messages to summarize
      const messages = Array.from({ length: 5 }, (_, i) => ({
        content: `Message ${i + 1}`,
        memory_type: 'FACT',
        message_seq: i + 1,
        created_at: new Date(),
      }));
      mockPrisma.memoryBank.findMany.mockResolvedValueOnce(messages);

      // Mock: summary creation
      const createdSummary = {
        id: 'summary_003',
        session_id,
        twin_id,
        user_id,
        summary_text: 'Manual summary',
        message_count: 5,
        start_message_seq: 1,
        end_message_seq: 5,
        summary_type: 'MANUAL',
        created_at: new Date(),
        correlation_id: 'corr_003',
        reason_code: 'MEMORY_SUMMARY',
        rule_applied_id: 'MEMORY-HIER-002',
        embedding: null,
      };
      mockPrisma.memorySummary.create.mockResolvedValueOnce(createdSummary);

      const result = await service.summarizeIfNeeded({
        session_id,
        twin_id,
        user_id,
        force: true,
      });

      expect(result).not.toBeNull();
      expect(result?.message_count).toBe(5);
    });
  });

  describe('manualSummarize', () => {
    it('forces summarization regardless of threshold', async () => {
      const session_id = 'sess_005';
      const twin_id = 'twin_005';
      const user_id = 'user_005';

      mockPrisma.memorySummary.findFirst.mockResolvedValueOnce(null);
      mockPrisma.memoryBank.count.mockResolvedValueOnce(10);

      const messages = Array.from({ length: 10 }, (_, i) => ({
        content: `Message ${i + 1}`,
        memory_type: 'FACT',
        message_seq: i + 1,
        created_at: new Date(),
      }));
      mockPrisma.memoryBank.findMany.mockResolvedValueOnce(messages);

      const createdSummary = {
        id: 'summary_004',
        session_id,
        twin_id,
        user_id,
        summary_text: 'Manual summary',
        message_count: 10,
        start_message_seq: 1,
        end_message_seq: 10,
        summary_type: 'MANUAL',
        created_at: new Date(),
        correlation_id: 'corr_004',
        reason_code: 'MEMORY_SUMMARY',
        rule_applied_id: 'MEMORY-HIER-002',
        embedding: null,
      };
      mockPrisma.memorySummary.create.mockResolvedValueOnce(createdSummary);

      const result = await service.manualSummarize(session_id, twin_id, user_id);

      expect(result).not.toBeNull();
      expect(result?.message_count).toBe(10);
    });
  });

  describe('getSessionSummaries', () => {
    it('retrieves all summaries for a session', async () => {
      const session_id = 'sess_006';

      const summaries = [
        {
          id: 's1',
          session_id,
          twin_id: 'twin_006',
          user_id: 'user_006',
          summary_text: 'Summary 1',
          message_count: 25,
          start_message_seq: 1,
          end_message_seq: 25,
          summary_type: 'AUTO',
          created_at: new Date('2026-05-24T10:00:00Z'),
          correlation_id: 'corr_s1',
          reason_code: 'MEMORY_SUMMARY',
          rule_applied_id: 'MEMORY-HIER-002',
          embedding: null,
        },
        {
          id: 's2',
          session_id,
          twin_id: 'twin_006',
          user_id: 'user_006',
          summary_text: 'Summary 2',
          message_count: 30,
          start_message_seq: 26,
          end_message_seq: 55,
          summary_type: 'AUTO',
          created_at: new Date('2026-05-24T12:00:00Z'),
          correlation_id: 'corr_s2',
          reason_code: 'MEMORY_SUMMARY',
          rule_applied_id: 'MEMORY-HIER-002',
          embedding: null,
        },
      ];

      mockPrisma.memorySummary.findMany.mockResolvedValueOnce(summaries);

      const result = await service.getSessionSummaries(session_id);

      expect(result).toHaveLength(2);
      expect(result[0].summary_text).toBe('Summary 1');
      expect(result[1].summary_text).toBe('Summary 2');
    });
  });
});
