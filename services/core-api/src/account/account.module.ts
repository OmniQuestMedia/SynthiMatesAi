// CHORE: Account Module
// Account management services including token purchases, wallet management.

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { AccountController } from './account.controller';
import { AccountPurchaseService } from './account-purchase.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccountController],
  providers: [AccountPurchaseService],
  exports: [AccountPurchaseService],
})
export class AccountModule {}
