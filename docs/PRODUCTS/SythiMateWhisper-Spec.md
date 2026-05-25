# SythiMateWhisper™ & CyranoWhisper Technical Specification

**Version**: 1.0
**Date**: May 2026
**Owner**: Kevin B (Product)

## 1. Product Overview

Two branded portals built on the shared Synthemates core + AI Twin framework:

- **SythiMateWhisper™** (Adult flagship)
- **CyranoWhisper** (Mainstream / non-adult)

Both use identical engine. Differentiation via onboarding, default templates, feature flags, and rating enforcement.

## 2. Core Features (Shared)

- .md file library (upload, tagging, versioning, rating)
- Whisper-as-Speech mode with Intelligent Auto-Advance (listens and delivers next chunk)
- Contextual On-Demand whispers
- Virtual Pickle controller (bottom half of phone screen)
- Shared session codes (multi-user + AI Twin control)
- Multimodal output (earpiece, phone/iPad/web/TV teleprompter)
- Broadcast Platform Overlay (browser extension for chat ingestion on Chaturbate, Stripchat, Cam4, ChatNow.Zone, etc.)
- Language settings + one free language pair (additional pairs paid)
- Restricted words list
- Privacy-first (on-device where possible)

## 3. Product Differentiation

| Feature           | SythiMateWhisper™                      | CyranoWhisper                                     |
| ----------------- | -------------------------------------- | ------------------------------------------------- |
| Default Rating    | 18+/XXX                                | G/14+                                             |
| G/14+ Mode        | Paid add-on                            | Included                                          |
| XXX Mode          | Included                               | Paid upgrade                                      |
| Primary Use Cases | Adult content creators, live broadcast | Dates, acting, public speaking, language coaching |

## 4. Technical Architecture

**No repo duplication.**

Follow existing multi-portal pattern:

- `apps/portals/synthimate-whisper/` (new)
- `apps/portals/cyrano-whisper/` (new)

Reuse:

- services/core-api, cyrano/, narrative-engine/, ai-twin/, voice-cloning/
- Shared UI components
- Safety, ledger, gateguard

New/Extended:

- Whisper-specific UI (Virtual Pickle, teleprompter)
- Broadcast overlay extension (feeds chat to AI Twin)
- Intelligent Auto-Advance logic
- Feature flags for rating & language add-ons

## 5. Browser Extension

Lightweight Chrome/Edge extension that connects to active AI Twin session and injects chat from broadcast platforms.

## 6. Roadmap

Phase 1: Core whisper + auto-advance + portals
Phase 2: Broadcast overlay + shared sessions + add-ons

**This document serves as the source of truth for development.**
