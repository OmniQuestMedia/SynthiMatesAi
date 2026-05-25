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

## Architecture: Account-Core + DreamCoins + Safe Synthetic Twin

This section provides a comprehensive overview of how the Account-Core, DreamCoins ledger, Safe Synthetic Twin, and GateGuard systems work together to power SynthiMatesAi.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User / Creator                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core API (NestJS)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Voice Chat   │  │ Synthetic    │  │ Account            │   │
│  │ Controller   │  │ Twin Creator │  │ Controller         │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘   │
│         │                  │                    │                │
│         ▼                  ▼                    ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Voice Chat   │  │ AI Twin      │  │ Account            │   │
│  │ Service      │  │ Service      │  │ Service            │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘   │
└─────────┼──────────────────┼───────────────────┼────────────────┘
          │                  │                    │
          │                  │                    │
┌─────────▼──────────────────▼───────────────────▼────────────────┐
│                    Shared Services Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Account-Core (services/account-core/)                    │  │
│  │  • resolveAccountType(userId) → USER/CREATOR/DUAL         │  │
│  │  • buildUnifiedView(userId) → UnifiedAccountView          │  │
│  │  • hasCreatorAccess(userId) → boolean                     │  │
│  │  • isVerifiedCreator(userId) → boolean                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Ledger Service (services/ledger/)                        │  │
│  │  • record(entry) → LedgerEntry (idempotent)               │  │
│  │  • spend(userId, amount, reason) → SpendResult            │  │
│  │  • credit(userId, amount, bucket, reason) → void          │  │
│  │  • verifyChain(userId) → ValidationResult                 │  │
│  │                                                             │  │
│  │  Three-Bucket Wallet:                                      │  │
│  │  ├─ purchased  (user-paid tokens)                          │  │
│  │  ├─ membership (stipends from membership tiers)            │  │
│  │  └─ bonus      (platform bonuses)                          │  │
│  │                                                             │  │
│  │  Spend Order: purchased → membership → bonus               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GateGuard Sentinel (services/core-api/src/gateguard/)    │  │
│  │  • evaluate(input) → GateGuardResult                       │  │
│  │  • preProcess<T>(fn, input) → T | GateGuardDeclineError   │  │
│  │                                                             │  │
│  │  Scoring:                                                  │  │
│  │  ├─ Fraud Score (0-100): chargeback, velocity, geo, VPN   │  │
│  │  └─ Welfare Score (0-100): velocity, overnight, dwell     │  │
│  │                                                             │  │
│  │  Decisions:                                                │  │
│  │  ├─ [0..40) → APPROVE                                      │  │
│  │  ├─ [40..70) → COOLDOWN (soft decline)                    │  │
│  │  ├─ [70..90) → HARD_DECLINE                               │  │
│  │  └─ [90..100] → HUMAN_ESCALATE (welfare team)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Safe Synthetic Twin Pipeline (services/ai-twin/)         │  │
│  │  • createSyntheticModel(images, fantasyLevel) → result    │  │
│  │                                                             │  │
│  │  Safeguards (applied in sequence):                         │  │
│  │  1. Multi-image blending (min 5 images)                    │  │
│  │  2. Celebrity down-weighting (similarity < 0.5)            │  │
│  │  3. Refinement loop (6 attempts, target ≤ 0.3)             │  │
│  │  4. Dissimilarity gate (cosine threshold 0.15)             │  │
│  │  5. C2PA watermarking (provenance metadata)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Account-Core Metrics (services/core-api/src/analytics/)  │  │
│  │  • trackDreamCoinsSpend(user, amount, reason)             │  │
│  │  • trackPayoutRequest(creator, amount, status)            │  │
│  │  • trackMembershipUpgrade(user, fromTier, toTier)         │  │
│  │  • trackVoiceMessage(user, twin, messages, tokens)        │  │
│  │  • trackSyntheticGeneration(user, twin, safeguards)       │  │
│  │  • emitSummary() → MetricsSummary                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NATS Event Bus                             │
│  All operations emit events for monitoring & audit:              │
│  • account_core.dreamcoins.spent                                 │
│  • account_core.payout.requested                                 │
│  • account_core.membership.upgraded                              │
│  • account_core.ledger.transaction                               │
│  • account_core.voice.message                                    │
│  • account_core.synthetic.generation                             │
│  • gateguard.decision.approved / cooldown / hard_decline         │
│  • audit.immutable.* (purchase, spend, recovery, etc.)           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Postgres + Redis + pgvector                    │
│  • CanonicalWallet (three-bucket balances)                       │
│  • CanonicalLedgerEntry (hash-chained immutable log)             │
│  • User, Creator (account profiles)                              │
│  • Membership (tiers, subscriptions, stipends)                   │
│  • AiTwin (synthetic twin metadata)                              │
│  • GateGuardLog (risk/welfare decisions)                         │
│  • Celebrity embeddings (pgvector for similarity checks)         │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works: Key User Flows

#### 1. Voice Chat with DreamCoins Deduction

**User sends a voice message to an AI Twin:**

1. User calls `POST /voice-chat/send-message` with userId, twinId, transcript
2. VoiceChat Service validates input and retrieves user's wallet
3. **GateGuard check** (optional): evaluate fraud/welfare risk
4. Check wallet balance across all three buckets (purchased, membership, bonus)
5. If balance insufficient → throw error
6. **Deduct 5 DreamCoins** using deterministic spend order:
   - Deduct from `purchased` first (user-paid tokens)
   - Then from `membership` (stipend tokens)
   - Finally from `bonus` (platform bonuses)
7. Create idempotent ledger entry with correlation_id and reason_code='SPEND'
8. Store voice transcript in Memory Bank as FACT-type memory
9. **Emit NATS event**: `account_core.voice.message` for monitoring
10. **Track metrics**: AccountCoreMetricsService records tokens charged
11. Return response with new balance breakdown

**Key Files:**

- `services/core-api/src/voice-chat/voice-chat.service.ts` (main logic)
- `services/ledger/ledger.service.ts` (wallet & spend logic)
- `services/core-api/src/analytics/account-core-metrics.service.ts` (metrics)

#### 2. Creator Payout Request

**Creator requests payout of earned DreamCoins:**

1. Creator calls `POST /payouts/request` with creatorId, amount
2. **Account-Core check**: `isVerifiedCreator(userId)` → must be true
3. **GateGuard evaluation**: fraud/welfare scoring for PAYOUT action
   - If score ≥ 70 → HARD_DECLINE or HUMAN_ESCALATE
4. Check creator's earned balance (from fan tips, subscriptions, etc.)
5. If sufficient balance:
   - Create payout record with status='PENDING'
   - Deduct from creator's earned wallet
   - Create ledger entry with reason_code='PAYOUT'
6. **Emit NATS events**:
   - `account_core.payout.requested`
   - `audit.immutable.payout`
7. **Track metrics**: AccountCoreMetricsService records payout
8. Queue for payment processing (Stripe, bank transfer, etc.)

**Key Files:**

- `services/ledger/payout.service.ts` (payout logic)
- `services/core-api/src/gateguard/gateguard.service.ts` (risk check)
- `services/account-core/account.service.ts` (creator verification)

#### 3. Membership Upgrade

**User upgrades from GUEST to VIP tier:**

1. User calls `POST /memberships/upgrade` with userId, targetTier
2. Retrieve pricing for target tier (e.g., VIP_GOLD = $19.99/month)
3. **GateGuard evaluation**: fraud scoring for PURCHASE action
4. Process payment via Stripe (or payment gateway)
5. If payment successful:
   - Update user's membership tier in database
   - **Credit membership stipend** to user's `membership` bucket
     - VIP: 50 CZT/month
     - VIP_SILVER: 100 CZT/month
     - VIP_GOLD: 200 CZT/month
     - VIP_PLATINUM: 500 CZT/month
     - VIP_DIAMOND: 1000 CZT/month
   - Create ledger entry with reason_code='MEMBERSHIP_STIPEND'
6. **Emit NATS events**:
   - `account_core.membership.upgraded`
   - `membership.subscription.created`
7. **Track metrics**: AccountCoreMetricsService records upgrade
8. Return new membership details and wallet balance

**Key Files:**

- `services/core-api/src/account/membership.service.ts` (membership logic)
- `services/ledger/ledger.service.ts` (stipend crediting)

#### 4. Safe Synthetic Twin Generation

**Creator creates a Safe Synthetic Twin from photos:**

1. Creator uploads 5+ photos via AI Twin wizard
2. Client calls `POST /cyrano/ai-twin/synthetic` with images + fantasyLevel
3. **Account-Core check**: `hasCreatorAccess(userId)` → must be true
4. AI Twin Service starts Safe Synthetic Pipeline:

   **Safeguard 1: Multi-Image Blending**
   - Reject if < 5 images provided
   - Extract ArcFace embeddings from each image

   **Safeguard 2: Celebrity Down-Weighting**
   - Compare each embedding to celebrity database (pgvector)
   - If similarity ≥ 0.5 → reduce weight to max 0.2

   **Safeguard 3: Refinement Loop**
   - Apply controlled fantasy deviation
   - For each iteration (max 6):
     - Generate candidate embedding
     - Check similarity to known celebrities
     - If similarity ≤ 0.3 → accept
     - Else → apply correction and retry

   **Safeguard 4: Dissimilarity Gate**
   - Check final embedding against all input embeddings
   - If cosine similarity > 0.15 (too close to any input) → nudge away

   **Safeguard 5: C2PA Watermarking**
   - Add provenance metadata to generated image
   - Include timestamp, creator ID, safeguards applied

5. Generate final image via Flux model with IP-Adapter
6. **Emit NATS event**: `account_core.synthetic.generation`
7. **Track metrics**: success/failure, safeguards applied, fantasy level
8. Return image URL with metadata

**Key Files:**

- `services/ai-twin/src/synthetic-pipeline.service.ts` (safeguards)
- `services/ai-twin/src/ai-twin.service.ts` (orchestration)

### DreamCoins Economy: How It All Works Together

#### Token Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     DreamCoins Economy                       │
└─────────────────────────────────────────────────────────────┘

User Acquisition:
┌──────────────┐    Stripe     ┌──────────────────────────┐
│     User     │───────────────▶│  Purchase DreamCoins     │
│              │  $10 = 100 CZT │  (credited to 'purchased'│
└──────────────┘                │   bucket)                │
                                └──────────────────────────┘

Membership Benefits:
┌──────────────┐  Monthly      ┌──────────────────────────┐
│ VIP Member   │  Stipend      │  Membership Stipend      │
│ (VIP_GOLD)   │───────────────▶│  (credited to 'membership'│
│              │  200 CZT/mo   │   bucket)                │
└──────────────┘                └──────────────────────────┘

Platform Bonuses:
┌──────────────┐  Promo/Bonus  ┌──────────────────────────┐
│     User     │───────────────▶│  Platform Bonus          │
│              │  50 CZT       │  (credited to 'bonus'    │
└──────────────┘                │   bucket)                │
                                └──────────────────────────┘

Spending (deterministic order):
┌──────────────┐               ┌──────────────────────────┐
│ Voice Chat   │  5 CZT/msg    │  Deduct from:            │
│ AI Twin      │───────────────▶│  1. purchased (first)    │
│              │               │  2. membership (second)  │
└──────────────┘               │  3. bonus (last)         │
                               └──────────────────────────┘

Creator Earnings:
┌──────────────┐               ┌──────────────────────────┐
│ Fan Tips &   │  Revenue      │  Creator Earned Balance  │
│ Subscriptions│───────────────▶│  (separate from user     │
│              │               │   wallets)               │
└──────────────┘               └──────────────────────────┘
                                         │
                                         │ Payout Request
                                         ▼
                               ┌──────────────────────────┐
                               │  Bank Transfer / Stripe  │
                               │  (converted to USD)      │
                               └──────────────────────────┘
```

#### Financial Integrity Guarantees

1. **Append-Only Ledger**: All transactions are immutable. Corrections are offset entries, never updates.
2. **Hash-Chained**: Each ledger entry includes SHA-256 hash of previous entry for integrity verification.
3. **Idempotent**: Duplicate transaction attempts with same correlation_id are rejected (replay protection).
4. **Deterministic Spend Order**: purchased → membership → bonus (enforced in code, never configurable).
5. **GateGuard Gating**: High-risk transactions blocked before touching ledger.
6. **NATS Audit Trail**: Every transaction emits event for real-time monitoring and compliance.
7. **Three-Bucket Isolation**: Purchased, membership, and bonus tokens tracked separately for accounting.

### Monitoring & Observability

All Account-Core and DreamCoins operations are observable in real-time via the `AccountCoreMetricsService`:

**Metrics Tracked:**

- DreamCoins spent (by reason code: VOICE_CHAT, SYNTHETIC_GENERATION, etc.)
- Payout requests (by status: PENDING, APPROVED, REJECTED, COMPLETED)
- Membership upgrades (by tier transition and revenue)
- Ledger transactions (by type: CREDIT/DEBIT, bucket, reason code)
- Voice messages sent (messages count, tokens charged)
- Synthetic generations (success rate, safeguards applied)
- Account lookups (by type: USER/CREATOR/DUAL)

**NATS Topics for Real-Time Monitoring:**

- `account_core.dreamcoins.spent`
- `account_core.payout.requested`
- `account_core.membership.upgraded`
- `account_core.ledger.transaction`
- `account_core.voice.message`
- `account_core.synthetic.generation`
- `account_core.lookup`
- `account_core.metrics.summary`

**Dashboard Integration:**
Subscribe to NATS topics to build real-time dashboards showing:

- Total DreamCoins in circulation (by bucket)
- Daily active users and creators
- Revenue from membership upgrades
- Top spending categories
- Synthetic generation success rates
- GateGuard block rates by decision type

### Security & Compliance

**Account-Core Security:**

- Role-based access control (USER, CREATOR, ADMIN)
- Creator verification required for payouts
- Multi-tenant organization isolation
- Account status enforcement (ACTIVE, SUSPENDED, DEACTIVATED)

**Ledger Security:**

- Append-only (no UPDATE/DELETE)
- Hash-chain verification
- Idempotency via correlation_id
- All transactions auditable via NATS

**GateGuard Security:**

- Multi-factor fraud scoring (device, geo, velocity, chargeback history)
- Welfare monitoring (overnight sessions, dwell time, chase-loss patterns)
- Zero-knowledge AV checking for sensitive content
- Federated ban checking across platforms
- Human escalation for edge cases

**Safe Synthetic Twin Security:**

- Celebrity protection (down-weighting + refinement)
- Dissimilarity gate prevents near-clones
- C2PA provenance metadata
- Legal/ethical consent enforcement

### Key Documentation

- **Account-Core Implementation**: `services/account-core/`
- **DreamCoins Ledger**: `services/ledger/`
- **GateGuard**: `services/core-api/src/gateguard/`
- **Safe Synthetic Twin**: `docs/SYNTHETIC_TWIN_SECURITY.md`
- **Voice Chat Integration**: `services/core-api/src/voice-chat/`
- **Monitoring**: `services/core-api/src/analytics/account-core-metrics.service.ts`
- **Roadmap**: `docs/ROADMAP.md`
- **Governance**: `PROGRAM_CONTROL/DIRECTIVES/QUEUE/OQMI_GOVERNANCE.md`
- **Domain Glossary**: `docs/DOMAIN_GLOSSARY.md`

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
