import { describe, expect, it } from 'vitest';
import { normalizeReferenceIdentityToken, normalizeReferenceSearchToken } from '../../src/reference-data/governance/ReferenceIdentityNormalization';

describe('P7 Unicode reference identities', () => {
  it.each(['北京','上海','广州','Москва','Санкт-Петербург','München','Zürich','Αθήνα','東京','서울','กรุงเทพมหานคร','दिल्ली','თბილისი'])(
    'does not erase %s', value => expect(normalizeReferenceIdentityToken(value).length).toBeGreaterThan(0),
  );
  it('normalizes compatible forms but keeps distinct scripts, accents and Arabic marks', () => {
    expect(normalizeReferenceIdentityToken('Ｍünchen')).toBe(normalizeReferenceIdentityToken('München'));
    expect(normalizeReferenceIdentityToken('東京')).not.toBe(normalizeReferenceIdentityToken('北京'));
    expect(normalizeReferenceIdentityToken('مدِينة')).not.toBe(normalizeReferenceIdentityToken('مدينة'));
    expect(normalizeReferenceSearchToken('München')).toBe(normalizeReferenceSearchToken('Munchen'));
  });
});
