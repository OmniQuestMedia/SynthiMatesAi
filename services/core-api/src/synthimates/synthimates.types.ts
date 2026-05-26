// services/core-api/src/synthimates/synthimates.types.ts
// SYNTHIMATES-001: Type definitions for SynthiMates facet-based character generation

export interface FacetDimension {
  id: string;
  name: string;
  description: string | null;
  isExplicitCategory: boolean;
  createdAt: Date;
}

export interface FacetValue {
  id: string;
  dimensionId: string;
  value: string;
  description: string | null;
  isExplicit: boolean;
  createdAt: Date;
}

export interface Character {
  id: string;
  displayName: string;
  bio: string | null;
  isExplicit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterFacet {
  id: string;
  characterId: string;
  facetValueId: string;
  createdAt: Date;
}

export interface CharacterExplicitFacet {
  id: string;
  characterId: string;
  facetValueId: string;
  createdAt: Date;
}

export interface EngagementEvent {
  id: string;
  characterId: string;
  userId: string;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface PopularityWorkerState {
  id: string;
  characterId: string;
  popularityScore: number;
  lastProcessedAt: Date;
  updatedAt: Date;
}
