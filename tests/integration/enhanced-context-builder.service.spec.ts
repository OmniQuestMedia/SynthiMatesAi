// tests/integration/enhanced-context-builder.service.spec.ts
// MEMORY-HIER-004: Test suite for enhanced context builder with RAG retrieval

import { EnhancedContextBuilderService } from '../../services/memory/src/enhanced-context-builder.service';
import { ContextMemoryService } from '../../services/memory/src/context-memory.service';
import { PrismaService } from '../../services/core-api/src/prisma.service';

describe('EnhancedContextBuilderService', () => {
  let service: EnhancedContextBuilderService;
  let contextMemory: ContextMemoryService;
  let prisma: PrismaService;

  const mockContextMemory = {
    getHierarchicalMemory: jest.fn(),
  };

  const mockPrisma = {
    aiTwin: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    contextMemory = mockContextMemory as unknown as ContextMemoryService;
    prisma = mockPrisma as unknown as PrismaService;
    service = new EnhancedContextBuilderService(prisma, contextMemory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildContext', () => {
    it('builds context with all memory layers', async () => {
      const session_id = 'sess_001';
      const twin_id = 'twin_001';
      const user_id = 'user_001';

      // Mock twin data
      mockPrisma.aiTwin.findUnique.mockResolvedValueOnce({
        display_name: 'Nova',
        persona_prompt: 'A friendly and helpful AI companion.',
      });

      // Mock hierarchical memory
      mockContextMemory.getHierarchicalMemory.mockResolvedValueOnce({
        shortTerm: [
          {
            memory_id: 'm1',
            content: 'I love pizza',
            memory_type: 'PREFERENCE',
            importance_score: 0.7,
            is_pinned: false,
            created_at: new Date(),
          },
        ],
        mediumTerm: [
          {
            id: 's1',
            summary_text: 'User discussed hobbies and interests',
            message_count: 20,
            start_message_seq: 1,
            end_message_seq: 20,
            created_at: new Date(),
          },
        ],
        longTerm: [
          {
            memory_id: 'p1',
            content: 'My birthday is March 15th',
            memory_type: 'FACT',
            importance_score: 1.0,
            is_pinned: true,
            created_at: new Date(),
          },
          {
            memory_id: 'm2',
            content: 'I am afraid of heights',
            memory_type: 'EMOTION',
            importance_score: 0.8,
            is_pinned: false,
            created_at: new Date(),
          },
        ],
        totalMemories: 4,
        memoryStrength: 0.85,
      });

      const result = await service.buildContext({
        session_id,
        twin_id,
        user_id,
      });

      expect(result.prompt_block).toContain('[SYSTEM]');
      expect(result.prompt_block).toContain('[PERSONA: Nova]');
      expect(result.prompt_block).toContain('[PINNED MEMORIES');
      expect(result.prompt_block).toContain('My birthday is March 15th');
      expect(result.prompt_block).toContain('[RECENT CONVERSATION]');
      expect(result.prompt_block).toContain('I love pizza');
      expect(result.prompt_block).toContain('[CONVERSATION HISTORY]');
      expect(result.prompt_block).toContain('User discussed hobbies');
      expect(result.prompt_block).toContain('[IMPORTANT CONTEXT]');
      expect(result.prompt_block).toContain('I am afraid of heights');
      expect(result.memory_strength).toBe(0.85);
      expect(result.trimmed).toBe(false);
      expect(result.layers_included.pinned_count).toBe(1);
      expect(result.layers_included.short_term_count).toBe(1);
      expect(result.layers_included.medium_term_count).toBe(1);
      expect(result.layers_included.long_term_count).toBe(1);
    });

    it('prioritizes pinned memories when token budget is tight', async () => {
      const session_id = 'sess_002';
      const twin_id = 'twin_002';
      const user_id = 'user_002';

      // Mock twin data
      mockPrisma.aiTwin.findUnique.mockResolvedValueOnce({
        display_name: 'Nova',
        persona_prompt: 'A friendly AI.',
      });

      // Mock hierarchical memory with lots of content
      const longContent = 'X'.repeat(8000); // Very long content to trigger trimming

      mockContextMemory.getHierarchicalMemory.mockResolvedValueOnce({
        shortTerm: Array.from({ length: 10 }, (_, i) => ({
          memory_id: `m${i}`,
          content: longContent,
          memory_type: 'FACT',
          importance_score: 0.5,
          is_pinned: false,
          created_at: new Date(),
        })),
        mediumTerm: [],
        longTerm: [
          {
            memory_id: 'p1',
            content: 'Critical pinned fact',
            memory_type: 'FACT',
            importance_score: 1.0,
            is_pinned: true,
            created_at: new Date(),
          },
        ],
        totalMemories: 11,
        memoryStrength: 0.9,
      });

      const result = await service.buildContext({
        session_id,
        twin_id,
        user_id,
      });

      // Pinned memories should be included
      expect(result.prompt_block).toContain('Critical pinned fact');
      expect(result.layers_included.pinned_count).toBe(1);
      // Some short-term may be trimmed
      expect(result.trimmed).toBe(true);
    });

    it('strips PII from memory content', async () => {
      const session_id = 'sess_003';
      const twin_id = 'twin_003';
      const user_id = 'user_003';

      mockPrisma.aiTwin.findUnique.mockResolvedValueOnce({
        display_name: 'Nova',
        persona_prompt: 'Helpful AI.',
      });

      mockContextMemory.getHierarchicalMemory.mockResolvedValueOnce({
        shortTerm: [
          {
            memory_id: 'm1',
            content: 'My email is user@example.com',
            memory_type: 'FACT',
            importance_score: 0.7,
            is_pinned: false,
            created_at: new Date(),
          },
        ],
        mediumTerm: [],
        longTerm: [],
        totalMemories: 1,
        memoryStrength: 0.5,
      });

      const result = await service.buildContext({
        session_id,
        twin_id,
        user_id,
      });

      // Email should be redacted
      expect(result.prompt_block).not.toContain('user@example.com');
      expect(result.prompt_block).toContain('[REDACTED]');
    });

    it('handles empty memory gracefully', async () => {
      const session_id = 'sess_004';
      const twin_id = 'twin_004';
      const user_id = 'user_004';

      mockPrisma.aiTwin.findUnique.mockResolvedValueOnce({
        display_name: 'Nova',
        persona_prompt: 'Helpful AI.',
      });

      mockContextMemory.getHierarchicalMemory.mockResolvedValueOnce({
        shortTerm: [],
        mediumTerm: [],
        longTerm: [],
        totalMemories: 0,
        memoryStrength: 0.0,
      });

      const result = await service.buildContext({
        session_id,
        twin_id,
        user_id,
      });

      // Should still have system block
      expect(result.prompt_block).toContain('[SYSTEM]');
      expect(result.prompt_block).toContain('[PERSONA: Nova]');
      // No memory blocks
      expect(result.prompt_block).not.toContain('[PINNED MEMORIES');
      expect(result.prompt_block).not.toContain('[RECENT CONVERSATION]');
      expect(result.memory_strength).toBe(0.0);
      expect(result.layers_included.pinned_count).toBe(0);
    });
  });
});
