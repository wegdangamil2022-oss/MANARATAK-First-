import { createHash } from 'node:crypto';
import { IRateLimiter, IRateLimitResult } from '@manaratak/core';

export interface RedisRateLimiterClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
}

const FIXED_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

/**
 * Production-capable distributed fixed-window rate limiter.
 * Atomic INCR + PEXPIRE execution is performed inside Redis so all API instances
 * observe the same counter for a client/window.
 */
export class RedisRateLimiter implements IRateLimiter {
  public readonly isProductionReady = true;
  public readonly kind = 'real' as const;
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE' as const;

  constructor(
    private readonly client: RedisRateLimiterClient,
    private readonly keyPrefix = 'manaratak:rate-limit:',
    private readonly now: () => number = Date.now,
  ) {}

  async consume(key: string, limit = 100, windowMs = 60_000): Promise<IRateLimitResult> {
    if (!Number.isSafeInteger(limit) || limit <= 0) {
      throw new Error('RATE_LIMIT_MAX_INVALID');
    }
    if (!Number.isSafeInteger(windowMs) || windowMs <= 0) {
      throw new Error('RATE_LIMIT_WINDOW_INVALID');
    }

    const normalizedKey = key?.trim() || 'unknown';
    const hashedKey = createHash('sha256').update(normalizedKey).digest('hex');
    const redisKey = `${this.keyPrefix}${hashedKey}`;
    const raw = await this.client.eval(FIXED_WINDOW_SCRIPT, {
      keys: [redisKey],
      arguments: [String(windowMs)],
    });

    if (!Array.isArray(raw) || raw.length < 2) {
      throw new Error('RATE_LIMIT_REDIS_RESPONSE_INVALID');
    }

    const count = Number(raw[0]);
    const ttl = Number(raw[1]);
    if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
      throw new Error('RATE_LIMIT_REDIS_RESPONSE_INVALID');
    }

    const effectiveTtl = ttl > 0 ? ttl : windowMs;
    const allowed = count <= limit;
    return {
      allowed,
      remaining: allowed ? Math.max(0, limit - count) : 0,
      resetTime: this.now() + effectiveTtl,
    };
  }
}
