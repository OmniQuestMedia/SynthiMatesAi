# Deployment Guide — Account-Core + Safe Synthetic Twin

**Status:** Production Ready ✅
**Last Updated:** 2026-05-25
**Version:** Phase 6 Complete

---

## Overview

This guide covers deployment of the Account-Core + Safe Synthetic Twin integration in SynthiMatesAi. The system includes:

1. **DreamCoins (CZT) Financial System** — Three-bucket wallet, append-only ledger
2. **Membership Tiers** — Six-tier subscription system with bonus tokens
3. **GateGuard Sentinel™** — Financial integrity protection
4. **Safe Synthetic Twin Creator** — 5-layer AI generation safeguards
5. **Creator Payout System** — Performance-based payouts with Flicker n'Flame Scoring

---

## Prerequisites

### Required Infrastructure

- **Postgres 16** with pgvector extension
- **Redis 7+** for caching and rate limiting
- **NATS.io** for real-time event fabric
- **Node.js 22** (LTS)
- **Yarn 1.22+** (canonical package manager)

### Required Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://localhost:6379

# NATS
NATS_URL=nats://localhost:4222

# AI Services
ELEVENLABS_API_KEY=your_elevenlabs_api_key
BANANA_API_KEY=your_banana_api_key
BANANA_MODEL_KEY_FLUX_PRO=your_flux_pro_model_key

# Safe Synthetic Pipeline
SYNTHETIC_GENERATION_ENDPOINT=https://your-synthetic-endpoint.com
NEWS_API_KEY=your_news_api_key  # Optional, for curator ingestion

# Application
NODE_ENV=production
PORT=3000
```

---

## Deployment Flow

### Step 1: Infrastructure Setup

#### Postgres with pgvector

```bash
# Docker Compose (recommended)
docker-compose up postgres -d

# OR manual setup
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_USER=chatnow_app \
  -e POSTGRES_DB=chatnow \
  -p 127.0.0.1:5432:5432 \
  pgvector/pgvector:pg16

# Enable pgvector extension
psql -h localhost -U chatnow_app -d chatnow -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### Redis

```bash
# Docker Compose
docker-compose up redis -d

# OR manual setup
docker run -d \
  --name redis \
  -p 127.0.0.1:6379:6379 \
  redis:7-alpine
```

#### NATS

```bash
# Docker Compose
docker-compose up nats -d

# OR manual setup
docker run -d \
  --name nats \
  -p 127.0.0.1:4222:4222 \
  -p 127.0.0.1:8222:8222 \
  nats:latest
```

### Step 2: Application Deployment

#### Install Dependencies

```bash
yarn install --frozen-lockfile
```

**Important:** Use `--frozen-lockfile` to ensure exact dependency versions from `yarn.lock`.

#### Database Migration

```bash
# Generate Prisma Client
yarn prisma:generate

# Validate schema
yarn prisma validate

# Push schema to database (production-safe, no data loss)
yarn prisma:push

# OR run migrations (recommended for production)
yarn prisma migrate deploy
```

#### Seed Database (Optional for initial setup)

```bash
# Seeds house models and membership fixtures
yarn prisma db seed
```

#### Build Application

```bash
# Build core-api
yarn tsc --project services/core-api/tsconfig.json

# Build cyrano-standalone
yarn --cwd apps/cyrano-standalone build

# Build all portals
for portal in main ink-and-steel lotus-bloom desperate-housewives barely-legal dark-desires; do
  yarn --cwd apps/portals/$portal build
done
```

### Step 3: Pre-Deployment Validation

#### Run CI Checks Locally

```bash
# Lint
yarn lint:ci

# Typecheck
yarn typecheck
yarn typecheck:api
yarn --cwd apps/cyrano-standalone typecheck

# Tests
yarn test

# Ship-gate verifier
yarn ship-gate
```

All checks must pass before deploying to production.

### Step 4: Start Services

#### Development Mode

```bash
# Start infrastructure
docker-compose up db redis nats -d

# Start core API
yarn workspace core-api dev

# Start cyrano-standalone (in separate terminal)
cd apps/cyrano-standalone && yarn dev

# Start portals (in separate terminals)
cd apps/portals/main && yarn dev
```

#### Production Mode

```bash
# Start all services with Docker Compose
docker-compose up -d

# OR start individually
yarn workspace core-api start  # Production mode
```

**Service Ports:**

- Core API: `http://localhost:3000`
- Cyrano Standalone: `http://localhost:3100`
- Portal — Main: `http://localhost:3001`
- Portal — Ink & Steel: `http://localhost:3002`
- Portal — Lotus Bloom: `http://localhost:3003`
- Portal — Desperate Housewives: `http://localhost:3004`
- Portal — Barely Legal: `http://localhost:3005`
- Portal — Dark Desires: `http://localhost:3006`

---

## Production Configuration

### Network Isolation

**Critical:** Postgres and Redis must NEVER be exposed on public interfaces.

**docker-compose.yml:**

```yaml
postgres:
  ports:
    - '127.0.0.1:5432:5432' # ✅ Localhost only

redis:
  ports:
    - '127.0.0.1:6379:6379' # ✅ Localhost only
```

**Production firewall rules:**

- Allow only application servers to access Postgres:5432
- Allow only application servers to access Redis:6379
- Expose only API gateway (reverse proxy) on public interface

### Secret Management

**Never commit secrets to repository.**

**Options:**

1. **Environment Variables** — `.env` file (development only)
2. **AWS Secrets Manager** — Production recommended
3. **Kubernetes Secrets** — For K8s deployments
4. **HashiCorp Vault** — Enterprise option

**Example (AWS Secrets Manager):**

```bash
# Retrieve secrets at runtime
DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id prod/synthimates/database-url \
  --query SecretString \
  --output text)
```

### Rate Limiting

Rate limits are configured in controller decorators:

```typescript
@Throttle(10, 60)  // 10 requests per 60 seconds
```

**Production adjustment:**

- Monitor API usage patterns
- Adjust limits in `services/ai-twin/src/ai-twin.controller.ts`
- Consider Redis-backed rate limiting for distributed deployments

### Scaling Considerations

#### Banana.dev Workloads

- Limit concurrent synthetic generation jobs
- Configure queue workers for training jobs
- Monitor API quota and rate limits

#### Redis

- Size memory for burst queueing/rate-limit keys
- Enable persistence (RDB or AOF) for critical cache
- Alert on eviction events

#### pgvector/Postgres

- Schedule regular VACUUM ANALYZE on vector tables
- Monitor similarity query latency
- Index maintenance for ArcFace embeddings

---

## Deployment Validation

### Health Checks

#### Core API

```bash
curl http://localhost:3000/health
# Expected: {"status": "ok"}
```

#### Database Connection

```bash
curl http://localhost:3000/api/health/db
# Expected: {"database": "connected"}
```

#### NATS Connection

```bash
curl http://localhost:3000/api/health/nats
# Expected: {"nats": "connected"}
```

### Smoke Tests

#### Token Purchase Flow

```bash
# Test token purchase (requires auth)
curl -X POST http://localhost:3000/api/account/purchase-tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount_tokens": 100, "correlation_id": "smoke-test-001"}'
```

#### Safe Synthetic Generation

```bash
# Test synthetic generation endpoint (controller-level)
yarn jest services/core-api/src/cyrano/ai-twin-synthetic.controller.spec.ts --runInBand
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/ci.yml`

**Jobs:**

1. **Restricted Paths Gate** — Blocks ledger/consent/PII changes
2. **Validate Schema** — Applies schema to live Postgres
3. **Validate Structure** — Checks required files exist
4. **Workspace Quality** — Lint, typecheck, format, test
5. **Ship-Gate Verifier** — Validates L0 invariants

**Requirements:**

- Node.js 22
- Frozen lockfile (`yarn install --frozen-lockfile`)
- Postgres with pgvector
- All tests pass
- Zero lint/typecheck errors

### Auto-Merge

**Workflow:** `.github/workflows/auto-merge.yml`

**Conditions:**

- CI green
- Ship-gate passed
- Non-FIZ changes (fast path)
- No restricted paths touched

**FIZ changes require manual review.**

---

## Monitoring & Observability

### Key Metrics to Monitor

#### Financial Metrics

- **GateGuard Decisions:**
  - APPROVE rate
  - COOLDOWN rate
  - HARD_DECLINE rate
  - HUMAN_ESCALATE rate

- **Ledger Health:**
  - Hash-chain integrity checks
  - Duplicate correlation_id attempts
  - Wallet balance discrepancies

- **Payout Processing:**
  - Payout request volume
  - Approval latency
  - Estimated vs. actual payout values

#### AI Generation Metrics

- **Synthetic Generation:**
  - Generation success rate
  - Safeguard failures (celebrity similarity, dissimilarity gate)
  - C2PA watermarking coverage

- **Training Jobs:**
  - LoRA training success rate
  - Training queue depth
  - Training duration (p50, p95, p99)

#### System Health

- **API Performance:**
  - Request latency (p50, p95, p99)
  - Error rate
  - Rate limit hits

- **Database:**
  - Connection pool utilization
  - Query latency
  - Replication lag (if applicable)

- **NATS:**
  - Message throughput
  - Queue depth
  - Consumer lag

### Logging

**Key Log Events:**

- GateGuard decisions (append-only)
- Ledger entries (immutable)
- Payout requests and approvals
- Synthetic generation safeguard results
- Training job lifecycle

**Log Levels:**

- `ERROR` — Critical failures requiring immediate attention
- `WARN` — Degraded performance or unusual patterns
- `INFO` — Normal operations (GateGuard approvals, payouts)
- `DEBUG` — Detailed diagnostics (development only)

### Alerting

**Critical Alerts:**

- Database connection failures
- Redis connection failures
- NATS connection failures
- GateGuard HUMAN_ESCALATE rate > 5%
- Hash-chain integrity violations
- Duplicate correlation_id attempts

**Warning Alerts:**

- GateGuard HARD_DECLINE rate > 10%
- Synthetic generation failure rate > 5%
- Payout approval latency > 1 hour
- Training queue depth > 50 jobs

---

## Rollback Procedure

### Database Rollback

**Migrations:**

```bash
# Rollback last migration
yarn prisma migrate resolve --rolled-back <migration_name>

# Verify schema
yarn prisma validate
```

**Ledger Corrections:**

- No UPDATE/DELETE allowed
- Use offset entries for corrections
- Document reason in ledger metadata

### Application Rollback

**Docker Compose:**

```bash
# Stop current version
docker-compose down

# Switch to previous image tag
docker-compose up -d --force-recreate
```

**Kubernetes:**

```bash
# Rollback deployment
kubectl rollout undo deployment/core-api

# Verify rollback
kubectl rollout status deployment/core-api
```

---

## Security Checklist

- [ ] All secrets in environment variables or secret manager
- [ ] Postgres and Redis bound to localhost only
- [ ] GateGuard enabled on all financial endpoints
- [ ] C2PA watermarking active on synthetic generation
- [ ] Rate limiting configured and tested
- [ ] HTTPS/TLS enabled on all public endpoints
- [ ] CORS configured for allowed origins only
- [ ] Authentication and authorization enforced
- [ ] NATS authentication enabled
- [ ] Database connection pool limits configured
- [ ] Log sensitive data redaction enabled

---

## Curator Cron Jobs (Optional)

### Purpose

Celebrity/news embedding ingestion for Safe Synthetic safeguards.

### Setup

**GitHub Actions Cron:**

```yaml
# .github/workflows/curator-sync.yml
on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
```

**Kubernetes CronJob:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: curator-sync
spec:
  schedule: '0 */6 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: curator-sync
              image: synthimates/core-api:latest
              command: ['curl', '-X', 'POST', 'http://core-api:3000/admin/ai-twin/curator/trigger']
```

**Manual Trigger:**

```bash
curl -X POST http://localhost:3000/admin/ai-twin/curator/trigger \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Requirements

- `NEWS_API_KEY` configured in environment
- Admin authentication token
- Sufficient Banana.dev API quota

---

## Troubleshooting

### Common Issues

#### Database Migration Failures

**Symptom:** `yarn prisma migrate deploy` fails

**Solutions:**

1. Check database connection: `psql $DATABASE_URL -c "SELECT 1"`
2. Verify pgvector extension: `psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"`
3. Check migration history: `yarn prisma migrate status`

#### GateGuard Always Returns HARD_DECLINE

**Symptom:** All transactions blocked

**Solutions:**

1. Check GateGuard thresholds in `services/core-api/src/gateguard/welfare-guardian.scorer.ts`
2. Verify fraud/welfare score calculations
3. Check for missing welfare signals in input

#### Synthetic Generation Fails

**Symptom:** 500 error on `/cyrano/ai-twin/synthetic`

**Solutions:**

1. Verify `SYNTHETIC_GENERATION_ENDPOINT` is reachable
2. Check Banana.dev API key and quota
3. Validate image uploads (5-20 images, 10MB max, image/\* MIME)
4. Check curator database (ArcFace embeddings)

#### Payout Requests Stuck in PENDING

**Symptom:** Payouts not processing

**Solutions:**

1. Verify admin approval workflow is running
2. Check GateGuard logs for HUMAN_ESCALATE decisions
3. Verify bonus_tokens balance is sufficient
4. Check payout service logs for errors

---

## Post-Deployment Checklist

- [ ] All services started successfully
- [ ] Health checks passing
- [ ] Database migrations applied
- [ ] pgvector extension enabled
- [ ] Smoke tests passed
- [ ] Rate limiting tested
- [ ] GateGuard evaluations working
- [ ] Synthetic generation tested
- [ ] Payout flow tested
- [ ] Monitoring dashboards configured
- [ ] Alerts configured and tested
- [ ] Logs streaming to aggregator
- [ ] Backup and disaster recovery tested
- [ ] Documentation updated

---

## Support & Escalation

### Documentation References

- **Architecture:** `docs/ARCHITECTURE_OVERVIEW.md`
- **Security:** `docs/ACCOUNT_CORE_SECURITY.md`
- **Synthetic Security:** `docs/SYNTHETIC_TWIN_SECURITY.md`
- **Membership Policy:** `docs/MEMBERSHIP_LIFECYCLE_POLICY.md`
- **Domain Glossary:** `docs/DOMAIN_GLOSSARY.md`
- **Governance:** `PROGRAM_CONTROL/DIRECTIVES/QUEUE/OQMI_GOVERNANCE.md`

### Escalation Path

1. **Level 1** — Check documentation and logs
2. **Level 2** — Review GitHub Issues and PRs
3. **Level 3** — Contact development team
4. **Level 4** — Escalate to CEO (Kevin B. Hartley) for governance/FIZ issues

---

## Version History

| Version | Date       | Changes                                                 |
| ------- | ---------- | ------------------------------------------------------- |
| Phase 6 | 2026-05-25 | Account-Core + Safe Synthetic Twin integration complete |
| Phase 5 | 2026-05-20 | Voice chat integration with DreamCoins                  |
| Phase 4 | 2026-05-15 | Membership tiers and GateGuard                          |
| Phase 3 | 2026-05-10 | Safe Synthetic Twin safeguards                          |
| Phase 2 | 2026-05-05 | Three-bucket wallet and ledger                          |
| Phase 1 | 2026-05-01 | Initial Account-Core integration                        |

---

_[rule_applied_id: DEPLOYMENT_GUIDE_v1.0]_
