// services/narrative-engine/src/narrative.module.ts
// CYR: Narrative Engine NestJS module
// CYR-NARR-002: Layer 2 services registered

import { Module } from '@nestjs/common';
import { NarrativeService } from './narrative.service';
import { NarrativeController } from './narrative.controller';
import { MemoryBankService } from './memory-bank.service';
import { ContextBuilderService } from './context-builder.service';
import { BranchingService } from './branching.service';

@Module({
  controllers: [NarrativeController],
  providers: [NarrativeService, MemoryBankService, ContextBuilderService, BranchingService],
  exports: [NarrativeService, MemoryBankService, ContextBuilderService, BranchingService],
})
export class NarrativeModule {}
