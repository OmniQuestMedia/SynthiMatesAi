// PAYLOAD 7 — Account-Core & DreamCoins Monitoring Service
// Real-time metrics and observability for Account-Core + Safe Synthetic Twin integration.
//
// Metrics captured:
//   • DreamCoins spent on synthetic generations (by user, by twin)
//   • Payout requests (by creator, status, amount)
//   • Membership upgrades (by tier, revenue)
//   • Ledger transactions (by type, bucket, reason_code)
//   • Voice chat usage (messages sent, tokens charged)
//   • Safe Synthetic Twin generations (success/failure rate, safeguards applied)
//   • Account-Core lookups (by type: USER, CREATOR, DUAL)
//
// Phase 0: In-process Redis counters for real-time dashboard visibility.
// Phase 1: Drain to time-series DB (Prometheus/InfluxDB) via NATS subscriber.
//
// Invariants:
//   • correlation_id + reason_code on every metric event
//   • No PII — only aggregate counters and IDs
//   • All ledger transactions are observable via NATS events

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NatsService } from '../nats/nats.service';
import { NATS_TOPICS } from '../../../nats/topics.registry';

export const ACCOUNT_CORE_METRICS_RULE_ID = 'ACCOUNT_CORE_METRICS_v1';

export interface DreamCoinsSpendMetric {
  user_id: string;
  twin_id?: string;
  amount_tokens: number;
  reason_code: string;
  bucket_breakdown: {
    purchased: number;
    membership: number;
    bonus: number;
  };
  correlation_id: string;
  timestamp_utc: string;
}

export interface PayoutRequestMetric {
  creator_id: string;
  amount_tokens: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  reason_code: string;
  correlation_id: string;
  timestamp_utc: string;
}

export interface MembershipUpgradeMetric {
  user_id: string;
  from_tier: string;
  to_tier: string;
  revenue_usd: number;
  correlation_id: string;
  timestamp_utc: string;
}

export interface LedgerTransactionMetric {
  user_id: string;
  transaction_type: 'CREDIT' | 'DEBIT';
  amount_tokens: number;
  bucket: 'purchased' | 'membership' | 'bonus';
  reason_code: string;
  correlation_id: string;
  timestamp_utc: string;
}

export interface VoiceChatMetric {
  user_id: string;
  twin_id: string;
  messages_sent: number;
  tokens_charged: number;
  correlation_id: string;
  timestamp_utc: string;
}

export interface SyntheticTwinMetric {
  user_id: string;
  twin_id: string;
  success: boolean;
  safeguards_applied: string[];
  fantasy_level: number;
  input_count: number;
  correlation_id: string;
  timestamp_utc: string;
}

export interface AccountCoreLookupMetric {
  user_id: string;
  account_type: 'USER' | 'CREATOR' | 'DUAL';
  has_creator_access: boolean;
  is_verified_creator: boolean;
  correlation_id: string;
  timestamp_utc: string;
}

export interface MetricsSummary {
  total_dreamcoins_spent: number;
  total_payouts_requested: number;
  total_membership_upgrades: number;
  total_ledger_transactions: number;
  total_voice_messages: number;
  total_synthetic_generations: number;
  total_account_lookups: number;
  synthetic_success_rate_pct: number;
  top_spend_reasons: Array<{ reason_code: string; count: number }>;
  emitted_at_utc: string;
  correlation_id: string;
  rule_applied_id: string;
}

@Injectable()
export class AccountCoreMetricsService {
  private readonly logger = new Logger(AccountCoreMetricsService.name);

  // In-process counters (Phase 0 — Redis/Prometheus integration in Phase 1)
  private metrics = {
    dreamcoins_spent: 0,
    payouts_requested: 0,
    membership_upgrades: 0,
    ledger_transactions: 0,
    voice_messages: 0,
    synthetic_generations: 0,
    synthetic_successes: 0,
    account_lookups: 0,
    spend_by_reason: new Map<string, number>(),
  };

  constructor(private readonly nats: NatsService) {}

  /**
   * Track DreamCoins spend event (voice chat, synthetic generation, etc.)
   */
  trackDreamCoinsSpend(
    input: Omit<DreamCoinsSpendMetric, 'correlation_id' | 'timestamp_utc'>,
  ): void {
    const corr = randomUUID();
    const now = new Date().toISOString();

    this.metrics.dreamcoins_spent += input.amount_tokens;
    this.metrics.spend_by_reason.set(
      input.reason_code,
      (this.metrics.spend_by_reason.get(input.reason_code) ?? 0) + 1,
    );

    const metric: DreamCoinsSpendMetric = {
      ...input,
      correlation_id: corr,
      timestamp_utc: now,
    };

    this.nats.publish(NATS_TOPICS.ACCOUNT_CORE_DREAMCOINS_SPENT, {
      ...metric,
      rule_applied_id: ACCOUNT_CORE_METRICS_RULE_ID,
    });

    this.logger.log('DreamCoins spend tracked', {
      user_id: input.user_id,
      amount_tokens: input.amount_tokens,
      reason_code: input.reason_code,
      correlation_id: corr,
    });
  }

  /**
   * Track payout request event
   */
  trackPayoutRequest(input: Omit<PayoutRequestMetric, 'correlation_id' | 'timestamp_utc'>): void {
    const corr = randomUUID();
    const now = new Date().toISOString();

    this.metrics.payouts_requested += 1;

    const metric: PayoutRequestMetric = {
      ...input,
      correlation_id: corr,
      timestamp_utc: now,
    };

    this.nats.publish(NATS_TOPICS.ACCOUNT_CORE_PAYOUT_REQUESTED, {
      ...metric,
      rule_applied_id: ACCOUNT_CORE_METRICS_RULE_ID,
    });

    this.logger.log('Payout request tracked', {
      creator_id: input.creator_id,
      amount_tokens: input.amount_tokens,
      status: input.status,
      correlation_id: corr,
    });
  }

  /**
   * Track membership upgrade event
   */
  trackMembershipUpgrade(
    input: Omit<MembershipUpgradeMetric, 'correlation_id' | 'timestamp_utc'>,
  ): void {
    const corr = randomUUID();
    const now = new Date().toISOString();

    this.metrics.membership_upgrades += 1;

    const metric: MembershipUpgradeMetric = {
      ...input,
      correlation_id: corr,
      timestamp_utc: now,
    };

    this.nats.publish(NATS_TOPICS.ACCOUNT_CORE_MEMBERSHIP_UPGRADED, {
      ...metric,
      rule_applied_id: ACCOUNT_CORE_METRICS_RULE_ID,
    });

    this.logger.log('Membership upgrade tracked', {
      user_id: input.user_id,
      from_tier: input.from_tier,
      to_tier: input.to_tier,
      revenue_usd: input.revenue_usd,
      correlation_id: corr,
    });
  }

  /**
   * Track ledger transaction event
   */
  trackLedgerTransaction(
    input: Omit<LedgerTransactionMetric, 'correlation_id' | 'timestamp_utc'>,
  ): void {
    const corr = randomUUID();
    const now = new Date().toISOString();

    this.metrics.ledger_transactions += 1;

    const metric: LedgerTransactionMetric = {
      ...input,
      correlation_id: corr,
      timestamp_utc: now,
    };

    this.nats.publish(NATS_TOPICS.ACCOUNT_CORE_LEDGER_TRANSACTION, {
      ...metric,
      rule_applied_id: ACCOUNT_CORE_METRICS_RULE_ID,
    });

    this.logger.debug('Ledger transaction tracked', {
      user_id: input.user_id,
      transaction_type: input.transaction_type,
      amount_tokens: input.amount_tokens,
      bucket: input.bucket,
      reason_code: input.reason_code,
      correlation_id: corr,
    });
  }

  /**
   * Track voice chat message event
   */
  trackVoiceMessage(input: Omit<VoiceChatMetric, 'correlation_id' | 'timestamp_utc'>): void {
    const corr = randomUUID();
    const now = new Date().toISOString();

    this.metrics.voice_messages += input.messages_sent;

    const metric: VoiceChatMetric = {
      ...input,
      correlation_id: corr,
      timestamp_utc: now,
    };

    this.nats.publish(NATS_TOPICS.ACCOUNT_CORE_VOICE_MESSAGE, {
      ...metric,
      rule_applied_id: ACCOUNT_CORE_METRICS_RULE_ID,
    });

    this.logger.log('Voice message tracked', {
      user_id: input.user_id,
      twin_id: input.twin_id,
      messages_sent: input.messages_sent,
      tokens_charged: input.tokens_charged,
      correlation_id: corr,
    });
  }

  /**
   * Track synthetic twin generation event
   */
  trackSyntheticGeneration(
    input: Omit<SyntheticTwinMetric, 'correlation_id' | 'timestamp_utc'>,
  ): void {
    const corr = randomUUID();
    const now = new Date().toISOString();

    this.metrics.synthetic_generations += 1;
    if (input.success) {
      this.metrics.synthetic_successes += 1;
    }

    const metric: SyntheticTwinMetric = {
      ...input,
      correlation_id: corr,
      timestamp_utc: now,
    };

    this.nats.publish(NATS_TOPICS.ACCOUNT_CORE_SYNTHETIC_GENERATION, {
      ...metric,
      rule_applied_id: ACCOUNT_CORE_METRICS_RULE_ID,
    });

    this.logger.log('Synthetic generation tracked', {
      user_id: input.user_id,
      twin_id: input.twin_id,
      success: input.success,
      safeguards_applied: input.safeguards_applied,
      correlation_id: corr,
    });
  }

  /**
   * Track Account-Core lookup event
   */
  trackAccountLookup(
    input: Omit<AccountCoreLookupMetric, 'correlation_id' | 'timestamp_utc'>,
  ): void {
    const corr = randomUUID();
    const now = new Date().toISOString();

    this.metrics.account_lookups += 1;

    const metric: AccountCoreLookupMetric = {
      ...input,
      correlation_id: corr,
      timestamp_utc: now,
    };

    this.nats.publish(NATS_TOPICS.ACCOUNT_CORE_LOOKUP, {
      ...metric,
      rule_applied_id: ACCOUNT_CORE_METRICS_RULE_ID,
    });

    this.logger.debug('Account lookup tracked', {
      user_id: input.user_id,
      account_type: input.account_type,
      has_creator_access: input.has_creator_access,
      correlation_id: corr,
    });
  }

  /**
   * Generate and emit a summary of all metrics
   */
  emitSummary(correlation_id?: string): MetricsSummary {
    const corr = correlation_id ?? randomUUID();
    const now = new Date().toISOString();

    const synthetic_success_rate_pct =
      this.metrics.synthetic_generations > 0
        ? Math.round(
            (this.metrics.synthetic_successes / this.metrics.synthetic_generations) * 100 * 100,
          ) / 100
        : 0;

    const top_spend_reasons = Array.from(this.metrics.spend_by_reason.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([reason_code, count]) => ({ reason_code, count }));

    const summary: MetricsSummary = {
      total_dreamcoins_spent: this.metrics.dreamcoins_spent,
      total_payouts_requested: this.metrics.payouts_requested,
      total_membership_upgrades: this.metrics.membership_upgrades,
      total_ledger_transactions: this.metrics.ledger_transactions,
      total_voice_messages: this.metrics.voice_messages,
      total_synthetic_generations: this.metrics.synthetic_generations,
      total_account_lookups: this.metrics.account_lookups,
      synthetic_success_rate_pct,
      top_spend_reasons,
      emitted_at_utc: now,
      correlation_id: corr,
      rule_applied_id: ACCOUNT_CORE_METRICS_RULE_ID,
    };

    this.nats.publish(NATS_TOPICS.ACCOUNT_CORE_METRICS_SUMMARY, {
      ...summary,
      reason_code: 'METRICS_SUMMARY_EMITTED',
    });

    this.logger.log('Account-Core metrics summary emitted', {
      total_dreamcoins_spent: summary.total_dreamcoins_spent,
      total_payouts_requested: summary.total_payouts_requested,
      total_membership_upgrades: summary.total_membership_upgrades,
      synthetic_success_rate_pct,
      correlation_id: corr,
    });

    return summary;
  }

  /**
   * Get current metrics snapshot (for health/status endpoints)
   */
  getMetricsSnapshot(): {
    dreamcoins_spent: number;
    payouts_requested: number;
    membership_upgrades: number;
    ledger_transactions: number;
    voice_messages: number;
    synthetic_generations: number;
    synthetic_success_rate_pct: number;
    account_lookups: number;
  } {
    const synthetic_success_rate_pct =
      this.metrics.synthetic_generations > 0
        ? Math.round(
            (this.metrics.synthetic_successes / this.metrics.synthetic_generations) * 100 * 100,
          ) / 100
        : 0;

    return {
      dreamcoins_spent: this.metrics.dreamcoins_spent,
      payouts_requested: this.metrics.payouts_requested,
      membership_upgrades: this.metrics.membership_upgrades,
      ledger_transactions: this.metrics.ledger_transactions,
      voice_messages: this.metrics.voice_messages,
      synthetic_generations: this.metrics.synthetic_generations,
      synthetic_success_rate_pct,
      account_lookups: this.metrics.account_lookups,
    };
  }

  /**
   * Reset all metrics (test seam only — never call in production)
   */
  reset(): void {
    this.metrics = {
      dreamcoins_spent: 0,
      payouts_requested: 0,
      membership_upgrades: 0,
      ledger_transactions: 0,
      voice_messages: 0,
      synthetic_generations: 0,
      synthetic_successes: 0,
      account_lookups: 0,
      spend_by_reason: new Map(),
    };
    this.logger.warn('Account-Core metrics reset (test mode only)');
  }
}
