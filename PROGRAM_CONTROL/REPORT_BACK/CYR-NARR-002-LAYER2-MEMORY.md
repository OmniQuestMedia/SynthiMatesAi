# CYR-NARR-002-LAYER2-MEMORY — REPORT-BACK

**Task:** CYR-NARR-002-LAYER2-MEMORY
**Status on completion:** DONE
**Agent:** copilot (executing per §2 routing flexibility — grok is primary)
**Date:** 2026-05-11
**CEO_GATE:** NO

---

## What was done

1. **Updated `prisma/schema.prisma`** — Added three new Layer 2 models:
   - `MemoryEntry` — semantic memory with `embedding` (JSON/vector-ready), `importance_score`, `last_accessed_at`, `access_count`, audit columns. Append-only except `last_accessed_at` + `access_count`.
   - `StoryBeat` — story beat with `beat_type` enum (OPEN|RISING|TURN|RESOLUTION), `summary`, optional FK to `MemoryEntry`. Append-only.
   - `BranchDecision` — immutable branching decision with `consequences` JSON, FK to `StoryBeat`. Absolutely no UPDATE/DELETE — branching history is forever.
   - Added `StoryBeatType` enum.

2. **Created `services/narrative-engine/src/memory-bank.service.ts`** — `MemoryBankService`:
   - `recordMemory()` — persists with heuristic importance scoring (length × emotional-keyword density) if not supplied
   - `recallMemories()` — relevance = importance × time-decay (`exp(-age_days / tau_days)`) × similarity; returns top-K sorted
   - `incrementAccess()` — bumps `access_count` + `last_accessed_at` (ONLY mutable columns)

3. **Created `services/narrative-engine/src/context-builder.service.ts`** — `ContextBuilderService`:
   - `buildContext()` — assembles safety rails block + memory block + beat block
   - Token-budget enforcement: trims memory block first, then beat block; NEVER trims safety rails
   - PII redaction on memory content before injection (email, US phone)
   - `LLM_MAX_PROMPT_TOKENS` configurable via env (default 8000)

4. **Created `services/narrative-engine/src/branching.service.ts`** — `BranchingService`:
   - `createStoryBeat()` — writes beat + emits `cyrano.narrative.l2.story-beat`
   - `createBranchDecision()` — verifies beat exists, writes decision + emits `cyrano.narrative.l2.branch-decision`; consequences JSON immutable
   - `listBeatsForPersona()`, `listDecisionsForBeat()` read-only accessors

5. **Updated `services/narrative-engine/src/narrative.module.ts`** — registered all three new services as providers + exports

6. **Updated `services/narrative-engine/src/narrative.service.ts`** — injected Layer 2 services; exposed via `memoryBank`, `contextBuilder`, `branching` getter properties for consumer module access

7. **Created `prisma/migrations/20260511100000_layer2_narrative_memory/migration.sql`** — idempotent DDL for `memory_entries`, `story_beats`, `branch_decisions` tables + indexes

8. **Created `tests/integration/cyrano-narr-002-layer2.spec.ts`** — 13 tests covering all three services

## Files changed

```
prisma/schema.prisma                                                      (UPDATE)
services/narrative-engine/src/memory-bank.service.ts                      (CREATE)
services/narrative-engine/src/context-builder.service.ts                   (CREATE)
services/narrative-engine/src/branching.service.ts                         (CREATE)
services/narrative-engine/src/narrative.module.ts                          (UPDATE)
services/narrative-engine/src/narrative.service.ts                         (UPDATE)
prisma/migrations/20260511100000_layer2_narrative_memory/migration.sql     (CREATE)
tests/integration/cyrano-narr-002-layer2.spec.ts                           (CREATE)
PROGRAM_CONTROL/REPORT_BACK/CYR-NARR-002-LAYER2-MEMORY.md                 (this file)
```

## Validation results

- `yarn test tests/integration/cyrano-narr-002-layer2.spec.ts`: **13/13 PASS**
- `yarn prisma:generate`: **CLEAN**
- `yarn typecheck:api`: **CLEAN**

## Invariants confirmed

- APPEND-ONLY: `BranchDecision.consequences` never updated once written; `MemoryEntry` content/embedding/importance immutable after write
- SCHEMA INTEGRITY: All new rows carry `correlation_id`, `reason_code`, `rule_applied_id`
- NO REFACTORING: Layer 1 `MemoryBank` and `NarrativeBranch` models untouched; Layer 2 models are additive
- PII protection: email + phone stripped before LLM injection
- Token budget: safety rails never trimmed; only memory block is reduced

## Result

**SUCCESS**
