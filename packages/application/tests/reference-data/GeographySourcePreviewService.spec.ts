import { describe, expect, it } from 'vitest';
import { GeographySourcePreviewService } from '../../src';

describe('GeographySourcePreviewService', () => {
  it('reports country and city-region reconciliation without database writes', () => {
    const result = new GeographySourcePreviewService().preview({
      canonicalCountryIso2Codes: ['EG', 'US'],
      regions: [{ countryIso2: 'EG', regionCode: 'EG-C', nameEn: 'Cairo', verificationStatus: 'IMPORTED' }],
      cities: [
        { cityId: 'city-1', countryIso2: 'EG', regionCode: 'EG-C', cityNameEn: 'Cairo', verificationStatus: 'REVIEW', regionMatchStatus: 'MATCHED' },
        { cityId: 'city-2', countryIso2: 'XK', regionCode: 'XK-1', cityNameEn: 'Pristina', verificationStatus: 'REVIEW', regionMatchStatus: 'UNMATCHED' },
      ],
    });

    expect(result.databaseWrites).toBe(0);
    expect(result.promotionAllowed).toBe(false);
    expect(result.countryCoverage.cityOnlyCodes).toEqual(['XK']);
    expect(result.countryCoverage.canonicalWithoutRegions).toEqual(['US']);
    expect(result.cities.unmatchedRegionReferences).toBe(1);
    expect(result.cities.regionReviewRequired).toBe(1);
    expect(result.promotionBlockers).toContain('COUNTRY_COVERAGE_RECONCILIATION_REQUIRED');
    expect(result.promotionBlockers).toContain('CITY_REGION_RECONCILIATION_REQUIRED');
    expect(result.promotionBlockers).toContain('CITY_REGION_SEMANTIC_REVIEW_REQUIRED');
  });
});
