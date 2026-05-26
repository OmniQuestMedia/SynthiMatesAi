// services/ai-twin/src/ai-twin.module.ts
import { Module } from '@nestjs/common';
import { AiTwinApiController, AiTwinController } from './ai-twin.controller';
import { AiTwinService } from './ai-twin.service';
import { SyntheticPipelineService } from './synthetic-pipeline.service';
import { AiTwinSyntheticController } from '../../core-api/src/cyrano/ai-twin-synthetic.controller';
import { PrismaModule } from '../../core-api/src/prisma.module';
import { CuratorService } from './curator.service';
import { CharacterReferenceService } from './character-reference.service';
import { AntiLookalikeGuard } from './anti-lookalike.guard';
import { ZKPConsentService } from './zkp-consent.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiTwinController, AiTwinApiController, AiTwinSyntheticController],
  providers: [
    AiTwinService,
    SyntheticPipelineService,
    CuratorService,
    CharacterReferenceService,
    AntiLookalikeGuard,
    ZKPConsentService,
  ],
  exports: [AiTwinService, SyntheticPipelineService, CuratorService, CharacterReferenceService],
})
export class AiTwinModule {}
