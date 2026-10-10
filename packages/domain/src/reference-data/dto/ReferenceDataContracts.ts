import { ReferenceAliasInput, ReferenceLifecycleState, ReferenceProviderMappingInput } from '../governance/ReferenceGovernance';

export interface ReferenceDataFilters {
  updatedFrom?: string;
  mappingStatus?: 'MAPPED' | 'UNMAPPED';
  activeOnly?: boolean;
  nonActiveOnly?: boolean;
  region?: string;
  administrativeRegionId?: string;
  countryIso2Code?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export type ReferenceDataCollection = 'countries' | 'currencies' | 'languages' | 'regions' | 'cities';

export interface ReferenceDataPage<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReferenceCountryDto {
  id: string;
  iso2Code: string;
  iso3Code: string;
  name: string;
  nameAr?: string | null;
  officialName?: string | null;
  region?: string | null;
  subregion?: string | null;
  defaultCurrencyCode?: string | null;
  defaultLanguageCode?: string | null;
  callingCode?: string | null;
  flagAssetId?: string | null;
  /** Compatibility projection; lifecycleState is authoritative. */
  isActive: boolean;
  lifecycleState: ReferenceLifecycleState;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  aliases?: ReferenceAliasInput[];
  providerMappings?: ReferenceProviderMappingInput[];
  metadata?: Record<string, unknown>;
}

export interface UpsertReferenceCountryDto {
  /** Stable canonical record ID when editing; omit on create. */
  id?: string;
  /** Required on existing-record edits; enforced with a row-locked CAS. */
  expectedVersion?: number;
  iso2Code: string;
  iso3Code: string;
  name: string;
  nameAr?: string | null;
  officialName?: string | null;
  region?: string | null;
  subregion?: string | null;
  defaultCurrencyCode?: string | null;
  defaultLanguageCode?: string | null;
  callingCode?: string | null;
  flagAssetId?: string | null;
  /** @deprecated lifecycle transitions must use the lifecycle command. */
  isActive?: boolean;
  aliases?: ReferenceAliasInput[];
  providerMappings?: ReferenceProviderMappingInput[];
  metadata?: Record<string, unknown>;
}

export interface ReferenceCurrencyDto {
  id: string;
  isoCode: string;
  numericCode?: string | null;
  name: string;
  nameAr?: string | null;
  symbol?: string | null;
  minorUnit?: number | null;
  /** Compatibility projection; lifecycleState is authoritative. */
  isActive: boolean;
  lifecycleState: ReferenceLifecycleState;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  aliases?: ReferenceAliasInput[];
  providerMappings?: ReferenceProviderMappingInput[];
  metadata?: Record<string, unknown>;
}

export interface UpsertReferenceCurrencyDto {
  /** Stable canonical record ID when editing; omit on create. */
  id?: string;
  /** Required on existing-record edits; enforced with a row-locked CAS. */
  expectedVersion?: number;
  isoCode: string;
  numericCode?: string | null;
  name: string;
  nameAr?: string | null;
  symbol?: string | null;
  minorUnit?: number | null;
  /** @deprecated lifecycle transitions must use the lifecycle command. */
  isActive?: boolean;
  aliases?: ReferenceAliasInput[];
  providerMappings?: ReferenceProviderMappingInput[];
  metadata?: Record<string, unknown>;
}

export interface ReferenceLanguageDto {
  id: string;
  /** ISO 639 alpha-2/alpha-3 language code ONLY; not a BCP47 locale tag. */
  isoCode: string;
  name: string;
  nameAr?: string | null;
  nativeName?: string | null;
  direction: 'LTR' | 'RTL';
  /** Compatibility projection; lifecycleState is authoritative. */
  isActive: boolean;
  lifecycleState: ReferenceLifecycleState;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  aliases?: ReferenceAliasInput[];
  providerMappings?: ReferenceProviderMappingInput[];
  metadata?: Record<string, unknown>;
}

export interface UpsertReferenceLanguageDto {
  /** Stable canonical record ID when editing; omit on create. */
  id?: string;
  /** Required on existing-record edits; enforced with a row-locked CAS. */
  expectedVersion?: number;
  isoCode: string;
  name: string;
  nameAr?: string | null;
  nativeName?: string | null;
  direction: 'LTR' | 'RTL';
  /** @deprecated lifecycle transitions must use the lifecycle command. */
  isActive?: boolean;
  aliases?: ReferenceAliasInput[];
  providerMappings?: ReferenceProviderMappingInput[];
  metadata?: Record<string, unknown>;
}

export interface AdministrativeRegionDto {
  id: string;
  countryReferenceId?: string | null;
  countryIso2Code: string;
  regionCode: string;
  name: string;
  nameAr?: string | null;
  localName?: string | null;
  regionType?: string | null;
  lifecycleState: ReferenceLifecycleState;
  isActive: boolean;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  aliases?: ReferenceAliasInput[];
}

export interface UpsertAdministrativeRegionDto {
  /** Omit id/version to create; updates must carry both. Identity fields are immutable. */
  id?: string;
  expectedVersion?: number;
  countryIso2Code: string;
  regionCode: string;
  name: string;
  nameAr?: string | null;
  localName?: string | null;
  regionType?: string | null;
  aliases?: ReferenceAliasInput[];
}

export interface ReferenceCityDto {
  id: string;
  countryReferenceId?: string | null;
  countryIso2Code: string;
  name: string;
  nameAr?: string | null;
  region?: string | null;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Compatibility projection; lifecycleState is authoritative. */
  isActive: boolean;
  lifecycleState: ReferenceLifecycleState;
  versionNumber: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  aliases?: ReferenceAliasInput[];
  providerMappings?: ReferenceProviderMappingInput[];
  metadata?: Record<string, unknown>;
  administrativeRegionId?: string | null;
  administrativeRegion?: AdministrativeRegionDto | null;
}

export interface UpsertReferenceCityDto {
  /** Stable canonical record ID when editing; omit on create. */
  id?: string;
  /** Required on existing-record edits; enforced with a row-locked CAS. */
  expectedVersion?: number;
  /** Internal canonical P7 identity; callers normally supply countryIso2Code and the application layer resolves this. */
  countryReferenceId?: string | null;
  countryIso2Code: string;
  name: string;
  nameAr?: string | null;
  region?: string | null;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** @deprecated lifecycle transitions must use the lifecycle command. */
  isActive?: boolean;
  aliases?: ReferenceAliasInput[];
  providerMappings?: ReferenceProviderMappingInput[];
  metadata?: Record<string, unknown>;
  administrativeRegionId?: string | null;
}
