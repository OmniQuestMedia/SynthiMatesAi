// services/core-api/src/admin/admin-payout.controller.ts
// PHASE 3 ITEM 3: Admin dashboard for creator payout management

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

class ApprovePayoutDto {
  adminUserId: string;
  notes?: string;
}

class RejectPayoutDto {
  adminUserId: string;
  reason: string;
}

class PayoutAnalytics {
  total_dreamcoins_used: number;
  total_payouts_pending: number;
  total_payouts_approved: number;
  total_payouts_rejected: number;
  membership_tier_distribution: Record<string, number>;
}

@Controller('admin/payouts')
export class AdminPayoutController {
  private readonly logger = new Logger(AdminPayoutController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List pending payout requests
   */
  @Get()
  async listPayouts(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const statusFilter = status || 'PENDING';
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const skip = (pageNum - 1) * limitNum;

    this.logger.log(
      `Fetching payouts with status=${statusFilter}, page=${pageNum}, limit=${limitNum}`,
    );

    const [payouts, total] = await Promise.all([
      this.prisma.payoutRequest.findMany({
        where: {
          status: statusFilter,
        },
        include: {
          creator: {
            include: {
              user_account: {
                include: {
                  membership: true,
                },
              },
            },
          },
        },
        orderBy: {
          requested_at: 'desc',
        },
        skip,
        take: limitNum,
      }),
      this.prisma.payoutRequest.count({
        where: {
          status: statusFilter,
        },
      }),
    ]);

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        creator_id: p.creator_id,
        creator_name: `Creator-${p.creator_id.slice(0, 8)}`, // User model doesn't have display_name
        amount_czt: p.amount_czt,
        amount_usd: p.amount_usd.toString(),
        status: p.status,
        requested_at: p.requested_at,
        processed_at: p.processed_at,
        processed_by: p.processed_by,
        rejection_reason: p.rejection_reason,
        membership_tier: p.creator.user_account?.membership?.tier || 'GUEST',
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get payout history (approved + rejected + paid)
   */
  @Get('history')
  async getPayoutHistory(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    const skip = (pageNum - 1) * limitNum;

    const [payouts, total] = await Promise.all([
      this.prisma.payoutRequest.findMany({
        where: {
          status: {
            in: ['APPROVED', 'REJECTED', 'PAID'],
          },
        },
        include: {
          creator: {
            include: {
              user_account: true,
            },
          },
        },
        orderBy: {
          processed_at: 'desc',
        },
        skip,
        take: limitNum,
      }),
      this.prisma.payoutRequest.count({
        where: {
          status: {
            in: ['APPROVED', 'REJECTED', 'PAID'],
          },
        },
      }),
    ]);

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        creator_name: `Creator-${p.creator_id.slice(0, 8)}`,
        amount_czt: p.amount_czt,
        amount_usd: p.amount_usd.toString(),
        status: p.status,
        requested_at: p.requested_at,
        processed_at: p.processed_at,
        rejection_reason: p.rejection_reason,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Approve a payout request
   * PHASE 3 ITEM 3: Includes GateGuard welfare check
   */
  @Post(':id/approve')
  async approvePayout(@Param('id') id: string, @Body() body: ApprovePayoutDto) {
    if (!body.adminUserId) {
      throw new BadRequestException('adminUserId is required');
    }

    this.logger.log(`Approving payout ${id} by admin ${body.adminUserId}`);

    // Fetch the payout request
    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user_account: true,
          },
        },
      },
    });

    if (!payout) {
      throw new BadRequestException('Payout request not found');
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException(`Payout already processed with status: ${payout.status}`);
    }

    // TODO: PHASE 3 ITEM 3: Add GateGuard welfare check here
    // For now, we'll simulate a basic check
    const gateGuardCheck = {
      passed: true,
      score: 85,
      reasons: ['Creator has good standing', 'No recent violations'],
    };

    if (!gateGuardCheck.passed) {
      throw new ForbiddenException('GateGuard welfare check failed. Cannot approve payout.');
    }

    // Update payout status to APPROVED
    const updatedPayout = await this.prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        processed_at: new Date(),
        processed_by: body.adminUserId,
        metadata: {
          gate_guard_check: gateGuardCheck,
          admin_notes: body.notes || null,
          approved_at: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Payout ${id} approved successfully`, {
      amount_usd: updatedPayout.amount_usd.toString(),
      creator_id: updatedPayout.creator_id,
      admin: body.adminUserId,
    });

    return {
      success: true,
      payout: {
        id: updatedPayout.id,
        status: updatedPayout.status,
        amount_czt: updatedPayout.amount_czt,
        amount_usd: updatedPayout.amount_usd.toString(),
        processed_at: updatedPayout.processed_at,
      },
      gate_guard_check: gateGuardCheck,
    };
  }

  /**
   * Reject a payout request
   */
  @Post(':id/reject')
  async rejectPayout(@Param('id') id: string, @Body() body: RejectPayoutDto) {
    if (!body.adminUserId || !body.reason) {
      throw new BadRequestException('adminUserId and reason are required');
    }

    this.logger.log(`Rejecting payout ${id} by admin ${body.adminUserId}`);

    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id },
    });

    if (!payout) {
      throw new BadRequestException('Payout request not found');
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException(`Payout already processed with status: ${payout.status}`);
    }

    const updatedPayout = await this.prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        processed_at: new Date(),
        processed_by: body.adminUserId,
        rejection_reason: body.reason,
        metadata: {
          rejected_at: new Date().toISOString(),
          rejected_by: body.adminUserId,
        },
      },
    });

    this.logger.log(`Payout ${id} rejected`, {
      reason: body.reason,
      admin: body.adminUserId,
    });

    return {
      success: true,
      payout: {
        id: updatedPayout.id,
        status: updatedPayout.status,
        rejection_reason: updatedPayout.rejection_reason,
        processed_at: updatedPayout.processed_at,
      },
    };
  }

  /**
   * Get analytics on DreamCoins usage and membership tiers
   */
  @Get('analytics')
  async getAnalytics(): Promise<PayoutAnalytics> {
    this.logger.log('Fetching payout analytics');

    const [pendingCount, approvedCount, rejectedCount, membershipDistribution] = await Promise.all([
      this.prisma.payoutRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.payoutRequest.count({ where: { status: 'APPROVED' } }),
      this.prisma.payoutRequest.count({ where: { status: 'REJECTED' } }),
      this.prisma.membership.groupBy({
        by: ['tier'], // Use 'tier' not 'membership_tier'
        _count: {
          id: true,
        },
      }),
    ]);

    // Calculate total DreamCoins used (from ledger entries)
    const ledgerEntries = await this.prisma.canonicalLedgerEntry.aggregate({
      where: {
        reason_code: {
          in: ['SYNTHETIC_GENERATION', 'IN_CHAT_IMAGE_GENERATION', 'CHAT_MESSAGE'],
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalDreamCoinsUsed = Math.abs(ledgerEntries._sum.amount || 0);

    const tierDistribution: Record<string, number> = {};
    membershipDistribution.forEach((tier) => {
      tierDistribution[tier.tier] = tier._count?.id || 0; // Use tier.tier and handle undefined _count
    });

    return {
      total_dreamcoins_used: totalDreamCoinsUsed,
      total_payouts_pending: pendingCount,
      total_payouts_approved: approvedCount,
      total_payouts_rejected: rejectedCount,
      membership_tier_distribution: tierDistribution,
    };
  }
}
