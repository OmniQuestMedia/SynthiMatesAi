import { CuratorService } from './curator.service';

describe('CuratorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEWS_API_KEY;
  });

  it('lists celebrity embeddings in newest-first order', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { name: 'Nova Vale', lastUpdated: new Date('2026-05-24T12:00:00Z'), source: 'seed' },
      ]);
    const service = new CuratorService({
      celebrityEmbedding: {
        findMany,
        count: jest.fn(),
      },
    } as never);

    const result = await service.listEmbeddings();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { lastUpdated: 'desc' },
      select: {
        name: true,
        lastUpdated: true,
        source: true,
      },
      take: 100,
    });
    expect(result).toHaveLength(1);
  });

  it('returns a manual refresh payload with environment visibility', async () => {
    process.env.NEWS_API_KEY = 'configured';
    const count = jest.fn().mockResolvedValue(7);
    const service = new CuratorService({
      celebrityEmbedding: {
        findMany: jest.fn(),
        count,
      },
    } as never);

    const result = await service.refreshGallery();

    expect(count).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.task).toBe('celebrity-embedding-curator');
    expect(result.newsApiConfigured).toBe(true);
    expect(result.existingCount).toBe(7);
  });
});
