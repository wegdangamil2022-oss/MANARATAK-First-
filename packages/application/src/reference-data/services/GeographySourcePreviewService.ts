export interface RegionSourceRecord extends Record<string, unknown> {
  regionId?: unknown; countryIso2?: unknown; regionCode?: unknown; nameEn?: unknown;
  nameAr?: unknown; localName?: unknown; regionType?: unknown; verificationStatus?: unknown;
}

export interface CitySourceRecord extends Record<string, unknown> {
  cityId?: unknown; countryIso2?: unknown; regionCode?: unknown; cityNameEn?: unknown;
  cityNameAr?: unknown; timezone?: unknown; latitude?: unknown; longitude?: unknown;
  regionMatchStatus?: unknown; verificationStatus?: unknown;
}

export interface GeographySourcePreview {
  mode: 'DRY_RUN'; databaseWrites: 0; promotionAllowed: false;
  regions: GeographySummary; cities: GeographySummary & { regionMatchStatuses: Record<string, number>; unmatchedRegionReferences: number; regionReviewRequired: number };
  countryCoverage: { canonicalCountries: number; regionCountries: number; cityCountries: number; regionOnlyCodes: string[]; cityOnlyCodes: string[]; canonicalWithoutRegions: string[]; canonicalWithoutCities: string[] };
  promotionBlockers: string[];
}

interface GeographySummary {
  total: number; valid: number; invalid: number; duplicateIdentities: string[];
  verificationStatuses: Record<string, number>;
}

export class GeographySourcePreviewService {
  public preview(input: { canonicalCountryIso2Codes: string[]; regions: RegionSourceRecord[]; cities: CitySourceRecord[] }): GeographySourcePreview {
    const canonical = new Set(input.canonicalCountryIso2Codes.map(value => value.toUpperCase()));
    const regionCountries = new Set(input.regions.map(row => this.text(row.countryIso2)?.toUpperCase()).filter(Boolean) as string[]);
    const cityCountries = new Set(input.cities.map(row => this.text(row.countryIso2)?.toUpperCase()).filter(Boolean) as string[]);
    const regionKeys = input.regions.map(row => `${this.text(row.countryIso2)?.toUpperCase() ?? ''}|${this.text(row.regionCode) ?? ''}`);
    const cityKeys = input.cities.map(row => this.text(row.cityId) ?? '');
    const regionSet = new Set(regionKeys);
    const unmatchedRegionReferences = input.cities.filter(row => {
      const code = this.text(row.regionCode);
      return Boolean(code) && !regionSet.has(`${this.text(row.countryIso2)?.toUpperCase() ?? ''}|${code}`);
    }).length;
    const acceptedRegionMatches = new Set(['MATCHED_BY_NORMALIZED_NAME', 'MATCHED_BY_CODE', 'MATCHED']);
    const regionReviewRequired = input.cities.filter(row => !acceptedRegionMatches.has(this.text(row.regionMatchStatus) ?? '')).length;
    const invalidRegions = input.regions.filter(row => !/^[A-Z]{2}$/.test(this.text(row.countryIso2)?.toUpperCase() ?? '') || !this.text(row.regionCode) || !this.text(row.nameEn)).length;
    const invalidCities = input.cities.filter(row => !/^[A-Z]{2}$/.test(this.text(row.countryIso2)?.toUpperCase() ?? '') || !this.text(row.cityId) || !this.text(row.cityNameEn)).length;

    return {
      mode: 'DRY_RUN', databaseWrites: 0, promotionAllowed: false,
      regions: {
        total: input.regions.length, valid: input.regions.length - invalidRegions, invalid: invalidRegions,
        duplicateIdentities: this.duplicates(regionKeys), verificationStatuses: this.count(input.regions, 'verificationStatus'),
      },
      cities: {
        total: input.cities.length, valid: input.cities.length - invalidCities, invalid: invalidCities,
        duplicateIdentities: this.duplicates(cityKeys), verificationStatuses: this.count(input.cities, 'verificationStatus'),
        regionMatchStatuses: this.count(input.cities, 'regionMatchStatus'), unmatchedRegionReferences, regionReviewRequired,
      },
      countryCoverage: {
        canonicalCountries: canonical.size, regionCountries: regionCountries.size, cityCountries: cityCountries.size,
        regionOnlyCodes: this.difference(regionCountries, canonical), cityOnlyCodes: this.difference(cityCountries, canonical),
        canonicalWithoutRegions: this.difference(canonical, regionCountries), canonicalWithoutCities: this.difference(canonical, cityCountries),
      },
      promotionBlockers: [
        'DATABASE_RECOVERY_GATE_REQUIRED', 'GEOGRAPHY_SOURCE_REVIEW_REQUIRED',
        ...(this.difference(regionCountries, canonical).length || this.difference(cityCountries, canonical).length ? ['COUNTRY_COVERAGE_RECONCILIATION_REQUIRED'] : []),
        ...(unmatchedRegionReferences ? ['CITY_REGION_RECONCILIATION_REQUIRED'] : []),
        ...(regionReviewRequired ? ['CITY_REGION_SEMANTIC_REVIEW_REQUIRED'] : []),
      ],
    };
  }

  private text(value: unknown): string | undefined { const result = String(value ?? '').trim(); return result || undefined; }
  private difference(left: Set<string>, right: Set<string>): string[] { return [...left].filter(value => !right.has(value)).sort(); }
  private duplicates(values: string[]): string[] { const counts = new Map<string, number>(); for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1); return [...counts].filter(([, count]) => count > 1).map(([value]) => value).sort(); }
  private count(rows: Array<Record<string, unknown>>, key: string): Record<string, number> { const result: Record<string, number> = {}; for (const row of rows) { const value = this.text(row[key]) ?? 'MISSING'; result[value] = (result[value] ?? 0) + 1; } return result; }
}
