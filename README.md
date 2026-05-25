# SythiMatesAi — Cleanup Mode

> **✅ FEATURES COMPLETE: Account-Core + Safe Synthetic Twin Integration**
>
> **The shared Account-Core and Safe Synthetic Twin integration from ChatNowZone--BUILD is now live and production-ready!**
>
> This repository now includes:
>
> - ✅ **Shared Account-Core** — Unified account lookup, creator verification, and membership management
> - ✅ **DreamCoins Ledger** — Canonical three-bucket wallet with hash-chained immutable transactions
> - ✅ **Safe Synthetic Twin Creator** — Multi-safeguard photo-based AI twin generation
> - ✅ **GateGuard Integration** — Risk/welfare pre-processor with fraud and welfare scoring
> - ✅ **Voice Chat** — Real-time voice messaging with automatic DreamCoins deduction
> - ✅ **Monitoring & Observability** — Real-time metrics for all Account-Core and DreamCoins operations
>
> See [Architecture Overview](#architecture-account-core--dreamcoins--safe-synthetic-twin) below for details.
> Full roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

> **CLEANUP MODE ACTIVE** — Governance sync and repo hardening take priority over new feature work.
> Cyrano L1/L2 feature ownership now lives in the dedicated Cyrano repo; this repo only keeps the integration and cleanup surface needed for ship-gate and handoff.

> **AI Character Companions — photorealistic, persistent-memory, voice-cloned.**
> Powered by Flux LoRA fine-tuning, ElevenLabs voice cloning, and a cinematic narrative engine.
> Governed by OmniQuest Media Inc. (OQMInc™) — `OQMI_GOVERNANCE.md` + `OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md`.

**Package manager:** Yarn (canonical for all OQMInc repos — do not use npm or pnpm).

---

## Architecture: One Engine → Multiple Portals (Active)

- **Backend**: Single Cyrano Engine (`services/core-api` + all services)
- **Frontends**: `apps/portals/{main,ink-and-steel,lotus-bloom,...}` (lightweight Next.js, shared-ui)
- **Key Fields**: `portal` on `AiTwin`, `is_spark_twin` for free-tier provisioning, `Subscription` model with tiers
- **Free Tier**: Every new user receives a Spark Twin on signup (15 messages/day, upgrade nudges at 10)
- **House Models**: Platform-owned AI characters seed the catalogue — 100% revenue to platform

### Multi-Portal Architecture

```
             ┌──────────────────────────────────────┐
             │         Cyrano Engine (core-api)     │
             │  GateGuard · Ledger · Membership      │
             │  SparkTwin · NarrativeEngine · Voice  │
             └───────────────┬──────────────────────┘
                             │ REST / NATS
        ┌──────────┬─────────┼──────────┬──────────┐
        ▼          ▼         ▼          ▼          ▼
  portal-main  ink-and-  lotus-bloom desperate  dark-desires
  :3001        steel     :3003       housewives  :3006
               :3002                 :3004
                                   barely-legal
                                     :3005
```

### New Quick Start (Multi-Portal)

```bash
yarn install
docker-compose up db redis nats -d
yarn prisma migrate dev
yarn prisma db seed

# Start core backend
yarn workspace core-api dev   # → :3000

# Start portals (in separate terminals)
cd apps/portals/main                && yarn dev  # → :3001
cd apps/portals/ink-and-steel       && yarn dev  # → :3002
cd apps/portals/lotus-bloom         && yarn dev  # → :3003
cd apps/portals/desperate-housewives && yarn dev # → :3004
cd apps/portals/barely-legal        && yarn dev  # → :3005
cd apps/portals/dark-desires        && yarn dev  # → :3006
```

Or start everything with Docker Compose (portals included):

```bash
docker-compose up
# → API:                      http://localhost:3000
# → Cyrano UI (standalone):   http://localhost:3100
# → Portal — Main:            http://localhost:3001
# → Portal — Ink & Steel:     http://localhost:3002
# → Portal — Lotus Bloom:     http://localhost:3003
# → Portal — Desperate Housewives: http://localhost:3004
# → Portal — Barely Legal:    http://localhost:3005
# → Portal — Dark Desires:    http://localhost:3006
```

---

## Account-Core & Safe Synthetic Twin Architecture

**Status:** ✅ **FULLY INTEGRATED AND PRODUCTION-READY** (Phase 6 Complete)

SynthiMatesAi features a complete Account-Core integration shared from ChatNowZone--BUILD, providing robust financial infrastructure and safe AI twin generation capabilities.

### Core Components

#### 1. **DreamCoins (ChatZoneTokens - CZT) Financial System**

The platform uses a single unified currency: **DreamCoins (ChatZoneTokens/CZT)**, powered by a canonical three-bucket wallet architecture:

- **Three-Bucket Wallet Design:**
  - `purchased_tokens` — Tokens purchased directly by users
  - `membership_tokens` — Bonus tokens from membership subscriptions
  - `bonus_tokens` — Creator earnings and rewards

- **Canonical Spend Order:** Governed by `LEDGER_SPEND_ORDER` — tokens are spent in priority order:
  1. `purchased` → 2. `membership` → 3. `bonus`

- **Append-Only Ledger:** All financial transactions are recorded in `CanonicalLedgerEntry` with:
  - Hash-chained integrity (SHA-256)
  - Idempotent writes via `correlation_id`
  - Immutable audit trail (no UPDATE/DELETE operations)
  - Reason codes for all transactions: `PURCHASE`, `SPEND`, `PAYOUT`, `MEMBERSHIP_BONUS`, `SYNTHETIC_GENERATION`, etc.

#### 2. **Membership Tiers & Monetization**

Six-tier membership system with automatic benefit delivery:

| Tier         | Price     | Status | Bonus Tokens |
| ------------ | --------- | ------ | ------------ |
| GUEST        | Free      | Active | 0            |
| VIP          | Free      | Active | 0            |
| VIP_SILVER   | $9.99/mo  | Active | 100 CZT      |
| VIP_GOLD     | $19.99/mo | Active | 250 CZT      |
| VIP_PLATINUM | $39.99/mo | Active | 500 CZT      |
| VIP_DIAMOND  | $99.99/mo | Active | 1000 CZT     |

- Billing intervals: MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL
- Bonus months auto-calculated per ADR-003 matrix
- One ACTIVE subscription per user (enforced)
- Age re-verification: Every 30 days for VIP, on each purchase for paid tiers

#### 3. **GateGuard Sentinel™ — Financial Integrity Protection**

All financial actions (PURCHASE, SPEND, PAYOUT) pass through GateGuard, a deterministic pre-processor that evaluates:

- **Fraud Score (0-100):** Account age, device churn, geo-mismatch, VPN detection, chargebacks, structuring patterns
- **Welfare Score (0-100):** Spend velocity, time-of-day patterns, dwell time, chase-loss signals, distress indicators

**Decision Outcomes:**

- `APPROVE` — Transaction proceeds
- `COOLDOWN` — Temporary hold (score ≥ 40)
- `HARD_DECLINE` — Transaction blocked (score ≥ 70)
- `HUMAN_ESCALATE` — Manual review required (score ≥ 90)

**Key Features:**

- Idempotent on `transaction_id`
- Pattern-based scoring (no external AI calls)
- Append-only logging to `gateguard_logs`

#### 4. **Safe Synthetic Twin Creator**

Transformative AI twin generation with 5-layer safety architecture:

**Safeguards:**

1. **Multi-image blending** — ArcFace embeddings from 5-20 input photos
2. **Celebrity down-weighting** — Known celebrity similarity triggers weight reduction
3. **Refinement loop** — Up to 6 refinement attempts to push away from celebrities
4. **Dissimilarity gate** — Cosine similarity threshold (0.15) ensures outputs aren't near-clones
5. **C2PA watermarking** — Cryptographic provenance metadata on all generated images

**Wizard Flow:**

- Step 1: Upload 5-20 photos (max 10MB each, `image/*` MIME type only)
- Step 2: Set fantasy level (0.0-1.0) and persona settings
- Step 3: Accept consent disclaimer (transformative use, legal rights confirmation)
- Step 4: Generate with safeguards applied

**Cost:** 50 DreamCoins per synthetic generation (deducted via canonical spend order)

**Consent Text:**

> I confirm I have the legal right to use all uploaded images, consent to transformative synthetic generation, and will not attempt impersonation, rights infringement, or deceptive identity cloning.

#### 5. **Creator Payout System (Flicker n'Flame Scoring)**

Creators earn from fan interactions with performance-based payout rates:

**Payout Rate Card (REDBOOK):**

- **RATE_COLD** (heat 0-33): $0.075/CZT
- **RATE_WARM** (heat 34-60): $0.080/CZT
- **RATE_HOT** (heat 61-85): $0.085/CZT
- **RATE_INFERNO** (heat 86-100): $0.090/CZT
- **RATE_DIAMOND_FLOOR**: $0.080 minimum on 10,000+ CZT bulk purchases

**Flicker n'Flame Scoring (FFS):**

- Real-time composite score (0-100) from:
  - Tip frequency and volume
  - Chat engagement
  - Dwell time (how long fans stay)
  - Loyalty signals
- Captured immutably at purchase moment
- Drives payout multiplier selection

**Payout Flow:**

1. Creator requests payout via `/api/creator/payout/request`
2. GateGuard evaluates the payout request
3. Balance validated against `bonus_tokens` bucket
4. Estimated USD value calculated (7.5 cents/token default)
5. Admin approval workflow
6. Ledger entry created with `reason_code: PAYOUT`

#### 6. **Feature Flags & Toggles**

Key feature flags for operational control:

| Flag                    | Status  | Purpose                                                                   |
| ----------------------- | ------- | ------------------------------------------------------------------------- |
| `welcome_credit_active` | `false` | Guest Welcome Credit ($100 CZT at $250 spend) — held pending legal review |
| `is_house_model`        | Boolean | Platform-owned AI characters (100% revenue to platform)                   |
| `is_spark_twin`         | Boolean | Free-tier Spark Twin provisioning (15 messages/day limit)                 |
| `visibility`            | Enum    | Twin visibility: `PRIVATE`, `PLATFORM_INTERNAL`, `SUBSCRIBER`             |
| `training_status`       | Enum    | AI twin training lifecycle: `PENDING_UPLOAD` → `TRAINING_COMPLETE`        |

### Architecture Principles

**Invariant Rules (Non-Negotiable):**

1. **Append-only finance** — No UPDATE/DELETE on ledger tables; corrections via offset entries
2. **NATS for real-time** — All chat and AI events via NATS.io fabric
3. **Network isolation** — Postgres (5432) and Redis (6379) never on public interface
4. **No secrets in tree** — All credentials in `.env` only, never committed
5. **GateGuard gates all writes** — Every financial action pre-evaluated
6. **Hash-chain integrity** — Ledger entries cryptographically linked

### Data Flow Example

**Complete User Journey:**

```
1. User signs up → CanonicalWallet created (0,0,0)
2. Purchase 1000 DreamCoins → GateGuard APPROVE
   → Ledger entry (PURCHASE, +1000, purchased)
   → Wallet: (1000,0,0)
3. Subscribe VIP_SILVER ($9.99/mo) → Bonus 100 CZT
   → Ledger entry (MEMBERSHIP_BONUS, +100, membership)
   → Wallet: (1000,100,0)
4. Generate Synthetic Twin (50 CZT cost)
   → GateGuard APPROVE
   → Deduct: 50 from purchased bucket
   → Ledger entry (SYNTHETIC_GENERATION, -50, purchased)
   → Wallet: (950,100,0)
   → C2PA watermark applied
5. Fan chats with twin (35 CZT spent)
   → Creator earns 26 CZT (75% payout)
   → Ledger entry (CREATOR_EARNINGS, +26, bonus)
   → Creator wallet: (0,0,26)
6. Creator requests payout (100 CZT)
   → GateGuard APPROVE
   → Estimated: $7.50 USD (at RATE_COLD)
   → Admin approval
   → Ledger entry (PAYOUT, -100, bonus)
```

### Security & Compliance

**GateGuard Integration:** All endpoints touching financial state use GateGuard middleware

**C2PA Watermarking:** Active on all synthetic image generation via `addC2paMetadata` in `synthetic-pipeline.service.ts`

**Privacy Disclaimers:** Consent checkboxes in `SafeSyntheticWizard.tsx` (Step 3)

**Rate Limiting:** `@Throttle` guards on:

- `/cyrano/ai-twin` creation/training endpoints
- `/api/ai-twin/test-synthetic` smoke test endpoint

**Schema Integrity:** Every table includes:

- `correlation_id` — Idempotency key
- `reason_code` — Transaction classification
- Timestamp fields for audit trail

### Documentation References

- **Membership Policy:** `docs/MEMBERSHIP_LIFECYCLE_POLICY.md`
- **Synthetic Security:** `docs/SYNTHETIC_TWIN_SECURITY.md`
- **Domain Glossary:** `docs/DOMAIN_GLOSSARY.md` (naming authority)
- **Architecture:** `docs/ARCHITECTURE_OVERVIEW.md`
- **Requirements:** `docs/REQUIREMENTS_MASTER.md`
- **Account Security:** `docs/ACCOUNT_CORE_SECURITY.md`

### API Endpoints (Account-Core)

| Endpoint                       | Method | Purpose                      |
| ------------------------------ | ------ | ---------------------------- |
| `/api/account/purchase-tokens` | POST   | Purchase DreamCoins (CZT)    |
| `/api/membership/subscribe`    | POST   | Subscribe to membership tier |
| `/api/membership/active`       | GET    | Get active membership tier   |
| `/cyrano/ai-twin`              | POST   | Create AI twin record        |
| `/cyrano/ai-twin/:id/photos`   | POST   | Upload photos for training   |
| `/cyrano/ai-twin/synthetic`    | POST   | Safe Synthetic generation    |
| `/api/creator/payout/request`  | POST   | Request creator payout       |
| `/api/creator/payout`          | GET    | List creator payouts         |

---

## What is Cyrano™?

Cyrano™ is a standalone AI companion product built on top of the OmniQuestMediaInc
governance, ledger, and user system. It allows creators to:

1. **Train an AI Twin (Safe Synthetic Mode first)** — Upload photos → use Safe Synthetic Mode for
   transformative generation safeguards → fine-tune a Flux LoRA model → generate photorealistic
   character images with natural skin, pores, lighting depth, and cinematic quality.
2. **Persistent Character Chat** — Conversations backed by a long-term Memory Bank
   (facts, preferences, story beats, secrets) so every interaction deepens the relationship.
3. **Voice Call** — ElevenLabs voice cloning gives each character a unique, cloned voice for
   real-time spoken interactions.
4. **Narrative Branching** — Cinematic branching choice points let users shape their story arc,
   with consequences written into memory.
5. **House Models** — Platform-owned characters that keep 100% revenue for testing and direct
   platform monetization.

---

## Repository Structure

```
Cyrano/
├── apps/
│   ├── cyrano-standalone/       # Next.js 14 frontend (port 3100)
│   │   ├── app/                 # App Router pages
│   │   │   ├── page.tsx         # Home dashboard
│   │   │   ├── ai-twin/         # AI Twin Creator wizard
│   │   │   ├── chat/            # Character Chat
│   │   │   └── voice-call/      # Voice Call
│   │   ├── components/
│   │   │   ├── AITwinCreator/   # Step-by-step twin training wizard
│   │   │   ├── CharacterChat/   # Persistent narrative chat UI
│   │   │   └── VoiceCall/       # ElevenLabs TTS voice call UI
│   │   └── lib/                 # Session helpers, API clients
│   ├── portals/                 # Brand-specific portal apps
│   │   ├── main/                # Main platform portal
│   │   ├── ink-and-steel/       # Ink & Steel brand portal
│   │   ├── lotus-bloom/         # Lotus Bloom brand portal
│   │   ├── desperate-housewives/ # Desperate Housewives brand portal
│   │   ├── barely-legal/        # Barely Legal brand portal
│   │   └── dark-desires/        # Dark Desires brand portal
│   └── shared-ui/               # Shared UI component library
│       ├── components/          # Reusable React/UI components
│       ├── lib/                 # Shared utilities and helpers
│       └── themes/              # Brand-specific theme tokens
├── services/
│   ├── ai-twin/                 # Photo upload + Flux LoRA training pipeline
│   ├── image-generation/        # Flux 2 Pro + Banana.dev image service
│   ├── voice-cloning/           # ElevenLabs voice clone + TTS service
│   ├── narrative-engine/        # Persistent memory + cinematic branching
│   ├── cyrano/                  # Cyrano core (session, prompt, persona)
│   ├── core-api/                # NestJS monolith (auth, ledger, GateGuard, …)
│   ├── diamond-concierge/       # Diamond-tier VIP concierge
│   ├── ledger/                  # Canonical Ledger (append-only finance)
│   ├── creator-control/         # Creator management
│   ├── integration-hub/         # Service integration layer
│   ├── recovery/                # Diamond recovery flows
│   ├── ffs/                     # Flicker n'Flame Scoring (Red Room rewards)
│   ├── gamification/            # Earn/burn logic, prize pools
│   └── rewards-api/             # Rewards API
├── prisma/                      # Prisma schema + migrations
├── finance/                     # Canonical Ledger, REDBOOK, dynamic pricing
├── governance/                  # Governance artifacts
├── PROGRAM_CONTROL/             # Directive queue, ship-gate verifier, report-backs
├── docs/                        # Architecture, glossary, requirements
└── docker-compose.yml           # Cyrano-focused compose (db, redis, nats, api, cyrano-ui)
```

---

## Quick Start (Development)

```bash
# 1. Install dependencies
yarn install

# 2. Copy environment variables
cp .env.example .env
# Fill in DATABASE_URL, ELEVENLABS_API_KEY, BANANA_API_KEY, etc.

# 3. Start infrastructure (Postgres, Redis, NATS)
docker-compose up db redis nats -d

# 4. Apply Prisma migrations
yarn prisma migrate dev

# 5. Seed house models + membership fixtures
yarn prisma db seed

# 6. Start the core API
yarn workspace core-api dev

# 7. Start the Cyrano standalone UI
cd apps/cyrano-standalone && yarn dev
# → http://localhost:3100
```

Or run everything (including all brand portals) with Docker Compose:

```bash
docker-compose up
# → API: http://localhost:3000
# → Cyrano UI: http://localhost:3100
# → Portals: http://localhost:3001–3006
```

---

## Key API Endpoints

| Endpoint                                    | Description                                                     |
| ------------------------------------------- | --------------------------------------------------------------- |
| `POST /cyrano/ai-twin`                      | Create a new AI twin record                                     |
| `POST /cyrano/ai-twin/:id/photos`           | Record a photo upload                                           |
| `POST /cyrano/ai-twin/:id/train`            | Start Flux LoRA training                                        |
| `GET  /cyrano/ai-twin/house-models`         | List platform house models (public)                             |
| `GET  /admin/house-models`                  | List house models — ADMIN only (`x-actor-role: ADMIN`)          |
| `POST /cyrano/spark/provision`              | Provision a free Spark Twin on signup                           |
| `POST /cyrano/spark/track-message`          | Track Spark message + return upgrade nudge if threshold crossed |
| `POST /cyrano/images/generate`              | Generate a photorealistic image                                 |
| `POST /cyrano/voice`                        | Create a voice clone                                            |
| `POST /cyrano/voice/tts`                    | Text-to-speech with cloned voice                                |
| `POST /cyrano/narrative/memory`             | Store a memory for a user+twin                                  |
| `POST /cyrano/narrative/context`            | Build LLM context from memory bank                              |
| `POST /cyrano/narrative/branch`             | Create a cinematic branch point                                 |
| `POST /cyrano/narrative/branch/:id/resolve` | Resolve a branch choice                                         |
| `POST /cyrano/narrative/nudge`              | Inject upgrade nudge into narrative memory                      |

---

## Safe Synthetic Twin Creator

The Safe Synthetic Twin Creator is the production-safe photo workflow for building transformative AI twins.
See the full security and compliance checklist in
[`docs/SYNTHETIC_TWIN_SECURITY.md`](docs/SYNTHETIC_TWIN_SECURITY.md).

### How it works

1. **Multi-image blend + weighting** — users upload 5+ images, each image is embedded and celebrity-near samples are down-weighted.
2. **Deviation + refinement loop** — controlled fantasy deviation is applied, then refinement attempts push embeddings away from known celebrity vectors.
3. **Dissimilarity gate** — final embedding is checked against each input embedding and nudged if similarity is too high.
4. **Generation + provenance** — generation runs through the synthetic endpoint and returns safeguard metadata; production generation should include C2PA provenance metadata in the final asset pipeline.

### Wizard usage (UI)

- Open **Create AI Twin**
- Choose **Safe Synthetic Mode** (recommended default for photo-based twins)
- Upload at least 5 photos, set fantasy level, confirm consent
- Submit generation and wait for the safe synthetic result preview + safeguard metadata

### API endpoints

| Endpoint                         | Method | Purpose                                                                |
| -------------------------------- | ------ | ---------------------------------------------------------------------- |
| `/cyrano/ai-twin/synthetic`      | POST   | Safe synthetic generation from multipart images + `fantasyLevel` input |
| `/admin/ai-twin/curator/trigger` | POST   | Manual curator refresh trigger for celebrity/news embedding ingestion  |

### Curator bot schedule

- Curator ingestion is intended to run on a regular schedule (daily/hourly, environment-dependent).
- `NEWS_API_KEY` is required when curator ingestion is enabled against live news sources.
- Admins can always run an immediate catch-up sync through the manual trigger endpoint above.

### Safe Synthetic operations checklist

- **Curator admin UI/API path documented**: `/admin/ai-twin/curator/trigger`
- **Rate limiting documented and enforced**: `@Throttle` guards in
  `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/ai-twin/src/ai-twin.controller.ts`
- **C2PA provenance metadata documented and applied**:
  `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/ai-twin/src/synthetic-pipeline.service.ts`

### Legal / ethical warning

Use Safe Synthetic Twin Creator only for lawful, consent-based, transformative content generation.
Attempting to produce near-clones, impersonations, or rights-infringing outputs violates policy. The weighting, refinement, and dissimilarity safeguards are mandatory protections and must not be bypassed.

---

## Environment Variables

See [`.env.example`](.env.example) for a full list. Key variables:

| Variable                    | Description                                |
| --------------------------- | ------------------------------------------ |
| `DATABASE_URL`              | Postgres connection string                 |
| `ELEVENLABS_API_KEY`        | ElevenLabs API key for voice cloning + TTS |
| `BANANA_API_KEY`            | Banana.dev API key for Flux LoRA training  |
| `BANANA_MODEL_KEY_FLUX_PRO` | Banana.dev model key for Flux Pro          |
| `AI_TWIN_LORA_RANK`         | LoRA rank for training (default: 16)       |
| `NARRATIVE_MEMORY_TTL_DAYS` | Memory retention in days (default: 365)    |

---

## Deployment — Safe Synthetic Twin Feature

### Deployment flow

1. Deploy API services with Prisma schema applied and pgvector-ready Postgres.
2. Ensure synthetic generation endpoint routing is configured before enabling user traffic.
3. Deploy or update Cyrano standalone so Safe Synthetic wizard mode is exposed to creators.
4. Validate `/api/ai-twin/test-synthetic` for a non-PII smoke pass after deploy.

### Required environment variables

| Variable                        | Description                                                             |
| ------------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`                  | Postgres connection string (pgvector-capable instance recommended)      |
| `SYNTHETIC_GENERATION_ENDPOINT` | ArcFace/generation/C2PA endpoint for Safe Synthetic pipeline            |
| `NEWS_API_KEY`                  | News source key for curator ingestion when scheduled refresh is enabled |
| `REDIS_URL`                     | Redis connection used for queueing/caching/rate-limit infrastructure    |
| `BANANA_API_KEY`                | Banana.dev API key for training/generation workloads                    |
| `BANANA_MODEL_KEY_FLUX_PRO`     | Banana.dev model identifier for Flux Pro workloads                      |

### Enabling curator cron jobs

- Use your scheduler (GitHub Actions cron, Kubernetes CronJob, or platform scheduler) to call:
  `POST /admin/ai-twin/curator/trigger`
- Keep `NEWS_API_KEY` configured in the runtime where scheduled curator sync is enabled.
- Retain manual override through the same admin endpoint for emergency re-syncs.

### Scaling notes (Banana.dev + Redis + pgvector)

- **Banana.dev**: isolate queue spikes by limiting concurrent synthetic jobs per instance.
- **Redis**: size memory for burst queueing/rate-limit keys; alert on eviction.
- **pgvector/Postgres**: keep vector index maintenance scheduled; monitor similarity query latency.

---

## ✅ Account-Core + Safe Synthetic Twin Integration Status

**Account-Core + Safe Synthetic Twin integration from ChatNowZone--BUILD is now live ✅**

The complete financial infrastructure and AI twin generation system is production-ready:

- ✅ DreamCoins (CZT) three-bucket wallet system
- ✅ Six-tier membership subscriptions with bonus tokens
- ✅ GateGuard Sentinel™ financial protection
- ✅ Safe Synthetic Twin Creator with 5-layer safeguards
- ✅ Creator payout system with Flicker n'Flame Scoring
- ✅ C2PA watermarking on all synthetic images
- ✅ Append-only ledger with hash-chain integrity
- ✅ Full CI/CD pipeline with automated testing

See [Account-Core & Safe Synthetic Twin Architecture](#account-core--safe-synthetic-twin-architecture) section below for complete details.

---

## Governance

This repo operates under cleanup-mode governance. All agents must read:

- **[`PROGRAM_CONTROL/DIRECTIVES/QUEUE/OQMI_GOVERNANCE.md`](PROGRAM_CONTROL/DIRECTIVES/QUEUE/OQMI_GOVERNANCE.md)** — governance invariants, PR lifecycle, escalation discipline.
- **[`docs/DOMAIN_GLOSSARY.md`](docs/DOMAIN_GLOSSARY.md)** — naming authority and commit prefix enum.
- **[`governance/OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md`](governance/OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md)** — sovereign infrastructure & security policy (rule_applied_id: OQMI_INFRA_v1.0). Binding on all repos, environments, agents, and infrastructure.
- **[`PROGRAM_CONTROL/WORK-ORDER-v0.9.8.md`](PROGRAM_CONTROL/WORK-ORDER-v0.9.8.md)** — current cleanup-cycle report-back for this repo.

### Cleanup-mode fast path

- Non-financial PRs follow the fast path: auto-merge on green/gray once CI and ship-gate are satisfied.
- Human review is reserved for governance-doc edits plus financial / ledger / compliance categories defined in `OQMI_GOVERNANCE.md §2.2`.
- Cyrano-specific runtime ownership is being stripped from this repo; remaining integrations should communicate through NATS events or webhook contracts instead of in-repo feature expansion.

### Financial Integrity Zone (FIZ)

All paths under `services/ledger/`, `finance/`, and any code touching `balance`, `payout`,
`escrow`, or `ledger_entry` columns are FIZ-scoped. FIZ commits require:

```
FIZ: <subject>
REASON: <why>
IMPACT: <financial surface affected>
CORRELATION_ID: <idempotency key>
```

### Non-negotiable invariants

- **Append-only finance** — no `UPDATE`/`DELETE` on ledger tables; corrections are offset entries.
- **NATS for real-time** — all chat and AI events via NATS.io; no REST polling.
- **Network isolation** — Postgres (5432) and Redis (6379) never on public interface.
- **No secrets in tree** — all credentials in `.env` only, never committed.

---

## Cleanup-mode direction

Cleanup work in this repo is currently focused on:

1. governance sync and ship-gate hardening,
2. removal or archiving of Cyrano L1/L2 remnants that no longer belong here,
3. preserving only the NATS / webhook integration seams needed to hand traffic to the dedicated Cyrano repository.

---

_[rule_applied_id: GOVERNANCE-EQ-v1]_
