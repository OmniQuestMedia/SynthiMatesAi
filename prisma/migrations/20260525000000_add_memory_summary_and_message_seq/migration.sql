-- Superior Memory System — Hierarchical Memory Architecture
-- Adds medium-term summary layer and message sequencing for auto-summarization

-- Add message_seq to MemoryBank for tracking summarization points
ALTER TABLE "memory_banks" ADD COLUMN "message_seq" INTEGER;

-- Create index for efficient session + sequence lookups
CREATE INDEX "memory_banks_session_id_message_seq_idx" ON "memory_banks"("session_id", "message_seq");

-- Create MemorySummary table for medium-term auto-summaries
CREATE TABLE "memory_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(200) NOT NULL,
    "twin_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "summary_text" TEXT NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "start_message_seq" INTEGER NOT NULL,
    "end_message_seq" INTEGER NOT NULL,
    "embedding" JSONB,
    "summary_type" VARCHAR(20) NOT NULL DEFAULT 'AUTO',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" VARCHAR(200) NOT NULL,
    "reason_code" VARCHAR(40) NOT NULL DEFAULT 'MEMORY_SUMMARY',
    "rule_applied_id" VARCHAR(100) NOT NULL DEFAULT 'MEMORY-HIER-001',

    CONSTRAINT "memory_summaries_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient queries
CREATE INDEX "memory_summaries_twin_id_user_id_session_id_created_at_idx" ON "memory_summaries"("twin_id", "user_id", "session_id", "created_at" DESC);
CREATE INDEX "memory_summaries_session_id_created_at_idx" ON "memory_summaries"("session_id", "created_at" DESC);
CREATE UNIQUE INDEX "memory_summaries_correlation_id_key" ON "memory_summaries"("correlation_id");

-- Add foreign key constraint
ALTER TABLE "memory_summaries" ADD CONSTRAINT "memory_summaries_twin_id_fkey" FOREIGN KEY ("twin_id") REFERENCES "ai_twins"("twin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
