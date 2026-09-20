import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisHealthChecker } from '@manaratak/infrastructure';
import { HealthStatus } from '@manaratak/core';

describe('RedisHealthChecker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('reports unavailable if client is not provided', async () => {
    const checker = new RedisHealthChecker(undefined);
    const result = await checker.checkHealth();
    expect(result.status).toBe(HealthStatus.DEGRADED);
    expect(result.error).toContain('Redis client instance not initialized');
  });

  it('fails if fake {} client cannot pass health', async () => {
    const checker = new RedisHealthChecker({});
    const result = await checker.checkHealth();
    expect(result.status).toBe(HealthStatus.DEGRADED);
    expect(result.error).toContain('Redis client lacks ping capability');
  });

  it('reports healthy if ping succeeds', async () => {
    const fakeClient = { ping: vi.fn().mockResolvedValue('PONG') };
    const checker = new RedisHealthChecker(fakeClient);
    const result = await checker.checkHealth();
    expect(result.status).toBe(HealthStatus.UP);
  });

  it('health timeout works', async () => {
    const fakeClient = {
      ping: () => new Promise(resolve => setTimeout(() => resolve('PONG'), 3000))
    };
    const checker = new RedisHealthChecker(fakeClient);

    const promise = checker.checkHealth();
    vi.advanceTimersByTime(2500); // Trigger timeout
    const result = await promise;

    expect(result.status).toBe(HealthStatus.DEGRADED);
    expect(result.error).toContain('timed out');
  });

  it('sanitizes secret URLs in health check error messages', async () => {
    const fakeClient = {
      ping: vi.fn().mockRejectedValue(new Error('Connection failed to redis://:secretpass123@redis.prod:6379'))
    };
    const checker = new RedisHealthChecker(fakeClient);
    const result = await checker.checkHealth();
    expect(result.status).toBe(HealthStatus.DEGRADED);
    expect(result.error).not.toContain('secretpass123');
    expect(result.error).toContain('***');
  });
});
