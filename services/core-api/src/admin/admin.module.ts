// services/core-api/src/admin/admin.module.ts
// CYR: Admin NestJS module — RBAC-gated admin dashboard surfaces.

import { Module } from '@nestjs/common';
import { AdminHouseModelController } from './admin-house-model.controller';
import { AuthModule } from '../auth/auth.module';
import { AdminSyntheticCuratorController } from './admin-synthetic-curator.controller';
import { CuratorService } from '../../../ai-twin/src/curator.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminHouseModelController, AdminSyntheticCuratorController],
  providers: [CuratorService],
})
export class AdminModule {}
