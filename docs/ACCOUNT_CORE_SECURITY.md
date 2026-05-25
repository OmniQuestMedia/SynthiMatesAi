# Account-Core Security & Compliance

**Last Updated:** 2026-05-25
**Rule Applied:** OQMI_GOVERNANCE v1.0

This document covers the security and compliance architecture of the Shared Account-Core system, including DreamCoins wallet management, creator payouts, membership tiers, and synthetic twin generation.

---

## Table of Contents

1. [GateGuard + Risk Engine Enforcement](#gateguard--risk-engine-enforcement)
2. [Append-Only Ledger Invariants](#append-only-ledger-invariants)
3. [Creator Payout Approval Workflow](#creator-payout-approval-workflow)
4. [DreamCoins Transaction Audit Trail](#dreamcoins-transaction-audit-trail)
5. [Three-Bucket Wallet Security](#three-bucket-wallet-security)
6. [Synthetic Twin Generation Safeguards](#synthetic-twin-generation-safeguards)
7. [Compliance & Monitoring](#compliance--monitoring)

---

## GateGuard + Risk Engine Enforcement

### Overview

GateGuard is a pre-processor risk and welfare engine that gates every financial operation before ledger mutations occur. It implements a fail-closed security model where all transactions must pass risk assessment before execution.

### Architecture

**Location:** `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/core-api/src/gateguard/`

**Core Components:**

- `GateGuardService` - Main orchestration service
- `WelfareGuardianScorer` - Risk scoring engine
- `WelfareGuardianService` - Conversation distress monitor
- `ChatGuardService` - Content moderation

### Pre-Processor Doctrine

Every financial operation (`PURCHASE`, `SPEND`, `PAYOUT`) is routed through GateGuard **before** ledger mutation:

```typescript
const result = await gateGuardService.evaluate({
  action: 'PAYOUT',
  userId,
  amountCents,
  context: { ... }
});

if (result.decision !== 'APPROVE') {
  throw new GateGuardDeclineError(result.decision, result.reason);
}

// Only after APPROVE do we proceed to ledger mutation
await ledgerService.recordEntry({ ... });
```

### Decision Types

| Decision         | Description                  | Action Taken                   |
| ---------------- | ---------------------------- | ------------------------------ |
| `APPROVE`        | Low risk, proceed normally   | Execute transaction            |
| `COOLDOWN`       | Moderate risk, enforce delay | Delay transaction, notify user |
| `HARD_DECLINE`   | High risk, block transaction | Block transaction, log event   |
| `HUMAN_ESCALATE` | Requires human review        | Queue for compliance team      |

### Risk Scoring Model

**Two-Dimensional Scoring:**

1. **Fraud Score (0-100):**
   - New account penalty: 25pt (<1 day), 15pt (<7 days)
   - Device churn: 18pt (≥4 devices)
   - Geo mismatch: 12pt
   - VPN detected: 10pt
   - Prior chargeback: 100pt (auto-bar)
   - Prior disputes: 20pt (≥3 disputes)
   - Structuring pattern: 25pt

2. **Welfare Score (0-100):**
   - Velocity penalty: scales by action type
   - Hours-of-day: 15pt overnight (01:00-05:59)
   - Dwell penalty: 8pt (>120min), 16pt (>180min), 24pt (>240min)
   - Chase loss pattern: 20pt
   - Self-reported distress: 25pt
   - Recent declines: 10pt per decline

**Threshold Mapping:**

- `0-40`: APPROVE
- `40-70`: COOLDOWN
- `70-90`: HARD_DECLINE
- `90-100`: HUMAN_ESCALATE

### Invariants

1. **Append-Only:** Risk scores are never updated or deleted, only new rows appended
2. **Deterministic:** Same input produces same decision
3. **Idempotent:** Same transaction_id evaluated twice is a no-op
4. **Auditable:** SHA-256 hash-chained log rows for tamper detection
5. **Pre-Processor:** Blocks ledger mutations on decline/escalation

### Integration Points

**Services Using GateGuard:**

- Creator payout requests (`creator-payout.service.ts`)
- Token purchases (wallet top-up)
- Token spends (image generation, chat, voice calls)
- Membership purchases
- Diamond tier upgrades

**NATS Event Topics:**

- `gateguard.evaluation.completed` - Risk assessment complete
- `gateguard.decision.approved` - Transaction approved
- `gateguard.decision.cooldown` - Cooldown enforced
- `gateguard.decision.hard_decline` - Transaction blocked
- `gateguard.decision.human_escalate` - Escalated to compliance
- `gateguard.welfare.signal` - Welfare monitoring event

---

## Append-Only Ledger Invariants

### Core Doctrine

The ledger follows OQMI Doctrine v2.0 with strict append-only semantics. No ledger entries are ever updated or deleted; corrections are applied as offset entries.

### Architecture

**Location:** `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/core-api/src/finance/ledger.service.ts`

**Schema:** `/home/runner/work/SynthiMatesAi/SynthiMatesAi/infra/postgres/init-ledger.sql`

### Ledger Table Structure

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  amount_cents BIGINT NOT NULL,
  bucket VARCHAR(50) NOT NULL,  -- PURCHASED | MEMBERSHIP_ALLOCATION | PROMOTIONAL_BONUS
  token_origin VARCHAR(50),     -- PURCHASED | GIFTED
  reference_id VARCHAR(255) UNIQUE,  -- Idempotency key
  correlation_id VARCHAR(255) NOT NULL,
  reason_code VARCHAR(255) NOT NULL,
  rule_applied_id VARCHAR(255) DEFAULT 'GENERAL_GOVERNANCE_v10',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  hash_current VARCHAR(64),     -- SHA-256 hash chain
  hash_prior VARCHAR(64)
);
```

### Invariants

1. **No UPDATE or DELETE:** Only INSERT operations allowed
2. **BigInt Amounts:** All token amounts are BIGINT (no fractional tokens)
3. **Hash Chain:** Each entry includes `hash_current = SHA256(hash_prior || payload_hash)`
4. **Idempotency:** `reference_id` UNIQUE constraint prevents duplicate processing
5. **Correlation Tracking:** Every entry includes `correlation_id` for end-to-end tracing
6. **Reason Code:** Mandatory `reason_code` explains why transaction occurred
7. **Rule Applied:** Every entry tags the governance rule version that authorized it

### Correction Pattern

When a transaction needs reversal (e.g., dispute, chargeback), we create an **offset entry** with negative delta:

```typescript
// Original entry
await ledgerService.recordEntry({
  userId,
  entryType: 'PURCHASE',
  amountCents: 1000n,
  bucket: 'PURCHASED',
  tokenOrigin: 'PURCHASED',
  correlationId: 'purchase-123',
  reasonCode: 'BUNDLE_PURCHASE',
});

// Reversal entry (dispute)
await ledgerService.handleDisputeReversal({
  userId,
  originalReferenceId: 'purchase-123',
  correlationId: 'dispute-456',
  reasonCode: 'CHARGEBACK_REVERSAL',
});
// Creates negative-delta entry with same bucket, preserving audit trail
```

### Hash Chain Verification

The `ImmutableAuditService` can replay the entire ledger chain to verify integrity:

```typescript
const verified = await auditService.verifyChain({
  tableName: 'ledger_entries',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
});

if (!verified.valid) {
  // Hash chain broken - possible tampering detected
  await escalateToCompliance(verified.brokenAt);
}
```

---

## Creator Payout Approval Workflow

### Overview

Creator payouts follow a multi-stage approval workflow with GateGuard risk assessment, balance validation, and immutable ledger recording.

### Architecture

**Location:** `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/core-api/src/creator/creator-payout.service.ts`

### Payout Workflow

```
1. Creator Request
   ↓
2. Validate Creator & Balance
   ↓
3. GateGuard Risk Assessment
   ↓
4. Decision Routing
   ├─ APPROVE → Ledger Entry → Email Notification → Success
   ├─ COOLDOWN → Delay Notice → Queue Retry
   ├─ HARD_DECLINE → Decline Notice → Audit Log
   └─ HUMAN_ESCALATE → Compliance Queue → Manual Review
```

### Request Payout Implementation

```typescript
async requestPayout(
  creatorId: string,
  amountCents: bigint,
  correlationId: string
): Promise<PayoutResult> {
  // 1. Validate creator exists and is active
  const creator = await this.validateCreator(creatorId);

  // 2. Check available balance (bonus bucket)
  const balance = await this.ledgerService.getBucketBalance(
    creatorId,
    'PROMOTIONAL_BONUS'
  );

  if (balance < amountCents) {
    throw new InsufficientBalanceError();
  }

  // 3. GateGuard risk assessment
  const gateGuardResult = await this.gateGuardService.evaluate({
    action: 'PAYOUT',
    userId: creatorId,
    amountCents,
    context: {
      correlationId,
      creatorHeatScore: creator.heatScore,
      accountAge: Date.now() - creator.createdAt.getTime(),
    },
  });

  // 4. Route based on decision
  switch (gateGuardResult.decision) {
    case 'APPROVE':
      // Debit from bonus bucket
      await this.ledgerService.recordEntry({
        userId: creatorId,
        entryType: 'PAYOUT_DEBIT',
        amountCents: -amountCents,
        bucket: 'PROMOTIONAL_BONUS',
        correlationId,
        reasonCode: 'CREATOR_PAYOUT_REQUEST',
        ruleAppliedId: 'CREATOR_PAYOUT_v1.0',
      });

      // Send confirmation email
      await this.notificationService.sendPayoutApproved({
        creatorEmail: creator.email,
        amountCents,
        correlationId,
      });

      return { status: 'APPROVED', correlationId };

    case 'COOLDOWN':
      // Queue for delayed processing
      await this.queuePayoutRetry(creatorId, amountCents, correlationId);
      return { status: 'DELAYED', retryAfter: gateGuardResult.cooldownUntil };

    case 'HARD_DECLINE':
      // Log decline and notify creator
      await this.auditService.emit({
        eventType: 'PAYOUT_DECLINED',
        userId: creatorId,
        correlationId,
        reason: gateGuardResult.reason,
      });
      throw new PayoutDeclinedError(gateGuardResult.reason);

    case 'HUMAN_ESCALATE':
      // Route to compliance team
      await this.complianceService.escalatePayout({
        creatorId,
        amountCents,
        correlationId,
        riskFactors: gateGuardResult.riskFactors,
      });
      return { status: 'ESCALATED', reviewId: correlationId };
  }
}
```

### Payout Rate Resolution

Payout rates are determined by creator heat score with diamond floor guarantee:

```typescript
const payoutRate = await this.resolvePayoutRate(creator);

// Heat score thresholds:
// [0-20):   70% payout rate
// [20-40):  75% payout rate
// [40-60):  80% payout rate
// [60-80):  85% payout rate
// [80-100]: 90% payout rate

// Diamond tier floor: 90% minimum regardless of heat score
```

### Security Measures

1. **Balance Validation:** Payout cannot exceed available bonus bucket balance
2. **Risk Assessment:** Every payout routed through GateGuard
3. **Immutable Record:** Ledger entry created before funds disbursement
4. **Email Confirmation:** Creator notified of approval/decline
5. **Escalation Path:** High-risk payouts require human review
6. **Correlation Tracking:** Full audit trail from request to disbursement

---

## DreamCoins Transaction Audit Trail

### Overview

Every DreamCoins (CZT) transaction is recorded in an immutable, hash-chained audit ledger with full traceability from origination to spend.

### Architecture

**Location:** `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/core-api/src/audit/immutable-audit.service.ts`

### Audit Event Types

| Event Type           | Description                                |
| -------------------- | ------------------------------------------ |
| `PURCHASE`           | Token bundle purchase                      |
| `SPEND`              | Token consumption (image gen, chat, voice) |
| `PAYOUT`             | Creator payout debit                       |
| `RECOVERY`           | Expired token recovery with safety net fee |
| `WALLET_MUTATION`    | Any wallet balance change                  |
| `GATEGUARD_DECISION` | Risk assessment result                     |
| `FFS_SCORE`          | Flicker n'Flame scoring event              |
| `MEMBERSHIP_GRANT`   | Monthly stipend distribution               |
| `BONUS_GRANT`        | Promotional bonus allocation               |

### Event Structure

```typescript
interface AuditEvent {
  id: string; // UUID
  eventType: AuditEventType;
  userId: string;
  correlationId: string; // End-to-end trace ID
  sequenceNumber: bigint; // Monotonic sequence
  payloadHash: string; // SHA-256(canonical(redacted_payload))
  hashPrior: string; // Previous event hash
  hashCurrent: string; // SHA-256(hashPrior || payloadHash)
  timestamp: Date;
  metadata: Record<string, unknown>;
}
```

### Hash Chain Integrity

Each audit event is hash-chained to prevent tampering:

```typescript
hashCurrent = SHA256(hashPrior || payloadHash);
```

**Genesis Hash:** First event in chain uses `GENESIS_HASH_SEED_v1` as `hashPrior`.

**Verification:** Chain can be replayed at any time to detect breaks:

```typescript
const chainValid = await auditService.verifyChain({
  startDate: '2026-01-01',
  endDate: '2026-12-31',
});

if (!chainValid.valid) {
  // Chain broken at event: chainValid.brokenAt
  // Indicates potential tampering - escalate immediately
}
```

### Transaction Traceability

Every transaction includes a `correlationId` that links related events:

**Example: Token Purchase Flow**

```
correlationId: purchase-abc-123

Event 1: PURCHASE
  - User purchases 100 CZT bundle
  - Creates ledger entry with +100 PURCHASED bucket

Event 2: GATEGUARD_DECISION
  - GateGuard evaluates purchase
  - Decision: APPROVE (fraud score: 15, welfare score: 5)

Event 3: WALLET_MUTATION
  - Wallet balance updated
  - Previous: 50 CZT, New: 150 CZT
```

**Example: Token Spend Flow**

```
correlationId: spend-xyz-456

Event 1: GATEGUARD_DECISION
  - GateGuard evaluates spend request
  - Decision: APPROVE

Event 2: SPEND
  - User generates AI image (15 CZT cost)
  - Deducts from PROMOTIONAL_BONUS bucket first

Event 3: WALLET_MUTATION
  - Wallet balance updated
  - Previous: 150 CZT, New: 135 CZT
```

### PII Redaction

Audit events **never** store PII directly. Payload is hashed after PII redaction:

```typescript
const redactedPayload = {
  userId: hash(userId), // One-way hash, not reversible
  amountCents, // Financial data preserved
  action,
  decision,
  // Email, IP, device ID excluded from payload hash
};

const payloadHash = SHA256(canonicalJSON(redactedPayload));
```

### WORM Export

Audit events can be sealed into Write-Once-Read-Many (WORM) exports for compliance:

```typescript
const wormExport = await auditService.sealWormExport({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  exportType: 'MONTHLY_COMPLIANCE',
});

// Creates tamper-evident export with:
// - Start/end hash anchors
// - Event count
// - Seal timestamp
// - SHA-256 seal over entire export
```

WORM exports are stored in `worm_export_record` table and can be used for regulatory compliance, audits, and forensic investigations.

---

## Three-Bucket Wallet Security

### Overview

The DreamCoins wallet uses a three-bucket model with deterministic spend order to ensure transparency and prevent user confusion about token expiration.

### Bucket Types

| Bucket                  | Source                           | Priority        | Expiration        |
| ----------------------- | -------------------------------- | --------------- | ----------------- |
| `PROMOTIONAL_BONUS`     | Platform grants, creator payouts | 1 (spend first) | 90 days           |
| `MEMBERSHIP_ALLOCATION` | Monthly stipend                  | 2               | End of membership |
| `PURCHASED`             | User purchases                   | 3 (spend last)  | Never             |

### Deterministic Spend Order

When a user spends tokens, they are deducted in strict priority order:

1. **PROMOTIONAL_BONUS** - Spend all promotional tokens first
2. **MEMBERSHIP_ALLOCATION** - Then spend membership stipend
3. **PURCHASED** - Finally spend purchased tokens

**Implementation:**

```typescript
async debitWallet(
  userId: string,
  amountCents: bigint,
  correlationId: string
): Promise<DebitResult> {
  const buckets = await this.getAllBucketBalances(userId);
  const spendOrder = ['PROMOTIONAL_BONUS', 'MEMBERSHIP_ALLOCATION', 'PURCHASED'];

  let remaining = amountCents;
  const debits: LedgerEntry[] = [];

  for (const bucket of spendOrder) {
    if (remaining <= 0n) break;

    const available = buckets[bucket];
    if (available <= 0n) continue;

    const toDebit = remaining > available ? available : remaining;

    await this.recordEntry({
      userId,
      entryType: 'SPEND',
      amountCents: -toDebit,
      bucket,
      correlationId,
      reasonCode: 'TOKEN_SPEND',
    });

    remaining -= toDebit;
    debits.push({ bucket, amount: toDebit });
  }

  if (remaining > 0n) {
    throw new InsufficientBalanceError();
  }

  return { debits, totalSpent: amountCents };
}
```

### Expiration Safety Net

When promotional or membership tokens approach expiration, users receive a recovery offer:

**Safety Net Offer:**

- Tokens expiring within 7 days trigger offer
- User can recover expiring tokens by paying a recovery fee (e.g., 20% of value)
- Recovered tokens moved to PURCHASED bucket (no longer expire)

**Implementation:**

```typescript
async offerExpirationSafetyNet(userId: string): Promise<SafetyNetOffer[]> {
  const expiringTokens = await this.getExpiringTokens(userId, 7); // 7 days

  return expiringTokens.map(token => ({
    bucket: token.bucket,
    expiringAmount: token.amount,
    recoveryFeeCents: token.amount * 20n / 100n, // 20% fee
    expiresAt: token.expiresAt,
    offerId: generateOfferId(),
  }));
}

async acceptSafetyNetOffer(
  userId: string,
  offerId: string,
  correlationId: string
): Promise<void> {
  const offer = await this.validateOffer(offerId);

  // Charge recovery fee
  await this.debitWallet(userId, offer.recoveryFeeCents, correlationId);

  // Move expiring tokens to PURCHASED bucket (no expiration)
  await this.recordEntry({
    userId,
    entryType: 'RECOVERY',
    amountCents: -offer.expiringAmount,
    bucket: offer.bucket,
    correlationId,
    reasonCode: 'EXPIRATION_RECOVERY_DEBIT',
  });

  await this.recordEntry({
    userId,
    entryType: 'RECOVERY',
    amountCents: offer.expiringAmount,
    bucket: 'PURCHASED',
    tokenOrigin: 'PURCHASED',
    correlationId,
    reasonCode: 'EXPIRATION_RECOVERY_CREDIT',
  });
}
```

### Balance Queries

Users can query their wallet balance at any time:

**Total Balance:**

```typescript
const total = await ledgerService.getBalance(userId);
// Returns sum of all three buckets
```

**Individual Bucket:**

```typescript
const bonus = await ledgerService.getBucketBalance(userId, 'PROMOTIONAL_BONUS');
```

**All Buckets (in spend priority):**

```typescript
const buckets = await ledgerService.getAllBucketBalances(userId);
// Returns: {
//   PROMOTIONAL_BONUS: 50n,
//   MEMBERSHIP_ALLOCATION: 100n,
//   PURCHASED: 200n
// }
```

### Security Measures

1. **Immutable History:** All wallet mutations appended to ledger, never deleted
2. **Idempotency:** `reference_id` prevents duplicate credits/debits
3. **Balance Derivation:** Balance computed from ledger sum, not stored separately
4. **Expiration Transparency:** Users always see which tokens expire when
5. **Recovery Option:** Users never lose value involuntarily
6. **Audit Trail:** Full transaction history available for review

---

## Synthetic Twin Generation Safeguards

### Overview

The Safe Synthetic Twin Creator implements multiple safeguards to prevent cloning, impersonation, and rights-infringing outputs.

### Architecture

**Location:** `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/ai-twin/src/synthetic-pipeline.service.ts`

### Safeguard Layers

```
User Upload (5+ photos)
    ↓
1. Multi-Image Embedding (ArcFace)
    ↓
2. Celebrity Down-Weighting
    ↓
3. Fantasy Deviation Application
    ↓
4. Weighted Mean Blend
    ↓
5. Refinement Loop (max 6 attempts)
    ↓
6. Dissimilarity Gate
    ↓
7. Flux Generation with IP-Adapter
    ↓
8. C2PA Watermark Application
    ↓
Output Image + Safeguard Metadata
```

### Layer Details

**1. Multi-Image Embedding**

- Minimum 5 reference images required
- Each image embedded with ArcFace model
- Catches single-image clone attempts

**2. Celebrity Down-Weighting**

- Compare each embedding against celebrity database
- High-similarity images receive reduced weight
- Prevents celebrity near-clone generation

**3. Fantasy Deviation Application**

- User-controlled fantasy level (0.0 - 1.0)
- Pushes output away from exact likeness
- Higher deviation = more transformative output

**4. Weighted Mean Blend**

- Combine all embeddings using normalized weights
- Celebrity-similar images contribute less to final blend

**5. Refinement Loop**

- Up to 6 refinement attempts
- Each iteration checks celebrity similarity
- Further pushes embedding away from known celebrities
- Loop exits when dissimilarity threshold met

**6. Dissimilarity Gate**

- Final embedding compared to each input embedding
- Ensures output ≠ near-clone of any input
- Blocks outputs with similarity > threshold

**7. Flux Generation**

- IP-Adapter conditioning with refined embedding
- Generates photorealistic image
- Cinematic quality with natural skin, pores, lighting

**8. C2PA Watermarking**

- Content Credentials metadata embedded
- Marks image as AI-generated
- Includes safeguard audit trail

### Curator Database

The celebrity/news curator maintains a database of known public figures:

**Ingestion Sources:**

- Celebrity image databases
- News API (recent newsmakers)
- Manual admin additions

**Update Schedule:**

- Automated: Daily/hourly (environment-dependent)
- Manual: Admin trigger via `/admin/ai-twin/curator/trigger`

**Storage:**

- PostgreSQL with pgvector extension
- ArcFace embeddings stored as `vector(512)` columns
- Indexed for fast similarity search

### Rate Limiting

Safe Synthetic generation is rate-limited to prevent abuse:

```typescript
@Throttle({
  default: {
    limit: 10,    // Max 10 requests
    ttl: 3600000, // Per hour
  }
})
async generateSyntheticTwin(...) { ... }
```

### Compliance Requirements

**Legal/Ethical:**

1. Only lawful, consent-based, transformative content
2. No near-clones or impersonations
3. No rights-infringing outputs
4. Safeguards mandatory, cannot be bypassed

**Technical:**

1. Minimum 5 reference images
2. Celebrity similarity check required
3. Refinement loop mandatory
4. C2PA watermarking enforced
5. Audit metadata preserved

### Safeguard Metadata

Every generated image includes safeguard audit trail:

```typescript
interface SafeguardMetadata {
  fantasyLevel: number; // 0.0 - 1.0
  inputImageCount: number; // Minimum 5
  celebrityWeightsApplied: boolean; // Always true
  refinementAttempts: number; // 0-6
  dissimilarityGatePassed: boolean; // Must be true
  c2paWatermarkApplied: boolean; // Must be true
  generatedAt: Date;
  correlationId: string;
}
```

This metadata is stored alongside the twin record and can be audited for compliance.

---

## Compliance & Monitoring

### Real-Time Monitoring

**NATS Event Subscriptions:**

- `gateguard.decision.hard_decline` - Blocked transactions
- `gateguard.decision.human_escalate` - Escalations
- `gateguard.welfare.signal` - Welfare alerts
- `audit.event.written` - Audit trail events
- `ai-twin.training.started` - Twin generation started
- `ai-twin.training.failed` - Generation failures

**Monitoring Dashboards:**

- GateGuard decision distribution (approve/cooldown/decline/escalate)
- Welfare score trends by user cohort
- Token transaction volume by bucket
- Payout approval rate
- Synthetic twin generation success rate

### Audit Trail Verification

**Daily Hash Chain Verification:**

```bash
yarn verify-audit-chain --start 2026-05-01 --end 2026-05-31
```

**Monthly WORM Export:**

```bash
yarn seal-worm-export --month 2026-05
```

### Compliance Reports

**Available Reports:**

1. **Transaction Audit:** All ledger entries with correlation trace
2. **Risk Assessment Log:** GateGuard decisions with risk factors
3. **Welfare Incidents:** Escalated welfare cases
4. **Payout History:** Creator payout requests and outcomes
5. **Synthetic Generation:** Safe Synthetic audit trail

**Report Access:**

- Admin dashboard: `/admin/compliance/reports`
- API endpoint: `GET /api/admin/compliance/report/{reportType}`
- WORM exports: Stored in `worm_export_record` table

### Incident Response

**Escalation Tiers:**

**Tier 1 - Automated:**

- COOLDOWN decisions
- Welfare system messages
- Expired token safety net offers

**Tier 2 - Compliance Review:**

- HUMAN_ESCALATE decisions
- High-risk payout requests
- Repeated HARD_DECLINE patterns

**Tier 3 - Executive Escalation:**

- Hash chain integrity failures
- Suspected ledger tampering
- Regulatory inquiries

**Response SLAs:**

- Tier 1: Immediate (automated)
- Tier 2: 24 hours (business days)
- Tier 3: 4 hours (24/7)

### Security Contacts

**Compliance Team:** compliance@omniquestmedia.com
**Security Team:** security@omniquestmedia.com
**Incident Hotline:** [Redacted - internal only]

---

## Governance References

This document is governed by:

- **OQMI_GOVERNANCE.md** - OQMInc governance invariants
- **OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md** - Infrastructure security policy
- **DOMAIN_GLOSSARY.md** - Naming authority and commit prefixes
- **SYNTHETIC_TWIN_SECURITY.md** - Safe Synthetic Twin detailed security spec

**Last Reviewed:** 2026-05-25
**Next Review Due:** 2026-08-25
**Document Owner:** OmniQuest Media Inc. Security Team

---

_rule_applied_id: ACCOUNT_CORE_SECURITY_v1.0_
