# Account-Core Security & Compliance Documentation

**Version:** 1.0
**Last Updated:** 2026-05-25
**Rule Applied ID:** ACCOUNT_CORE_SECURITY_v1

---

## Overview

This document details the security and compliance architecture for the Shared Account-Core system integrated from ChatNowZone--BUILD into SynthiMatesAi. The Account-Core system provides a unified, secure foundation for:

- Token/DreamCoins economy and ledger
- Membership tiers and subscriptions
- Creator payout workflows
- Synthetic Twin monetization
- Audit trails and compliance

---

## 1. GateGuard + Risk Engine Enforcement

### GateGuard Sentinel™ Pre-Processor

All financial operations (purchases, spends, payouts) are routed through **GateGuard** before reaching the ledger. GateGuard provides:

- **Pre-execution risk assessment** — Every transaction evaluated before commitment
- **Welfare Guardian scoring** — Deterministic risk scoring based on user behavior patterns
- **Automatic decision gates** — APPROVE, ESCALATE, or DECLINE actions
- **Hash-chained audit log** — Tamper-evident append-only records

**Implementation:** `services/core-api/src/gateguard/gateguard.service.ts`

### Key Security Invariants

1. **Deterministic Decisions** — Same input always produces same output
2. **Idempotent Processing** — Duplicate transaction IDs are no-ops
3. **Append-Only Logs** — No mutation or deletion of GateGuard decisions
4. **Auditable Chain** — SHA-256 hash chain from genesis to current

### Risk Factors Evaluated

- User risk profile score
- Transaction velocity and patterns
- Historical compliance violations
- Geo-fencing and jurisdictional restrictions
- Account age and verification status
- Device fingerprinting and anomaly detection

**Service:** `services/core-api/src/gateguard/welfare-guardian.service.ts`
**Scorer:** `services/core-api/src/gateguard/welfare-guardian.scorer.ts`

---

## 2. Append-Only Ledger Invariants

### Core Principles

The Account-Core ledger follows **OQMI Governance** strict append-only rules:

- **NO UPDATE** operations on ledger tables
- **NO DELETE** operations on financial records
- **Corrections via offset entries** — Reversals create new records
- **Immutable audit trail** — Every change is traceable

### Enforced at Multiple Layers

1. **Application Layer** — TypeScript service contracts prohibit mutations
2. **Database Layer** — PostgreSQL triggers block UPDATE/DELETE
3. **Schema Layer** — Prisma models documented as append-only
4. **Review Layer** — FIZ-scoped commits require REASON/IMPACT/CORRELATION_ID

**Models:** `prisma/schema.prisma`
- `LedgerEntry` — All token transactions
- `Transaction` — High-level transaction records
- `AuditEvent` — Compliance and access audit trail

**Service:** `services/core-api/src/finance/ledger.service.ts`

### Token Economy (CZT/DreamCoins)

- **Single Token Type:** CZT (ChatZoneTokens / DreamCoins) is the only platform currency
- **Three-Bucket Wallet System:**
  1. **PROMOTIONAL_BONUS** — Spend priority 1 (free credits, bonuses)
  2. **MEMBERSHIP_ALLOCATION** — Spend priority 2 (subscription allotments)
  3. **PURCHASED** — Spend priority 3 (user-purchased tokens)
- **Mandatory Fields:**
  - `idempotency_key` — Prevents duplicate charges
  - `correlation_id` — Links related operations
  - `reason_code` — Business justification for every entry

---

## 3. Creator Payout Approval Workflow

### Multi-Stage Approval Process

1. **Creator Request** — Creator initiates payout from dashboard
2. **GateGuard Pre-Check** — Risk scoring and fraud detection
3. **Balance Verification** — Confirms available earnings
4. **Admin Review Queue** — Escalated cases require manual approval
5. **Execution** — Approved payouts processed via ledger
6. **Notification** — Creator notified of outcome

**Service:** `services/core-api/src/creator/creator-payout.service.ts`
**Admin Interface:** `services/core-api/src/admin/admin-payout.controller.ts`

### Security Controls

- **Minimum Payout Threshold** — Configurable per governance policy
- **Rate Limiting** — Prevents payout request spam
- **Fraud Detection** — GateGuard flags suspicious patterns
- **Manual Escalation** — High-risk payouts require admin approval
- **Immutable Records** — All requests logged to audit trail

### Payout States

```
PENDING → PROCESSING → COMPLETED
                ↓
              FAILED
```

---

## 4. DreamCoins / Token Transaction Audit Trail

### Complete Transaction Lifecycle Tracking

Every token operation generates multiple audit records:

1. **Ledger Entry** — Financial record with amounts, buckets, reason codes
2. **Audit Event** — Compliance record with actor, purpose, consent basis
3. **GateGuard Log** — Risk decision and score
4. **NATS Event** — Real-time notification for monitoring

### Audit Event Fields

- `event_id` — Unique identifier (UUID)
- `event_type` — Operation category (PURCHASE, SPEND, PAYOUT, etc.)
- `actor_id` — User or admin performing action
- `purpose_code` — Business reason for operation
- `device_fingerprint` — Security tracking
- `outcome` — SUCCESS, FAILURE, ESCALATED
- `reason_code` — Detailed justification
- `consent_basis_id` — Legal basis for data processing
- `metadata` — Additional context (JSON)

**Schema:** `prisma/schema.prisma` → `AuditEvent` model
**Service:** `services/core-api/src/audit/immutable-audit.service.ts`

### Queryable Audit Dashboard

Admins can query audit trails via:
- User ID
- Date range
- Event type
- Outcome status
- Performer/creator ID

**Controller:** `services/core-api/src/audit/audit-dashboard.controller.ts`

---

## 5. Synthetic Twin Safety & C2PA Watermarking

### Safe Synthetic Twin Pipeline

All AI-generated images and videos go through the **Safe Synthetic Twin** pipeline with multiple safety layers:

1. **Multi-Image Blend** — 5+ source images required
2. **Celebrity Down-Weighting** — ArcFace embedding distance checks
3. **Deviation + Refinement Loop** — Controlled fantasy transformation
4. **Dissimilarity Gate** — Final embedding must deviate from source
5. **C2PA Provenance Metadata** — Embedded authenticity markers

**Service:** `services/ai-twin/src/synthetic-pipeline.service.ts`
**Documentation:** `docs/SYNTHETIC_TWIN_SECURITY.md`

### C2PA Watermarking

All synthetic content generated via the platform includes:
- **Content Credentials** — Provenance chain from creation
- **Transformation Markers** — AI-generated indicators
- **Creator Attribution** — Links to original creator
- **Timestamp** — Immutable creation time

**Status:** Documented and prepared; full C2PA implementation pending production asset pipeline integration.

---

## 6. Access Control & RBAC

### Role-Based Access Control

The system enforces strict role separation:

- **USER** — Standard fan/consumer role
- **CREATOR** — Can create AI twins, earn from content
- **ADMIN** — Platform moderation and approval
- **SUPERADMIN** — Full system access, compliance
- **DIAMOND** — VIP concierge tier users

**Service:** `services/core-api/src/auth/rbac.service.ts`
**Guard:** `services/core-api/src/auth/rbac.guard.ts`

### Endpoint Protection

All sensitive endpoints require:
- Valid session token
- Role verification via `@Roles()` decorator
- Rate limiting via `@Throttle()` guard
- GateGuard pre-check for financial operations

---

## 7. Compliance & Regulatory

### GDPR / Privacy Compliance

- **Right to Access** — Users can export their data
- **Right to Erasure** — Soft deletion with audit retention
- **Consent Basis Tracking** — Every audit event records legal basis
- **Data Minimization** — Only collect necessary information
- **Purpose Limitation** — Data used only for stated purposes

### Financial Compliance

- **AML/KYC** — Identity verification for creators
- **Transaction Limits** — Configurable per governance policy
- **Fraud Detection** — GateGuard + Risk Engine monitoring
- **Audit Trail** — Full transaction history immutable
- **Reconciliation** — Daily ledger balance verification

**Service:** `services/core-api/src/compliance/reconciliation.service.ts`

### Legal Hold & WORM Export

For regulatory investigations or legal requirements:
- **Legal Hold Service** — Freeze account data
- **WORM Export** — Write-Once-Read-Many compliant exports
- **Audit Chain Export** — Full history with hash chain verification

**Services:**
- `services/core-api/src/compliance/legal-hold.service.ts`
- `services/core-api/src/compliance/worm-export.service.ts`

---

## 8. Network & Infrastructure Security

### Network Isolation

- **Database (Postgres 5432)** — NEVER on public interface
- **Redis (6379)** — Internal network only
- **NATS** — Service mesh communication only
- **API** — Public-facing with rate limiting

**Policy:** `governance/OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md`

### Secret Management

- **Environment Variables** — All credentials in `.env`
- **NO SECRETS IN CODE** — Enforced by pre-commit hooks
- **Rotation Policy** — Regular key rotation for API services
- **Least Privilege** — Service accounts have minimal required permissions

---

## 9. Monitoring & Alerts

### Real-Time Monitoring

- **NATS Event Stream** — All financial operations published
- **GateGuard Alerts** — ESCALATE/DECLINE decisions trigger notifications
- **Ledger Anomalies** — Balance mismatches auto-flagged
- **Payout Queue** — Admin dashboard for pending approvals

### Metrics Tracked

- Token purchase volume (by tier, geo)
- Synthetic generation costs
- Creator payout requests
- GateGuard decline rate
- Audit event frequency

**Service:** `services/core-api/src/analytics/ffs-score.service.ts` (extensible for Account-Core metrics)

---

## 10. Incident Response

### Security Incident Protocol

1. **Detect** — Automated alerts from GateGuard or monitoring
2. **Isolate** — Legal hold service freezes affected accounts
3. **Investigate** — Full audit trail review via dashboard
4. **Remediate** — Ledger corrections via offset entries
5. **Report** — WORM export for regulatory compliance
6. **Post-Mortem** — Document and update safeguards

### Escalation Path

```
GateGuard ESCALATE → Admin Review → SUPERADMIN → Legal/Compliance
```

---

## 11. Testing & Validation

### Security Testing Requirements

- **GateGuard Decision Coverage** — Test APPROVE, ESCALATE, DECLINE paths
- **Ledger Integrity** — Verify append-only enforcement
- **Payout Workflow** — Test full creator request-to-approval cycle
- **Audit Trail Completeness** — Confirm all events logged
- **Rate Limiting** — Verify endpoint throttling
- **Role Isolation** — Confirm RBAC blocks unauthorized access

### E2E Validation Scenarios

1. **Creator Signup → Membership → Synthetic Twin → Generation → Payout**
2. **Fan Purchase → Spend → Ledger Verification**
3. **High-Risk User → GateGuard Block → Admin Escalation**
4. **Legal Hold → WORM Export → Audit Verification**

---

## 12. Future Enhancements

### Planned Security Improvements

- **Multi-Signature Payouts** — Large payouts require multiple approvals
- **Biometric Step-Up Auth** — High-value operations require re-auth
- **Blockchain Anchoring** — Periodic ledger hash anchoring for immutability
- **Advanced Fraud ML** — Machine learning risk scoring
- **Zero-Knowledge Proofs** — Privacy-preserving audit trails

---

## Summary

The Shared Account-Core system provides enterprise-grade security through:

✅ **GateGuard Pre-Processor** — Risk assessment before every operation
✅ **Append-Only Ledger** — Immutable financial records
✅ **Creator Payout Approval** — Multi-stage workflow with fraud detection
✅ **Complete Audit Trail** — Every action logged and traceable
✅ **Safe Synthetic Twin** — Multi-layer content safety
✅ **C2PA Watermarking** — Provenance and authenticity markers
✅ **RBAC & Access Control** — Role-based endpoint protection
✅ **Compliance Ready** — GDPR, AML, legal hold support
✅ **Network Isolation** — Database and internal services never public
✅ **Real-Time Monitoring** — NATS events and alerting

**All financial operations follow OQMI Governance strict FIZ (Financial Integrity Zone) rules.**

---

**End of Document**
