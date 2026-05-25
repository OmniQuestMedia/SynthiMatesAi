# Deployment Guide — SynthiMatesAi

**Last Updated:** 2026-05-25
**Rule Applied:** OQMI_GOVERNANCE v1.0

This document covers deployment procedures, environment requirements, and operational considerations for the SynthiMatesAi platform with Shared Account-Core features.

---

## Table of Contents

1. [Infrastructure Requirements](#infrastructure-requirements)
2. [Environment Variables](#environment-variables)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Steps](#deployment-steps)
5. [Account-Core Feature Deployment](#account-core-feature-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Alerts](#monitoring--alerts)

---

## Infrastructure Requirements

### Minimum Requirements

**Compute:**

- Node.js: **22.x** (required — specified in `package.json` engines)
- CPU: 4 cores (recommended 8+ for production)
- Memory: 8GB RAM (recommended 16GB+ for production)
- Storage: 100GB SSD (recommended 500GB+ for production)

**Database:**

- PostgreSQL: **16.x** with **pgvector** extension
- Connection pool: 20-50 connections per instance
- Storage: 100GB minimum, auto-scaling recommended
- Backups: Automated daily snapshots with 30-day retention

**Cache & Queue:**

- Redis: **7.x**
- Memory: 2GB minimum (recommended 8GB+ for production)
- Persistence: AOF enabled for durability

**Message Bus:**

- NATS.io: **2.x**
- Cluster size: 3 nodes minimum for production
- JetStream enabled for persistent streams

**Dependency Manager:**

- **Yarn** (canonical for all OQMInc repos)
- Version: 1.22+ (specified in `package.json` engines)
- **DO NOT use npm or pnpm** — Yarn is the canonical package manager

### External Services

**Required:**

- ElevenLabs API (voice cloning)
- Banana.dev API (Flux LoRA training)
- Stripe (payments)
- Email service (SendGrid, Mailgun, or AWS SES)

**Optional:**

- News API (curator celebrity ingestion)
- C2PA signing service (provenance metadata)
- CDN (Cloudflare, AWS CloudFront)

---

## Environment Variables

### Core Configuration

```bash
# Database
DATABASE_URL=postgresql://chatnow_app:PASSWORD@db-host:5432/chatnow

# Redis
REDIS_URL=redis://redis-host:6379

# NATS
NATS_URL=nats://nats-host:4222

# Node Environment
NODE_ENV=production
PORT=3000
```

### Account-Core Features

```bash
# Membership System
ENABLE_MEMBERSHIPS=true
MEMBERSHIP_STIPEND_ENABLED=true
MEMBERSHIP_GUEST_LIMIT_IMAGES=10
MEMBERSHIP_MEMBER_LIMIT_IMAGES=100
MEMBERSHIP_DIAMOND_LIMIT_IMAGES=-1  # Unlimited

# Payout System
ENABLE_CREATOR_PAYOUTS=true
GATEGUARD_PAYOUT_ENABLED=true
MIN_PAYOUT_AMOUNT_CENTS=5000        # $50 minimum
MAX_PAYOUT_AMOUNT_CENTS=1000000     # $10,000 maximum

# Wallet System
ENABLE_EXPIRATION_SAFETY_NET=true
WALLET_THREE_BUCKET_ENABLED=true
PROMOTIONAL_BONUS_EXPIRY_DAYS=90
MEMBERSHIP_ALLOCATION_EXPIRES_WITH_MEMBERSHIP=true
SAFETY_NET_RECOVERY_FEE_PERCENT=20

# Synthetic Twins
ENABLE_SYNTHETIC_TWINS=true
SAFE_SYNTHETIC_MODE_REQUIRED=true
MIN_REFERENCE_IMAGES=5
MAX_REFINEMENT_ATTEMPTS=6
CELEBRITY_SIMILARITY_THRESHOLD=0.75

# Analytics
ENABLE_CREATOR_ANALYTICS=true
ENABLE_ADMIN_ANALYTICS=true
```

### Security & Compliance

```bash
# GateGuard Risk Engine
GATEGUARD_ENABLED=true
GATEGUARD_FRAUD_THRESHOLD_APPROVE=40
GATEGUARD_FRAUD_THRESHOLD_COOLDOWN=70
GATEGUARD_FRAUD_THRESHOLD_DECLINE=90

# Audit & Compliance
ENABLE_HASH_CHAIN_VERIFICATION=true
WORM_EXPORT_ENABLED=true
AUDIT_CHAIN_VERIFICATION_SCHEDULE="0 2 * * *"  # Daily at 2 AM
WORM_EXPORT_SCHEDULE="0 3 1 * *"               # Monthly on 1st at 3 AM

# Rate Limiting
SYNTHETIC_GENERATION_RATE_LIMIT=10
SYNTHETIC_GENERATION_RATE_WINDOW_MS=3600000    # 1 hour
PAYOUT_REQUEST_RATE_LIMIT=5
PAYOUT_REQUEST_RATE_WINDOW_MS=86400000        # 24 hours
```

### External API Keys

```bash
# Voice Cloning
ELEVENLABS_API_KEY=sk_...

# Image Generation & Training
BANANA_API_KEY=...
BANANA_MODEL_KEY_FLUX_PRO=...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SENDGRID_API_KEY=SG...
NOTIFICATION_FROM_EMAIL=noreply@omniquestmedia.com

# Optional Services
NEWS_API_KEY=...                               # For curator celebrity ingestion
C2PA_SIGNING_ENDPOINT=https://c2pa.example.com
```

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`yarn test`)
- [ ] Linting clean (`yarn lint:ci`)
- [ ] TypeScript checks pass (`yarn typecheck && yarn typecheck:api`)
- [ ] Prisma schema validated (`yarn prisma validate`)
- [ ] Ship-gate verifier passes (`yarn ship-gate`)

### Database Migrations

- [ ] Review pending migrations (`yarn prisma migrate status`)
- [ ] Test migrations on staging database
- [ ] Backup production database before migration
- [ ] Run migrations (`yarn prisma migrate deploy`)
- [ ] Verify pgvector extension installed (`CREATE EXTENSION IF NOT EXISTS vector;`)

### Environment Configuration

- [ ] All required environment variables set
- [ ] External API keys valid and tested
- [ ] Database connection tested
- [ ] Redis connection tested
- [ ] NATS connection tested

### Security Review

- [ ] No secrets committed to repository
- [ ] All `.env` files excluded from version control
- [ ] GateGuard thresholds reviewed and approved
- [ ] Rate limiting configured appropriately
- [ ] Database credentials rotated

### Compliance

- [ ] Audit chain verification scheduled
- [ ] WORM exports configured
- [ ] Backup retention policy reviewed
- [ ] Privacy policy updated (if new features added)
- [ ] Terms of service updated (if needed)

---

## Deployment Steps

### 1. Pre-Deployment Backup

```bash
# Backup database
pg_dump -h db-host -U chatnow_app chatnow > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup Redis (if using persistence)
redis-cli --rdb dump-$(date +%Y%m%d-%H%M%S).rdb
```

### 2. Update Codebase

```bash
# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Install dependencies with frozen lockfile
yarn install --frozen-lockfile
```

### 3. Database Migrations

```bash
# Generate Prisma client
yarn prisma:generate

# Apply migrations (production)
yarn prisma migrate deploy

# Enable pgvector extension (if not already enabled)
psql -h db-host -U chatnow_app -d chatnow -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify schema
yarn prisma validate
```

### 4. Build Application

```bash
# Typecheck
yarn typecheck
yarn typecheck:api

# Build core-api
yarn tsc --project services/core-api/tsconfig.json

# Build cyrano-standalone
yarn --cwd apps/cyrano-standalone build

# Build portals (if deploying)
yarn --cwd apps/portals/main build
yarn --cwd apps/portals/ink-and-steel build
# ... repeat for other portals
```

### 5. Start Services

**Using Docker Compose:**

```bash
docker-compose up -d
```

**Manual Start (recommended for production with process manager):**

```bash
# Start core-api (use PM2 or similar)
pm2 start yarn --name core-api -- workspace core-api dev

# Start cyrano-standalone
pm2 start yarn --name cyrano-ui -- --cwd apps/cyrano-standalone start

# Start portals
pm2 start yarn --name portal-main -- --cwd apps/portals/main start
# ... repeat for other portals
```

### 6. Verify Services

```bash
# Check service health
curl http://localhost:3000/health
curl http://localhost:3100/

# Check database connection
psql -h db-host -U chatnow_app -d chatnow -c "SELECT 1;"

# Check Redis connection
redis-cli ping

# Check NATS connection
nats-top
```

---

## Account-Core Feature Deployment

### DreamCoins Wallet System

**First-Time Setup:**

1. Ensure ledger schema applied (`init-ledger.sql`)
2. Verify three-bucket wallet enabled (`WALLET_THREE_BUCKET_ENABLED=true`)
3. Test token purchase flow on staging
4. Verify expiration safety net offers appear 7 days before expiry

**Migration Notes:**

- If migrating from single-bucket to three-bucket, run migration script to redistribute tokens
- Hash chain must be initialized with genesis hash for new installations

### Membership Tiers

**First-Time Setup:**

1. Configure tier benefits in environment variables
2. Set up monthly stipend distribution job (cron or scheduler)
3. Test subscription creation and cancellation flows
4. Verify grace period behavior on cancellation

**Migration Notes:**

- Existing subscriptions retain their benefits
- Upgrade/downgrade logic applies at next billing cycle

### Creator Payout System

**First-Time Setup:**

1. Configure GateGuard thresholds (`GATEGUARD_FRAUD_THRESHOLD_*`)
2. Set minimum/maximum payout amounts
3. Test payout request flow (APPROVE, COOLDOWN, HARD_DECLINE, HUMAN_ESCALATE)
4. Configure compliance team notifications for escalations

**Migration Notes:**

- Existing creator balances preserved
- Payout rates apply to new requests only

### Synthetic Twin Generation

**First-Time Setup:**

1. Verify pgvector extension installed
2. Populate celebrity database via curator (`POST /admin/ai-twin/curator/trigger`)
3. Configure synthetic generation rate limits
4. Test safe synthetic mode with 5+ images

**Migration Notes:**

- Existing twins unaffected
- New twins must use safe synthetic mode if `SAFE_SYNTHETIC_MODE_REQUIRED=true`

### Analytics Dashboard

**First-Time Setup:**

1. Enable creator and admin analytics features
2. Verify analytics queries perform well (add indexes if needed)
3. Test creator dashboard endpoint
4. Test admin summary endpoint

**Migration Notes:**

- Analytics compute on-demand from ledger and audit tables
- No separate analytics database required

---

## Post-Deployment Verification

### Smoke Tests

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Test synthetic endpoint (non-PII smoke test)
curl -X POST http://localhost:3000/api/ai-twin/test-synthetic

# 3. Test wallet balance endpoint
curl http://localhost:3000/api/wallet/balance/TEST_USER_ID

# 4. Test membership endpoint
curl http://localhost:3000/api/membership/tiers

# 5. Test analytics endpoint
curl http://localhost:3000/api/analytics/dreamcoins/usage?startDate=2026-05-01&endDate=2026-05-31
```

### Feature Verification

- [ ] DreamCoins purchase flow works end-to-end
- [ ] Three-bucket wallet spend order correct (PROMOTIONAL_BONUS → MEMBERSHIP_ALLOCATION → PURCHASED)
- [ ] Membership subscription creation works
- [ ] Creator payout request routes through GateGuard
- [ ] Synthetic twin generation completes successfully
- [ ] Analytics endpoints return data

### Monitoring Verification

- [ ] Application logs flowing to monitoring system
- [ ] Error tracking configured (Sentry, Rollbar, etc.)
- [ ] Performance metrics collecting (response times, throughput)
- [ ] Database query performance monitored
- [ ] NATS event publishing working

### Security Verification

- [ ] Hash chain verification job running
- [ ] WORM export job scheduled
- [ ] GateGuard decisions logging correctly
- [ ] Audit events writing to `immutable_audit_event` table
- [ ] No secrets in logs or error messages

---

## Rollback Procedures

### Application Rollback

```bash
# Stop current services
pm2 stop all

# Revert to previous release
git checkout <PREVIOUS_TAG>

# Reinstall dependencies
yarn install --frozen-lockfile

# Rebuild
yarn typecheck && yarn typecheck:api
yarn tsc --project services/core-api/tsconfig.json

# Restart services
pm2 restart all
```

### Database Rollback

**WARNING:** Database rollbacks are destructive. Only perform if absolutely necessary.

```bash
# Restore from backup (PostgreSQL)
psql -h db-host -U chatnow_app -d chatnow < backup-YYYYMMDD-HHMMSS.sql

# Verify restoration
psql -h db-host -U chatnow_app -d chatnow -c "SELECT COUNT(*) FROM ledger_entries;"
```

**Note:** Ledger entries follow append-only semantics. If rollback required, consider creating offset entries instead of full database restore.

### Feature Flag Rollback

For immediate feature disable without code rollback:

```bash
# Disable memberships
ENABLE_MEMBERSHIPS=false

# Disable creator payouts
ENABLE_CREATOR_PAYOUTS=false

# Disable synthetic twins
ENABLE_SYNTHETIC_TWINS=false

# Restart services
pm2 restart all
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

**Application Health:**

- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Request throughput
- Active connections

**Database:**

- Connection pool utilization
- Query performance (slow query log)
- Table sizes (ledger_entries, immutable_audit_event)
- Replication lag (if using replicas)

**Account-Core Features:**

- DreamCoins purchase volume
- Token spend rate
- Payout request volume
- Payout approval rate
- GateGuard decision distribution (APPROVE vs DECLINE vs ESCALATE)
- Synthetic twin generation success rate
- Membership tier distribution

### Alert Thresholds

**Critical Alerts (PagerDuty / 24/7 on-call):**

- Application down (health check fails)
- Database connection errors
- Hash chain verification failure
- Error rate > 5%
- Response time p99 > 5 seconds

**Warning Alerts (Email / Slack):**

- High payout escalation rate (> 10%)
- Synthetic twin generation failure rate > 5%
- GateGuard HARD_DECLINE rate > 20%
- Database query latency p95 > 1 second
- Redis memory usage > 80%

**Informational Alerts (Dashboard / Slack):**

- Daily DreamCoins volume report
- Daily payout summary
- Weekly top creators report
- Monthly WORM export completion

### Dashboards

**Operational Dashboard:**

- Application health (uptime, response times, error rates)
- Infrastructure metrics (CPU, memory, disk, network)
- Database performance
- Cache hit rates

**Business Metrics Dashboard:**

- DreamCoins purchase/spend trends
- Membership tier distribution
- Creator payout volume
- Synthetic twin generation volume
- Top creators by earnings

**Security Dashboard:**

- GateGuard decision distribution
- Welfare score trends
- Audit event volume
- Hash chain verification status
- Failed login attempts

---

## CI/CD Pipeline

### GitHub Actions Workflow

The CI workflow (`.github/workflows/ci.yml`) runs on every push and PR:

**Jobs:**

1. **Restricted Paths Gate** - Fail-closed on ledger/consent/PII changes
2. **Validate SQL Schema** - Apply ledger schema to live PostgreSQL
3. **Validate Repository Structure** - Check required files exist
4. **Workspace Quality** - Lint, typecheck, test, build
5. **Ship-Gate Verifier** - Verify L0 invariants

**Node.js Version:** 22.x (specified in workflow and `package.json` engines)
**Cache:** Yarn cache enabled with `yarn.lock` as cache key
**Frozen Lockfile:** All installs use `--frozen-lockfile` for reproducibility

### Auto-Merge Policy

**Cleanup-Mode Fast Path:**

- Non-financial PRs auto-merge on green/gray once CI + ship-gate satisfied
- Human review reserved for:
  - Governance doc edits
  - Financial/ledger changes (FIZ-scoped)
  - Compliance changes

**FIZ-Scoped Changes:**
All changes to:

- `services/ledger/`
- `finance/`
- Any code touching `balance`, `payout`, `escrow`, `ledger_entry` columns

Require:

```
FIZ: <subject>
REASON: <why>
IMPACT: <financial surface affected>
CORRELATION_ID: <idempotency key>
```

### Deployment Environments

**Development:**

- Branch: `develop`
- Auto-deploy: On merge to develop
- Database: Shared dev instance
- External APIs: Sandbox/test keys

**Staging:**

- Branch: `staging`
- Auto-deploy: On merge to staging
- Database: Staging instance (production-like data)
- External APIs: Sandbox/test keys

**Production:**

- Branch: `main`
- Deploy: Manual approval after CI green
- Database: Production instance
- External APIs: Live keys

---

## Support & Escalation

**Deployment Issues:**

- Engineering Team: engineering@omniquestmedia.com
- On-Call: PagerDuty escalation

**Security Incidents:**

- Security Team: security@omniquestmedia.com
- Incident Hotline: [Redacted - internal only]

**Compliance Questions:**

- Compliance Team: compliance@omniquestmedia.com

---

## Governance References

This deployment guide follows:

- **OQMI_GOVERNANCE.md** - OQMInc governance invariants
- **OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md** - Infrastructure security policy
- **DOMAIN_GLOSSARY.md** - Naming authority and commit prefixes
- **ACCOUNT_CORE_SECURITY.md** - Account-core security architecture

**Last Reviewed:** 2026-05-25
**Next Review Due:** 2026-08-25
**Document Owner:** OmniQuest Media Inc. DevOps Team

---

_rule_applied_id: DEPLOYMENT_GUIDE_v1.0_
