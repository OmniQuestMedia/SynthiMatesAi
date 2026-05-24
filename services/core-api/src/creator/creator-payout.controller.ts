// FIZ: Creator Payout Controller
// REASON: Implement creator payout endpoints (Phase 1 Item 5b)
// IMPACT: Enables creators to view and request payouts
// CORRELATION_ID: PHASE1-ITEM5B-CREATOR-PAYOUTS

import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import {
  CreatorPayoutService,
  type PayoutRecord,
  type PayoutRequestInput,
  type PayoutRequestResponse,
} from './creator-payout.service';

@Controller('creator')
export class CreatorPayoutController {
  constructor(private readonly creatorPayoutService: CreatorPayoutService) {}

  /**
   * GET /api/creator/payouts/:creatorId
   * Get all payouts for a creator.
   */
  @Get('payouts/:creatorId')
  async getPayouts(@Param('creatorId') creatorId: string): Promise<PayoutRecord[]> {
    return this.creatorPayoutService.getCreatorPayouts(creatorId);
  }

  /**
   * POST /api/creator/request-payout
   * Request a payout for a creator.
   * GateGuard middleware should be applied to this route.
   */
  @Post('request-payout')
  @HttpCode(HttpStatus.OK)
  async requestPayout(@Body() input: PayoutRequestInput): Promise<PayoutRequestResponse> {
    return this.creatorPayoutService.requestPayout(input);
  }
}
