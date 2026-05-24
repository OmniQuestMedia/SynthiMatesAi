import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';

export interface CuratorRefreshResult {
  ok: true;
  task: 'celebrity-embedding-curator';
  queuedAt: string;
  newsApiConfigured: boolean;
  existingCount: number;
}

@Injectable()
export class CuratorService {
  private readonly logger = new Logger(CuratorService.name);
  private readonly newsApiKey = process.env.NEWS_API_KEY ?? '';

  constructor(private readonly prisma: PrismaService) {}

  async listEmbeddings() {
    return this.prisma.celebrityEmbedding.findMany({
      orderBy: { lastUpdated: 'desc' },
      select: {
        name: true,
        lastUpdated: true,
        source: true,
      },
      take: 100,
    });
  }

  async refreshGallery(): Promise<CuratorRefreshResult> {
    const existingCount = await this.prisma.celebrityEmbedding.count();
    const result: CuratorRefreshResult = {
      ok: true,
      task: 'celebrity-embedding-curator',
      queuedAt: new Date().toISOString(),
      newsApiConfigured: Boolean(this.newsApiKey),
      existingCount,
    };

    this.logger.log(
      `CuratorService: manual refresh requested, existingCount=${existingCount}, newsApiConfigured=${result.newsApiConfigured}`,
    );

    return result;
  }
}
