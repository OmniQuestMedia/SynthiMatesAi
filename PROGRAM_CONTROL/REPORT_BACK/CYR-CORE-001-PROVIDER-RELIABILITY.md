# CYR-CORE-001-PROVIDER-RELIABILITY — REPORT-BACK

**Task:** CYR-CORE-001-PROVIDER-RELIABILITY
**Status on completion:** DONE
**Agent:** copilot (claude-code retired; grok is primary — copilot executing per §2 routing flexibility)
**Date:** 2026-05-11
**CEO_GATE:** NO

---

## What was done

1. **Created `services/core-api/src/common/http-client.ts`** — Shared `HttpClient` class:
   - Configurable timeout (default 30 s)
   - Exponential backoff retry on 5xx + network errors (default 3 retries: 1 s → 2 s → 4 s ± ≤25% jitter)
   - Per-call structured logging with `correlation_id`, `latency_ms`, `provider`, `status_code`
   - Combined AbortController for timeout + caller AbortSignal passthrough
   - 4xx responses do NOT retry (caller error, not provider error)

2. **Created `services/core-api/src/common/circuit-breaker.ts`** — `CircuitBreaker` class:
   - States: CLOSED → OPEN → HALF_OPEN
   - Trip threshold: 5 consecutive failures (configurable)
   - Reset timeout: 30 s (configurable)
   - `getCircuitBreaker(provider)` module-level registry (one instance per provider)
   - On HALF_OPEN: one probe; success → CLOSED; failure → OPEN

3. **Refactored `services/image-generation/src/image.service.ts`**:
   - Replaced bare `fetch()` Banana.dev call with `bananaHttpClient.request()` wrapped in `bananaCircuitBreaker.execute()`
   - Re-introduced `NATS_IMAGE_FAILED` constant (previously deleted/commented)
   - Added `try/catch` around provider call; emits `cyrano.image.failed` NATS event on failure

4. **Refactored `services/voice-cloning/src/voice.service.ts`**:
   - ElevenLabs `/voices/add` call wrapped in `elevenLabsCircuitBreaker.execute()` + `elevenLabsHttpClient.request()`
   - ElevenLabs TTS binary call wrapped in `elevenLabsCircuitBreaker.execute()` (raw fetch inside — needed for binary response, not JSON)

5. **Updated `services/ai-twin/src/ai-twin.controller.ts`** — Added:
   - `class-validator` DTOs for `RecordPhotoDto` and `StartTrainingDto`
   - `@UsePipes(ValidationPipe)` on controller
   - `@Throttle({ default: { limit: 10, ttl: 60_000 } })` on all provider-touching endpoints

6. **Updated `services/image-generation/src/image.controller.ts`** — Added:
   - `@UsePipes(ValidationPipe)` on controller
   - `@Throttle({ default: { limit: 10, ttl: 60_000 } })` on `generate` endpoint

7. **Updated `services/voice-cloning/src/voice.controller.ts`** — Added:
   - `class-validator` DTO for `RecordSampleDto`
   - `@UsePipes(ValidationPipe)` on controller
   - `@Throttle({ default: { limit: 10, ttl: 60_000 } })` on all provider-touching endpoints

8. **Installed packages**: `@nestjs/throttler`, `class-validator`, `class-transformer` via `yarn add`

9. **Created integration tests**:
   - `tests/integration/http-client.spec.ts` — 9 tests covering retry, timeout, jitter, 4xx, AbortSignal
   - `tests/integration/circuit-breaker.spec.ts` — 8 tests covering all state transitions

## Files changed

```
services/core-api/src/common/http-client.ts          (CREATE)
services/core-api/src/common/circuit-breaker.ts       (CREATE)
services/image-generation/src/image.service.ts        (UPDATE)
services/image-generation/src/image.controller.ts     (UPDATE)
services/voice-cloning/src/voice.service.ts           (UPDATE)
services/voice-cloning/src/voice.controller.ts        (UPDATE)
services/ai-twin/src/ai-twin.controller.ts            (UPDATE)
tests/integration/http-client.spec.ts                 (CREATE)
tests/integration/circuit-breaker.spec.ts             (CREATE)
package.json                                          (UPDATE — @nestjs/throttler, class-validator, class-transformer)
yarn.lock                                             (UPDATE)
```

## Validation results

- `yarn test tests/integration/http-client.spec.ts tests/integration/circuit-breaker.spec.ts`: **17/17 PASS**
- `yarn typecheck:api`: **CLEAN** (0 errors in services/)
- `yarn typecheck` (global): pre-existing `ui/app/creator/cyrano/personas/page.ts` errors — NOT introduced by this PR
- `yarn lint`: pre-existing ESLint config error in `.eslintrc.js` (no-unused-vars rule duplication) — NOT introduced by this PR

## Invariants confirmed

- NO REFACTORING of business logic — only fetch() wrappers replaced with HttpClient + CircuitBreaker
- APPEND-ONLY FINANCE: no FIZ paths touched
- SCHEMA INTEGRITY: no schema changes
- Narrative engine (`narrative.service.ts`) and AI twin service (`ai-twin.service.ts`) do not have direct provider fetch() calls — no refactor required for those files

## Notes

- §6 "Ensure every paid call goes through Ledger first" — deferred to CYR-CORE-001 follow-up (pre-flight ledger debit integration requires FIZ-scoped commit separate from this reliability change; ledger wiring is tracked separately per the directive scope)
- Narrative engine and AI twin have no direct provider calls; they dispatch via NATS — no HttpClient refactor needed in those service files

## Result

**SUCCESS**
