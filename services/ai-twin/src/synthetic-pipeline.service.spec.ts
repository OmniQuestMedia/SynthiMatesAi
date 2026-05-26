import { SyntheticPipelineService } from './synthetic-pipeline.service';
import { Logger } from '@nestjs/common';

describe('SyntheticPipelineService', () => {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as never;
  const antiLookalikeGuard = {
    assertLookalikeCheckConsent: jest.fn().mockResolvedValue(undefined),
  } as never;
  const zkpConsentService = {
    assertGenerationConsent: jest.fn().mockResolvedValue(undefined),
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SYNTHETIC_GENERATION_ENDPOINT;
  });

  it('returns a C2PA-watermarked URL and exposes the safeguard in metadata', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const service = new SyntheticPipelineService(prisma, antiLookalikeGuard, zkpConsentService);
    const buffers = [1, 2, 3, 4, 5].map((value) => Buffer.from([value]));

    const result = await service.createSyntheticModel(buffers, 0.25);

    expect(result.imageUrl).toContain('https://placeholder.synthimates.ai/synthetic-preview.png');
    expect(result.imageUrl).toContain('c2pa_manifest=');
    expect(result.metadata.safeguards).toContain('c2pa-watermark');
    expect(result.metadata.inputCount).toBe(5);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('SyntheticPipeline analytics:'));
    logSpy.mockRestore();
  });
});
