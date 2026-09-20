import { describe, expect, it, vi } from 'vitest';
import { RedisStudentWorkspaceDeliveryCache } from '../../src/students/RedisStudentWorkspaceDeliveryCache';
import { RedisCmsDeliveryCache } from '../../src/cms/RedisCmsDeliveryCache';

function client() {
  return {
    isReady: true,
    buildKey: (feature: string, key: string) => `tenant:${feature}:${key}`,
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    publish: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
  };
}

describe('Phase 15/16 distributed delivery cache isolation', () => {
  it('partitions student dashboard keys and realtime channels by authenticated student', async () => {
    const redis = client();
    const cache = new RedisStudentWorkspaceDeliveryCache(redis);
    await cache.invalidate('student/one', 'layout-reset');
    await cache.invalidate('student/two', 'layout-reset');

    expect(redis.del.mock.calls[0][0]).not.toBe(redis.del.mock.calls[1][0]);
    expect(redis.publish.mock.calls[0][0]).not.toBe(redis.publish.mock.calls[1][0]);
    expect(redis.del.mock.calls[0][0]).toContain('student%2Fone');
  });

  it('partitions CMS delivery generations by site', async () => {
    const redis = client();
    const cache = new RedisCmsDeliveryCache(redis);
    await cache.invalidateSite('site-a', 'publish');
    await cache.invalidateSite('site-b', 'publish');

    expect(redis.incr.mock.calls[0][0]).not.toBe(redis.incr.mock.calls[1][0]);
    expect(redis.publish.mock.calls[0][0]).not.toBe(redis.publish.mock.calls[1][0]);
  });

  it('fails open when Redis is unavailable', async () => {
    const redis = { ...client(), isReady: false };
    const cache = new RedisStudentWorkspaceDeliveryCache(redis);
    await expect(cache.getDashboard('student-1')).resolves.toBeNull();
    await expect(cache.invalidate('student-1', 'update')).resolves.toBeUndefined();
    expect(redis.get).not.toHaveBeenCalled();
  });
});
