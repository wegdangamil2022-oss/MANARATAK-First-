import { describe, it, expect } from 'vitest';
import {
  referenceSection,
  referenceForm,
  referencePayload,
  referenceState,
  referenceStateParams,
  type ReferenceRow,
} from '../../src/features/reference-data/referenceWorkspaceModel';
const country: ReferenceRow = {
  id: 'canonical-1',
  name: 'Original',
  nameAr: 'أصل',
  iso2Code: 'YE',
  iso3Code: 'YEM',
  versionNumber: 7,
  lifecycleState: 'ACTIVE',
  defaultCurrencyCode: 'YER',
  defaultLanguageCode: 'ar',
  metadata: { source: 'retained' },
};
describe('reference workspace contracts', () => {
  it('keeps legacy section links and an explicit overview', () => {
    expect(referenceSection(new URLSearchParams('p7Tab=cities'))).toBe('cities');
    expect(referenceSection(new URLSearchParams())).toBe('home');
    expect(referenceSection(new URLSearchParams('section=quality&p7Tab=cities'))).toBe('quality');
  });
  it('rejects object prototype names as untrusted navigation values', () => {
    for (const section of ['constructor', 'toString', '__proto__'])
      expect(referenceSection(new URLSearchParams({ section }))).toBe('home');
  });
  it('round-trips each bounded filter without allowing an unbounded page', () => {
    const parsed = referenceState(
      new URLSearchParams(
        'p7Q=aden&p7Country=YE&p7Region=region-1&p7Page=2&p7MappingStatus=MAPPED',
      ),
    );
    expect(referenceState(referenceStateParams(parsed))).toEqual(parsed);
    expect(referenceState(new URLSearchParams('p7Page=Infinity')).page).toBe(1);
    expect(referenceState(new URLSearchParams('p7Page=1.5')).page).toBe(1);
  });
  it('preserves canonical identity, hidden Arabic values and version on a name edit', () => {
    const form = referenceForm(country, 'countries');
    const payload = referencePayload(
      'countries',
      { ...form, name: 'Updated', iso2Code: 'ZZ', iso3Code: 'ZZZ' },
      country,
    );
    expect(payload).toMatchObject({
      id: 'canonical-1',
      expectedVersion: 7,
      iso2Code: 'YE',
      iso3Code: 'YEM',
      nameAr: 'أصل',
      defaultCurrencyCode: 'YER',
    });
    expect(payload).not.toHaveProperty('metadata');
    expect(country.metadata).toEqual({ source: 'retained' });
  });
  it('keeps missing coordinates null and accepts valid boundary values', () => {
    const form = referenceForm(null, 'cities');
    expect(referencePayload('cities', form, null)).toMatchObject({
      latitude: null,
      longitude: null,
    });
    expect(
      referencePayload('cities', { ...form, latitude: '-90', longitude: '180' }, null),
    ).toMatchObject({ latitude: -90, longitude: 180 });
  });
  it('rejects invalid coordinates and currency precision before a command', () => {
    for (const value of ['NaN', '91', '-91'])
      expect(() =>
        referencePayload('cities', { ...referenceForm(null, 'cities'), latitude: value }, null),
      ).toThrow();
    for (const value of ['1.5', '5', '-1'])
      expect(() =>
        referencePayload(
          'currencies',
          { ...referenceForm(null, 'currencies'), minorUnit: value },
          null,
        ),
      ).toThrow();
  });
  it('does not let a city edit rewrite the stored country identity', () => {
    const row = { ...country, countryIso2Code: 'YE', administrativeRegionId: 'region-1' };
    expect(
      referencePayload('cities', { ...referenceForm(row, 'cities'), countryIso2Code: 'SA' }, row),
    ).toMatchObject({
      countryIso2Code: 'YE',
      administrativeRegionId: 'region-1',
      id: country.id,
      expectedVersion: 7,
    });
  });
});
