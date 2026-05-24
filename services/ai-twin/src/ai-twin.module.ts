// services/ai-twin/src/ai-twin.module.ts
import { Module } from '@nestjs/common';
import { AiTwinApiController, AiTwinController } from './ai-twin.controller';
import { AiTwinService } from './ai-twin.service';
import { SyntheticPipelineService } from './synthetic-pipeline.service';
import { AiTwinSyntheticController } from '../../core-api/src/cyrano/ai-twin-synthetic.controller';
import { PrismaModule } from '../../core-api/src/prisma.module';
import { CuratorService } from './curator.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiTwinController, AiTwinApiController, AiTwinSyntheticController],
  providers: [AiTwinService, SyntheticPipelineService, CuratorService],
  exports: [AiTwinService, SyntheticPipelineService, CuratorService],
})
export class AiTwinModule {}
