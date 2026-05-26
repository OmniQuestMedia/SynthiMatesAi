-- Migration for Phase 2.7: Consent + Motion Library

-- Enhanced Consents Table (with ZKP support)
CREATE TABLE IF NOT EXISTS character_consents (
    consent_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          UUID NOT NULL REFERENCES accounts(accountid),
    character_id        UUID NOT NULL,
    consent_type        TEXT NOT NULL CHECK (consent_type IN ('twin', 'fantasy')),
    consent_text_hash   TEXT NOT NULL,
    zk_proof_hash       TEXT,                    -- Hash of the ZKP proof for audit
    granted             BOOLEAN NOT NULL DEFAULT TRUE,
    granted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address_hash     TEXT,                    -- Hashed for privacy
    user_agent_hash     TEXT,
    CONSTRAINT unique_character_consent UNIQUE (character_id, consent_type, granted)
);

CREATE INDEX idx_character_consents_active ON character_consents(character_id, consent_type)
    WHERE granted = TRUE;

-- Motion Library (Anonymized)
CREATE TABLE IF NOT EXISTS motion_profiles (
    motion_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    category            TEXT NOT NULL,           -- flirty, dominant, playful, etc.
    blendshapes         JSONB NOT NULL,          -- MediaPipe blendshape weights
    head_pose           JSONB,
    eye_gaze            JSONB,
    intensity           NUMERIC(3,2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active           BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_motion_profiles_category ON motion_profiles(category) WHERE is_active = TRUE;

-- Link between characters and motion profiles
CREATE TABLE IF NOT EXISTS character_motion_usage (
    character_id        UUID NOT NULL,
    motion_id           UUID NOT NULL REFERENCES motion_profiles(motion_id),
    usage_count         INTEGER DEFAULT 0,
    last_used_at        TIMESTAMPTZ,
    PRIMARY KEY (character_id, motion_id)
);

-- Audit log for generations with consent reference
ALTER TABLE engagementevents
    ADD COLUMN IF NOT EXISTS consent_id UUID REFERENCES character_consents(consent_id),
    ADD COLUMN IF NOT EXISTS zkp_public_signals JSONB;
