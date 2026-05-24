// WO: WO-INIT-001
// PHASE1-ITEM5B: Added creator payout endpoints
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';
import { CreatorPayoutController } from './creator-payout.controller';
import { CreatorPayoutService } from './creator-payout.service';

@Module({
  imports: [PrismaModule],
  controllers: [StatementsController, CreatorPayoutController],
  providers: [StatementsService, CreatorPayoutService],
  exports: [CreatorPayoutService],
})
export class CreatorModule {}
