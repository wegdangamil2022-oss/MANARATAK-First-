import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
beforeEach(() => { vi.resetModules(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());
describe('M10-09 provider administration transport', () => {
  it('keeps review body, CSRF and idempotency identity through one session refresh', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { courseProviderRegistryApi: api } = await import('./courseProviders');
    let attempt = 0; let token = 0;
    vi.mocked(fetch).mockImplementation(async url => {
      if (String(url).endsWith('/auth/csrf-token')) return Response.json({ data: { csrfToken: 'csrf-' + ++token } });
      if (String(url).endsWith('/auth/refresh')) return Response.json({ data: { authenticated: true } });
      return ++attempt === 1 ? Response.json({ error: 'expired' }, { status: 401 }) : Response.json({ id: 'same-provider-id' });
    });
    const body = { expectedUpdatedAt: '2026-10-01T00:00:00.000Z', displayName: 'Provider', officialWebsite: null, aliases: [{ alias: 'Original label' }], allowedDomains: ['example.com'], mappingsReviewed: true as const, reason: 'Reviewed source', evidenceReference: 'review-1' };
    expect((await api.update('same-provider-id', body)).id).toBe('same-provider-id');
    const commands = vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'PUT');
    expect(commands).toHaveLength(2); expect(commands[0][1]?.body).toBe(commands[1][1]?.body); expect(JSON.parse(String(commands[0][1]?.body))).toEqual(body);
    const headers = commands.map(([, options]) => new Headers(options?.headers));
    expect(headers[0].get('Idempotency-Key')).toBeTruthy(); expect(headers[1].get('Idempotency-Key')).toBe(headers[0].get('Idempotency-Key'));
    expect(headers.map(item => item.get('X-CSRF-Token'))).toEqual(['csrf-1', 'csrf-2']);
  });
  it('uses the bounded list contract and treats unknown resolution as a review without a provider ID', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { courseProviderRegistryApi: api } = await import('./courseProviders');
    vi.mocked(fetch).mockImplementation(async url => String(url).endsWith('/auth/csrf-token') ? Response.json({ data: { csrfToken: 'csrf' } }) : String(url).includes('resolve-label') ? Response.json({ rawLabel: 'Unknown', state: 'REVIEW_REQUIRED', providerId: null }) : Response.json({ data: [{ id: 'later-provider' }], page: 2, pageSize: 50, total: 51, totalPages: 2 }));
    expect(await api.list({ page: 2, pageSize: 50, q: 'alias' })).toMatchObject({ page: 2, totalPages: 2 });
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('page=2&pageSize=50&q=alias');
    expect(await api.resolveLabel('Unknown')).toMatchObject({ state: 'REVIEW_REQUIRED', providerId: null });
  });
});
