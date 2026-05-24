// services/ai-twin/src/curator.service.ts
// Safe Synthetic Twin curator ingestion service.
// Ingests known names and seeds celebrity_embeddings for dissimilarity checks.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';

export interface CuratorRunResult {
  processedNames: number;
  embeddingsAdded: number;
  source: string;
}

@Injectable()
export class CuratorService {
  private readonly logger = new Logger(CuratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refreshCelebrityEmbeddings(
    names: string[],
    source = 'manual-admin-trigger',
  ): Promise<CuratorRunResult> {
    const uniqueNames = Array.from(
      new Set(names.map((name) => name.trim()).filter((name) => name.length > 0)),
    );

    let embeddingsAdded = 0;
    for (const name of uniqueNames) {
      const embedding = this.buildDeterministicEmbedding(name);
      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO celebrity_embeddings (id, name, embedding, "lastUpdated", source)
           VALUES ($1, $2, $3::vector, NOW(), $4)`,
          `curator-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          embedding,
          source,
        );
        embeddingsAdded += 1;
      } catch (error) {
        this.logger.warn(`CuratorService: failed to add embedding for "${name}"`, error as Error);
      }
    }

    this.logger.log(
      `CuratorService: completed run (processedNames=${uniqueNames.length}, embeddingsAdded=${embeddingsAdded}, source=${source})`,
    );

    return {
      processedNames: uniqueNames.length,
      embeddingsAdded,
      source,
    };
  }

  private buildDeterministicEmbedding(name: string): string {
    const chars = Array.from(name);
    const vector = Array.from({ length: 512 }, (_, i) => {
      const code = chars[i % chars.length]?.charCodeAt(0) ?? 0;
      return Number((Math.sin(code + i) * 0.5).toFixed(6));
    });
    return `[${vector.join(',')}]`;
  }
}
