import { describe, expect, it, vi } from 'vitest';
import { RedisRateLimiter } from '../../src/security/RedisRateLimiter';

describe('RedisRateLimiter', () => {
  it('uses atomic Redis evaluation and returns distributed counter state', async () => {
    const evalMock = vi.fn().mockResolvedValue([3, 45_000]);
    const limiter = new RedisRateLimiter({ eval: evalMock }, 'test:', () => 1_000);

    await expect(limiter.consume('198.51.100.10', 5, 60_000)).resolves.toEqual({
      allowed: true,
      remaining: 2,
      resetTime: 46_000,
    });
    expect(evalMock).toHaveBeenCalledTimes(1);
    expect(evalMock.mock.calls[0][1]).toMatchObject({ arguments: ['60000'] });
    expect(limiter.isProductionReady).toBe(true);
    expect(limiter.kind).toBe('real');
  });

  it('denies when the shared Redis counter is over the limit', async () => {
    const limiter = new RedisRateLimiter({ eval: vi.fn().mockResolvedValue([6, 30_000]) }, 'test:', () => 5_000);
    await expect(limiter.consume('198.51.100.10', 5, 60_000)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      resetTime: 35_000,
    });
  });

  it('fails closed on malformed Redis responses', async () => {
    const limiter = new RedisRateLimiter({ eval: vi.fn().mockResolvedValue(null) });
    await expect(limiter.consume('client')).rejects.toThrow('RATE_LIMIT_REDIS_RESPONSE_INVALID');
  });
});
