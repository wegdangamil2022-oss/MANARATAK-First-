export type CanonicalReferenceType = 'COUNTRY' | 'REGION' | 'CITY' | 'LANGUAGE' | 'CURRENCY';

export interface ReferenceLookup {
  id?: string;
  standardCode?: string;
  providerSystem?: string;
  providerId?: string;
  alias?: string;
  normalizedAlias?: string;
}

export type ReferenceResolutionMethod = 'EXACT_ID' | 'EXACT_STANDARD_CODE' | 'PROVIDER_MAPPING' | 'NORMALIZED_ALIAS';

export interface CanonicalReference {
  id: string;
  type: CanonicalReferenceType;
  standardCode?: string;
  active: boolean | null;
  resolutionMethod?: ReferenceResolutionMethod;
}

export interface IReferenceResolver {
  resolveCountry(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
  resolveRegion(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
  resolveCity(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
  resolveLanguage(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
  resolveCurrency(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
}
