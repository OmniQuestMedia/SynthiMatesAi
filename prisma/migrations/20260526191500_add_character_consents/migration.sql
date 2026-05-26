-- Phase 2.7 pre-requisite: character consent ledger for motion extractor and guardrails.
-- Creates character_consents with immutable grant rows tracked by scope.

CREATE TABLE IF NOT EXISTS "character_consents" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "character_id"   UUID         NOT NULL,
    "consent_scope"  VARCHAR(80)  NOT NULL,
    "granted_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at"     TIMESTAMPTZ,
    "proof_ref"      VARCHAR(255),
    "correlation_id" VARCHAR(200) NOT NULL,
    "reason_code"    VARCHAR(80)  NOT NULL DEFAULT 'CHARACTER_CONSENT_GRANT',
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "character_consents_character_id_consent_scope_key"
  ON "character_consents"("character_id", "consent_scope");

CREATE UNIQUE INDEX IF NOT EXISTS "character_consents_correlation_id_key"
  ON "character_consents"("correlation_id");

CREATE INDEX IF NOT EXISTS "character_consents_character_id_granted_at_idx"
  ON "character_consents"("character_id", "granted_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'character_consents_character_id_fkey'
  ) THEN
    ALTER TABLE "character_consents"
      ADD CONSTRAINT "character_consents_character_id_fkey"
      FOREIGN KEY ("character_id") REFERENCES "characters"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
