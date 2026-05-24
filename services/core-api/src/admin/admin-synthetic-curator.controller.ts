// services/core-api/src/admin/admin-synthetic-curator.controller.ts
// ADMIN-triggered Safe Synthetic curator sync endpoint.

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Logger,
  Post,
} from '@nestjs/common';
import { CuratorService } from '../../../ai-twin/src/curator.service';
import { RbacGuard, RbacRole } from '../auth/rbac.guard';

class TriggerCuratorDto {
  names?: string[];
  source?: string;
}

const DEFAULT_CURATOR_NAMES = ['Scarlett Johansson', 'Tom Cruise', 'Zendaya', 'Keanu Reeves'];

@Controller('admin/ai-twin/curator')
export class AdminSyntheticCuratorController {
  private readonly logger = new Logger(AdminSyntheticCuratorController.name);
  private readonly RULE_ID = 'ADMIN_SYNTHETIC_CURATOR_v1';

  constructor(
    private readonly rbac: RbacGuard,
    private readonly curatorService: CuratorService,
  ) {}

  @Post('trigger')
  async trigger(
    @Headers('x-actor-id') actorId: string | undefined,
    @Headers('x-actor-role') actorRole: string | undefined,
    @Body() body: TriggerCuratorDto,
  ) {
    if (!actorId || !actorRole) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'x-actor-id and x-actor-role headers are required.',
        reason_code: 'NO_ACTOR_CONTEXT',
        rule_applied_id: this.RULE_ID,
      });
    }

    const decision = this.rbac.check({
      actor_id: actorId,
      actor_role: actorRole as RbacRole,
      permission: 'house-model:manage',
    });

    if (!decision.permitted) {
      this.logger.warn('AdminSyntheticCuratorController.trigger: denied', {
        actor_id: actorId,
        actor_role: actorRole,
        reason: decision.failure_reason,
        rule_applied_id: this.RULE_ID,
      });
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'house-model:manage requires ADMIN role.',
        reason_code: decision.failure_reason ?? 'INSUFFICIENT_ROLE',
        rule_applied_id: this.RULE_ID,
      });
    }

    const names =
      Array.isArray(body?.names) && body.names.length > 0 ? body.names : DEFAULT_CURATOR_NAMES;
    const source = body?.source?.trim() ? body.source.trim() : 'manual-admin-trigger';

    this.logger.log('AdminSyntheticCuratorController.trigger: starting curator run', {
      actor_id: actorId,
      names_count: names.length,
      source,
      rule_applied_id: this.RULE_ID,
    });

    const result = await this.curatorService.refreshGallery();
    return result;
  }
}
