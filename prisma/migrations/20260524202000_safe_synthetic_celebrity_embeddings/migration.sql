-- Safe Synthetic Twin Phase 1 — celebrity embedding store + pgvector index
-- Creates the celebrity_embeddings table and ivfflat cosine index idempotently.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS celebrity_embeddings (
  id            TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  embedding     vector(512) NOT NULL,
  "lastUpdated" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source        TEXT        NOT NULL,
  CONSTRAINT celebrity_embeddings_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS celebrity_embeddings_name_idx
  ON celebrity_embeddings (name);

CREATE INDEX IF NOT EXISTS celeb_embedding_ivfflat_idx
  ON celebrity_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
