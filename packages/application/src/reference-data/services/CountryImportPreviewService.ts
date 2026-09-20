import type { UpsertReferenceCountryDto } from '@manaratak/domain';
import { ReferenceDataImportHandoffService } from './ReferenceDataImportHandoffService';

export interface CountrySourceRecord extends Record<string, unknown> {
  name_ar?: unknown;
  name_en?: unknown;
  official_name_ar?: unknown;
  official_name_en?: unknown;
  local_name?: unknown;
  iso_alpha2?: unknown;
  iso_alpha3?: unknown;
  iso_numeric?: unknown;
  continent?: unknown;
  region?: unknown;
  subregion?: unknown;
  capital?: unknown;
  default_currency?: unknown;
  official_currencies?: unknown;
  calling_code?: unknown;
  default_language?: unknown;
  official_languages?: unknown;
  local_languages?: unknown;
  primary_timezone?: unknown;
  timezones?: unknown;
  flag?: unknown;
  slug?: unknown;
  public_id?: unknown;
  reference_review_status?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  source_audit_date?: unknown;
  reference_sources?: unknown;
  notes?: unknown;
}

export interface CountryImportPreview {
  mode: 'DRY_RUN';
  databaseWrites: 0;
  source: { name: string; version: string; sha256?: string };
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  reviewRequiredRecords: number;
  duplicateKeys: Record<'iso2' | 'iso3' | 'publicId' | 'slug', string[]>;
  promotionAllowed: false;
  promotionBlockers: string[];
  issueCounts: Record<string, number>;
  sample: Array<UpsertReferenceCountryDto & { sourcePublicId?: string; reviewStatus?: string }>;
}

export function mapCountrySourceRecord(source: CountrySourceRecord): UpsertReferenceCountryDto {
  const reviewStatus = countryText(source.reference_review_status)?.toUpperCase() ?? 'UNREVIEWED';
  return {
    iso2Code: countryText(source.iso_alpha2)?.toUpperCase() ?? '',
    iso3Code: countryText(source.iso_alpha3)?.toUpperCase() ?? '',
    name: countryText(source.name_en) ?? '',
    officialName: countryText(source.official_name_en) ?? null,
    region: countryText(source.continent) ?? countryText(source.region) ?? null,
    subregion: countryText(source.subregion) ?? null,
    defaultCurrencyCode: countryText(source.default_currency)?.toUpperCase() ?? null,
    defaultLanguageCode: countryText(source.default_language)?.toLowerCase() ?? null,
    callingCode: countryText(source.calling_code) ?? null,
    isActive: reviewStatus !== 'INACTIVE',
    metadata: {
      nameAr: countryText(source.name_ar),
      officialNameAr: countryText(source.official_name_ar),
      localName: countryText(source.local_name),
      isoNumeric: countryText(source.iso_numeric),
      sourceRegion: countryText(source.region),
      capital: countryText(source.capital),
      officialCurrencies: countryList(source.official_currencies),
      officialLanguages: countryList(source.official_languages),
      localLanguages: countryList(source.local_languages),
      primaryTimezone: countryText(source.primary_timezone),
      timezones: countryList(source.timezones),
      flag: countryText(source.flag),
      slug: countryText(source.slug),
      publicId: countryText(source.public_id),
      referenceReviewStatus: reviewStatus,
      sourceCreatedAt: countryText(source.created_at),
      sourceUpdatedAt: countryText(source.updated_at),
      sourceAuditDate: countryText(source.source_audit_date),
      referenceSources: countryList(source.reference_sources, '|'),
      notes: countryText(source.notes),
    },
  };
}

function countryText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function countryList(value: unknown, separator = ','): string[] {
  return String(value ?? '').split(separator).map(item => item.trim()).filter(Boolean);
}

export class CountryImportPreviewService {
  constructor(private readonly handoff = new ReferenceDataImportHandoffService()) {}

  public preview(input: {
    sourceName: string;
    sourceVersion: string;
    sha256?: string;
    records: CountrySourceRecord[];
  }): CountryImportPreview {
    const mapped = input.records.map(mapCountrySourceRecord);
    const batch = this.handoff.prepareSeedBatch({
      seedBatchId: `country-preview:${input.sha256 ?? input.sourceVersion}`,
      sourceName: input.sourceName,
      sourceVersion: input.sourceVersion,
      entityType: 'COUNTRY',
      records: mapped,
    });
    const duplicateKeys = {
      iso2: this.duplicates(mapped.map(record => record.iso2Code)),
      iso3: this.duplicates(mapped.map(record => record.iso3Code)),
      publicId: this.duplicates(mapped.map(record => String(record.metadata?.publicId ?? ''))),
      slug: this.duplicates(mapped.map(record => String(record.metadata?.slug ?? ''))),
    };
    const reviewRequiredRecords = mapped.filter(record => record.metadata?.referenceReviewStatus !== 'REVIEWED').length;
    const promotionBlockers: string[] = ['DATABASE_RECOVERY_GATE_REQUIRED'];
    if (batch.validationSummary?.invalidRecords) promotionBlockers.push('INVALID_SOURCE_RECORDS');
    if (Object.values(duplicateKeys).some(values => values.length > 0)) promotionBlockers.push('DUPLICATE_CANONICAL_KEYS');
    if (reviewRequiredRecords > 0) promotionBlockers.push('SOURCE_REVIEW_REQUIRED');

    const issueCounts: Record<string, number> = {};
    for (const record of batch.records) {
      for (const issue of record.validationReport?.issues ?? []) {
        issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
      }
    }

    return {
      mode: 'DRY_RUN',
      databaseWrites: 0,
      source: { name: input.sourceName, version: input.sourceVersion, sha256: input.sha256 },
      totalRecords: mapped.length,
      validRecords: batch.validationSummary?.validRecords ?? 0,
      invalidRecords: batch.validationSummary?.invalidRecords ?? mapped.length,
      reviewRequiredRecords,
      duplicateKeys,
      promotionAllowed: false,
      promotionBlockers,
      issueCounts,
      sample: mapped.slice(0, 10).map(record => ({
        ...record,
        sourcePublicId: String(record.metadata?.publicId ?? '') || undefined,
        reviewStatus: String(record.metadata?.referenceReviewStatus ?? '') || undefined,
      })),
    };
  }

  private duplicates(values: string[]): string[] {
    const counts = new Map<string, number>();
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
  }
}
