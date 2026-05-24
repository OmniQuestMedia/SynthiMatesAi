// CHORE: Account-Core Shared Types
// Shared account, user, and creator types for use across services.
// This module re-exports ledger types and adds account-specific domain types.

import type { UserType, LedgerBucket, TokenType } from '../../ledger/types';

// Re-export ledger types for consumer convenience
export type { UserType, LedgerBucket, TokenType };

/**
 * Account Status — unified account state across User and Creator accounts.
 */
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'PENDING_VERIFICATION';

/**
 * Account Type — discriminator for account queries.
 */
export type AccountType = 'USER' | 'CREATOR' | 'DUAL'; // DUAL = user with creator profile

/**
 * Creator Account Profile — minimal creator account metadata.
 */
export interface CreatorAccountProfile {
  creatorId: string;
  userId: string;
  isVerified: boolean;
  streamKeyHash?: string;
  affiliationNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Account Profile — minimal user account metadata.
 */
export interface UserAccountProfile {
  userId: string;
  organizationId: string;
  tenantId: string;
  accountStatus: AccountStatus;
  isCreator: boolean;
  creatorProfileId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Unified Account View — combines user + optional creator profile.
 */
export interface UnifiedAccountView {
  user: UserAccountProfile;
  creator?: CreatorAccountProfile;
  accountType: AccountType;
}

/**
 * Membership Tier — mirrors Prisma MembershipTier enum.
 */
export type MembershipTier =
  | 'GUEST'
  | 'VIP'
  | 'VIP_SILVER'
  | 'VIP_GOLD'
  | 'VIP_PLATINUM'
  | 'VIP_DIAMOND';

/**
 * Creator Onboarding Status — mirrors Prisma CreatorOnboardingStatus enum.
 */
export type CreatorOnboardingStatus = 'PENDING' | 'AFFILIATED' | 'COMPLETE';
