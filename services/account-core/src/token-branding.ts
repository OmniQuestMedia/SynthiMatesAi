// CHORE: Token Branding Layer
// DreamCoins is the SynthiMatesAi user-facing brand name.
// Internally, we use CZT (ChatZoneTokens) per DOMAIN_GLOSSARY.md.
// This module provides display-name mapping for UI/API responses.

import { TOKEN_TYPE_CZT, type TokenType } from '../../ledger/types';

/**
 * Token Display Names — user-facing branding.
 * Internal code uses CZT exclusively (enforced by DB CHECK constraints).
 * UI-facing code can use this mapping to display "DreamCoins" to users.
 */
export const TOKEN_DISPLAY_NAMES: Record<TokenType, string> = {
  CZT: 'DreamCoins',
};

/**
 * Get the user-facing display name for a token type.
 * @param tokenType - The internal token type (always 'CZT')
 * @returns The user-facing display name ('DreamCoins')
 */
export function getTokenDisplayName(tokenType: TokenType = TOKEN_TYPE_CZT): string {
  return TOKEN_DISPLAY_NAMES[tokenType];
}

/**
 * Get the internal token type from a display name.
 * @param displayName - The user-facing name ('DreamCoins')
 * @returns The internal token type ('CZT')
 */
export function getTokenTypeFromDisplayName(displayName: string): TokenType | null {
  const entry = Object.entries(TOKEN_DISPLAY_NAMES).find(([_, name]) => name === displayName);
  return entry ? (entry[0] as TokenType) : null;
}

/**
 * Format a token amount with the display name.
 * @param amount - The token amount
 * @param tokenType - The internal token type (default: 'CZT')
 * @returns Formatted string like "150 DreamCoins"
 */
export function formatTokenAmount(amount: number, tokenType: TokenType = TOKEN_TYPE_CZT): string {
  const displayName = getTokenDisplayName(tokenType);
  return `${amount.toLocaleString()} ${displayName}`;
}
