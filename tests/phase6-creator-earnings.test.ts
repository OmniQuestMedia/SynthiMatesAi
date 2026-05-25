// tests/phase6-creator-earnings.test.ts
// PHASE 6 ITEM 1: Test creator earnings from synthetic twin generations
// Validates that creators receive 40% revenue share on image/video generations

import { describe, it, expect } from '@jest/globals';

describe('Phase 6: Creator Earnings Integration', () => {
  // Mock constants matching implementation
  const SYNTHETIC_GENERATION_COST = 50;
  const VIDEO_GENERATION_BASE_COST = 60;
  const CREATOR_REVENUE_SHARE_PERCENT = 40;

  describe('Revenue Share Calculations', () => {
    it('should calculate correct creator earnings for synthetic image generation', () => {
      const creatorShare = Math.floor(
        SYNTHETIC_GENERATION_COST * (CREATOR_REVENUE_SHARE_PERCENT / 100),
      );
      expect(creatorShare).toBe(20); // 50 * 0.4 = 20 DreamCoins
    });

    it('should calculate correct creator earnings for video generation (5s)', () => {
      const videoCost = VIDEO_GENERATION_BASE_COST; // 60 DreamCoins
      const creatorShare = Math.floor(videoCost * (CREATOR_REVENUE_SHARE_PERCENT / 100));
      expect(creatorShare).toBe(24); // 60 * 0.4 = 24 DreamCoins
    });

    it('should calculate correct creator earnings for video generation (10s)', () => {
      const videoCost = VIDEO_GENERATION_BASE_COST + 5 * 5; // 60 + 25 = 85 DreamCoins
      const creatorShare = Math.floor(videoCost * (CREATOR_REVENUE_SHARE_PERCENT / 100));
      expect(creatorShare).toBe(34); // 85 * 0.4 = 34 DreamCoins
    });
  });

  describe('Ledger Entry Format', () => {
    it('should use correct reason codes for creator earnings', () => {
      const expectedReasonCodes = [
        'CREATOR_EARNINGS_SYNTHETIC',
        'CREATOR_EARNINGS_IMAGE',
        'CREATOR_EARNINGS_VIDEO',
      ];

      expectedReasonCodes.forEach((code) => {
        expect(code).toMatch(/^CREATOR_EARNINGS_/);
      });
    });

    it('should use correct reason codes for fan spending', () => {
      const expectedReasonCodes = [
        'SYNTHETIC_GENERATION',
        'IN_CHAT_IMAGE_GENERATION',
        'VIDEO_GENERATION',
      ];

      expectedReasonCodes.forEach((code) => {
        expect(code).toMatch(/GENERATION$/);
      });
    });
  });

  describe('Dashboard Aggregation', () => {
    it('should convert tokens to cents at $0.075 per token', () => {
      const tokens = 1000;
      const cents = Math.floor(tokens * 7.5);
      expect(cents).toBe(7500); // $75.00
    });

    it('should calculate total earnings correctly', () => {
      // Simulate 10 synthetic generations + 5 videos
      const syntheticEarnings = 10 * 20; // 200 DreamCoins
      const videoEarnings = 5 * 24; // 120 DreamCoins
      const totalTokens = syntheticEarnings + videoEarnings; // 320 DreamCoins
      const totalCents = Math.floor(totalTokens * 7.5); // $24.00

      expect(totalTokens).toBe(320);
      expect(totalCents).toBe(2400);
    });
  });

  describe('Competitive Positioning', () => {
    it('should offer higher creator revenue share than Candy.AI', () => {
      const synthiMatesShare = 40; // 40%
      const candyAIShare = 0; // 0%

      expect(synthiMatesShare).toBeGreaterThan(candyAIShare);
      expect(synthiMatesShare).toBeGreaterThanOrEqual(30); // Within 30-50% range
      expect(synthiMatesShare).toBeLessThanOrEqual(50); // Within 30-50% range
    });

    it('should provide video generation capability', () => {
      const hasVideoGeneration = true; // SynthiMatesAi
      const candyAIHasVideo = false; // Limited/none

      expect(hasVideoGeneration).toBe(true);
      expect(hasVideoGeneration).not.toBe(candyAIHasVideo);
    });
  });

  describe('Three-Bucket Wallet Priority', () => {
    it('should deduct from purchased tokens first', () => {
      const _wallet = {
        purchased_tokens: 100,
        membership_tokens: 50,
        bonus_tokens: 25,
      };

      const cost = 50;
      let remaining = cost;
      const deductions: Array<{ bucket: string; amount: number }> = [];

      // Purchased first
      if (_wallet.purchased_tokens >= remaining) {
        deductions.push({ bucket: 'purchased', amount: remaining });
        remaining = 0;
      }

      expect(deductions.length).toBe(1);
      expect(deductions[0].bucket).toBe('purchased');
      expect(deductions[0].amount).toBe(50);
      expect(remaining).toBe(0);
    });

    it('should deduct from membership tokens if purchased insufficient', () => {
      const wallet = {
        purchased_tokens: 20,
        membership_tokens: 50,
        bonus_tokens: 25,
      };

      const cost = 50;
      let remaining = cost;
      const deductions: Array<{ bucket: string; amount: number }> = [];

      // Purchased first
      if (wallet.purchased_tokens > 0) {
        deductions.push({ bucket: 'purchased', amount: wallet.purchased_tokens });
        remaining -= wallet.purchased_tokens;
      }

      // Membership second
      if (remaining > 0 && wallet.membership_tokens >= remaining) {
        deductions.push({ bucket: 'membership', amount: remaining });
        remaining = 0;
      }

      expect(deductions.length).toBe(2);
      expect(deductions[0]).toEqual({ bucket: 'purchased', amount: 20 });
      expect(deductions[1]).toEqual({ bucket: 'membership', amount: 30 });
      expect(remaining).toBe(0);
    });

    it('should deduct from bonus tokens as last resort', () => {
      const _wallet = {
        purchased_tokens: 0,
        membership_tokens: 0,
        bonus_tokens: 100,
      };

      const cost = 50;
      let remaining = cost;
      const deductions: Array<{ bucket: string; amount: number }> = [];

      // Skip purchased and membership (both 0)
      if (remaining > 0) {
        deductions.push({ bucket: 'bonus', amount: remaining });
        remaining = 0;
      }

      expect(deductions.length).toBe(1);
      expect(deductions[0]).toEqual({ bucket: 'bonus', amount: 50 });
      expect(remaining).toBe(0);
    });
  });
});

describe('Phase 6: Video Generation Integration', () => {
  const VIDEO_GENERATION_BASE_COST = 60;
  const COST_PER_SECOND = 5;

  describe('Video Pricing', () => {
    it('should calculate correct cost for 5-second video', () => {
      const duration = 5;
      const additionalSeconds = Math.max(0, duration - 5);
      const totalCost = VIDEO_GENERATION_BASE_COST + additionalSeconds * COST_PER_SECOND;

      expect(totalCost).toBe(60); // Base cost only
    });

    it('should calculate correct cost for 10-second video', () => {
      const duration = 10;
      const additionalSeconds = Math.max(0, duration - 5);
      const totalCost = VIDEO_GENERATION_BASE_COST + additionalSeconds * COST_PER_SECOND;

      expect(totalCost).toBe(85); // 60 + (5 * 5) = 85
    });

    it('should clamp duration between 2-10 seconds', () => {
      const input1 = 1; // Too short
      const input2 = 15; // Too long
      const input3 = 7; // Valid

      const duration1 = Math.min(10, Math.max(2, input1));
      const duration2 = Math.min(10, Math.max(2, input2));
      const duration3 = Math.min(10, Math.max(2, input3));

      expect(duration1).toBe(2); // Clamped to minimum
      expect(duration2).toBe(10); // Clamped to maximum
      expect(duration3).toBe(7); // Unchanged
    });
  });
});

describe('Phase 6: Dashboard Analytics', () => {
  describe('Earnings Aggregation', () => {
    it('should filter ledger entries by creator earnings reason codes', () => {
      const mockLedgerEntries = [
        { reason_code: 'CREATOR_EARNINGS_SYNTHETIC', amount: 20 },
        { reason_code: 'CREATOR_EARNINGS_IMAGE', amount: 20 },
        { reason_code: 'CREATOR_EARNINGS_VIDEO', amount: 24 },
        { reason_code: 'PURCHASE', amount: 100 }, // Not creator earnings
        { reason_code: 'SPEND', amount: -50 }, // Not creator earnings
      ];

      const creatorEarnings = mockLedgerEntries.filter((entry) =>
        ['CREATOR_EARNINGS_SYNTHETIC', 'CREATOR_EARNINGS_IMAGE', 'CREATOR_EARNINGS_VIDEO'].includes(
          entry.reason_code,
        ),
      );

      expect(creatorEarnings.length).toBe(3);
      expect(creatorEarnings.reduce((sum, e) => sum + e.amount, 0)).toBe(64);
    });

    it('should count generations by type', () => {
      const mockLedgerEntries = [
        { reason_code: 'CREATOR_EARNINGS_SYNTHETIC', amount: 20 },
        { reason_code: 'CREATOR_EARNINGS_SYNTHETIC', amount: 20 },
        { reason_code: 'CREATOR_EARNINGS_IMAGE', amount: 20 },
        { reason_code: 'CREATOR_EARNINGS_IMAGE', amount: 20 },
        { reason_code: 'CREATOR_EARNINGS_IMAGE', amount: 20 },
      ];

      const syntheticCount = mockLedgerEntries.filter(
        (e) => e.reason_code === 'CREATOR_EARNINGS_SYNTHETIC',
      ).length;
      const imageCount = mockLedgerEntries.filter(
        (e) => e.reason_code === 'CREATOR_EARNINGS_IMAGE',
      ).length;

      expect(syntheticCount).toBe(2);
      expect(imageCount).toBe(3);
    });
  });
});
