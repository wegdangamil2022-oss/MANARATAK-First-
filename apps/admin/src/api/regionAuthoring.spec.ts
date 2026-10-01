import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferenceLifecycleState } from '@manaratak/domain';
beforeEach(() => { vi.resetModules(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

describe('M10-07 region admin transport and picker freshness', () => {
  it('uses CSRF and idempotency for create, edit and lifecycle; accepts an empty 204', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { referenceDataAdminApi: api } = await import('./referenceData');
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).endsWith('/auth/csrf-token')) return Response.json({ data: { csrfToken: 'region-session-csrf' } });
      if (String(url).endsWith('/lifecycle')) return new Response(null, { status: 204 });
      return Response.json({ id: 'region-1', versionNumber: 1 });
    });
    const body = { countryIso2Code: 'YE', regionCode: 'YE-AD', name: 'Aden' };
    await api.saveRegion(body, { idempotencyKey: 'region-create' });
    await api.saveRegion({ ...body, id: 'region-1', expectedVersion: 1 }, { idempotencyKey: 'region-edit' });
    await expect(api.transitionRegion('region-1', { toState: ReferenceLifecycleState.DEPRECATED, expectedVersion: 2, reason: 'source replaced' }, { idempotencyKey: 'region-deprecate' })).resolves.toBeUndefined();
    const commands = vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST' || options?.method === 'PUT');
    expect(commands.map(([url]) => String(url))).toEqual(['/api/v1/admin/reference-data/regions', '/api/v1/admin/reference-data/regions/region-1', '/api/v1/admin/reference-data/governance/REGION/region-1/lifecycle']);
    expect(commands.map(([, options]) => new Headers(options?.headers).get('Idempotency-Key'))).toEqual(['region-create', 'region-edit', 'region-deprecate']);
    for (const [, options] of commands) { expect(new Headers(options?.headers).get('X-CSRF-Token')).toBe('region-session-csrf'); expect(options?.credentials).toBe('include'); }
    expect(JSON.parse(String(commands[0][1]?.body))).not.toHaveProperty('id');
    expect(JSON.parse(String(commands[1][1]?.body))).toEqual({ ...body, expectedVersion: 1 });
  });
  it('reflects committed create/edit in the chooser and blocks deprecated records while keeping their IDs', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { referenceDataAdminApi: api } = await import('./referenceData');
    const { canonicalPickerApi, canonicalOptionIsSelectable } = await import('./canonicalPickers');
    let record: Record<string, unknown> | null = null;
    vi.mocked(fetch).mockImplementation(async (url, options) => {
      const path = String(url);
      if (path.endsWith('/auth/csrf-token')) return Response.json({ data: { csrfToken: 'csrf' } });
      if (options?.method === 'POST' && !path.endsWith('/lifecycle')) { record = { ...JSON.parse(String(options.body)), id: 'region-1', lifecycleState: 'ACTIVE', versionNumber: 1 }; return Response.json(record); }
      if (options?.method === 'PUT') { record = { ...record, ...JSON.parse(String(options.body)), versionNumber: 2 }; return Response.json(record); }
      if (path.endsWith('/lifecycle')) { record = { ...record, lifecycleState: 'DEPRECATED', isActive: false }; return new Response(null, { status: 204 }); }
      const params = new URL(path, 'https://fixture.invalid').searchParams;
      expect(params.get('countryIso2Code')).toBe('YE');
      return Response.json({ data: record ? [record] : [], page: 1, pageSize: 100, total: record ? 1 : 0, totalPages: record ? 1 : 0 });
    });
    expect(await canonicalPickerApi.regions('YE')).toEqual([]);
    await api.saveRegion({ countryIso2Code: 'YE', regionCode: 'YE-AD', name: 'Aden' });
    const created = await canonicalPickerApi.regions('YE'); expect(created[0].id).toBe('region-1'); expect(canonicalOptionIsSelectable(created[0])).toBe(true);
    await api.saveRegion({ id: 'region-1', expectedVersion: 1, countryIso2Code: 'YE', regionCode: 'YE-AD', name: 'Aden Governorate' });
    expect((await canonicalPickerApi.regions('YE'))[0].label).toBe('Aden Governorate');
    await api.transitionRegion('region-1', { expectedVersion: 2, toState: ReferenceLifecycleState.DEPRECATED, reason: 'source changed' });
    const deprecated = await canonicalPickerApi.regions('YE'); expect(deprecated[0].id).toBe('region-1'); expect(canonicalOptionIsSelectable(deprecated[0])).toBe(false);
  });
  it('retries region update once after refresh using the same version, body and semantic key', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { referenceDataAdminApi: api } = await import('./referenceData');
    let token = 0; let writes = 0;
    vi.mocked(fetch).mockImplementation(async url => {
      if (String(url).endsWith('/auth/csrf-token')) return Response.json({ data: { csrfToken: 'session-' + ++token } });
      if (String(url).endsWith('/auth/refresh')) return Response.json({ data: { authenticated: true } });
      return ++writes === 1 ? Response.json({ error: 'expired' }, { status: 401 }) : Response.json({ id: 'region-1' });
    });
    await api.saveRegion({ id: 'region-1', expectedVersion: 4, countryIso2Code: 'YE', regionCode: 'YE-AD', name: 'Aden' }, { idempotencyKey: 'same-region-command' });
    const commands = vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'PUT');
    expect(commands).toHaveLength(2); expect(commands[0][1]?.body).toBe(commands[1][1]?.body);
    expect(commands.map(([, options]) => new Headers(options?.headers).get('Idempotency-Key'))).toEqual(['same-region-command', 'same-region-command']);
    expect(commands.map(([, options]) => new Headers(options?.headers).get('X-CSRF-Token'))).toEqual(['session-1', 'session-2']);
  });
});
