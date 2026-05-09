# Main Branch Protection — Agent Fast-Path Settings

Apply these settings to `main` branch protection / ruleset:

- Require status checks to pass before merging.
- Required checks for agent branches (`copilot/*`, `grok/*`, `agent/*`):
  - `CI / Workspace Quality (lint / typecheck / format / test)` (from `.github/workflows/ci.yml`)
  - `CI / Ship-Gate Verifier` (from `.github/workflows/ci.yml`)
  - `Copilot Internal Fast-Path / fast-gate` (from `.github/workflows/copilot-internal.yml`)
- Keep governance/security checks enabled for non-agent branches:
  - `CodeQL / Analyze (javascript-typescript)`
  - `Lint (Super-Linter) / Super-Linter`
- Keep existing review, signed-commit, and linear-history safeguards unchanged.
