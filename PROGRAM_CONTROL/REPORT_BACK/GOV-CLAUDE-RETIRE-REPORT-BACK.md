# GOV-CLAUDE-RETIRE — REPORT-BACK

**Task:** Retire Claude Code as build agent; establish Grok as primary
**Directive:** CEO directive 2026-05-11 (problem statement: "Claude has been fully removed. Grok is now primary build agent.")
**Branch:** grok/gov-claude-retire
**Agent:** copilot (executor) → Grok (successor primary)
**Date:** 2026-05-11
**CEO_GATE:** NO

---

## What was done

- Updated `PROGRAM_CONTROL/DIRECTIVES/QUEUE/CNZ-WORK-001.md`:
  - Changed all 24 `Agent: claude-code` task hints → `Agent: grok`
  - Updated §2 AGENT ROUTING description to list Grok as primary
  - Updated task shape template and report-back/done-record templates to replace `claude-code` with `grok`
- Moved `CNZ-CLAUDE-CODE-KICKOFF.md` → `PROGRAM_CONTROL/DIRECTIVES/DONE/CNZ-CLAUDE-CODE-KICKOFF-RETIRED.md`
- Moved `CNZ-CLAUDE-CODE-STANDING-PROMPT.md` → `PROGRAM_CONTROL/DIRECTIVES/DONE/CNZ-CLAUDE-CODE-STANDING-PROMPT-RETIRED.md`
- Created `PROGRAM_CONTROL/DIRECTIVES/QUEUE/CNZ-GROK-KICKOFF.md` — Grok kickoff authority doc
- Created `PROGRAM_CONTROL/DIRECTIVES/QUEUE/CNZ-GROK-STANDING-PROMPT.md` — Grok standing execution authority
- Updated `.github/AGENTS.md` — added agent roster section listing Grok as primary, Copilot as secondary, Claude Code as RETIRED
- Updated `.github/workflows/directive-dispatch.yml` — added `Route to Grok` step for `AGENT == GROK`; replaced `Route to Claude Code` step with a Grok re-route with retirement notice
- Updated `PROGRAM_CONTROL/DIRECTIVES/QUEUE/OQMI_SYSTEM_STATE.md` §7 RETIRED ITEMS — added Claude Code retirement record; §8 PROVENANCE NOTES — added Claude Code retirement note

## Files changed

```
.github/AGENTS.md
.github/workflows/directive-dispatch.yml
PROGRAM_CONTROL/DIRECTIVES/QUEUE/CNZ-WORK-001.md
PROGRAM_CONTROL/DIRECTIVES/QUEUE/CNZ-GROK-KICKOFF.md          (CREATE)
PROGRAM_CONTROL/DIRECTIVES/QUEUE/CNZ-GROK-STANDING-PROMPT.md  (CREATE)
PROGRAM_CONTROL/DIRECTIVES/DONE/CNZ-CLAUDE-CODE-KICKOFF-RETIRED.md          (MOVED)
PROGRAM_CONTROL/DIRECTIVES/DONE/CNZ-CLAUDE-CODE-STANDING-PROMPT-RETIRED.md  (MOVED)
PROGRAM_CONTROL/DIRECTIVES/QUEUE/OQMI_SYSTEM_STATE.md
PROGRAM_CONTROL/REPORT_BACK/GOV-CLAUDE-RETIRE-REPORT-BACK.md  (this file)
```

## Invariants confirmed

- NO REFACTORING: Only doc/config files changed; no service logic touched
- SCHEMA INTEGRITY: No schema changes
- APPEND-ONLY FINANCE: No FIZ paths touched
- All `claude-code` task hints in CNZ-WORK-001.md replaced with `grok` (24 occurrences)
- Governance chain intact: OQMI_GOVERNANCE.md unchanged (supreme authority)

## Result

**SUCCESS** — Governance updated. Claude Code retired. Grok is primary build agent.
Next: CYR-CORE-001, STUDIO-AFF-001, CYR-NARR-002 to be executed on separate branches.
