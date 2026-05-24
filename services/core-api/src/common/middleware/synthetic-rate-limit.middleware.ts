// services/core-api/src/common/middleware/synthetic-rate-limit.middleware.ts
// In-memory rate limiter: 5 synthetic generation requests per user per hour.
// Replace memoryStore with Redis in production via REDIS_URL env var.

import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

const MAX_REQUESTS_PER_HOUR = 5;
const WINDOW_MS = 3_600_000; // 1 hour

type RateLimitEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, RateLimitEntry>();

function incrementMemoryCounter(key: string): number {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

@Injectable()
export class SyntheticRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SyntheticRateLimitMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction): void {
    const userId =
      (req as Request & { user?: { sub?: string } }).user?.sub ?? req.ip ?? 'anonymous';

    const key = `synthetic-rate:${userId}`;
    const count = incrementMemoryCounter(key);

    this.logger.log(`SyntheticRateLimit: user=${userId}, count=${count}/${MAX_REQUESTS_PER_HOUR}`);

    if (count > MAX_REQUESTS_PER_HOUR) {
      throw new HttpException(
        `Safe Synthetic Twin generation is limited to ${MAX_REQUESTS_PER_HOUR} requests per hour.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
