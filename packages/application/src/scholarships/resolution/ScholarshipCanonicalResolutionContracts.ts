export type ScholarshipCanonicalResolutionState =
  | 'RESOLVED'
  | 'UNRESOLVED'
  | 'REVIEW_REQUIRED'
  | 'AMBIGUOUS'
  | 'NOT_APPLICABLE';

export type ScholarshipCanonicalResolutionTarget =
  | 'PROVIDER_UNIVERSITY'
  | 'UNIVERSITY'
  | 'ACADEMIC_PROGRAM'
  | 'COUNTRY'
  | 'LANGUAGE'
  | 'CURRENCY'
  | 'DEGREE_LEVEL'
  | 'MAJOR'
  | 'INTERNATIONAL_TEST';

export type ScholarshipCanonicalResolutionMethod =
  | 'EXACT_CANONICAL_ID'
  | 'EXACT_PUBLIC_ID'
  | 'EXACT_STANDARD_CODE'
  | 'EXACT_CANONICAL_NAME'
  | 'EXACT_ALIAS'
  | 'EXACT_ABBREVIATION'
  | 'NOT_APPLICABLE';

export type ScholarshipProviderKind = 'UNIVERSITY' | 'NON_UNIVERSITY' | 'UNKNOWN';

export interface ScholarshipCanonicalResolutionRequest {
  target: ScholarshipCanonicalResolutionTarget;
  rawValue?: string | null;
  /**
   * For University/Major/InternationalTest this is the existing public identity.
   * For AcademicProgram, Reference Data and DegreeLevel it is the existing internal canonical id.
   */
  canonicalId?: string | null;
  standardCode?: string | null;
  optional?: boolean;
  providerKind?: ScholarshipProviderKind;
}

export interface ScholarshipCanonicalCandidate {
  target: Exclude<ScholarshipCanonicalResolutionTarget, 'PROVIDER_UNIVERSITY'>;
  id: string;
  publicId?: string | null;
  standardCode?: string | null;
  canonicalName: string;
  displayName?: string | null;
  ownerId?: string | null;
  lifecycle?: string | null;
  method: Exclude<ScholarshipCanonicalResolutionMethod, 'NOT_APPLICABLE'>;
}

export interface ScholarshipCanonicalResolutionResult {
  target: ScholarshipCanonicalResolutionTarget;
  state: ScholarshipCanonicalResolutionState;
  rawValue: string | null;
  requestedCanonicalId: string | null;
  requestedStandardCode: string | null;
  canonicalReferenceId: string | null;
  canonicalPublicId: string | null;
  canonicalStandardCode: string | null;
  canonicalName: string | null;
  method: ScholarshipCanonicalResolutionMethod | null;
  candidates: ScholarshipCanonicalCandidate[];
  reason: string;
}

export interface ScholarshipCanonicalResolutionBundle {
  providerUniversity?: ScholarshipCanonicalResolutionResult;
  country?: ScholarshipCanonicalResolutionResult;
  language?: ScholarshipCanonicalResolutionResult;
  currency?: ScholarshipCanonicalResolutionResult;
  degreeLevels: ScholarshipCanonicalResolutionResult[];
  majors: ScholarshipCanonicalResolutionResult[];
  internationalTests: ScholarshipCanonicalResolutionResult[];
  universities: ScholarshipCanonicalResolutionResult[];
  academicPrograms: ScholarshipCanonicalResolutionResult[];
}
