-- STUDIO-AFF-001 — Studio affiliation number integrity constraints
-- 
-- Adds:
--   1. DB CHECK constraint: affiliation_number must be 6–9 characters.
--   2. Idempotent unique index on studios.affiliation_number
--      (Prisma @unique already generates this; SQL written idempotently so
--       the migration is safe to run even if the index already exists).
--
-- FIZ NOTE: This migration touches the `studios` table which is governance-bearing.
-- All writes to this table must carry correlation_id + reason_code per OQMI invariants.

-- 1. CHECK constraint: enforce 6 ≤ length(affiliation_number) ≤ 9
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'studios'
      AND constraint_name = 'chk_aff_num_len'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE studios
      ADD CONSTRAINT chk_aff_num_len
      CHECK (length(affiliation_number) BETWEEN 6 AND 9);
  END IF;
END;
$$;

-- 2. Idempotent unique index (Prisma @unique creates "studios_affiliation_number_key";
--    this explicit CREATE is a no-op if it already exists, guaranteeing the migration
--    is safe to run in any environment state).
CREATE UNIQUE INDEX IF NOT EXISTS uq_studios_aff_num
  ON studios (affiliation_number);
