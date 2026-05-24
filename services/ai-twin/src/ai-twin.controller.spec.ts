import { AiTwinApiController } from './ai-twin.controller';
import type { SyntheticModelResult } from './synthetic-pipeline.service';

describe('AiTwinApiController', () => {
  it('runs the synthetic pipeline with 5 placeholder images and returns timing metadata', async () => {
    const pipelineResult: SyntheticModelResult = {
      imageUrl: 'https://example.com/c2pa.png',
      metadata: {
        fantasyLevel: 0.25,
        inputCount: 5,
        safeguards: ['c2pa-watermark'],
      },
    };

    const createSyntheticModel = jest.fn().mockResolvedValue(pipelineResult);
    const controller = new AiTwinApiController({
      createSyntheticModel,
    } as never);

    const response = await controller.testSynthetic();

    expect(createSyntheticModel).toHaveBeenCalledTimes(1);
    const [buffers, fantasyLevel] = createSyntheticModel.mock.calls[0];
    expect(buffers).toHaveLength(5);
    expect(buffers.every((buffer: Buffer) => Buffer.isBuffer(buffer))).toBe(true);
    expect(fantasyLevel).toBe(0.25);
    expect(response.route).toBe('/api/ai-twin/test-synthetic');
    expect(response.testCommand).toBe('curl http://localhost:3000/api/ai-twin/test-synthetic');
    expect(response.placeholderImages).toHaveLength(5);
    expect(response.result).toEqual(pipelineResult);
    expect(response.timing.durationMs).toBeGreaterThanOrEqual(0);
  });
});
