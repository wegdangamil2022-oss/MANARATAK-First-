import { IRateLimiter, IRateLimitResult } from '@manaratak/core';

export interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class DefaultRateLimiter implements IRateLimiter {
  public readonly isProductionReady: boolean = false;
  public readonly kind = 'process-local' as const;
  public readonly capabilityStatus = 'DEVELOPMENT_ONLY' as const;
  private hits = new Map<string, RateLimitRecord>();

  /**
   * Consumes a request token for a given client key.
   *
   * @param key Client identifier (e.g. IP address)
   * @param limit Maximum allowed requests in windowMs (default: 100)
   * @param windowMs Time window in milliseconds (default: 60000)
   */
  async consume(
    key: string,
    limit: number = 100,
    windowMs: number = 60000
  ): Promise<IRateLimitResult> {
    const now = Date.now();
    const clientKey = key || 'unknown';

    // Prune expired records if map grows large
    if (this.hits.size > 1000) {
      for (const [k, record] of this.hits.entries()) {
        if (now >= record.resetTime) {
          this.hits.delete(k);
        }
      }
    }

    const record = this.hits.get(clientKey);

    if (!record || now >= record.resetTime) {
      const resetTime = now + windowMs;
      const allowed = limit > 0;
      const count = 1;

      this.hits.set(clientKey, { count, resetTime });

      return {
        allowed,
        remaining: allowed ? Math.max(0, limit - count) : 0,
        resetTime,
      };
    }

    if (record.count < limit) {
      record.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, limit - record.count),
        resetTime: record.resetTime,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  /**
   * Resets rate limit records for a specific key or all keys.
   */
  reset(key?: string): void {
    if (key) {
      this.hits.delete(key);
    } else {
      this.hits.clear();
    }
  }

  [key: string]: any;
  static [key: string]: any;
}
