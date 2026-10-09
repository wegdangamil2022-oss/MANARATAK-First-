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
  /** Historical identity is retained; consumers explicitly decide whether to follow. */
  replacement?: {
    relationshipType: 'SUPERSEDED_BY' | 'MERGED_INTO';
    targetReferenceId: string;
  };
}

export interface IReferenceResolver {
  resolveCountry(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
  resolveRegion(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
  resolveCity(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
  resolveLanguage(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
  resolveCurrency(lookup: ReferenceLookup): Promise<CanonicalReference | null>;
}
