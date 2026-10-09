import { describe, expect, it } from 'vitest';
import { normalizeReferenceIdentityToken, normalizeReferenceSearchToken, referenceCityScopeKey } from '../../src/reference-data/governance/ReferenceIdentityNormalization';

describe('P7 Unicode reference identities', () => {
  it.each(['北京','上海','广州','Москва','Санкт-Петербург','München','Zürich','Αθήνα','東京','서울','กรุงเทพมหานคร','दिल्ली','თბილისი'])(
    'does not erase %s', value => expect(normalizeReferenceIdentityToken(value).length).toBeGreaterThan(0),
  );
  it('keeps country and region qualifiers in the SHA input to disambiguate shared city names', () => {
    const base = { countryIso2Code: 'US', name: 'Springfield' };
    expect(referenceCityScopeKey({ ...base, region: 'Illinois' }))
      .not.toBe(referenceCityScopeKey({ ...base, region: 'Missouri' }));
    expect(referenceCityScopeKey({ ...base, region: 'Illinois' }))
      .not.toBe(referenceCityScopeKey({ ...base, countryIso2Code: 'AU', region: 'Illinois' }));
    expect(referenceCityScopeKey({ ...base, name: 'Ｓpringfield', region: 'Illinois' }))
      .toBe(referenceCityScopeKey({ ...base, region: 'Illinois' }));
  });
  it('normalizes compatible forms but keeps distinct scripts, accents and Arabic marks', () => {
    expect(normalizeReferenceIdentityToken('Ｍünchen')).toBe(normalizeReferenceIdentityToken('München'));
    expect(normalizeReferenceIdentityToken('東京')).not.toBe(normalizeReferenceIdentityToken('北京'));
    expect(normalizeReferenceIdentityToken('مدِينة')).not.toBe(normalizeReferenceIdentityToken('مدينة'));
    expect(normalizeReferenceSearchToken('München')).toBe(normalizeReferenceSearchToken('Munchen'));
  });
});
