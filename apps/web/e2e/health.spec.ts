import { expect, test } from '@playwright/test';

test.describe('MANARATAK source-level runtime smoke checks', () => {
  test('renders the public web application', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page).toHaveTitle(/MANARATAK|منارتك/i);
  });

  test('reports API liveness from the running application', async ({ request }) => {
    const response = await request.get('/api/v1/monitoring/health/liveness');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('UP');
  });

  test('reports readiness truthfully when dependencies are unavailable', async ({ request }) => {
    const response = await request.get('/api/v1/monitoring/health/readiness');

    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(['UP', 'DEGRADED', 'DOWN']).toContain(body.status);
    expect(body).toHaveProperty('details');
  });

  test('serves a safe public API read', async ({ request }) => {
    const response = await request.get('/api/v1/auth/csrf-token');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
  });

  test('rejects unauthenticated admin reads and mutations', async ({ request }) => {
    const readResponse = await request.get('/api/v1/admin/universities');
    expect(readResponse.status()).toBe(401);
    await expect(readResponse.json()).resolves.toMatchObject({ error: { code: 'ADMIN_AUTH_REQUIRED' } });

    const mutationResponse = await request.post('/api/v1/admin/universities', {
      data: { displayName: 'E2E must never create this university' },
    });
    // CSRF protection runs before the admin guard for JSON mutations, so a
    // source-only unauthenticated request may safely be rejected with 403.
    expect([401, 403, 423]).toContain(mutationResponse.status());
    const mutationBody = await mutationResponse.json();
    if (mutationResponse.status() === 401) {
      expect(mutationBody).toMatchObject({ error: { code: 'ADMIN_AUTH_REQUIRED' } });
    } else if (mutationResponse.status() === 403) {
      expect(mutationBody).toMatchObject({ error: { code: 'CSRF_TOKEN_INVALID' } });
    } else {
      expect(mutationBody).toMatchObject({ error: 'READ_ONLY_PREVIEW' });
    }
  });
});
