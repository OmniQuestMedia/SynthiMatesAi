// services/cyrano-engines-client/src/cyrano-engines.module.ts
// CYR: Phase 7 — CyranoEngines Client Module

import { Module } from '@nestjs/common';
import { CyranoEnginesClient } from './cyrano-engines.client';

@Module({
  providers: [CyranoEnginesClient],
  exports: [CyranoEnginesClient],
})
export class CyranoEnginesModule {}
