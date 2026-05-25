// FIZ: Account Controller (Tokens + Membership)
// REASON: Phase 1 Item 5a (tokens) + Phase 2 Item 2 (membership purchases)
// IMPACT: Enables user token and membership purchases via standardized account endpoints
// CORRELATION_ID: PHASE2-ITEM2-MEMBERSHIP-PURCHASE

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AccountPurchaseService } from './account-purchase.service';
import { MembershipPurchaseService } from './membership-purchase.service';
import type { PurchaseTokensRequest, PurchaseTokensResponse } from './account-purchase.service';
import type {
  PurchaseMembershipRequest,
  PurchaseMembershipResponse,
} from './membership-purchase.service';

@Controller('account')
export class AccountController {
  constructor(
    private readonly accountPurchaseService: AccountPurchaseService,
    private readonly membershipPurchaseService: MembershipPurchaseService,
  ) {}

  /**
   * POST /api/account/purchase-tokens
   * Purchase tokens for a user account.
   * GateGuard middleware should be applied to this route in app.module.ts.
   */
  @Post('purchase-tokens')
  @HttpCode(HttpStatus.OK)
  async purchaseTokens(@Body() request: PurchaseTokensRequest): Promise<PurchaseTokensResponse> {
    return this.accountPurchaseService.purchaseTokens(request);
  }

  /**
   * POST /api/account/purchase-membership
   * Purchase or upgrade membership tier for a user.
   * PHASE 2 ITEM 2: Implements membership purchasing with automatic benefit activation.
   * GateGuard middleware should be applied to this route in app.module.ts.
   */
  @Post('purchase-membership')
  @HttpCode(HttpStatus.OK)
  async purchaseMembership(
    @Body() request: PurchaseMembershipRequest,
  ): Promise<PurchaseMembershipResponse> {
    return this.membershipPurchaseService.purchaseMembership(request);
  }
}
