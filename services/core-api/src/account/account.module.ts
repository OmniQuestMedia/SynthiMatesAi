// FIZ: Account Module
// Account management services including token purchases, membership purchases, wallet management.
// PHASE 2 ITEM 2: Added membership purchasing capability

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { MembershipModule } from '../membership/membership.module';
import { AccountController } from './account.controller';
import { AccountPurchaseService } from './account-purchase.service';
import { MembershipPurchaseService } from './membership-purchase.service';

@Module({
  imports: [PrismaModule, MembershipModule],
  controllers: [AccountController],
  providers: [AccountPurchaseService, MembershipPurchaseService],
  exports: [AccountPurchaseService, MembershipPurchaseService],
})
export class AccountModule {}
