// prisma/seed.ts
/* eslint-disable no-console */
// MEMB-001: Membership schema foundation seed data
// Seeds a test organization + tenant + six users (one per MembershipTier enum value),
// each with one Membership row and a matching MembershipTierTransition ledger entry.
//
// Rationale: Membership.user_id is @unique (one Membership per user, lifetime) per
// directive MEMB-001 §2. To satisfy "exactly SIX Membership rows — one per tier enum
// value" (§6.b), we seed six distinct users under a single test org+tenant triple.
// This is enum-coverage validation, not realistic user data.

import { PrismaClient, MembershipTier, TransitionTrigger } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000002';

const FACET_DIMENSIONS = [
  'Cultural Aesthetics',
  'Life Stage',
  'Personality Vibe',
  'Body Style',
  'Explicit Category',
] as const;

const FACET_VALUE_FIXTURES: ReadonlyArray<{
  dimension: (typeof FACET_DIMENSIONS)[number];
  value: string;
  isExplicit: boolean;
}> = [
  { dimension: 'Cultural Aesthetics', value: 'Alt/Goth', isExplicit: false },
  { dimension: 'Cultural Aesthetics', value: 'Glam', isExplicit: false },
  { dimension: 'Life Stage', value: 'College', isExplicit: false },
  { dimension: 'Life Stage', value: 'Professional', isExplicit: false },
  { dimension: 'Personality Vibe', value: 'Playful', isExplicit: false },
  { dimension: 'Personality Vibe', value: 'Dominant', isExplicit: false },
  { dimension: 'Body Style', value: 'Athletic', isExplicit: false },
  { dimension: 'Body Style', value: 'Curvy', isExplicit: false },
  { dimension: 'Explicit Category', value: 'BDSM', isExplicit: true },
  { dimension: 'Explicit Category', value: 'Roleplay', isExplicit: true },
  { dimension: 'Explicit Category', value: 'Fetish', isExplicit: true },
];

const PHASE_2_7_CHARACTER_ID = '00000000-0000-0000-0000-000000000201';
const PHASE_2_7_CHARACTER_NAME = 'Phase2.7 Seed Character';
const CHARACTER_CONSENT_FIXTURES: ReadonlyArray<{
  scope: 'CHARACTER_REFERENCE' | 'ANTI_LOOKALIKE' | 'ZKP_CONSENT';
  correlationId: string;
}> = [
  {
    scope: 'CHARACTER_REFERENCE',
    correlationId: 'PHASE2_7_CHARACTER_CONSENT_REFERENCE',
  },
  {
    scope: 'ANTI_LOOKALIKE',
    correlationId: 'PHASE2_7_CHARACTER_CONSENT_ANTI_LOOKALIKE',
  },
  {
    scope: 'ZKP_CONSENT',
    correlationId: 'PHASE2_7_CHARACTER_CONSENT_ZKP',
  },
];

// Deterministic per-tier user IDs so the seed is idempotent across runs.
const TIER_FIXTURES: ReadonlyArray<{
  userId: string;
  tier: MembershipTier;
  trigger: TransitionTrigger;
}> = [
  {
    userId: '00000000-0000-0000-0000-000000000011',
    tier: 'GUEST',
    trigger: 'GATE_1_GUEST_GRANTED',
  },
  {
    userId: '00000000-0000-0000-0000-000000000012',
    tier: 'VIP',
    trigger: 'GATE_2_VIP_GRANTED',
  },
  {
    userId: '00000000-0000-0000-0000-000000000013',
    tier: 'VIP_SILVER',
    trigger: 'GATE_3_PAID_TIER_PURCHASED',
  },
  {
    userId: '00000000-0000-0000-0000-000000000014',
    tier: 'VIP_GOLD',
    trigger: 'GATE_3_PAID_TIER_PURCHASED',
  },
  {
    userId: '00000000-0000-0000-0000-000000000015',
    tier: 'VIP_PLATINUM',
    trigger: 'GATE_3_PAID_TIER_PURCHASED',
  },
  {
    userId: '00000000-0000-0000-0000-000000000016',
    tier: 'VIP_DIAMOND',
    trigger: 'GATE_3_PAID_TIER_PURCHASED',
  },
];

async function main() {
  console.log('Starting MEMB-001 seed...');

  for (const fixture of TIER_FIXTURES) {
    const user = await prisma.user.upsert({
      where: { id: fixture.userId },
      update: {},
      create: {
        id: fixture.userId,
        organization_id: TEST_ORG_ID,
        tenant_id: TEST_TENANT_ID,
      },
    });

    const membership = await prisma.membership.upsert({
      where: { user_id: user.id },
      update: {
        tier: fixture.tier,
        account_status: 'ACTIVE',
        organization_id: TEST_ORG_ID,
        tenant_id: TEST_TENANT_ID,
      },
      create: {
        user_id: user.id,
        tier: fixture.tier,
        account_status: 'ACTIVE',
        organization_id: TEST_ORG_ID,
        tenant_id: TEST_TENANT_ID,
      },
    });

    console.log(`Seeded ${fixture.tier} membership for user ${user.id}`);

    await prisma.membershipTierTransition.create({
      data: {
        membership_id: membership.id,
        user_id: user.id,
        previous_tier: null,
        new_tier: fixture.tier,
        previous_status: null,
        new_status: 'ACTIVE',
        trigger_type: fixture.trigger,
        actor_id: null,
        rule_applied_id: 'MEMB-001-SEED-DATA',
        organization_id: TEST_ORG_ID,
        tenant_id: TEST_TENANT_ID,
      },
    });

    console.log(`Seeded ${fixture.trigger} transition for ${fixture.tier}`);
  }

  console.log('MEMB-001 seed complete — 6 users, 6 memberships, 6 transitions.');
}

async function seedFacetFoundation() {
  console.log('Starting facet foundation seed...');

  for (const [index, name] of FACET_DIMENSIONS.entries()) {
    await prisma.$executeRaw`
      INSERT INTO "facetdimensions" ("name", "correlation_id", "reason_code")
      VALUES (${name}, ${`PHASE2_1_DIMENSION_${index + 1}`}, 'FACET_DIMENSION_SEED')
      ON CONFLICT ("name") DO NOTHING
    `;
  }

  for (const [index, fixture] of FACET_VALUE_FIXTURES.entries()) {
    await prisma.$executeRaw`
      INSERT INTO "facetvalues" (
        "facetdimension_id",
        "value",
        "isexplicit",
        "correlation_id",
        "reason_code"
      )
      SELECT
        fd."id",
        ${fixture.value},
        ${fixture.isExplicit},
        ${`PHASE2_1_VALUE_${index + 1}`},
        'FACET_VALUE_SEED'
      FROM "facetdimensions" fd
      WHERE fd."name" = ${fixture.dimension}
      ON CONFLICT ("facetdimension_id", "value") DO UPDATE
      SET "isexplicit" = EXCLUDED."isexplicit"
    `;
  }

  console.log(
    `Facet foundation seed complete — ${FACET_DIMENSIONS.length} dimensions, ${FACET_VALUE_FIXTURES.length} values.`,
  );
}

async function seedCharacterConsents() {
  console.log('Starting character consent seed...');

  await prisma.$executeRaw`
    INSERT INTO "characters" ("id", "name", "correlation_id", "reason_code")
    VALUES (
      ${PHASE_2_7_CHARACTER_ID}::uuid,
      ${PHASE_2_7_CHARACTER_NAME},
      'PHASE2_7_CHARACTER_SEED',
      'CHARACTER_SEED'
    )
    ON CONFLICT ("id") DO UPDATE
    SET
      "name" = EXCLUDED."name",
      "reason_code" = EXCLUDED."reason_code"
  `;

  for (const [index, fixture] of CHARACTER_CONSENT_FIXTURES.entries()) {
    await prisma.$executeRaw`
      INSERT INTO "character_consents" (
        "character_id",
        "consent_scope",
        "granted_at",
        "proof_ref",
        "correlation_id",
        "reason_code"
      )
      VALUES (
        ${PHASE_2_7_CHARACTER_ID}::uuid,
        ${fixture.scope},
        CURRENT_TIMESTAMP,
        ${`PHASE2_7_PROOF_${index + 1}`},
        ${fixture.correlationId},
        'CHARACTER_CONSENT_SEED'
      )
      ON CONFLICT ("character_id", "consent_scope") DO UPDATE
      SET
        "granted_at" = EXCLUDED."granted_at",
        "revoked_at" = NULL,
        "proof_ref" = EXCLUDED."proof_ref"
    `;
  }

  console.log(
    `Character consent seed complete — ${CHARACTER_CONSENT_FIXTURES.length} consent scopes.`,
  );
}

// ── House Models ─────────────────────────────────────────────────────────────
// Deterministic creator UUID used for all platform-owned house models.
const HOUSE_MODEL_CREATOR_ID = '00000000-0000-0000-0000-000000000099';

const HOUSE_MODEL_FIXTURES: ReadonlyArray<{
  correlationId: string;
  displayName: string;
  personaPrompt: string;
  triggerWord: string;
  portal: string;
}> = [
  {
    correlationId: 'HOUSE-MODEL-001-RAVEN-STEELE',
    displayName: 'Raven Steele',
    personaPrompt:
      'Tattooed punk domme — bold, commanding, and deeply charismatic. Portal: INK_AND_STEEL.',
    triggerWord: 'raven_steele',
    portal: 'INK_AND_STEEL',
  },
  {
    correlationId: 'HOUSE-MODEL-002-LUNA-MEI',
    displayName: 'Luna Mei',
    personaPrompt:
      'Elegant kawaii companion who shifts from playful to seductive. Portal: LOTUS_BLOOM.',
    triggerWord: 'luna_mei',
    portal: 'LOTUS_BLOOM',
  },
  {
    correlationId: 'HOUSE-MODEL-003-JADE-CROSS',
    displayName: 'Jade Cross',
    personaPrompt:
      'Steel-edged alt model with a razor wit and a soft heart underneath. Portal: INK_AND_STEEL.',
    triggerWord: 'jade_cross',
    portal: 'INK_AND_STEEL',
  },
  {
    correlationId: 'HOUSE-MODEL-004-SAKURA-ROSE',
    displayName: 'Sakura Rose',
    personaPrompt:
      'Delicate yet fierce — blends traditional elegance with modern passion. Portal: LOTUS_BLOOM.',
    triggerWord: 'sakura_rose',
    portal: 'LOTUS_BLOOM',
  },
  {
    correlationId: 'HOUSE-MODEL-005-VERONICA-CHASE',
    displayName: 'Veronica Chase',
    personaPrompt:
      'Polished suburban seductress with a taste for chaos. Portal: DESPERATE_HOUSEWIVES.',
    triggerWord: 'veronica_chase',
    portal: 'DESPERATE_HOUSEWIVES',
  },
  {
    correlationId: 'HOUSE-MODEL-006-DIANA-VANCE',
    displayName: 'Diana Vance',
    personaPrompt:
      'Sophisticated neighbor with secrets and an irresistible smile. Portal: DESPERATE_HOUSEWIVES.',
    triggerWord: 'diana_vance',
    portal: 'DESPERATE_HOUSEWIVES',
  },
  {
    correlationId: 'HOUSE-MODEL-007-NOVA-SKY',
    displayName: 'Nova Sky',
    personaPrompt:
      'Bright-eyed and fearless — perpetually playful with a bold edge. Portal: BARELY_LEGAL.',
    triggerWord: 'nova_sky',
    portal: 'BARELY_LEGAL',
  },
  {
    correlationId: 'HOUSE-MODEL-008-CLEO-HART',
    displayName: 'Cleo Hart',
    personaPrompt: 'Confident and flirty with an energy that fills any room. Portal: BARELY_LEGAL.',
    triggerWord: 'cleo_hart',
    portal: 'BARELY_LEGAL',
  },
  {
    correlationId: 'HOUSE-MODEL-009-SELENE-VOSS',
    displayName: 'Selene Voss',
    personaPrompt:
      'Dark and magnetic — draws you in with a gaze that promises everything. Portal: DARK_DESIRES.',
    triggerWord: 'selene_voss',
    portal: 'DARK_DESIRES',
  },
  {
    correlationId: 'HOUSE-MODEL-010-MORGAN-BLAKE',
    displayName: 'Morgan Blake',
    personaPrompt:
      'Intense and mysterious — the kind of person you cannot stop thinking about. Portal: DARK_DESIRES.',
    triggerWord: 'morgan_blake',
    portal: 'DARK_DESIRES',
  },
];

async function seedHouseModels() {
  console.log('Starting house model seed...');

  for (const fixture of HOUSE_MODEL_FIXTURES) {
    await prisma.aiTwin.upsert({
      where: { correlation_id: fixture.correlationId },
      update: {},
      create: {
        creator_id: HOUSE_MODEL_CREATOR_ID,
        display_name: fixture.displayName,
        persona_prompt: fixture.personaPrompt,
        trigger_word: fixture.triggerWord,
        visibility: 'PLATFORM_INTERNAL',
        is_house_model: true,
        training_status: 'TRAINING_COMPLETE',
        correlation_id: fixture.correlationId,
        reason_code: 'HOUSE_MODEL_SEED',
      },
    });

    console.log(`Seeded house model: ${fixture.displayName} (${fixture.portal})`);
  }

  console.log(`House model seed complete — ${HOUSE_MODEL_FIXTURES.length} models seeded.`);
}

// ── Promo Codes ───────────────────────────────────────────────────────────────
// PROMO-001: Launch70 promo code — 70% off, valid until 2026-07-31.
// FIZ: REASON: Seed canonical launch promo code for LAUNCH70 promotion.
//      IMPACT: Writes a single row to promo_codes; used_count starts at 0.
//      CORRELATION_ID: CNZ-WORK-001-PROMO-001-SEED

async function seedPromoCodes() {
  console.log('Starting promo code seed...');

  await prisma.promoCode.upsert({
    where: { code: 'LAUNCH70' },
    update: {},
    create: {
      code: 'LAUNCH70',
      discount_percent: 70,
      expires_at: new Date('2026-07-31T23:59:59Z'),
      max_uses: 5000,
      used_count: 0,
      correlation_id: 'PROMO-001-LAUNCH70-SEED',
      reason_code: 'PROMO_SEED',
    },
  });

  console.log('Promo code seed complete — LAUNCH70 seeded.');
}

async function runAll() {
  const seedOnlyPhase21Facets = process.env.SEED_ONLY_PHASE_2_1_FACETS === 'true';

  try {
    await seedFacetFoundation();
  } catch (e) {
    console.error('Facet foundation seed failed:', e);
    throw e;
  }

  try {
    await seedCharacterConsents();
  } catch (e) {
    console.error('Character consent seed failed:', e);
    throw e;
  }

  if (seedOnlyPhase21Facets) {
    console.log('SEED_ONLY_PHASE_2_1_FACETS=true — skipping other seed domains.');
    return;
  }

  try {
    await main();
  } catch (e) {
    console.error('MEMB-001 seed failed:', e);
    throw e;
  }

  try {
    await seedHouseModels();
  } catch (e) {
    console.error('House model seed failed:', e);
    throw e;
  }

  try {
    await seedPromoCodes();
  } catch (e) {
    console.error('Promo code seed failed:', e);
    throw e;
  }
}

runAll()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
