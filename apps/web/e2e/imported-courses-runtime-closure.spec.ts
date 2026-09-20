import { expect, test } from '@playwright/test';

test.describe('WP-IC-10 imported-course runtime boundary', () => {
  test('keeps course import operations behind admin authentication', async ({ request }) => {
    for (const path of [
      '/api/v1/admin/imports/courses/overview',
      '/api/v1/admin/imports/courses/providers',
      '/api/v1/admin/imports/courses/review',
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'ADMIN_AUTH_REQUIRED' } });
    }
  });

  test('rejects unauthenticated provider continuation mutation', async ({ request }) => {
    const response = await request.post('/api/v1/admin/imports/courses/providers/wp-ic-10-smoke/connector/run', { data: {} });
    expect([401, 403, 423]).toContain(response.status());
  });

  test('keeps public liveness available while admin import routes stay private', async ({ request }) => {
    const liveness = await request.get('/api/v1/monitoring/health/liveness');
    expect(liveness.status()).toBe(200);
    await expect(liveness.json()).resolves.toMatchObject({ status: 'UP' });

    const admin = await request.get('/api/v1/admin/imports/courses/overview');
    expect(admin.status()).toBe(401);
  });
});
