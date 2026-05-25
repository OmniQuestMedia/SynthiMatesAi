# SynthiMatesAi Roadmap

**Document Authority:** OmniQuest Media Inc. (OQMInc™)
**Last Updated:** 2026-05-25
**Version:** 1.0

---

## Table of Contents

1. [Account-Core + Safe Synthetic Twin Roadmap](#account-core--safe-synthetic-twin-roadmap)
2. [Completed Features](#completed-features)
3. [In Progress](#in-progress)
4. [Planned Features](#planned-features)
5. [Long-Term Vision](#long-term-vision)

---

## Account-Core + Safe Synthetic Twin Roadmap

### ✅ Phase 1-6: Foundation (COMPLETED)

**Account-Core Integration:**

- ✅ Shared account lookup service (`services/account-core/`)
- ✅ Unified account type resolution (USER, CREATOR, DUAL)
- ✅ Creator access validation and verification checks
- ✅ Membership tier system integration

**DreamCoins Ledger System:**

- ✅ Canonical three-bucket wallet architecture (purchased, membership, bonus)
- ✅ Deterministic spend order enforcement
- ✅ Hash-chained immutable ledger with SHA-256 integrity
- ✅ Idempotent transaction processing with replay protection
- ✅ Creator payout engine with rate card management
- ✅ Token expiration and recovery workflows

**Safe Synthetic Twin Creator:**

- ✅ Multi-image blending safeguard (minimum 5 reference images)
- ✅ Celebrity down-weighting algorithm (similarity threshold 0.5)
- ✅ Refinement loop (6 attempts, target similarity ≤ 0.3)
- ✅ Dissimilarity gate (cosine similarity threshold 0.15)
- ✅ C2PA watermarking for provenance metadata
- ✅ ArcFace embeddings for facial recognition
- ✅ Flux model integration with IP-Adapter

**GateGuard Integration:**

- ✅ Pre-processor risk/welfare engine
- ✅ Fraud scoring (0-100 scale, multi-factor)
- ✅ Welfare scoring (velocity, overnight, dwell, chase-loss patterns)
- ✅ Decision thresholds (APPROVE, COOLDOWN, HARD_DECLINE, HUMAN_ESCALATE)
- ✅ Zero-knowledge AV callback handling
- ✅ Federated cross-platform ban checking
- ✅ Append-only audit log chain with NATS event publishing

**Voice Chat Integration:**

- ✅ Voice message sending with automatic DreamCoins deduction (5 CZT/message)
- ✅ Wallet balance checking and breakdown
- ✅ Idempotent voice chat transactions
- ✅ Memory bank integration for voice transcripts
- ✅ Multi-bucket spend tracking (purchased → membership → bonus)

**Monitoring & Observability (Phase 7 - Item 1):**

- ✅ Real-time metrics service for Account-Core operations
- ✅ DreamCoins spend tracking by reason code
- ✅ Payout request monitoring by status and creator
- ✅ Membership upgrade analytics
- ✅ Ledger transaction observability (all transactions via NATS)
- ✅ Voice chat usage metrics
- ✅ Synthetic generation success rate tracking
- ✅ Account lookup analytics by type
- ✅ NATS event emission for all key metrics

---

### 🚀 Phase 7+: Advanced Features & Extensions

#### 1. Advanced Voice Features (Q3 2026)

**Real-Time Bidirectional Calling:**

- WebSocket-based voice streaming with ElevenLabs
- Session management for call initiation, hold, transfer
- Real-time transcription with GateGuard moderation
- Call quality monitoring with automatic text fallback
- Recording consent management and PII redaction
- Audio encryption at rest (30-day retention default)
- Call history and playback with access controls

**Voice Cloning Enhancements:**

- Multi-sample voice training for better quality
- Voice emotion modulation (happy, sad, excited, etc.)
- Voice style transfer (whisper, shout, normal)
- Custom voice profiles per AI Twin
- Voice similarity detection and deduplication

**Voice-Activated Commands:**

- Hands-free voice commands for navigation
- Voice-controlled DreamCoins transactions
- Voice-based twin personality switching
- Natural language voice search

---

#### 2. Group Chat & Multi-Party Features (Q4 2026)

**Group Voice Rooms:**

- Multi-user voice chat with AI Twin participation
- Spatial audio for realistic positioning
- Per-participant volume controls
- Group voice recording with consent management
- Turn-taking AI responses in group context

**Shared Experiences:**

- Collaborative storytelling with multiple AI Twins
- Group narrative branching with voting mechanics
- Shared memory banks across group members
- Group-exclusive AI Twin personalities

**Social Features:**

- Friend invitations to AI Twin sessions
- Shared DreamCoins pools for group activities
- Group membership tiers with stipend multipliers
- Social leaderboards and achievements

---

#### 3. Multi-Model Support (Q1 2027)

**LLM Flexibility:**

- Support for GPT-4, Claude, Gemini, and custom models
- Model selection per AI Twin personality
- A/B testing framework for model performance
- Cost optimization with model routing
- Fallback chains for model availability

**Image Generation Diversity:**

- DALL-E 3, Midjourney, Stable Diffusion integration
- Model selection based on style preferences
- Multi-model ensemble for higher quality
- Custom LoRA model marketplace for creators

**Voice Synthesis Options:**

- Azure Speech, Google WaveNet alternatives
- Voice cloning from multiple providers
- Quality/cost tradeoff optimization
- Multilingual voice support expansion

---

#### 4. Advanced Personalization (Q2 2027)

**Enhanced Memory System:**

- Long-term memory with weighted importance
- Memory decay simulation for realism
- Memory retrieval with semantic search
- Memory sharing between user's multiple twins
- Memory export and import for portability

**Adaptive Personalities:**

- Machine learning for personality evolution
- User preference learning over time
- Context-aware personality adjustments
- Emotional intelligence improvements
- Multi-dimensional personality traits

**Predictive Engagement:**

- Proactive twin-initiated conversations
- Event-based automatic check-ins
- Surprise messages based on user history
- Contextual greeting variations
- Predictive narrative suggestions

---

#### 5. Creator Monetization Extensions (Q3 2027)

**Advanced Payout Options:**

- Tiered payout rates based on engagement quality
- Bonus pools for top-performing creators
- Referral bonuses for creator recruitment
- Performance-based stipend multipliers
- Creator staking and revenue sharing

**Premium Content Tiers:**

- Exclusive AI Twin personalities for premium members
- Early access to new features for VIP creators
- Custom voice models for Diamond tier
- Priority support and concierge service
- Revenue analytics dashboard

**Creator Tools:**

- A/B testing for twin personalities
- Engagement analytics and insights
- Automated marketing campaigns
- Creator collaboration tools
- Twin performance optimization suggestions

---

#### 6. Compliance & Safety Enhancements (Ongoing)

**Enhanced GateGuard:**

- Real-time sentiment analysis for welfare monitoring
- Predictive modeling for at-risk users
- Automated intervention escalation
- Integration with external mental health resources
- Multi-language content moderation

**Privacy & Data Protection:**

- End-to-end encryption for voice messages
- Zero-knowledge proof for sensitive operations
- GDPR/CCPA automated compliance reporting
- User data export automation
- Right-to-be-forgotten workflows

**Age Verification:**

- Multi-factor age verification system
- Biometric age estimation (optional)
- Parental consent management
- Age-appropriate content filtering
- Minor protection safeguards

---

#### 7. Scalability & Performance (Q4 2027)

**Infrastructure:**

- Multi-region deployment for global reach
- Edge computing for low-latency voice
- CDN integration for media delivery
- Auto-scaling based on demand
- Disaster recovery and high availability

**Optimization:**

- Database query optimization and indexing
- Caching strategies for frequently accessed data
- Background job queuing for expensive operations
- Rate limiting per tier with burst allowance
- Connection pooling and resource management

**Monitoring:**

- Real-time performance dashboards
- Alerting for anomalies and errors
- Usage forecasting and capacity planning
- Cost attribution per feature
- SLA tracking and reporting

---

## Completed Features

### Core Platform (Shipped)

1. **User Authentication & Authorization**
   - Email/password authentication
   - JWT token-based sessions
   - Role-based access control (USER, CREATOR, ADMIN)
   - Multi-tenant organization support

2. **AI Twin Creator Wizard**
   - Step-by-step twin creation flow
   - Photo upload with Safe Synthetic Mode
   - LoRA training pipeline integration
   - House model provisioning

3. **Persistent Memory System**
   - Fact storage and retrieval
   - Story beat tracking
   - Secret management
   - Preference learning

4. **Character Chat Interface**
   - Real-time text chat with AI twins
   - Narrative branching with choice points
   - Upgrade nudges for Spark twins
   - Memory-aware context building

5. **Multi-Portal Architecture**
   - Brand-specific portal apps (Main, Ink & Steel, Lotus Bloom, etc.)
   - Shared UI component library
   - Portal-specific theming
   - Single backend for all portals

---

## In Progress

### Active Development (Current Sprint)

1. **Phase 7 Final Items:**
   - ✅ Monitoring & observability for Account-Core + DreamCoins
   - ✅ Final cleanup and tech debt removal
   - 🔄 Roadmap documentation (this document)
   - 🔄 Final documentation and handover
   - 🔄 Project closure and validation

2. **Cyrano Voice Call System (CYR-VOICE-004):**
   - Real-time bidirectional calling with ElevenLabs WebSocket
   - Session management service
   - GateGuard text moderation on STT transcripts
   - Call quality monitoring with fallback
   - Recording consent and PII redaction
   - Audio encryption at rest

---

## Planned Features

### Near-Term (Next 6 Months)

1. **Enhanced Analytics Dashboard**
   - Creator performance metrics
   - Revenue breakdown by source
   - Engagement heatmaps
   - User retention analytics

2. **Mobile App Development**
   - iOS native app
   - Android native app
   - Push notifications
   - Offline mode support

3. **Marketplace Integration**
   - AI Twin marketplace for discovery
   - Creator storefronts
   - Featured twins and promotions
   - User reviews and ratings

4. **Advanced Moderation Tools**
   - AI-powered content flagging
   - Creator moderation dashboard
   - User reporting system
   - Automated ban management

### Mid-Term (6-12 Months)

1. **Internationalization**
   - Multi-language UI support
   - Localized content
   - Regional payment methods
   - Currency conversion

2. **Enterprise Features**
   - White-label deployment options
   - Custom branding
   - Dedicated instances
   - SLA guarantees

3. **API Ecosystem**
   - Public API for third-party integrations
   - Developer portal and documentation
   - Webhook system for events
   - API analytics and usage tracking

---

## Long-Term Vision

### Strategic Goals (12-24 Months)

1. **AI Twin Marketplace Economy**
   - Creator-to-creator collaboration
   - Twin licensing and royalties
   - Derivative works management
   - IP protection framework

2. **Virtual World Integration**
   - VR/AR twin experiences
   - Spatial computing support
   - Metaverse platform integrations
   - 3D avatar generation

3. **Advanced AI Capabilities**
   - Multimodal interaction (text, voice, video, gesture)
   - Emotional intelligence improvements
   - Contextual awareness across platforms
   - Proactive engagement

4. **Blockchain Integration (Optional)**
   - NFT-based twin ownership
   - Decentralized identity
   - Smart contract automation
   - Tokenized economy

---

## How New Features Should Integrate

### Architecture Principles

All new features must adhere to the following principles:

1. **Reuse Shared Ledger:**
   - All financial transactions go through `services/ledger/`
   - Use canonical three-bucket wallet system
   - Enforce deterministic spend order
   - Maintain hash-chain integrity
   - Never bypass GateGuard for financial operations

2. **Leverage GateGuard:**
   - All user actions requiring risk assessment must call GateGuard
   - Respect GateGuard decisions (APPROVE, COOLDOWN, HARD_DECLINE, HUMAN_ESCALATE)
   - Emit welfare signals for monitoring
   - Use zero-knowledge AV checking for sensitive content
   - Log all decisions in append-only audit chain

3. **Use Account-Core for Identity:**
   - All user/creator lookups through `services/account-core/`
   - Use unified account views for multi-role users
   - Validate creator access before creator-only operations
   - Check verified status for privileged features
   - Respect account status (ACTIVE, SUSPENDED, etc.)

4. **Emit NATS Events:**
   - All significant operations publish to NATS topics
   - Follow NATS topics registry (`services/nats/topics.registry.ts`)
   - Include correlation_id and reason_code on every event
   - Use idempotency keys for critical operations
   - Enable real-time monitoring and auditing

5. **Follow Security Invariants:**
   - Append-only for financial data (no UPDATE/DELETE on ledger tables)
   - Network isolation (Postgres and Redis never on public interface)
   - No secrets in code (use environment variables)
   - All chat and AI events via NATS (no REST polling)
   - Validate all user input at boundaries

6. **Maintain Data Privacy:**
   - Minimize PII collection
   - Encrypt sensitive data at rest
   - Use zero-knowledge proofs where possible
   - Respect user consent preferences
   - Implement data retention policies

7. **Ensure Observability:**
   - Add metrics to AccountCoreMetricsService
   - Log key operations with structured logging
   - Include trace IDs for debugging
   - Emit NATS events for dashboards
   - Support health check endpoints

---

## Feature Request Process

To propose a new feature:

1. **Create a Directive:**
   - Use template in `docs/DIRECTIVE_TEMPLATE.md`
   - Include motivation, scope, and acceptance criteria
   - List all files/services touched
   - Specify parallel-safe status

2. **Review Against Governance:**
   - Check `PROGRAM_CONTROL/DIRECTIVES/QUEUE/OQMI_GOVERNANCE.md`
   - Ensure compliance with invariants
   - Identify FIZ impact if touching financial code
   - Flag human-review categories

3. **Queue for Implementation:**
   - Place in `PROGRAM_CONTROL/DIRECTIVES/QUEUE/`
   - Assign to appropriate agent (COPILOT, GROK, etc.)
   - Prioritize based on roadmap and dependencies
   - Update `docs/REQUIREMENTS_MASTER.md`

4. **Implementation & Testing:**
   - Agent implements per directive
   - Runs typecheck and linting
   - Generates report-back
   - Opens PR for review

5. **Merge & Deploy:**
   - Auto-merge on green CI (non-FIZ)
   - CEO review for FIZ/governance changes
   - Deploy to staging then production
   - Monitor metrics post-deploy

---

## Maintenance & Support

### Regular Activities

- **Weekly:** Review metrics dashboard, triage issues
- **Monthly:** Security audits, dependency updates, performance reviews
- **Quarterly:** Architecture reviews, roadmap updates, compliance audits
- **Annually:** Major version upgrades, infrastructure reviews, disaster recovery drills

### Deprecation Policy

When retiring a feature:

1. Announce deprecation 90 days in advance
2. Provide migration path for affected users
3. Mark APIs as deprecated with sunset date
4. Remove from documentation
5. Archive code with tombstone comments
6. Update NATS topics registry with @deprecated tags

---

## Success Metrics

### Key Performance Indicators (KPIs)

- **User Growth:** Monthly active users, retention rate
- **Engagement:** Messages per user, session duration, daily active twins
- **Revenue:** DreamCoins purchased, membership conversions, creator payouts
- **Quality:** Synthetic twin success rate, moderation accuracy, uptime SLA
- **Performance:** API response times, voice latency, page load speeds

### Goals for 2026

- 10,000+ active users
- 500+ active creators
- 95% synthetic twin success rate
- <100ms API response time (p95)
- 99.9% uptime
- <5% fraud/abuse rate

---

_For questions about this roadmap, contact the engineering team via PROGRAM_CONTROL directives._

_[rule_applied_id: ROADMAP_v1.0]_
