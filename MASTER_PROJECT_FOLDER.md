# MASTER PROJECT FOLDER — ChatNow.Zone & Cyrano™

**Authority:** Kevin B. Hartley, CEO — OmniQuest Media Inc.
**Last Updated:** 2026-05-25
**Status:** v3.1 BUILD COMPLETE — GO-LIVE READY

---

## Document Purpose

This Master Project Folder tracks the ChatNow.Zone and Cyrano™ build program from inception through go-live readiness. It serves as the canonical record of:

- Build wave completion status
- Canonical document compliance
- Launch readiness milestones
- Governance gate status

---

## Current Status: v3.1 Complete

**Homestretch Build Wave — v3.1 Complete (May 25, 2026)**

- **Hygiene Sweep:** Complete and merged
- **Phase 11 (Cyrano Layer 1 Whisper Copilot):** Complete and merged
- **Whisper Rollout (Voice Twins consumer + Cyrano Whisper Prompt enterprise):** Complete and merged
- **All v3.1 canonicals enforced:**
  - Business Plan v3.1 (May 2026)
  - Canonical Corpus v11
  - Revenue Assembly v2.2
  - TechSpec v1.0
- **Build Status:** Now in go-live readiness state per Master Project Folder protocol

---

## Canonical Document Registry (v3.1)

### Primary Governance Documents

| Document          | Version | Status | Location                                              |
| ----------------- | ------- | ------ | ----------------------------------------------------- |
| OQMI Governance   | v2.0    | ACTIVE | `PROGRAM_CONTROL/DIRECTIVES/QUEUE/OQMI_GOVERNANCE.md` |
| OQMI System State | v2.0    | ACTIVE | `OQMI_SYSTEM_STATE.md`                                |
| Business Plan     | v3.1    | LOCKED | External (CEO-authorized)                             |
| Canonical Corpus  | v11     | LOCKED | External (CEO-authorized)                             |
| Revenue Assembly  | v2.2    | LOCKED | External (CEO-authorized)                             |
| TechSpec          | v1.0    | LOCKED | External (CEO-authorized)                             |

### Supporting Documentation

| Document              | Status    | Location                                  |
| --------------------- | --------- | ----------------------------------------- |
| Domain Glossary       | ACTIVE    | `docs/DOMAIN_GLOSSARY.md`                 |
| Requirements Master   | ACTIVE    | `docs/REQUIREMENTS_MASTER.md`             |
| Canonical Locks       | IMMUTABLE | `REFERENCE_LIBRARY/01_CANONICAL_LOCKS.md` |
| Architecture Overview | ACTIVE    | `docs/ARCHITECTURE_OVERVIEW.md`           |
| Roadmap               | v1.0      | `docs/ROADMAP.md`                         |
| Launch Manifest       | ACTIVE    | `PROGRAM_CONTROL/LAUNCH_MANIFEST.md`      |
| Launch Ready          | ACTIVE    | `PROGRAM_CONTROL/LAUNCH_READY.md`         |

---

## Build Wave History

### Wave 1-6: Foundation (COMPLETED — April 2026)

- Account-Core integration
- DreamCoins Ledger System (three-bucket wallet)
- Safe Synthetic Twin Creator
- GateGuard Integration
- Voice Chat Integration
- Monitoring & Observability

### Wave 7: Advanced Features & Polish (COMPLETED — April 2026)

- Real-time metrics service
- Ledger transaction observability
- Account lookup analytics
- Final cleanup and tech debt removal

### Wave 8: Homestretch Preparation (COMPLETED — May 2026)

- Repository hygiene sweep (20 stale branches deleted)
- Branch count reduction: 41 → 21 branches (48.8% reduction)
- Aggressive garbage collection and optimization
- Pre-launch checklist validation

### Wave 9: Phase 11 Cyrano Layer 1 (COMPLETED — May 2026)

- Cyrano Layer 1 Whisper Copilot engine
- 8-category whisper prompt system
- Persona scaffold and latency SLO compliance
- Integration Hub handoffs (Ledger↔GateGuard, FFS↔CreatorControl)

### Wave 10: Whisper Rollout (COMPLETED — May 2026)

- Voice Twins consumer experience
- Cyrano Whisper Prompt enterprise features
- Voice cloning enhancements
- ElevenLabs integration polish

---

## Ship-Gate Status

### L0 Ship-Gate Components (ChatNow.Zone)

| System                              | Status             | Reference                      |
| ----------------------------------- | ------------------ | ------------------------------ |
| Three-Bucket Wallet                 | ✅ DONE            | `services/ledger/`             |
| Risk Engine                         | 🔶 NEEDS_DIRECTIVE | D002                           |
| NATS Fabric                         | ✅ DONE (scaffold) | `services/nats/`               |
| OBS Broadcast Kernel                | 🔶 NEEDS_DIRECTIVE | D004                           |
| FairPay + NOWPayouts                | 🔶 NEEDS_DIRECTIVE | D006, E002                     |
| RedBook                             | 🔶 NEEDS_DIRECTIVE | E001                           |
| Compliance Stack                    | 🔶 NEEDS_DIRECTIVE | D008                           |
| GateGuard Sentinel                  | ✅ DONE (scaffold) | `services/gateguard-sentinel/` |
| Flicker n'Flame Scoring             | ✅ DONE (scaffold) | GovernanceConfig               |
| CreatorControl.Zone                 | ✅ DONE (scaffold) | PAYLOAD 5                      |
| Cyrano Layer 1                      | ✅ DONE            | PAYLOAD 5 + Phase 11           |
| Integration Hub                     | ✅ DONE (scaffold) | PAYLOAD 5                      |
| Black-Glass Interface               | 🔶 NEEDS_DIRECTIVE | G101+                          |
| Immutable Audit Architecture        | ✅ DONE            | PAYLOAD-6                      |
| Frontend Polish + Diamond Concierge | ✅ DONE            | PAYLOAD-7                      |
| End-to-end Validation               | ✅ DONE            | PAYLOAD-8                      |

### Cyrano L0 Ship-Gate Components (Cyrano™ Standalone)

| System                            | Status             | Reference                               |
| --------------------------------- | ------------------ | --------------------------------------- |
| Three-Bucket Wallet               | ✅ DONE            | `LedgerService.debitWallet`             |
| NATS Fabric                       | ✅ DONE (scaffold) | JetStream + topics registry             |
| GateGuard Sentinel                | ✅ DONE (scaffold) | Welfare Guardian                        |
| Cyrano Layer 1 (whisper engine)   | ✅ DONE            | 8-category whisper engine               |
| Cyrano Layer 2 (memory + context) | 🔶 NEEDS_DIRECTIVE | CYR-NARR-002                            |
| Integration Hub                   | ✅ DONE (scaffold) | Ledger↔GateGuard                        |
| AI Twin training pipeline         | 🔶 SCAFFOLD        | CYR-AI-TWIN-003                         |
| Voice cloning + TTS               | ✅ DONE            | ElevenLabs integration                  |
| Image generation                  | 🔶 SCAFFOLD        | CYR-CORE-001                            |
| Spark Twin free tier              | ✅ DONE            | 15-message cap                          |
| Studio affiliation                | 🔶 NEEDS_DIRECTIVE | STUDIO-AFF-001                          |
| Pre-launch checklist              | ✅ DONE            | `docs/PRE_LAUNCH_CHECKLIST.md`          |
| Ship-gate verifier                | ✅ DONE            | `PROGRAM_CONTROL/ship-gate-verifier.ts` |

---

## Governance Gates

| Gate        | Status                             | Scope        | Clearance Location            |
| ----------- | ---------------------------------- | ------------ | ----------------------------- |
| GOV-FINTRAC | CEO-AUTHORIZED-STAGED (2026-04-11) | DFSP-002–008 | `PROGRAM_CONTROL/CLEARANCES/` |
| GOV-AGCO    | CEO-AUTHORIZED-STAGED (2026-04-11) | DFSP-002–008 | `PROGRAM_CONTROL/CLEARANCES/` |
| GOV-AV      | BRANCH-AND-HOLD                    | AV-001 only  | `PROGRAM_CONTROL/CLEARANCES/` |

---

## Launch Sequence (Pending — Target 2026-10-01)

### 1. Pixel Legacy Creator Onboarding Flow

**Owner:** Creator Operations
**Window:** T-90 days → T-30 days
**Status:** Pending CEO clearance

### 2. Mic Drop Reveal Sequence

**Owner:** Marketing + CEO
**Window:** T-30 days → T-0
**Status:** Pending CEO clearance

### 3. First 3,000 Creator Rate-Lock

**Owner:** Finance + Creator Operations
**Window:** Open at T-0; closes at 3,000 creators
**Status:** Pending CEO clearance

### 4. GateGuard Processor LOI Data Package

**Owner:** Compliance + GateGuard squad
**Window:** T-60 days → T-14 days
**Status:** Pending CEO clearance

---

## Invariant Compliance Status

### Financial Integrity Zone (FIZ)

✅ **PASS** — All FIZ-scoped changes include REASON/IMPACT/CORRELATION_ID in commits

**Protected paths:**

- `services/ledger/` — Balance columns, token flows
- `services/gateguard-sentinel/` — Welfare decisions, ZK proof audit
- `services/cyrano/` — Premium feature gating touching CZT spend

### Core Invariants

| Invariant                                                  | Status  | Evidence                                              |
| ---------------------------------------------------------- | ------- | ----------------------------------------------------- |
| Ledger append-only                                         | ✅ PASS | Postgres triggers in `infra/postgres/init-ledger.sql` |
| correlation_id + reason_code on all financial/audit tables | ✅ PASS | Schema compliance verified                            |
| Network isolation (Postgres 5432 / Redis 6379)             | ✅ PASS | `docker-compose.yml` internal network only            |
| NATS real-time fabric (no REST polling)                    | ✅ PASS | `services/nats/topics.registry.ts`                    |
| No secrets in repo                                         | ✅ PASS | `.env.example` + `.gitignore` compliance              |
| Governance §12 banned-entity purge                         | ✅ PASS | Completed 2026-04-24                                  |

---

## Requirements Master Status

**Total tracked requirements:** 114

| Status          | Count |
| --------------- | ----- |
| DONE            | 20    |
| QUEUED          | 12    |
| IN_PROGRESS     | 4     |
| NEEDS_DIRECTIVE | 73    |
| RETIRED         | 9     |

**Source of truth:** `docs/REQUIREMENTS_MASTER.md`

---

## Directive Pipeline Status

| Bucket      | Count | Location                                  |
| ----------- | ----- | ----------------------------------------- |
| DONE        | 39    | `PROGRAM_CONTROL/DIRECTIVES/DONE/`        |
| IN_PROGRESS | 0     | `PROGRAM_CONTROL/DIRECTIVES/IN_PROGRESS/` |
| QUEUE       | 14    | `PROGRAM_CONTROL/DIRECTIVES/QUEUE/`       |

---

## Next Human Steps (Post v3.1)

1. **Pixel Legacy onboarding** — Activate `pixel_legacy` flag workflow per Launch Manifest
2. **Payment processor testing** — Verify Stripe integration end-to-end
3. **CEO launch clearance sign-off** — Required in `PROGRAM_CONTROL/CLEARANCES/` before production
4. **legal_holds.correlation_id migration** — FIZ/GOV-scoped schema change
5. **Wave B–H directives** — Remaining items in Requirements Master require directive authoring
6. **GateGuard Sentinel LOI + federated lookup** — NEEDS_DIRECTIVE
7. **Hard launch deadline** — 2026-10-01

---

## Change Log

### 2026-05-25 — v3.1 Homestretch Complete

- Hygiene Sweep complete and merged (20 stale branches deleted)
- Phase 11 (Cyrano Layer 1 Whisper Copilot) complete and merged
- Whisper Rollout complete and merged
- All v3.1 canonicals enforced (Business Plan, Corpus v11, Revenue Assembly v2.2, TechSpec v1.0)
- Build declared go-live ready per Master Project Folder protocol

---

## Authority & Compliance

**This document is maintained under OQMI Governance v2.0.**

All changes to this Master Project Folder require:

- CEO authorization (Kevin B. Hartley)
- Compliance with Business Plan v3.1
- Compliance with Canonical Corpus v11
- Compliance with OQMI Governance doctrine

**Hard launch authorization** will be filed in:
`PROGRAM_CONTROL/CLEARANCES/LAUNCH_GATE_2026-10-01.md`

No agent (Claude Code, Copilot, or human) may flip production feature flags without that clearance.

---

_END MASTER PROJECT FOLDER_
