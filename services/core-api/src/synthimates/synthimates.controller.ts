// services/core-api/src/synthimates/synthimates.controller.ts
// SYNTHIMATES-001: REST endpoints for SynthiMates character browsing and facet queries

import { Controller, Get, Param, Query } from '@nestjs/common';
import { SynthiMatesService } from './synthimates.service';

@Controller('synthimates')
export class SynthiMatesController {
  constructor(private readonly synthimatesService: SynthiMatesService) {}

  @Get('facets/dimensions')
  async getFacetDimensions() {
    return this.synthimatesService.getFacetDimensions();
  }

  @Get('facets/dimensions/:id')
  async getFacetDimensionById(@Param('id') id: string) {
    return this.synthimatesService.getFacetDimensionById(id);
  }

  @Get('facets/dimensions/:dimensionId/values')
  async getFacetValuesByDimension(@Param('dimensionId') dimensionId: string) {
    return this.synthimatesService.getFacetValuesByDimension(dimensionId);
  }

  @Get('characters')
  async listCharacters(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.synthimatesService.listCharacters(parsedLimit, parsedOffset);
  }

  @Get('characters/:id')
  async getCharacterById(@Param('id') id: string) {
    return this.synthimatesService.getCharacterById(id);
  }

  @Get('characters/:id/popularity')
  async getCharacterPopularity(@Param('id') id: string) {
    return this.synthimatesService.getPopularityScore(id);
  }
}
