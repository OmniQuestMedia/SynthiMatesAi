# STUDIO-AFF-001-IMPL — REPORT-BACK

**Task:** STUDIO-AFF-001-IMPL
**Status on completion:** DONE
**Agent:** copilot (executing per §2 routing flexibility — grok is primary)
**Date:** 2026-05-11
**CEO_GATE:** NO
**FIZ:** YES

---

## FIZ Commit Trailer

REASON: Implement affiliate() for StudioService — creator-onboarding boot path was throwing NotImplementedException in production
IMPACT: Studio creation and affiliation now writes governance-bearing rows (Studio + StudioAffiliation) in a single $transaction with full audit columns; emits nats.studios.affiliated NATS event
CORRELATION_ID: STUDIO-AFF-001

---

## What was done

1. **Created `services/studio-affiliation/src/affiliation-number.generator.ts`** — `AffiliationNumberGenerator` injectable:
   - Generates 6–9 char strings from alphabet A-Z, 2-9 (excludes 0, 1, O, I per schema comment)
   - Length proportional to studio count (6 → 7 → 8 → 9 as count grows)
   - Retry-on-collision: up to 5 attempts, throws on exhaustion
   - `static isValid(value)` for input validation
   - Uniqueness check passed as async predicate by the caller (stays testable without DB dependency)

2. **Updated `services/studio-affiliation/src/studio.service.ts`** — Full `affiliate()` implementation:
   - **Path A** (existing_studio_id): verifies `studio.status === 'ACTIVE'`, inserts `StudioAffiliation` with `role: CREATOR`
   - **Path B** (studio_name): generates affiliation number, inserts `Studio` (status=PENDING) + founder `StudioAffiliation` (role=STUDIO_OWNER) in a single `$transaction`
   - Every row stamped with `correlation_id`, `reason_code: STUDIO_AFFILIATE_JOIN|STUDIO_CREATE|STUDIO_FOUNDER_AFFILIATION`, `rule_applied_id: STUDIO-AFF-001`, `organization_id`, `tenant_id`
   - Emits `nats.studios.affiliated` with redacted payload (studio_id, affiliation_number, correlation_id — no PII)
   - Removed `NotImplementedException` stub
   - Added NatsService and AffiliationNumberGenerator injection

3. **Updated `services/studio-affiliation/src/studio-affiliation.module.ts`** — Added AffiliationNumberGenerator to providers + exports

4. **Created `prisma/migrations/20260511000000_studio_affiliation_indexes/migration.sql`**:
   - `ALTER TABLE studios ADD CONSTRAINT chk_aff_num_len CHECK (length(affiliation_number) BETWEEN 6 AND 9)` (idempotent via DO$$)
   - `CREATE UNIQUE INDEX IF NOT EXISTS uq_studios_aff_num ON studios (affiliation_number)` (idempotent)

5. **Created `tests/integration/studio-affiliation.spec.ts`** — 13 tests:
   - Generator: 1k iterations, no forbidden chars, lengths valid, all unique
   - Generator: retry on collision (3 attempts to find unique)
   - Generator: throws after MAX_RETRIES
   - Generator: isValid() static method
   - StudioService: Path A success (ACTIVE studio)
   - StudioService: Path A reject (non-ACTIVE studio)
   - StudioService: Path B success (new studio + founder affiliation)
   - StudioService: validation errors (both/neither path given)

## Files changed

```
services/studio-affiliation/src/affiliation-number.generator.ts  (CREATE)
services/studio-affiliation/src/studio.service.ts                (UPDATE)
services/studio-affiliation/src/studio-affiliation.module.ts     (UPDATE)
prisma/migrations/20260511000000_studio_affiliation_indexes/migration.sql  (CREATE)
tests/integration/studio-affiliation.spec.ts                     (CREATE)
PROGRAM_CONTROL/REPORT_BACK/STUDIO-AFF-001-IMPL.md               (this file)
```

## Validation results

- `yarn test tests/integration/studio-affiliation.spec.ts`: **13/13 PASS**
- `yarn typecheck:api`: **CLEAN**

## Invariants confirmed

- APPEND-ONLY FINANCE: No balance columns touched; no UPDATE/DELETE on ledger tables
- SCHEMA INTEGRITY: All new rows carry correlation_id, reason_code, rule_applied_id, organization_id, tenant_id
- All-or-nothing: $transaction ensures no partial studio without founder affiliation
- FIZ audit trail: REASON / IMPACT / CORRELATION_ID in commit message

## Result

**SUCCESS**
