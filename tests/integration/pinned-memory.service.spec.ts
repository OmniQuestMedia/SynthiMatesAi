// tests/integration/pinned-memory.service.spec.ts
// MEMORY-HIER-003: Test suite for pinned memory management

import { PinnedMemoryService } from '../../services/memory/src/pinned-memory.service';
import { PrismaService } from '../../services/core-api/src/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PinnedMemoryService', () => {
  let service: PinnedMemoryService;
  let prisma: PrismaService;

  const mockPrisma = {
    memoryBank: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    prisma = mockPrisma as unknown as PrismaService;
    service = new PinnedMemoryService(prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pinMemory', () => {
    it('successfully pins a memory', async () => {
      const memory_id = 'mem_001';
      const user_id = 'user_001';
      const correlation_id = 'corr_001';

      mockPrisma.memoryBank.findFirst.mockResolvedValueOnce({
        memory_id,
        user_id,
        content: 'My birthday is March 15th',
        is_pinned: false,
      });

      mockPrisma.memoryBank.update.mockResolvedValueOnce({
        memory_id,
        is_pinned: true,
      });

      await service.pinMemory({ memory_id, user_id, correlation_id });

      expect(mockPrisma.memoryBank.update).toHaveBeenCalledWith({
        where: { memory_id },
        data: { is_pinned: true },
      });
    });

    it('throws NotFoundException when memory does not exist', async () => {
      const memory_id = 'mem_999';
      const user_id = 'user_001';
      const correlation_id = 'corr_002';

      mockPrisma.memoryBank.findFirst.mockResolvedValueOnce(null);

      await expect(service.pinMemory({ memory_id, user_id, correlation_id })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when memory belongs to different user', async () => {
      const memory_id = 'mem_001';
      const user_id = 'user_002';
      const correlation_id = 'corr_003';

      mockPrisma.memoryBank.findFirst.mockResolvedValueOnce(null);

      await expect(service.pinMemory({ memory_id, user_id, correlation_id })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unpinMemory', () => {
    it('successfully unpins a memory', async () => {
      const memory_id = 'mem_001';
      const user_id = 'user_001';
      const correlation_id = 'corr_004';

      mockPrisma.memoryBank.findFirst.mockResolvedValueOnce({
        memory_id,
        user_id,
        content: 'My birthday is March 15th',
        is_pinned: true,
      });

      mockPrisma.memoryBank.update.mockResolvedValueOnce({
        memory_id,
        is_pinned: false,
      });

      await service.unpinMemory({ memory_id, user_id, correlation_id });

      expect(mockPrisma.memoryBank.update).toHaveBeenCalledWith({
        where: { memory_id },
        data: { is_pinned: false },
      });
    });
  });

  describe('getPinnedMemories', () => {
    it('retrieves all pinned memories for user + twin', async () => {
      const user_id = 'user_001';
      const twin_id = 'twin_001';

      const pinnedMemories = [
        {
          memory_id: 'mem_001',
          content: 'My birthday is March 15th',
          memory_type: 'FACT',
          importance_score: 1.0,
          created_at: new Date('2026-05-20T10:00:00Z'),
          session_id: 'sess_001',
        },
        {
          memory_id: 'mem_002',
          content: 'I love chocolate',
          memory_type: 'PREFERENCE',
          importance_score: 0.9,
          created_at: new Date('2026-05-21T10:00:00Z'),
          session_id: 'sess_001',
        },
      ];

      mockPrisma.memoryBank.findMany.mockResolvedValueOnce(pinnedMemories);

      const result = await service.getPinnedMemories(user_id, twin_id);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('My birthday is March 15th');
      expect(result[1].content).toBe('I love chocolate');
      expect(mockPrisma.memoryBank.findMany).toHaveBeenCalledWith({
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
    });

    it('returns empty array when no pinned memories', async () => {
      const user_id = 'user_002';
      const twin_id = 'twin_002';

      mockPrisma.memoryBank.findMany.mockResolvedValueOnce([]);

      const result = await service.getPinnedMemories(user_id, twin_id);

      expect(result).toHaveLength(0);
    });
  });

  describe('getPinnedCount', () => {
    it('returns the count of pinned memories', async () => {
      const user_id = 'user_001';
      const twin_id = 'twin_001';

      mockPrisma.memoryBank.count.mockResolvedValueOnce(3);

      const count = await service.getPinnedCount(user_id, twin_id);

      expect(count).toBe(3);
      expect(mockPrisma.memoryBank.count).toHaveBeenCalledWith({
        where: {
          user_id,
          twin_id,
          is_pinned: true,
        },
      });
    });
  });

  describe('deleteMemory', () => {
    it('soft deletes a memory by setting expires_at', async () => {
      const memory_id = 'mem_001';
      const user_id = 'user_001';
      const correlation_id = 'corr_005';

      mockPrisma.memoryBank.findFirst.mockResolvedValueOnce({
        memory_id,
        user_id,
        content: 'Memory to delete',
      });

      mockPrisma.memoryBank.update.mockResolvedValueOnce({
        memory_id,
        expires_at: new Date(),
      });

      await service.deleteMemory(memory_id, user_id, correlation_id);

      expect(mockPrisma.memoryBank.update).toHaveBeenCalledWith({
        where: { memory_id },
        data: { expires_at: expect.any(Date) },
      });
    });

    it('throws NotFoundException when memory does not exist', async () => {
      const memory_id = 'mem_999';
      const user_id = 'user_001';
      const correlation_id = 'corr_006';

      mockPrisma.memoryBank.findFirst.mockResolvedValueOnce(null);

      await expect(service.deleteMemory(memory_id, user_id, correlation_id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMemoryContent', () => {
    it('updates memory content', async () => {
      const memory_id = 'mem_001';
      const user_id = 'user_001';
      const new_content = 'Updated content';
      const correlation_id = 'corr_007';

      mockPrisma.memoryBank.findFirst.mockResolvedValueOnce({
        memory_id,
        user_id,
        content: 'Old content',
      });

      mockPrisma.memoryBank.update.mockResolvedValueOnce({
        memory_id,
        content: new_content,
      });

      await service.updateMemoryContent(memory_id, user_id, new_content, correlation_id);

      expect(mockPrisma.memoryBank.update).toHaveBeenCalledWith({
        where: { memory_id },
        data: { content: new_content },
      });
    });

    it('throws NotFoundException when memory does not exist', async () => {
      const memory_id = 'mem_999';
      const user_id = 'user_001';
      const new_content = 'Updated content';
      const correlation_id = 'corr_008';

      mockPrisma.memoryBank.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateMemoryContent(memory_id, user_id, new_content, correlation_id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
