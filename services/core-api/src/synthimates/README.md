# SynthiMates Module

**SYNTHIMATES-001: Phase 2.1 — Project Setup & Database Foundation**

## Overview

The SynthiMates module provides a facet-based character generation system for creating diverse AI companion characters. Characters are built from combinations of facet values across multiple dimensions (Cultural Aesthetics, Life Stage, Personality Vibe, Body Style, etc.).

## Architecture

### Database Schema

The module uses the following database tables:

- **facet_dimensions**: Categories of character attributes (e.g., "Cultural Aesthetics", "Life Stage")
- **facet_values**: Specific values within each dimension (e.g., "Kawaii", "Gothic", "Punk")
- **characters**: AI companion character profiles
- **character_facets**: Non-explicit facet assignments for characters
- **character_explicit_facets**: Explicit/adult facet assignments (18+ only)
- **engagement_events**: User interaction tracking (views, likes, chats)
- **popularity_worker_state**: Character popularity scoring state

### Explicit Content Separation

The system enforces strict separation between explicit and non-explicit content:

- Database triggers prevent explicit facet values from being inserted into `character_facets`
- Explicit facet values must be inserted into `character_explicit_facets`
- The `is_explicit` flag on `FacetValue` controls this behavior
- The `is_explicit_category` flag on `FacetDimension` marks entire dimensions as explicit

## API Endpoints

All endpoints are prefixed with `/synthimates`:

### Facet Management

- `GET /facets/dimensions` - List all facet dimensions with their values
- `GET /facets/dimensions/:id` - Get a specific dimension with values
- `GET /facets/dimensions/:dimensionId/values` - Get values for a dimension

### Character Management

- `GET /characters` - List characters (supports ?limit and ?offset)
- `GET /characters/:id` - Get character details with all facets
- `GET /characters/:id/popularity` - Get character popularity score

## Initial Data

The seed script (`prisma/seed.ts`) populates:

1. **Cultural Aesthetics** (5 values): Kawaii, Gothic, Punk, Elegant, Casual
2. **Life Stage** (4 values): Young Adult, Mature, Experienced, Distinguished
3. **Personality Vibe** (5 values): Playful, Mysterious, Confident, Sweet, Intense
4. **Body Style** (5 values): Athletic, Curvy, Slender, Average, Petite
5. **Explicit Content Preferences** (3 values, explicit): Softcore, Hardcore, Fetish

Total: 5 dimensions, 22 facet values

## Usage Example

```typescript
import { SynthiMatesService } from './synthimates/synthimates.service';

// Get all facet dimensions
const dimensions = await synthimatesService.getFacetDimensions();

// List characters
const characters = await synthimatesService.listCharacters(20, 0);

// Get character with facets
const character = await synthimatesService.getCharacterById(characterId);

// Record engagement
await synthimatesService.recordEngagementEvent({
  characterId: '...',
  userId: '...',
  eventType: 'VIEW',
  metadata: { source: 'browse' },
});
```

## Migration

Migration: `20260526000000_synthimates_foundation/migration.sql`

Run migrations with:

```bash
yarn prisma migrate deploy
```

## Seed Data

Seed facets with:

```bash
yarn prisma db seed
```

## Testing

The module follows standard NestJS patterns. Unit tests should be added in `*.spec.ts` files alongside each service/controller.

## Future Phases

- Phase 2.2: Character generation algorithms
- Phase 2.3: Recommendation engine based on facet preferences
- Phase 2.4: Integration with Cyrano narrative engine
