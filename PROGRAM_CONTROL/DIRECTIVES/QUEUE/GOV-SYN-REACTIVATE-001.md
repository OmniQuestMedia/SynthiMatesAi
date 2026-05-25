# GOV-SYN-REACTIVATE-001 — SynthiMatesAi Mode Flip: CLEANUP → ACTIVE

**Document ID:** GOV-SYN-REACTIVATE-001
**Type:** Mode-flip directive (strategic state change)
**Authority:** Kevin B. Hartley, CEO — OmniQuest Media Inc. (commissioned via Cowork orchestrator session, 2026-05-19)
**Repo:** `OmniQuestMediaInc/SynthiMatesAi`
**Path:** `PROGRAM_CONTROL/DIRECTIVES/QUEUE/GOV-SYN-REACTIVATE-001.md`
**Date opened:** 2026-05-19
**Status:** QUEUED
**Agent:** grok
**CEO_GATE:** YES
**Rule Applied:** OQMI_GOVERNANCE
**Predecessor reference:** `PROGRAM_CONTROL/DIRECTIVES/DONE/GOVERNANCE-EQ-001.md`

---

## 1. CONTEXT

SynthiMatesAi README currently opens with "**CLEANUP MODE ACTIVE** — Governance sync and repo hardening take priority over new feature work. Cyrano L1/L2 feature ownership now lives in the dedicated Cyrano repo." The last HANDOFF (GOVERNANCE-EQ-001, 2026-05-12) confirmed cleanup mode and identified four shedding candidates.

Per CEO directive 2026-05-19 (Cowork orchestrator session): substantial new work has occurred since May 12. SynthiMatesAi is being reactivated as the primary adult consumer surface for `synthimateai.com/whisper`. The Grok-folder delta `SynthiMatesAi_BackEnd_Implementation_Delta_v1.0.md` describes the target Whisper feature scope.

This directive formally exits CLEANUP MODE before any feature directive can queue.

## 2. DELTAS

- [ ] **D1** — Update `README.md`: remove "CLEANUP MODE ACTIVE" block, replace with active-status header. New header should reference Whisper voice-twin consumer role and consumption of CyranoEngines adult Whisper path.
- [ ] **D2** — Update `OQMI_SYSTEM_STATE.md` (root, pending DOCTRINE-PROPAGATION-PIPELINE archive-relocation) to reflect active mode and current status.
- [ ] **D3** — Resolve the four shedding candidates identified in `PROGRAM_CONTROL/REPORT_BACK/GOVERNANCE-EQ-001-REPORT-BACK.md`: (a) `gateguard/` Python prototype, (b) root-level `finance/` loose services, (c) `safety/` stub, (d) `dist/tsconfig.tsbuildinfo` artifact. Decision per candidate: shed via targeted directive OR defer with documented reason.
- [ ] **D4** — IaC/Terraform AWS ca-central-1 gap noted in GOVERNANCE-EQ-001 — defer to consumer-side coverage via the existing INFRA pattern in CNZ-BUILD; document the deferral in this directive.

## 3. ACCEPTANCE CRITERIA

- README clearly states ACTIVE mode + Whisper consumer role.
- Four shedding candidates each have a resolution (shed/deferred with rationale).
- No "CLEANUP MODE" references remain anywhere in repo root.
- Green ship-gate.

## 4. OUT OF SCOPE

- Authoring Whisper feature directives (queue separately once mode-flip lands).
- Cross-repo Whisper integration work (waits on Cyrano API contract).

## 5. BLOCKERS / DEPENDENCIES

None — independent mode-flip.

## 6. BLOCKS

- All Whisper feature directives in SynthiMatesAi (must wait for mode-flip to land before queuing).

## HANDOFF

Assign to grok. PR on `grok/gov-syn-reactivate-001` branch. CEO_GATE: YES — CEO reviews mode-flip before merge.
