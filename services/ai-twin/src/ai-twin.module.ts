// services/ai-twin/src/ai-twin.module.ts
import { Module } from '@nestjs/common';
import { AiTwinService } from './ai-twin.service';
import { AiTwinController } from './ai-twin.controller';
import { SyntheticPipelineService } from './synthetic-pipeline.service';
import { AiTwinSyntheticController } from '../../core-api/src/cyrano/ai-twin-synthetic.controller';
import { PrismaModule } from '../../core-api/src/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiTwinController, AiTwinSyntheticController],
  providers: [AiTwinService, SyntheticPipelineService],
  exports: [AiTwinService, SyntheticPipelineService],
})
export class AiTwinModule {}
