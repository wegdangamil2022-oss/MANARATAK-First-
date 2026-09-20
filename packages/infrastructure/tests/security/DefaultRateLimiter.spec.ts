import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DefaultRateLimiter } from '../../src/security/DefaultRateLimiter';

describe('DefaultRateLimiter', () => {
  let rateLimiter: DefaultRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    rateLimiter = new DefaultRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests before reaching the limit and returns accurate remaining and resetTime', async () => {
    const limit = 3;
    const windowMs = 60000;
    const key = '192.168.1.1';

    const res1 = await rateLimiter.consume(key, limit, windowMs);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);
    expect(res1.resetTime).toBeGreaterThan(Date.now());

    const res2 = await rateLimiter.consume(key, limit, windowMs);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await rateLimiter.consume(key, limit, windowMs);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('blocks requests after exceeding the limit', async () => {
    const limit = 2;
    const windowMs = 60000;
    const key = '192.168.1.1';

    await rateLimiter.consume(key, limit, windowMs); // 1 remaining
    await rateLimiter.consume(key, limit, windowMs); // 0 remaining

    const blockedRes = await rateLimiter.consume(key, limit, windowMs);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });

  it('tracks request counts separately per client key', async () => {
    const limit = 1;
    const windowMs = 60000;
    const clientA = '10.0.0.1';
    const clientB = '10.0.0.2';

    // Client A consumes limit
    const resA1 = await rateLimiter.consume(clientA, limit, windowMs);
    expect(resA1.allowed).toBe(true);

    const resA2 = await rateLimiter.consume(clientA, limit, windowMs);
    expect(resA2.allowed).toBe(false);

    // Client B should still be allowed
    const resB1 = await rateLimiter.consume(clientB, limit, windowMs);
    expect(resB1.allowed).toBe(true);
    expect(resB1.remaining).toBe(0);
  });

  it('resets the window after windowMs has passed', async () => {
    const limit = 2;
    const windowMs = 30000;
    const key = '172.16.0.1';

    await rateLimiter.consume(key, limit, windowMs);
    await rateLimiter.consume(key, limit, windowMs);
    const blockedRes = await rateLimiter.consume(key, limit, windowMs);
    expect(blockedRes.allowed).toBe(false);

    // Fast-forward time past windowMs
    vi.advanceTimersByTime(30001);

    const resAfterReset = await rateLimiter.consume(key, limit, windowMs);
    expect(resAfterReset.allowed).toBe(true);
    expect(resAfterReset.remaining).toBe(1);
  });

  it('allows manual reset of rate limit key', async () => {
    const limit = 1;
    const windowMs = 60000;
    const key = '10.0.0.5';

    await rateLimiter.consume(key, limit, windowMs);
    expect((await rateLimiter.consume(key, limit, windowMs)).allowed).toBe(false);

    rateLimiter.reset(key);

    const resAfterReset = await rateLimiter.consume(key, limit, windowMs);
    expect(resAfterReset.allowed).toBe(true);
  });
});
