// services/core-api/src/synthimates/synthimates.module.ts
// SYNTHIMATES-001: SynthiMates module for facet-based character generation

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { SynthiMatesController } from './synthimates.controller';
import { SynthiMatesService } from './synthimates.service';

@Module({
  imports: [PrismaModule],
  controllers: [SynthiMatesController],
  providers: [SynthiMatesService],
  exports: [SynthiMatesService],
})
export class SynthiMatesModule {}
