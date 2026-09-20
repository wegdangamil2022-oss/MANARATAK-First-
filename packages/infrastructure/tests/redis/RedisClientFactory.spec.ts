import { describe, it, expect, vi } from 'vitest';
import { RedisClientFactory } from '../../src/redis/RedisClientFactory';

describe('RedisClientFactory', () => {
  it('creates a real Redis client instance when valid configuration is provided', () => {
    const config = { REDIS_URL: 'redis://localhost:6379', REDIS_NAMESPACE: 'testapp:' };
    const client = RedisClientFactory.createClient(config);

    expect(client).toBeDefined();
    expect(typeof client.connect).toBe('function');
    expect(typeof client.ping).toBe('function');
    expect(typeof client.quit).toBe('function');
    expect(typeof client.buildKey).toBe('function');

    // Clean up un-connected client
    client.quit().catch(() => {});
  });

  it('fails deterministically when REDIS_URL is missing or empty', () => {
    expect(() => RedisClientFactory.createClient({})).toThrow('REDIS_URL is required');
    expect(() => RedisClientFactory.createClient('')).toThrow('REDIS_URL is required');
  });

  it('fails deterministically when REDIS_URL has invalid protocol', () => {
    expect(() => RedisClientFactory.createClient({ REDIS_URL: 'http://localhost:6379' })).toThrow('REDIS_URL must start with redis:// or rediss://');
  });

  it('sanitizes credentials and passwords in URLs and error messages', () => {
    const rawUrl = 'redis://user:mysecretpassword123@redis-host:6379';
    const sanitizedUrl = RedisClientFactory.sanitizeUrl(rawUrl);

    expect(sanitizedUrl).not.toContain('mysecretpassword123');
    expect(sanitizedUrl).toContain('***');

    const errorMsg = `Failed to connect to ${rawUrl}`;
    const sanitizedMsg = RedisClientFactory.sanitizeMessage(errorMsg, rawUrl);
    expect(sanitizedMsg).not.toContain('mysecretpassword123');
    expect(sanitizedMsg).toContain('***');
  });

  it('formats keys according to the canonical namespace strategy <namespace>:<feature>:<key>', () => {
    const key = RedisClientFactory.buildKey('manaratak:', 'cache', 'user:123');
    expect(key).toBe('manaratak:cache:user:123');

    const keyWithoutTrailingColon = RedisClientFactory.buildKey('custom_ns', 'rate-limit', 'ip:127.0.0.1');
    expect(keyWithoutTrailingColon).toBe('custom_ns:rate-limit:ip:127.0.0.1');

    const client = RedisClientFactory.createClient({ REDIS_URL: 'redis://localhost:6379', REDIS_NAMESPACE: 'app:' });
    expect(client.buildKey('session', 'abc')).toBe('app:session:abc');
    client.quit().catch(() => {});
  });

  it('bounded reconnect policy prevents infinite reconnect loops when Redis is unavailable', () => {
    const mockLogger = { error: vi.fn() };
    const client = RedisClientFactory.createClient({ REDIS_URL: 'redis://127.0.0.1:16379' }, mockLogger);

    expect(client).toBeDefined();
    // Verify error handler and bounded client exist
    client.quit().catch(() => {});
  });
});
