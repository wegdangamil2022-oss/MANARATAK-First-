import { describe, expect, it } from 'vitest';
import { CountryImportPreviewService } from '../../src';

describe('CountryImportPreviewService', () => {
  it('maps the unified source fields and never permits database promotion', () => {
    const result = new CountryImportPreviewService().preview({
      sourceName: 'countries.xlsx',
      sourceVersion: 'sha256:test',
      records: [{
        name_ar: 'مصر', name_en: 'Egypt', official_name_en: 'Arab Republic of Egypt',
        iso_alpha2: 'EG', iso_alpha3: 'EGY', iso_numeric: '818', continent: 'Africa',
        subregion: 'Northern Africa', default_currency: 'EGP', default_language: 'ar',
        official_languages: 'ar', primary_timezone: 'Africa/Cairo', timezones: 'Africa/Cairo',
        calling_code: '+20', slug: 'egypt', public_id: 'ctry-EG',
        reference_review_status: 'UNREVIEWED', created_at: '2026-08-07', updated_at: '2026-08-08', reference_sources: 'ISO | IANA',
      }],
    });

    expect(result.totalRecords).toBe(1);
    expect(result.validRecords).toBe(1);
    expect(result.invalidRecords).toBe(0);
    expect(result.reviewRequiredRecords).toBe(1);
    expect(result.promotionAllowed).toBe(false);
    expect(result.databaseWrites).toBe(0);
    expect(result.promotionBlockers).toContain('DATABASE_RECOVERY_GATE_REQUIRED');
    expect(result.promotionBlockers).toContain('SOURCE_REVIEW_REQUIRED');
    expect(result.sample[0]).toMatchObject({
      iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt', sourcePublicId: 'ctry-EG',
      defaultCurrencyCode: 'EGP', defaultLanguageCode: 'ar',
    });
    expect(result.sample[0].metadata).toMatchObject({ sourceCreatedAt: '2026-08-07', sourceUpdatedAt: '2026-08-08' });
  });

  it('reports duplicate canonical keys and invalid records', () => {
    const result = new CountryImportPreviewService().preview({
      sourceName: 'countries.xlsx', sourceVersion: 'test',
      records: [
        { name_en: 'One', iso_alpha2: 'AA', iso_alpha3: 'AAA', public_id: 'ctry-AA', slug: 'one', continent: 'Test' },
        { name_en: 'Two', iso_alpha2: 'AA', iso_alpha3: 'AAA', public_id: 'ctry-AA', slug: 'one', continent: 'Test' },
        { name_en: '', iso_alpha2: 'B', iso_alpha3: 'BB', public_id: 'bad', slug: 'bad' },
      ],
    });

    expect(result.invalidRecords).toBe(1);
    expect(result.duplicateKeys.iso2).toEqual(['AA']);
    expect(result.duplicateKeys.iso3).toEqual(['AAA']);
    expect(result.promotionBlockers).toContain('DUPLICATE_CANONICAL_KEYS');
    expect(result.promotionBlockers).toContain('INVALID_SOURCE_RECORDS');
  });
});
