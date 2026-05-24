// CHORE: Account-Core Shared Service
// Provides unified account queries across User and Creator models.

import type {
  UserAccountProfile,
  CreatorAccountProfile,
  UnifiedAccountView,
  AccountType,
} from './types';

/**
 * AccountCoreService — Shared account lookup and profile resolution.
 * This service provides read-only account queries. For writes, use domain-specific
 * services (core-api, creator-control, etc.).
 */
export class AccountCoreService {
  /**
   * Determines the account type based on user and creator profile presence.
   */
  static resolveAccountType(hasCreatorProfile: boolean): AccountType {
    return hasCreatorProfile ? 'DUAL' : 'USER';
  }

  /**
   * Builds a unified account view from user and optional creator profiles.
   */
  static buildUnifiedView(
    user: UserAccountProfile,
    creator?: CreatorAccountProfile,
  ): UnifiedAccountView {
    return {
      user,
      creator,
      accountType: AccountCoreService.resolveAccountType(!!creator),
    };
  }

  /**
   * Validates if a user has creator privileges.
   */
  static hasCreatorAccess(account: UnifiedAccountView): boolean {
    return account.user.isCreator && !!account.creator;
  }

  /**
   * Validates if a user has verified creator status.
   */
  static isVerifiedCreator(account: UnifiedAccountView): boolean {
    return AccountCoreService.hasCreatorAccess(account) && !!account.creator?.isVerified;
  }
}
