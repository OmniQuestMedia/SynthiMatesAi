import { Logger } from '@nestjs/common';
import { AiTwinSyntheticController } from './ai-twin-synthetic.controller';

describe('AiTwinSyntheticController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs anonymized analytics for synthetic requests', async () => {
    const createSyntheticModel = jest.fn().mockResolvedValue({
      imageUrl: 'https://example.com/safe.png',
      metadata: {
        fantasyLevel: 0.5,
        inputCount: 5,
        safeguards: ['c2pa-watermark'],
      },
    });

    // Mock PrismaService for Phase 2 wallet integration
    const mockPrismaService = {
      canonicalWallet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'wallet_test',
          user_id: 'user_test',
          purchased_tokens: 1000,
          membership_tokens: 500,
          bonus_tokens: 250,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      canonicalLedgerEntry: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const controller = new AiTwinSyntheticController(
      { createSyntheticModel } as never,
      mockPrismaService as never,
    );

    await controller.createSynthetic(
      [1, 2, 3, 4, 5].map((value) => ({ buffer: Buffer.from([value]), mimetype: 'image/png' })),
      { fantasyLevel: '0.5', userId: 'user_test' },
    );

    expect(createSyntheticModel).toHaveBeenCalledWith(expect.any(Array), 0.5, {
      characterId: undefined,
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('SyntheticController analytics:'));
    logSpy.mockRestore();
  });
});
