// PHASE 6 ITEM 3: Enhanced Creator Dashboard with real-time earnings
// WO: WO-INIT-001
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface DashboardSummary {
  creatorId: string;
  totalEarningsCents: number;
  totalEarningsTokens: number; // PHASE 6 ITEM 1: Track token earnings
  pendingPayoutCents: number;
  activeContracts: number;
  recentTipCount: number;
  activeTwins: number; // PHASE 6 ITEM 3: Count of active AI twins
  syntheticGenerations: number; // PHASE 6 ITEM 3: Total synthetic generations
  imageGenerations: number; // PHASE 6 ITEM 3: Total in-chat image generations
}

@Injectable()
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(creatorId: string): Promise<DashboardSummary> {
    // PHASE 6 ITEM 1 & 3: Aggregate real earnings from ledger

    // Get creator wallet
    const wallet = await this.prisma.canonicalWallet.findFirst({
      where: { user_id: creatorId, user_type: 'creator' },
    });

    // Count active AI twins
    const activeTwins = await this.prisma.aiTwin.count({
      where: {
        creator_id: creatorId,
        training_status: 'TRAINING_COMPLETE',
      },
    });

    // Get creator earnings from ledger
    const earningsEntries = await this.prisma.canonicalLedgerEntry.findMany({
      where: {
        wallet_id: wallet?.id || '',
        reason_code: {
          in: ['CREATOR_EARNINGS_SYNTHETIC', 'CREATOR_EARNINGS_IMAGE', 'CREATOR_EARNINGS_VIDEO'],
        },
      },
    });

    // Sum up earnings (amounts are in tokens)
    const totalEarningsTokens = earningsEntries.reduce((sum, entry) => sum + entry.amount, 0);

    // Convert tokens to cents (approximate: 1 token ≈ $0.075)
    const totalEarningsCents = Math.floor(totalEarningsTokens * 7.5);

    // Count generations by type
    const syntheticGenerations = earningsEntries.filter(
      (e) => e.reason_code === 'CREATOR_EARNINGS_SYNTHETIC',
    ).length;

    const imageGenerations = earningsEntries.filter(
      (e) => e.reason_code === 'CREATOR_EARNINGS_IMAGE',
    ).length;

    // Get available balance for payout
    const pendingPayoutCents = wallet ? Math.floor(wallet.bonus_tokens * 7.5) : 0;

    return {
      creatorId,
      totalEarningsCents,
      totalEarningsTokens,
      pendingPayoutCents,
      activeContracts: 0, // Legacy field - not used in Cyrano context
      recentTipCount: 0, // Legacy field - not used in Cyrano context
      activeTwins,
      syntheticGenerations,
      imageGenerations,
    };
  }
}
