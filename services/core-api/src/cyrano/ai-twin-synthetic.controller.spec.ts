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
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const controller = new AiTwinSyntheticController({ createSyntheticModel } as never);

    await controller.createSynthetic(
      [1, 2, 3, 4, 5].map((value) => ({ buffer: Buffer.from([value]), mimetype: 'image/png' })),
      { fantasyLevel: '0.5' },
    );

    expect(createSyntheticModel).toHaveBeenCalledWith(expect.any(Array), 0.5);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('SyntheticController analytics:'));
    logSpy.mockRestore();
  });
});
