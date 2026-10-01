import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

describe('M10-08 scoped city selection (source only)', () => {
  it('never requests unscoped city/region options while country identity is unavailable', async () => {
    const { canonicalPickerApi } = await import('./canonicalPickers');
    expect(await canonicalPickerApi.cities()).toEqual([]);
    expect(await canonicalPickerApi.regions()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retains exact country/region scope across pages and stable IDs after a fresh session read', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { canonicalPickerApi } = await import('./canonicalPickers');
    const regionId = '11111111-1111-4111-8111-111111111111';
    vi.mocked(fetch).mockImplementation(async (url) => {
      const params = new URL(String(url), 'https://fixture.invalid').searchParams;
      expect(params.get('countryIso2Code')).toBe('YE');
      expect(params.get('administrativeRegionId')).toBe(regionId);
      const page = Number(params.get('page'));
      return Response.json({ data: [{ id: `city-${page}`, name: 'Same name', countryIso2Code: 'YE', administrativeRegionId: regionId, region: 'Original region', lifecycleState: 'ACTIVE' }], page, pageSize: 100, totalPages: 2, total: 101 });
    });
    const first = await canonicalPickerApi.cities('YE', regionId);
    adminApiClient.clearSecuritySession(); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const refreshed = await canonicalPickerApi.cities('YE', regionId);
    expect(first.map(item => item.id)).toEqual(['city-1', 'city-2']);
    expect(refreshed).toEqual(first); expect(fetch).toHaveBeenCalledTimes(4);
    expect(first[1].metadata).toMatchObject({ administrativeRegionId: regionId, rawRegionLabel: 'Original region' });
  });

  it('supports optional country-only scope and preserves raw region text separately in the city command', async () => {
    const { adminApiClient } = await import('./client'); adminApiClient.setAdminAuthStatus('AUTHORIZED');
    const { canonicalPickerApi } = await import('./canonicalPickers');
    vi.mocked(fetch).mockImplementation(async (url) => {
      expect(new URL(String(url), 'https://fixture.invalid').searchParams.has('administrativeRegionId')).toBe(false);
      return Response.json({ data: [], page: 1, pageSize: 100, totalPages: 0, total: 0 });
    });
    await canonicalPickerApi.cities('YE', null);
    vi.mocked(fetch).mockImplementation(async (url) => String(url).endsWith('/auth/csrf-token')
      ? Response.json({ data: { csrfToken: 'session-csrf' } }) : Response.json({ id: 'city-id' }));
    const { referenceDataAdminApi } = await import('./referenceData');
    const regionId = '11111111-1111-4111-8111-111111111111';
    await referenceDataAdminApi.saveCity({ name: 'Aden', countryIso2Code: 'YE', administrativeRegionId: regionId, region: 'Original source region' });
    const command = vi.mocked(fetch).mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(JSON.parse(String(command?.[1]?.body))).toEqual({ name: 'Aden', countryIso2Code: 'YE', administrativeRegionId: regionId, region: 'Original source region' });
    expect(new Headers(command?.[1]?.headers).get('X-CSRF-Token')).toBe('session-csrf');
  });

  it('routes identical names to explicit review and excludes inactive candidates without replacing source text', async () => {
    const { reviewCityLabel } = await import('./citySelection');
    const options = [
      { id: 'a', label: 'Aden', lifecycle: 'ACTIVE' },
      { id: 'b', label: 'عدن', lifecycle: 'ACTIVE', metadata: { name: 'ADEN' } },
      { id: 'inactive', label: 'Aden', lifecycle: 'ARCHIVED' },
    ];
    const result = reviewCityLabel('  Aden  ', options);
    expect(result).toEqual({ state: 'AMBIGUOUS_REVIEW_REQUIRED', candidateIds: ['a', 'b'], rawLabel: '  Aden  ' });
    expect(result).not.toHaveProperty('cityReferenceId');
    expect(reviewCityLabel('Aden', options.slice(0, 1)).state).toBe('EXPLICIT_SELECTION_REQUIRED');
    expect(reviewCityLabel('Adan', options).state).toBe('UNMATCHED_REVIEW_REQUIRED');
  });
});
