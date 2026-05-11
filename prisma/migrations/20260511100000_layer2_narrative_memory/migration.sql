-- CYR-NARR-002: Layer 2 Narrative Memory — MemoryEntry, StoryBeat, BranchDecision tables
-- These are DISTINCT from the Layer 1 memory_banks and narrative_branches tables.

-- Enum for story beat types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StoryBeatType') THEN
    CREATE TYPE "StoryBeatType" AS ENUM ('OPEN', 'RISING', 'TURN', 'RESOLUTION');
  END IF;
END;
$$;

-- Layer 2 memory entries with embedding support + access tracking
CREATE TABLE IF NOT EXISTS memory_entries (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL,
  persona_id        UUID        NOT NULL,
  content           TEXT        NOT NULL,
  embedding         JSONB,
  importance_score  FLOAT       NOT NULL DEFAULT 0.5,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at  TIMESTAMPTZ,
  access_count      INT         NOT NULL DEFAULT 0,
  correlation_id    VARCHAR(200) NOT NULL,
  reason_code       VARCHAR(40) NOT NULL DEFAULT 'MEMORY_RECORD',
  rule_applied_id   VARCHAR(100) NOT NULL DEFAULT 'CYR-NARR-002'
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_user_persona_score
  ON memory_entries (user_id, persona_id, importance_score DESC);

CREATE INDEX IF NOT EXISTS idx_memory_entries_user_persona_accessed
  ON memory_entries (user_id, persona_id, last_accessed_at);

-- Layer 2 story beats (append-only)
CREATE TABLE IF NOT EXISTS story_beats (
  id               UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID          NOT NULL,
  persona_id       UUID          NOT NULL,
  beat_type        "StoryBeatType" NOT NULL,
  summary          TEXT          NOT NULL,
  memory_entry_id  UUID          REFERENCES memory_entries(id),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  correlation_id   VARCHAR(200)  NOT NULL,
  reason_code      VARCHAR(40)   NOT NULL DEFAULT 'STORY_BEAT',
  rule_applied_id  VARCHAR(100)  NOT NULL DEFAULT 'CYR-NARR-002'
);

CREATE INDEX IF NOT EXISTS idx_story_beats_user_persona_type
  ON story_beats (user_id, persona_id, beat_type);

CREATE INDEX IF NOT EXISTS idx_story_beats_user_persona_created
  ON story_beats (user_id, persona_id, created_at DESC);

-- Layer 2 branch decisions (append-only; consequences immutable)
CREATE TABLE IF NOT EXISTS branch_decisions (
  id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL,
  persona_id      UUID         NOT NULL,
  beat_id         UUID         NOT NULL REFERENCES story_beats(id),
  decision_text   TEXT         NOT NULL,
  consequences    JSONB        NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  correlation_id  VARCHAR(200) NOT NULL,
  reason_code     VARCHAR(40)  NOT NULL DEFAULT 'BRANCH_DECISION',
  rule_applied_id VARCHAR(100) NOT NULL DEFAULT 'CYR-NARR-002'
);

CREATE INDEX IF NOT EXISTS idx_branch_decisions_user_persona_created
  ON branch_decisions (user_id, persona_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_branch_decisions_beat_id
  ON branch_decisions (beat_id);
