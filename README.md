# SythiMatesAi — Cleanup Mode

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

## Shared Account-Core Architecture

The **Shared Account-Core** system (integrated from ChatNowZone--BUILD) provides a unified, enterprise-grade foundation for the platform's economy, user management, and creator monetization.

### Core Components

#### 1. Token Economy (DreamCoins / CZT)

**CZT (ChatZone Tokens / DreamCoins)** is the single platform currency used for all transactions:

- **Token Purchase** — Users buy tokens via Stripe or other payment gateways
- **Membership Allocations** — Subscription tiers grant monthly token allotments
- **Promotional Bonuses** — Platform-awarded free credits for engagement
- **Token Spending** — Used for AI image generation, voice calls, synthetic twin creation, and premium features

**Three-Bucket Wallet System:**
1. **PROMOTIONAL_BONUS** — Priority 1 (spent first) — Free credits and bonuses
2. **MEMBERSHIP_ALLOCATION** — Priority 2 — Subscription-granted tokens
3. **PURCHASED** — Priority 3 (spent last) — User-purchased tokens

All token operations are logged to the append-only ledger with full audit trails.

#### 2. Membership Tiers & Subscriptions

Users can upgrade to premium tiers for enhanced features and token allocations:

- **Free Tier** — Access to Spark Twins (15 messages/day)
- **Basic** — Monthly token allotment + increased message limits
- **Pro** — Higher token allotment + priority generation + advanced features
- **Diamond** — VIP concierge service + maximum token allotment + exclusive features

**Membership Features:**
- Automatic monthly token allocation
- Tiered access to AI generation features
- Priority support and faster processing
- Exclusive content and early access

**API Endpoints:**
- `POST /account/membership/purchase` — Upgrade membership tier
- `GET /account/membership/status` — Check current membership status
- `POST /account/tokens/purchase` — Buy additional tokens
- `GET /account/balance` — View token balance by bucket

#### 3. Creator Monetization & Payouts

Creators earn revenue from their AI twins and content:

**Revenue Streams:**
- **Synthetic Twin Usage** — Creators earn 30-50% of tokens spent on their AI twins
- **Image/Voice Generation** — Revenue share on each generation request
- **Membership Subscriptions** — Recurring earnings from subscriber base
- **Tips & Gifts** — Direct fan support

**Payout Workflow:**
1. **Creator Dashboard** — View real-time earnings and analytics
2. **Payout Request** — Submit withdrawal request (minimum threshold applies)
3. **GateGuard Pre-Check** — Automatic fraud detection and risk scoring
4. **Admin Review** — High-risk requests escalated for manual approval
5. **Processing** — Approved payouts executed via ledger
6. **Notification** — Creator notified of payout status

**API Endpoints:**
- `GET /creator/dashboard/summary` — Dashboard with earnings and analytics
- `GET /creator/dashboard/analytics` — Detailed revenue breakdown
- `POST /creator/payout/request` — Submit payout request
- `GET /creator/payout/history` — View payout history

#### 4. Financial Integrity & Security

All financial operations are protected by multiple layers of security:

**GateGuard Sentinel™ Pre-Processor:**
- **Pre-execution risk assessment** before every transaction
- **Welfare Guardian scoring** for fraud detection
- **Automatic decision gates** (APPROVE / ESCALATE / DECLINE)
- **Hash-chained audit log** for tamper-evident records

**Append-Only Ledger:**
- **NO UPDATE or DELETE** operations on financial records
- **Corrections via offset entries** only
- **Immutable audit trail** with correlation IDs
- **Every transaction logged** with reason codes

**Mandatory Fields:**
- `idempotency_key` — Prevents duplicate charges
- `correlation_id` — Links related operations
- `reason_code` — Business justification
- `actor_id` — Who performed the action

See [`docs/ACCOUNT_CORE_SECURITY.md`](docs/ACCOUNT_CORE_SECURITY.md) for complete security documentation.

#### 5. Analytics & Monitoring

Real-time dashboards for creators and admins:

**Creator Analytics:**
- Token usage trends over time
- Synthetic Twin generation volume and revenue
- Top-performing AI twins
- Payout request summary
- Fan engagement metrics

**Admin Analytics:**
- Platform-wide token usage
- Membership tier distribution
- Revenue trends and projections
- Payout queue monitoring
- Risk and fraud alerts

**API Endpoints:**
- `GET /creator/dashboard/analytics` — Creator analytics (30/60/90 days)
- `GET /admin/analytics` — Platform-wide metrics (admin-only)
- `GET /admin/analytics/token-usage` — Token purchase and spend trends
- `GET /admin/analytics/membership-distribution` — Tier breakdown
- `GET /admin/analytics/payout-queue` — Pending payouts summary

### Integration with AI Features

The Account-Core system seamlessly integrates with platform features:

**Synthetic Twin Creation:**
- Token deduction when generating Safe Synthetic Twins
- Creator revenue share automatically calculated
- Usage tracked for analytics dashboard

**In-Chat Generation:**
- Real-time token balance checks before generation
- Automatic bucket-priority spending
- Creator earnings credited on completion

**Voice Cloning:**
- Premium feature requires membership tier or token spend
- Creator revenue share for voice call usage
- Usage logged to ledger with provenance

### Feature Flags & Toggles

Account-Core features can be controlled via environment variables and governance config:

- `MEMBERSHIP_ENABLED` — Enable/disable subscription tiers
- `CREATOR_PAYOUTS_ENABLED` — Enable/disable creator payout requests
- `TOKEN_PURCHASE_ENABLED` — Enable/disable direct token purchases
- `GATEGUARD_STRICT_MODE` — Enforce strict risk scoring
- `MINIMUM_PAYOUT_CENTS` — Configurable minimum payout threshold

### Compliance & Audit

Full compliance with financial regulations and privacy laws:

- **GDPR** — User data access, export, and erasure
- **AML/KYC** — Creator identity verification for payouts
- **Audit Trail** — Every action logged with legal basis
- **Legal Hold** — Freeze accounts for investigations
- **WORM Export** — Immutable exports for regulatory compliance

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
