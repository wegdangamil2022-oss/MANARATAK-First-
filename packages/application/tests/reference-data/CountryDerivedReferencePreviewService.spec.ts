import { describe, expect, it } from 'vitest';
import { CountryDerivedReferencePreviewService } from '../../src';

describe('CountryDerivedReferencePreviewService', () => {
  it('extracts unique currency and language candidates without authorizing promotion', () => {
    const result = new CountryDerivedReferencePreviewService().preview([
      {
        iso_alpha2: 'EG', default_currency: 'EGP', official_currencies: 'EGP',
        default_language: 'ar', official_languages: 'ar', local_languages: 'ar, en',
      },
      {
        iso_alpha2: 'US', default_currency: 'USD', official_currencies: 'USD',
        default_language: 'en', official_languages: 'en, es', local_languages: 'en, es',
      },
    ]);

    expect(result.currencies.map(item => item.code)).toEqual(['EGP', 'USD']);
    expect(result.languages.map(item => item.code)).toEqual(['ar', 'en', 'es']);
    expect(result.languages.find(item => item.code === 'ar')?.suggestedDirection).toBe('RTL');
    expect(result.languages.find(item => item.code === 'en')?.countryIso2Codes).toEqual(['EG', 'US']);
    expect(result.promotionAllowed).toBe(false);
    expect(result.databaseWrites).toBe(0);
    expect(result.promotionBlockers).toContain('AUTHORITATIVE_CURRENCY_ENRICHMENT_REQUIRED');
    expect(result.promotionBlockers).toContain('AUTHORITATIVE_LANGUAGE_ENRICHMENT_REQUIRED');
  });
});
