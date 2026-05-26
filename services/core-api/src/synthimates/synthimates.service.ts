// services/core-api/src/synthimates/synthimates.service.ts
// SYNTHIMATES-001: Core service for SynthiMates character generation and facet management

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SynthiMatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getFacetDimensions() {
    return this.prisma.facetDimension.findMany({
      include: {
        values: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getFacetDimensionById(id: string) {
    return this.prisma.facetDimension.findUnique({
      where: { id },
      include: {
        values: true,
      },
    });
  }

  async getFacetValuesByDimension(dimensionId: string) {
    return this.prisma.facetValue.findMany({
      where: { dimension_id: dimensionId },
      orderBy: {
        value: 'asc',
      },
    });
  }

  async getCharacterById(id: string) {
    return this.prisma.character.findUnique({
      where: { id },
      include: {
        facets: {
          include: {
            facetValue: {
              include: {
                dimension: true,
              },
            },
          },
        },
        explicitFacets: {
          include: {
            facetValue: {
              include: {
                dimension: true,
              },
            },
          },
        },
      },
    });
  }

  async listCharacters(limit = 20, offset = 0) {
    return this.prisma.character.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async recordEngagementEvent(data: {
    characterId: string;
    userId: string;
    eventType: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.engagementEvent.create({
      data: {
        character_id: data.characterId,
        user_id: data.userId,
        event_type: data.eventType,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async getPopularityScore(characterId: string) {
    return this.prisma.popularityWorkerState.findUnique({
      where: { character_id: characterId },
    });
  }
}
