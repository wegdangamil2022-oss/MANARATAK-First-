import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

describe('ReferenceData admin transport', () => {
  it('routes all four saves and both previews through session CSRF and idempotency', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { referenceDataAdminApi: api } = await import('./referenceData');
    vi.mocked(fetch).mockImplementation(async (url) => String(url).endsWith('/auth/csrf-token')
      ? Response.json({ data: { csrfToken: 'session-bound-token' } }) : Response.json({ saved: true }));
    await api.saveCountry({ iso2Code: 'YE', iso3Code: 'YEM', name: 'Yemen' });
    await api.saveCurrency({ isoCode: 'YER', name: 'Rial' });
    await api.saveLanguage({ isoCode: 'ar', name: 'Arabic', direction: 'RTL' });
    await api.saveCity({ countryIso2Code: 'YE', name: 'Aden' });
    await api.previewCountries({ sourceName: 'fixture.xlsx', sourceVersion: '1', records: [{ iso_alpha2: 'YE' }] });
    await api.previewDerivedReferences([{ iso_alpha2: 'YE' }]);
    const commands = vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method !== 'GET');
    expect(commands).toHaveLength(6);
    const keys = new Set<string>();
    for (const [, options] of commands) {
      const headers = new Headers(options?.headers);
      expect(headers.get('X-CSRF-Token')).toBe('session-bound-token');
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Idempotency-Key')).toBeTruthy(); keys.add(headers.get('Idempotency-Key')!);
      expect(options?.credentials).toBe('include');
    }
    expect(keys.size).toBe(6);
    expect(JSON.parse(String(commands[0][1]?.body))).not.toHaveProperty('iso2Code');
    expect(JSON.parse(String(commands[1][1]?.body))).not.toHaveProperty('isoCode');
    expect(JSON.parse(String(commands[2][1]?.body))).not.toHaveProperty('isoCode');
    expect(String(commands[3][0])).toBe('/api/v1/admin/reference-data/cities');
  });

  it('preserves the command key when a rejected CSRF token is renewed once', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { referenceDataAdminApi: api } = await import('./referenceData');
    let token = 0; let attempt = 0;
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).endsWith('/auth/csrf-token')) return Response.json({ data: { csrfToken: `csrf-${++token}` } });
      return ++attempt === 1 ? Response.json({ error: { code: 'CSRF_TOKEN_INVALID' } }, { status: 403 }) : Response.json({ saved: true });
    });
    await api.saveCountry({ iso2Code: 'YE', iso3Code: 'YEM', name: 'Yemen' }, { idempotencyKey: 'same-country-command' });
    const commands = vi.mocked(fetch).mock.calls.filter(([, opts]) => opts?.method === 'PUT');
    expect(commands).toHaveLength(2);
    expect(commands.map(([, opts]) => new Headers(opts?.headers).get('Idempotency-Key'))).toEqual(['same-country-command', 'same-country-command']);
    expect(commands.map(([, opts]) => new Headers(opts?.headers).get('X-CSRF-Token'))).toEqual(['csrf-1', 'csrf-2']);
  });

  it('loads reference picker options beyond the first page with the same scoped filter', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { canonicalPickerApi, canonicalOptionIsSelectable } = await import('./canonicalPickers');
    vi.mocked(fetch).mockImplementation(async (url) => {
      const parsed = new URL(String(url), 'https://fixture.invalid'); const page = Number(parsed.searchParams.get('page'));
      expect(parsed.searchParams.get('pageSize')).toBe('50'); expect(parsed.searchParams.get('countryIso2Code')).toBe('YE');
      expect(parsed.searchParams.get('activeOnly')).toBe('false');
      return Response.json({ data: [{ id: `city-${page}`, name: `City ${page}`, countryIso2Code: 'YE', lifecycleState: page === 1 ? 'ARCHIVED' : 'ACTIVE' }], page, pageSize: 100, total: 101, totalPages: 2 });
    });
    const options = [...await canonicalPickerApi.cities('YE', null, '', 1), ...await canonicalPickerApi.cities('YE', null, '', 2)];
    expect(options.map((item) => item.id)).toEqual(['city-1', 'city-2']);
    expect(canonicalOptionIsSelectable(options[0])).toBe(false); expect(canonicalOptionIsSelectable(options[1])).toBe(true);
  });

  it('renews session CSRF after a 401 refresh while preserving the command identity and caller headers', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    let token = 0; let attempt = 0;
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).endsWith('/auth/csrf-token')) return Response.json({ data: { csrfToken: `session-${++token}` } });
      if (String(url).endsWith('/auth/refresh')) return Response.json({ data: { authenticated: true } });
      return ++attempt === 1 ? Response.json({ error: { message: 'Expired' } }, { status: 401 }) : Response.json({ saved: true });
    });
    const body = JSON.stringify({ name: 'Yemen', iso3Code: 'YEM' });
    await adminApiClient.request('/admin/reference-data/countries/YE', { method: 'PUT', body, idempotencyKey: 'command-refresh', headers: { 'X-Correlation-ID': 'trace-refresh' } });
    const commands = vi.mocked(fetch).mock.calls.filter(([, opts]) => opts?.method === 'PUT');
    expect(commands).toHaveLength(2);
    expect(commands.map(([, opts]) => new Headers(opts?.headers).get('X-CSRF-Token'))).toEqual(['session-1', 'session-2']);
    for (const [, opts] of commands) {
      expect(new Headers(opts?.headers).get('Idempotency-Key')).toBe('command-refresh');
      expect(new Headers(opts?.headers).get('X-Correlation-ID')).toBe('trace-refresh'); expect(opts?.body).toBe(body);
    }
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('uses bounded pages for all StudyDestination language options, including page 3', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { listAllReferenceData } = await import('./referenceData');
    vi.mocked(fetch).mockImplementation(async (url) => {
      const p = new URL(String(url), 'https://fixture.invalid').searchParams; const page = Number(p.get('page'));
      expect(p.get('pageSize')).toBe('100');
      return Response.json({ data: [{ id: `language-${page}` }], total: 260, page, pageSize: 100, totalPages: 3 });
    });
    expect(await listAllReferenceData('languages')).toEqual([{ id: 'language-1' }, { id: 'language-2' }, { id: 'language-3' }]);
  });

  it('fails visibly on a malformed page instead of returning incomplete options', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { listAllReferenceData } = await import('./referenceData');
    vi.mocked(fetch).mockResolvedValue(Response.json({ data: [], page: 1, pageSize: 100, total: 200, totalPages: 2 }));
    await expect(listAllReferenceData('languages')).rejects.toThrow('PAGINATION_RESPONSE_INVALID');
  });
});
