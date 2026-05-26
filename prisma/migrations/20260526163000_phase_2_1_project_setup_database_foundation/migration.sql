-- Phase 2.1: Project Setup & Database Foundation
-- Adds facet foundations, character facets, engagement events, and worker state.

CREATE TABLE "facetdimensions" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"           VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(200) NOT NULL,
    "reason_code"    VARCHAR(80)  NOT NULL DEFAULT 'FACET_DIMENSION_CREATE',
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facetdimensions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "facetdimensions_name_key" ON "facetdimensions"("name");
CREATE UNIQUE INDEX "facetdimensions_correlation_id_key" ON "facetdimensions"("correlation_id");

CREATE TABLE "facetvalues" (
    "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
    "facetdimension_id" UUID         NOT NULL,
    "value"             VARCHAR(120) NOT NULL,
    "isexplicit"        BOOLEAN      NOT NULL DEFAULT FALSE,
    "correlation_id"    VARCHAR(200) NOT NULL,
    "reason_code"       VARCHAR(80)  NOT NULL DEFAULT 'FACET_VALUE_CREATE',
    "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facetvalues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "facetvalues_dimension_value_key" ON "facetvalues"("facetdimension_id", "value");
CREATE UNIQUE INDEX "facetvalues_correlation_id_key" ON "facetvalues"("correlation_id");

ALTER TABLE "facetvalues"
  ADD CONSTRAINT "facetvalues_facetdimension_id_fkey"
  FOREIGN KEY ("facetdimension_id") REFERENCES "facetdimensions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "characters" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"           VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(200) NOT NULL,
    "reason_code"    VARCHAR(80)  NOT NULL DEFAULT 'CHARACTER_CREATE',
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "characters_name_key" ON "characters"("name");
CREATE UNIQUE INDEX "characters_correlation_id_key" ON "characters"("correlation_id");

CREATE TABLE "characterfacets" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "character_id"   UUID         NOT NULL,
    "facetvalue_id"  UUID         NOT NULL,
    "correlation_id" VARCHAR(200) NOT NULL,
    "reason_code"    VARCHAR(80)  NOT NULL DEFAULT 'CHARACTER_FACET_ATTACH',
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "characterfacets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "characterfacets_character_id_facetvalue_id_key" ON "characterfacets"("character_id", "facetvalue_id");
CREATE UNIQUE INDEX "characterfacets_correlation_id_key" ON "characterfacets"("correlation_id");

ALTER TABLE "characterfacets"
  ADD CONSTRAINT "characterfacets_character_id_fkey"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "characterfacets"
  ADD CONSTRAINT "characterfacets_facetvalue_id_fkey"
  FOREIGN KEY ("facetvalue_id") REFERENCES "facetvalues"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "characterexplicitfacets" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "character_id"   UUID         NOT NULL,
    "facetvalue_id"  UUID         NOT NULL,
    "correlation_id" VARCHAR(200) NOT NULL,
    "reason_code"    VARCHAR(80)  NOT NULL DEFAULT 'CHARACTER_EXPLICIT_FACET_ATTACH',
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "characterexplicitfacets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "characterexplicitfacets_character_id_facetvalue_id_key" ON "characterexplicitfacets"("character_id", "facetvalue_id");
CREATE UNIQUE INDEX "characterexplicitfacets_correlation_id_key" ON "characterexplicitfacets"("correlation_id");

ALTER TABLE "characterexplicitfacets"
  ADD CONSTRAINT "characterexplicitfacets_character_id_fkey"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "characterexplicitfacets"
  ADD CONSTRAINT "characterexplicitfacets_facetvalue_id_fkey"
  FOREIGN KEY ("facetvalue_id") REFERENCES "facetvalues"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "engagementevents" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "character_id"   UUID         NOT NULL,
    "event_type"     VARCHAR(80)  NOT NULL,
    "metadata"       JSONB,
    "occurred_at"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" VARCHAR(200) NOT NULL,
    "reason_code"    VARCHAR(80)  NOT NULL DEFAULT 'ENGAGEMENT_EVENT',

    CONSTRAINT "engagementevents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "engagementevents_character_id_occurred_at_idx" ON "engagementevents"("character_id", "occurred_at");
CREATE UNIQUE INDEX "engagementevents_correlation_id_key" ON "engagementevents"("correlation_id");

ALTER TABLE "engagementevents"
  ADD CONSTRAINT "engagementevents_character_id_fkey"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "popularityworkerstate" (
    "id"                      UUID         NOT NULL DEFAULT gen_random_uuid(),
    "worker_name"             VARCHAR(120) NOT NULL,
    "last_processed_event_id" UUID,
    "last_processed_at"       TIMESTAMPTZ,
    "correlation_id"          VARCHAR(200) NOT NULL,
    "reason_code"             VARCHAR(80)  NOT NULL DEFAULT 'POPULARITY_WORKER_STATE',
    "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "popularityworkerstate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "popularityworkerstate_worker_name_key" ON "popularityworkerstate"("worker_name");
CREATE UNIQUE INDEX "popularityworkerstate_correlation_id_key" ON "popularityworkerstate"("correlation_id");

ALTER TABLE "popularityworkerstate"
  ADD CONSTRAINT "popularityworkerstate_last_processed_event_id_fkey"
  FOREIGN KEY ("last_processed_event_id") REFERENCES "engagementevents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_characterfacets_nonexplicit()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "facetvalues" fv
     WHERE fv."id" = NEW."facetvalue_id"
       AND fv."isexplicit" = TRUE
  ) THEN
    RAISE EXCEPTION 'characterfacets cannot reference explicit facetvalues';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_characterexplicitfacets_explicit()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "facetvalues" fv
     WHERE fv."id" = NEW."facetvalue_id"
       AND fv."isexplicit" = FALSE
  ) THEN
    RAISE EXCEPTION 'characterexplicitfacets must reference explicit facetvalues';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER characterfacets_enforce_nonexplicit_trigger
BEFORE INSERT OR UPDATE OF "facetvalue_id" ON "characterfacets"
FOR EACH ROW
EXECUTE FUNCTION enforce_characterfacets_nonexplicit();

CREATE TRIGGER characterexplicitfacets_enforce_explicit_trigger
BEFORE INSERT OR UPDATE OF "facetvalue_id" ON "characterexplicitfacets"
FOR EACH ROW
EXECUTE FUNCTION enforce_characterexplicitfacets_explicit();
