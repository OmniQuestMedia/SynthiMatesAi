// ui/app/admin/creator-payouts/page.ts
// PHASE 3 ITEM 3: Admin dashboard for creator payout management
// Follows render-plan convention: no JSX, structurally-testable RenderElement tree

import { el, RenderElement } from '../../../components/render-plan';
import { SEO } from '../../../config/seo';

export const ADMIN_CREATOR_PAYOUTS_PAGE_RULE_ID = 'ADMIN_CREATOR_PAYOUTS_v1';

export interface PayoutRequestRow {
  id: string;
  creator_id: string;
  creator_name: string;
  amount_czt: number;
  amount_usd: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  requested_at: string;
  processed_at?: string;
  rejection_reason?: string;
  membership_tier: string;
}

export interface PayoutAnalytics {
  total_dreamcoins_used: number;
  total_payouts_pending: number;
  total_payouts_approved: number;
  total_payouts_rejected: number;
  membership_tier_distribution: Record<string, number>;
}

export interface AdminCreatorPayoutsPageInputs {
  pending_payouts: PayoutRequestRow[];
  analytics: PayoutAnalytics;
  admin_user_id: string;
}

export interface AdminCreatorPayoutsPageRender {
  metadata: typeof SEO.admin_payouts;
  tree: RenderElement;
  rule_applied_id: string;
}

export function renderAdminCreatorPayoutsPage(
  inputs: AdminCreatorPayoutsPageInputs,
): AdminCreatorPayoutsPageRender {
  const tree = el(
    'main',
    {
      test_id: 'admin-creator-payouts-page',
      classes: ['cnz-admin-page', 'cnz-theme-dark'],
      props: {
        admin_user_id: inputs.admin_user_id,
      },
    },
    [
      renderPageHeader(),
      renderAnalyticsSummary(inputs.analytics),
      renderPendingPayoutsTable(inputs.pending_payouts, inputs.admin_user_id),
    ],
  );

  return {
    metadata: SEO.admin_payouts || {
      title: 'Creator Payouts - Admin Dashboard',
      description: 'Manage creator payout requests',
    },
    tree,
    rule_applied_id: ADMIN_CREATOR_PAYOUTS_PAGE_RULE_ID,
  };
}

function renderPageHeader(): RenderElement {
  return el(
    'header',
    {
      test_id: 'admin-payouts-header',
      classes: ['cnz-admin-page__header'],
    },
    [
      el('h1', { test_id: 'admin-payouts-title' }, ['Creator Payouts']),
      el('p', { classes: ['cnz-admin-page__subtitle'] }, [
        'Approve or reject creator payout requests with GateGuard welfare checks',
      ]),
    ],
  );
}

function renderAnalyticsSummary(analytics: PayoutAnalytics): RenderElement {
  return el(
    'section',
    {
      test_id: 'admin-payouts-analytics',
      classes: ['cnz-admin-analytics'],
      aria: { 'aria-label': 'Payout analytics summary' },
    },
    [
      el('h2', {}, ['Analytics Overview']),
      el(
        'div',
        {
          test_id: 'admin-analytics-grid',
          classes: ['cnz-admin-analytics__grid'],
        },
        [
          renderAnalyticsCard(
            'Total DreamCoins Used',
            analytics.total_dreamcoins_used.toLocaleString(),
            'total-dreamcoins',
          ),
          renderAnalyticsCard(
            'Pending Payouts',
            analytics.total_payouts_pending.toString(),
            'pending-payouts',
          ),
          renderAnalyticsCard(
            'Approved Payouts',
            analytics.total_payouts_approved.toString(),
            'approved-payouts',
          ),
          renderAnalyticsCard(
            'Rejected Payouts',
            analytics.total_payouts_rejected.toString(),
            'rejected-payouts',
          ),
        ],
      ),
      renderMembershipTierDistribution(analytics.membership_tier_distribution),
    ],
  );
}

function renderAnalyticsCard(label: string, value: string, testId: string): RenderElement {
  return el(
    'div',
    {
      test_id: `admin-analytics-${testId}`,
      classes: ['cnz-admin-analytics__card'],
    },
    [
      el('span', { classes: ['cnz-admin-analytics__label'] }, [label]),
      el('strong', { classes: ['cnz-admin-analytics__value'] }, [value]),
    ],
  );
}

function renderMembershipTierDistribution(distribution: Record<string, number>): RenderElement {
  const tiers = Object.entries(distribution);
  if (tiers.length === 0) {
    return el('div', {}, []);
  }

  return el(
    'div',
    {
      test_id: 'admin-membership-distribution',
      classes: ['cnz-admin-analytics__distribution'],
    },
    [
      el('h3', {}, ['Membership Tier Distribution']),
      el(
        'ul',
        { classes: ['cnz-tier-distribution-list'] },
        tiers.map(([tier, count]) =>
          el(
            'li',
            {
              test_id: `admin-tier-${tier}`,
              classes: ['cnz-tier-distribution-item'],
            },
            [
              el('span', { classes: ['cnz-tier-name'] }, [tier]),
              el('span', { classes: ['cnz-tier-count'] }, [`${count} users`]),
            ],
          ),
        ),
      ),
    ],
  );
}

function renderPendingPayoutsTable(
  payouts: PayoutRequestRow[],
  adminUserId: string,
): RenderElement {
  if (payouts.length === 0) {
    return el(
      'section',
      {
        test_id: 'admin-payouts-table-empty',
        classes: ['cnz-admin-payouts-table', 'cnz-admin-payouts-table--empty'],
      },
      [
        el('h2', {}, ['Pending Payout Requests']),
        el('p', {}, ['No pending payout requests at this time.']),
      ],
    );
  }

  return el(
    'section',
    {
      test_id: 'admin-payouts-table',
      classes: ['cnz-admin-payouts-table'],
      aria: { 'aria-label': 'Pending payout requests' },
    },
    [
      el('h2', {}, [`Pending Payout Requests (${payouts.length})`]),
      el(
        'table',
        {
          test_id: 'admin-payouts-table-data',
          classes: ['cnz-table', 'cnz-table--payouts'],
        },
        [
          el('thead', {}, [
            el('tr', {}, [
              el('th', {}, ['Creator']),
              el('th', {}, ['Tier']),
              el('th', {}, ['Amount (CZT)']),
              el('th', {}, ['Amount (USD)']),
              el('th', {}, ['Requested']),
              el('th', {}, ['Actions']),
            ]),
          ]),
          el(
            'tbody',
            {},
            payouts.map((payout) => renderPayoutRow(payout, adminUserId)),
          ),
        ],
      ),
    ],
  );
}

function renderPayoutRow(payout: PayoutRequestRow, adminUserId: string): RenderElement {
  return el(
    'tr',
    {
      test_id: `admin-payout-row-${payout.id}`,
      classes: ['cnz-payout-row'],
      props: {
        payout_id: payout.id,
      },
    },
    [
      el('td', {}, [payout.creator_name]),
      el('td', {}, [
        el(
          'span',
          {
            classes: ['cnz-tier-badge', `cnz-tier-badge--${payout.membership_tier.toLowerCase()}`],
          },
          [payout.membership_tier],
        ),
      ]),
      el('td', { classes: ['cnz-amount'] }, [payout.amount_czt.toLocaleString()]),
      el('td', { classes: ['cnz-amount'] }, [`$${payout.amount_usd}`]),
      el('td', {}, [new Date(payout.requested_at).toLocaleDateString()]),
      el(
        'td',
        {
          classes: ['cnz-payout-actions'],
        },
        [
          el(
            'button',
            {
              test_id: `admin-approve-btn-${payout.id}`,
              classes: ['cnz-button', 'cnz-button--success'],
              on: { click: 'approvePayout' },
              props: {
                payout_id: payout.id,
                admin_user_id: adminUserId,
              },
              aria: { 'aria-label': `Approve payout for ${payout.creator_name}` },
            },
            ['✓ Approve'],
          ),
          el(
            'button',
            {
              test_id: `admin-reject-btn-${payout.id}`,
              classes: ['cnz-button', 'cnz-button--danger'],
              on: { click: 'rejectPayout' },
              props: {
                payout_id: payout.id,
                admin_user_id: adminUserId,
              },
              aria: { 'aria-label': `Reject payout for ${payout.creator_name}` },
            },
            ['✗ Reject'],
          ),
        ],
      ),
    ],
  );
}
