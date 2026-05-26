-- SYNTHIMATES-001: Phase 2.1 — Facet-Based Character Generation Database Foundation
-- Creates tables for facet dimensions, facet values, characters, and engagement tracking
-- Enforces explicit vs non-explicit content separation via triggers

-- ── Facet Dimensions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facet_dimensions (
  id                    UUID         NOT NULL DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL,
  description           TEXT,
  is_explicit_category  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT facet_dimensions_pkey PRIMARY KEY (id)
);

-- ── Facet Values ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facet_values (
  id           UUID         NOT NULL DEFAULT gen_random_uuid(),
  dimension_id UUID         NOT NULL,
  value        VARCHAR(200) NOT NULL,
  description  TEXT,
  is_explicit  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT facet_values_pkey PRIMARY KEY (id),
  CONSTRAINT facet_values_dimension_id_fkey FOREIGN KEY (dimension_id) REFERENCES facet_dimensions(id)
);

CREATE INDEX IF NOT EXISTS facet_values_dimension_id_idx ON facet_values (dimension_id);

-- ── Characters ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS characters (
  id           UUID         NOT NULL DEFAULT gen_random_uuid(),
  display_name VARCHAR(200) NOT NULL,
  bio          TEXT,
  is_explicit  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT characters_pkey PRIMARY KEY (id)
);

-- ── Character Facets (Non-Explicit) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_facets (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  character_id   UUID        NOT NULL,
  facet_value_id UUID        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT character_facets_pkey PRIMARY KEY (id),
  CONSTRAINT character_facets_character_id_fkey FOREIGN KEY (character_id) REFERENCES characters(id),
  CONSTRAINT character_facets_facet_value_id_fkey FOREIGN KEY (facet_value_id) REFERENCES facet_values(id)
);

CREATE INDEX IF NOT EXISTS character_facets_character_id_idx ON character_facets (character_id);
CREATE INDEX IF NOT EXISTS character_facets_facet_value_id_idx ON character_facets (facet_value_id);

-- ── Character Explicit Facets ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_explicit_facets (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  character_id   UUID        NOT NULL,
  facet_value_id UUID        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT character_explicit_facets_pkey PRIMARY KEY (id),
  CONSTRAINT character_explicit_facets_character_id_fkey FOREIGN KEY (character_id) REFERENCES characters(id),
  CONSTRAINT character_explicit_facets_facet_value_id_fkey FOREIGN KEY (facet_value_id) REFERENCES facet_values(id)
);

CREATE INDEX IF NOT EXISTS character_explicit_facets_character_id_idx ON character_explicit_facets (character_id);
CREATE INDEX IF NOT EXISTS character_explicit_facets_facet_value_id_idx ON character_explicit_facets (facet_value_id);

-- ── Engagement Events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engagement_events (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  character_id UUID        NOT NULL,
  user_id      UUID        NOT NULL,
  event_type   VARCHAR(50) NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT engagement_events_pkey PRIMARY KEY (id),
  CONSTRAINT engagement_events_character_id_fkey FOREIGN KEY (character_id) REFERENCES characters(id)
);

CREATE INDEX IF NOT EXISTS engagement_events_character_id_created_at_idx ON engagement_events (character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS engagement_events_user_id_created_at_idx ON engagement_events (user_id, created_at DESC);

-- ── Popularity Worker State ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS popularity_worker_state (
  id                UUID        NOT NULL DEFAULT gen_random_uuid(),
  character_id      UUID        NOT NULL UNIQUE,
  popularity_score  INTEGER     NOT NULL DEFAULT 0,
  last_processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT popularity_worker_state_pkey PRIMARY KEY (id),
  CONSTRAINT popularity_worker_state_character_id_fkey FOREIGN KEY (character_id) REFERENCES characters(id)
);

CREATE INDEX IF NOT EXISTS popularity_worker_state_popularity_score_idx ON popularity_worker_state (popularity_score);

-- ── Trigger: Enforce Explicit Facet Separation ─────────────────────────────────
-- Ensures that explicit facet values can only be inserted into character_explicit_facets,
-- and non-explicit facet values can only be inserted into character_facets.

CREATE OR REPLACE FUNCTION enforce_explicit_facet_separation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'character_facets' THEN
    -- Inserting into non-explicit table: facet value must NOT be explicit
    IF EXISTS (SELECT 1 FROM facet_values WHERE id = NEW.facet_value_id AND is_explicit = TRUE) THEN
      RAISE EXCEPTION 'Explicit facet value % cannot be inserted into character_facets. Use character_explicit_facets instead.', NEW.facet_value_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'character_explicit_facets' THEN
    -- Inserting into explicit table: facet value MUST be explicit
    IF EXISTS (SELECT 1 FROM facet_values WHERE id = NEW.facet_value_id AND is_explicit = FALSE) THEN
      RAISE EXCEPTION 'Non-explicit facet value % cannot be inserted into character_explicit_facets. Use character_facets instead.', NEW.facet_value_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_character_facets_explicit_separation
  BEFORE INSERT ON character_facets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_explicit_facet_separation();

CREATE TRIGGER enforce_character_explicit_facets_separation
  BEFORE INSERT ON character_explicit_facets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_explicit_facet_separation();
