import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import type { Sql } from 'postgres';

import { DATABASE_CLIENT } from '../database/database.module';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(DATABASE_CLIENT) private readonly db: Sql,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([(): Promise<HealthIndicatorResult> => this.pingDatabase()]);
  }

  private async pingDatabase(): Promise<HealthIndicatorResult> {
    await this.db`select 1`;
    return { database: { status: 'up' } };
  }
}
