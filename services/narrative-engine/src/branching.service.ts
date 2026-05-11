// services/narrative-engine/src/branching.service.ts
// CYR-NARR-002: Layer 2 BranchingService — immutable branching decision history.
//
// Manages StoryBeat and BranchDecision records.
// Branching history is APPEND-ONLY — no rollback of decisions, ever.
// The BranchDecision.consequences JSON blob is immutable once written.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';
import { NatsService } from '../../core-api/src/nats/nats.service';

export type BeatType = 'OPEN' | 'RISING' | 'TURN' | 'RESOLUTION';

export interface CreateStoryBeatInput {
  user_id: string;
  persona_id: string;
  beat_type: BeatType;
  summary: string;
  memory_entry_id?: string;
  correlation_id: string;
}

export interface StoryBeatRecord {
  id: string;
  user_id: string;
  persona_id: string;
  beat_type: BeatType;
  summary: string;
  created_at: Date;
}

export interface CreateBranchDecisionInput {
  user_id: string;
  persona_id: string;
  beat_id: string;
  decision_text: string;
  /** Consequences as a record of category → outcome description. Immutable once written. */
  consequences: Record<string, string>;
  correlation_id: string;
}

export interface BranchDecisionRecord {
  id: string;
  user_id: string;
  persona_id: string;
  beat_id: string;
  decision_text: string;
  consequences: Record<string, string>;
  created_at: Date;
}

const NATS_STORY_BEAT_LAYER2 = 'cyrano.narrative.l2.story-beat';
const NATS_BRANCH_DECISION = 'cyrano.narrative.l2.branch-decision';

@Injectable()
export class BranchingService {
  private readonly logger = new Logger(BranchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nats: NatsService,
  ) {}

  /**
   * Record a new story beat for a user+persona pair.
   * Emits NATS event on creation.
   */
  async createStoryBeat(input: CreateStoryBeatInput): Promise<StoryBeatRecord> {
    const record = await this.prisma.storyBeat.create({
      data: {
        user_id: input.user_id,
        persona_id: input.persona_id,
        beat_type: input.beat_type,
        summary: input.summary,
        memory_entry_id: input.memory_entry_id ?? null,
        correlation_id: input.correlation_id,
        reason_code: 'STORY_BEAT',
        rule_applied_id: 'CYR-NARR-002',
      },
    });

    await this.nats.publish(NATS_STORY_BEAT_LAYER2, {
      beat_id: record.id,
      user_id: record.user_id,
      persona_id: record.persona_id,
      beat_type: record.beat_type,
    });

    this.logger.log(
      `StoryBeat created: ${record.id} (type=${record.beat_type}, user=${record.user_id})`,
    );

    return this.toBeatRecord(record);
  }

  /**
   * Record an immutable branching decision for a story beat.
   * The consequences JSON blob is written once and never updated.
   * Emits NATS event on creation.
   */
  async createBranchDecision(input: CreateBranchDecisionInput): Promise<BranchDecisionRecord> {
    // Verify the referenced beat exists before inserting
    await this.prisma.storyBeat.findUniqueOrThrow({ where: { id: input.beat_id } });

    const record = await this.prisma.branchDecision.create({
      data: {
        user_id: input.user_id,
        persona_id: input.persona_id,
        beat_id: input.beat_id,
        decision_text: input.decision_text,
        consequences: input.consequences,
        correlation_id: input.correlation_id,
        reason_code: 'BRANCH_DECISION',
        rule_applied_id: 'CYR-NARR-002',
      },
    });

    await this.nats.publish(NATS_BRANCH_DECISION, {
      decision_id: record.id,
      beat_id: record.beat_id,
      user_id: record.user_id,
      persona_id: record.persona_id,
    });

    this.logger.log(
      `BranchDecision created: ${record.id} (beat=${record.beat_id}, user=${record.user_id})`,
    );

    return this.toDecisionRecord(record);
  }

  /** List all story beats for a user+persona, newest first. */
  async listBeatsForPersona(user_id: string, persona_id: string): Promise<StoryBeatRecord[]> {
    const records = await this.prisma.storyBeat.findMany({
      where: { user_id, persona_id },
      orderBy: { created_at: 'desc' },
    });
    return records.map((r) => this.toBeatRecord(r));
  }

  /** List all branch decisions for a beat. */
  async listDecisionsForBeat(beat_id: string): Promise<BranchDecisionRecord[]> {
    const records = await this.prisma.branchDecision.findMany({
      where: { beat_id },
      orderBy: { created_at: 'asc' },
    });
    return records.map((r) => this.toDecisionRecord(r));
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private toBeatRecord(r: {
    id: string;
    user_id: string;
    persona_id: string;
    beat_type: string;
    summary: string;
    created_at: Date;
  }): StoryBeatRecord {
    return {
      id: r.id,
      user_id: r.user_id,
      persona_id: r.persona_id,
      beat_type: r.beat_type as BeatType,
      summary: r.summary,
      created_at: r.created_at,
    };
  }

  private toDecisionRecord(r: {
    id: string;
    user_id: string;
    persona_id: string;
    beat_id: string;
    decision_text: string;
    consequences: unknown;
    created_at: Date;
  }): BranchDecisionRecord {
    return {
      id: r.id,
      user_id: r.user_id,
      persona_id: r.persona_id,
      beat_id: r.beat_id,
      decision_text: r.decision_text,
      consequences: r.consequences as Record<string, string>,
      created_at: r.created_at,
    };
  }
}
