import { HealthStatus, HealthCheckResult } from '@manaratak/core';
import { RedisClientFactory } from '../redis/RedisClientFactory';

export class RedisHealthChecker {
  constructor(private client?: any) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    const checkedAt = new Date().toISOString();

    if (!this.client) {
      return {
        status: HealthStatus.DEGRADED,
        timestamp: checkedAt,
        error: 'Redis client instance not initialized',
        details: { redis: 'disconnected', optional: true }
      };
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Redis health check timed out after 2000ms'));
        }, 2000);
        if (typeof timer === 'object' && 'unref' in timer) {
          (timer as any).unref();
        }
      });

      let queryPromise: Promise<any>;
      if (typeof this.client.ping === 'function') {
        queryPromise = this.client.ping();
      } else if (typeof this.client.checkHealth === 'function') {
        queryPromise = this.client.checkHealth();
      } else {
        throw new Error('Redis client lacks ping capability');
      }

      const response = await Promise.race([queryPromise, timeoutPromise]);
      if (typeof this.client.ping === 'function' && response !== 'PONG') {
        throw new Error('Redis ping returned an unexpected response');
      }
      const latencyMs = Date.now() - start;

      return {
        status: HealthStatus.UP,
        timestamp: checkedAt,
        details: { redis: 'connected', capabilityStatus: 'AVAILABLE', latencyMs }
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const rawErrorMsg = err?.message || String(err);
      const safeErrorMsg = RedisClientFactory.sanitizeMessage(rawErrorMsg);

      return {
        status: HealthStatus.DEGRADED,
        timestamp: checkedAt,
        error: safeErrorMsg,
        details: { redis: 'disconnected', capabilityStatus: 'UNAVAILABLE', latencyMs, optional: true }
      };
    }
  }
}
