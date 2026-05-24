// FIZ: Account Token Purchase Controller
// REASON: Implement POST /api/account/purchase-tokens endpoint (Phase 1 Item 5a)
// IMPACT: Enables user token purchases via standardized account endpoint
// CORRELATION_ID: PHASE1-ITEM5A-PURCHASE-TOKENS

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AccountPurchaseService } from './account-purchase.service';
import type { PurchaseTokensRequest, PurchaseTokensResponse } from './account-purchase.service';

@Controller('account')
export class AccountController {
  constructor(private readonly accountPurchaseService: AccountPurchaseService) {}

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
}
