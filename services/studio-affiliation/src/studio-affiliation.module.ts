// services/studio-affiliation/src/studio-affiliation.module.ts
// STUDIO-AFF-001 — StudioAffiliationModule (full implementation).
// Provides StudioService + AffiliationNumberGenerator for creator-onboarding consumers.
import { Module } from '@nestjs/common';
import { StudioService } from './studio.service';
import { AffiliationNumberGenerator } from './affiliation-number.generator';

@Module({
  providers: [StudioService, AffiliationNumberGenerator],
  exports: [StudioService, AffiliationNumberGenerator],
})
export class StudioAffiliationModule {}
