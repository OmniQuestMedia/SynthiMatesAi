// CHORE: Diamond Concierge Integration Layer
// Provides easy access to Diamond Concierge pricing and membership tier benefits.
// This module integrates the diamond-concierge service with the account-core module.

import type { MembershipTier } from './types';

/**
 * Diamond Tier Benefits — feature access by membership tier.
 */
export interface TierBenefits {
  tier: MembershipTier;
  canPurchaseDiamond: boolean;
  volumeDiscounts: boolean;
  velocityPricing: boolean;
  safetyNetAccess: boolean;
  conciergeSupport: boolean;
  prioritySupport: boolean;
}

/**
 * Resolves membership tier benefits.
 * Based on REDBOOK §4 — Diamond tier access requires VIP_DIAMOND status.
 */
export function resolveTierBenefits(tier: MembershipTier): TierBenefits {
  const isDiamond = tier === 'VIP_DIAMOND';
  const isVIP = tier.startsWith('VIP');

  return {
    tier,
    canPurchaseDiamond: isDiamond,
    volumeDiscounts: isDiamond,
    velocityPricing: isDiamond,
    safetyNetAccess: isDiamond,
    conciergeSupport: isDiamond,
    prioritySupport: isVIP,
  };
}

/**
 * Validates if a user can access Diamond Concierge features.
 */
export function canAccessDiamondTier(tier: MembershipTier): boolean {
  return tier === 'VIP_DIAMOND';
}

/**
 * Validates if a user has VIP-level access (any VIP tier).
 */
export function hasVIPAccess(tier: MembershipTier): boolean {
  return tier.startsWith('VIP');
}

/**
 * Diamond Purchase Volume Tiers — mirrors governance.config.DIAMOND_TIER.VOLUME_TIERS
 * These are display-only for UI. Actual pricing logic lives in DiamondConciergeService.
 */
export const DIAMOND_VOLUME_TIERS = [
  { minTokens: 10_000, maxTokens: 27_499, label: 'Bronze', description: 'Entry tier' },
  { minTokens: 30_000, maxTokens: 57_499, label: 'Silver', description: 'Mid tier' },
  { minTokens: 60_000, maxTokens: Infinity, label: 'Gold', description: 'Premium tier' },
] as const;

/**
 * Diamond Velocity Options — mirrors VELOCITY_MULTIPLIERS
 * These are display-only for UI. Actual pricing logic lives in DiamondConciergeService.
 */
export const DIAMOND_VELOCITY_OPTIONS = [
  { days: 14, label: '14 days', multiplier: 1.0 },
  { days: 30, label: '30 days', multiplier: 1.0 },
  { days: 90, label: '90 days', multiplier: 1.08 },
  { days: 180, label: '180 days', multiplier: 1.12 },
  { days: 366, label: '1 year', multiplier: 1.15 },
] as const;
