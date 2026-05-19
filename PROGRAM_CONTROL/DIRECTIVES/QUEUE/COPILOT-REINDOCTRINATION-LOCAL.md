# COPILOT-REINDOCTRINATION-LOCAL — SynthiMatesAi

**Document ID:** COPILOT-REINDOCTRINATION-LOCAL
**Type:** Local standing prompt — pointer to canonical master
**Authority:** Kevin B. Hartley, CEO — OmniQuest Media Inc.
**Orchestrator:** Claude (Cowork) — Architectural + Coding Authority per 2026-05-19
**Repo:** `OmniQuestMediaInc/SynthiMatesAi`
**Path:** `PROGRAM_CONTROL/DIRECTIVES/QUEUE/COPILOT-REINDOCTRINATION-LOCAL.md`
**Effective:** 2026-05-19
**Master:** `OmniQuestMediaInc/MaxZoneGPT/PROGRAM_CONTROL/DIRECTIVES/QUEUE/COPILOT-DROID-REINDOCTRINATION-MASTER.md`

-----

## YOU ARE COPILOT IN STRICT DROID MODE

For the complete, canonical Strict Droid Mode contract — read order, execution loop, hard-stop conditions, report-back format — fetch and read the master file above. That is the binding source of truth.

```
gh api repos/OmniQuestMediaInc/MaxZoneGPT/contents/PROGRAM_CONTROL/DIRECTIVES/QUEUE/COPILOT-DROID-REINDOCTRINATION-MASTER.md --jq '.content' | base64 -d
```

This local file adds repo-specific context only.

## REPO ROLE & STATUS

**Role:** Adult consumer surface for synthimateai.com/whisper; consumer of CyranoEngines adult Whisper path
**Status:** CLEANUP MODE → REACTIVATING (per GOV-SYN-REACTIVATE-001, CEO_GATE: YES)

## PRIORITY DIRECTIVES IN THIS REPO'S QUEUE

1. **GOV-SYN-REACTIVATE-001** (CEO_GATE: YES) — formally exit CLEANUP MODE, resolve shedding candidates from GOVERNANCE-EQ-001. DO NOT queue Whisper feature work until this lands.

## REPO-SPECIFIC NOTES

Predecessor to CyranoEngines. Four shedding candidates flagged in PROGRAM_CONTROL/REPORT_BACK/GOVERNANCE-EQ-001-REPORT-BACK.md must be resolved. Last HANDOFF 2026-05-12.

## START

1. Workspace probe (`pwd`, `git status`, `git remote -v`)
2. Fetch and read the canonical master (command above)
3. Read this repo's `.github/copilot-instructions.md` (if present)
4. Read this file (you are here)
5. `ls PROGRAM_CONTROL/DIRECTIVES/QUEUE/`
6. Pick the highest-priority directive matching this repo's scope
7. Begin the master's execution loop

## ROUTING

- `Agent: copilot` → execute
- `Agent: grok` (queued before 2026-05-19) → re-routed to copilot per GOV-CANONICAL-AGENT-CHANGE-001 §3
- `CEO_GATE: YES` → draft + flag, do not auto-merge
- Cross-repo coordination → file `CROSS-REPO-FLAG-*` in both affected repos
