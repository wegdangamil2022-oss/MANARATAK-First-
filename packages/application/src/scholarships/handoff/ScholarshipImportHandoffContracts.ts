import type {
  ScholarshipCompletenessState,
  ScholarshipImportPayload,
  UniversalImportHandoff,
} from '@manaratak/domain';
import type { ScholarshipCanonicalResolutionResult } from '../resolution';

export type ScholarshipImportStagingState =
  | 'STAGED_COMPLETE'
  | 'STAGED_NEEDS_REVIEW'
  | 'STAGED_INCOMPLETE';

export interface ScholarshipImportHandoffEvidence {
  handoffId: string;
  artifact: UniversalImportHandoff['artifact'];
  provenance: UniversalImportHandoff['provenance'];
  execution: UniversalImportHandoff['execution'];
  validation: UniversalImportHandoff['validation'];
  correlationId?: string;
  referenceMetadata?: UniversalImportHandoff['referenceMetadata'];
}

export interface ScholarshipNameScreeningResult {
  rawSourceTitle: string;
  normalizedSourceTitle: string;
  displayName: string;
  cleanedScholarshipName: string;
  detectedYear: string | null;
  sourceAliases: string[];
  extracted: {
    fundingTypeCode: 'FULLY_FUNDED' | 'PARTIALLY_FUNDED' | null;
    degreeLevelLabels: Array<'BACHELOR' | 'MASTER' | 'DOCTORATE'>;
    removedPhrases: string[];
  };
}

export interface ScholarshipCompletenessScreeningResult {
  state: ScholarshipCompletenessState;
  missingFields: string[];
  identityMissingFields: string[];
  coreMissingFields: string[];
  optionalMissingFields: string[];
  missingCount: number;
  identityReady: boolean;
}

export type ScholarshipDuplicateScreeningState =
  | 'NOT_CHECKED'
  | 'NEW'
  | 'DUPLICATE'
  | 'UPDATE'
  | 'COLLISION_REVIEW';

export interface ScholarshipDuplicateScreeningMatch {
  id: string;
  publicId?: string | null;
  displayName?: string | null;
  canonicalDedupKey?: string | null;
  sourceImportRecordId?: string | null;
  countryReferenceId?: string | null;
  countrySourceLabel?: string | null;
  officialSourceUrl?: string | null;
}

export interface ScholarshipDedupeScreeningResult {
  duplicateKey: string;
  providerKey: string;
  yearOrNoYear: string;
  state: ScholarshipDuplicateScreeningState;
  matches: ScholarshipDuplicateScreeningMatch[];
  requiresReview: boolean;
  reason: string;
}

export interface ScholarshipImportStagingCandidate {
  stagingKey: string;
  stageState: ScholarshipImportStagingState;
  normalizedPayload: ScholarshipImportPayload;
  nameScreening: ScholarshipNameScreeningResult;
  completeness: ScholarshipCompletenessScreeningResult;
  dedupe: ScholarshipDedupeScreeningResult;
  canonicalScreening: ScholarshipCanonicalResolutionResult[];
  evidence: ScholarshipImportHandoffEvidence;
}

/**
 * Read-only semantic screening hook. Implementations may resolve existing
 * canonical references, but must not create or mutate canonical entities.
 */
export interface IScholarshipHandoffCanonicalScreening {
  screen(payload: ScholarshipImportPayload): Promise<ScholarshipCanonicalResolutionResult[]>;
}

/** Read-only lookup for the approved WP12-5 duplicate key. */
export interface IScholarshipHandoffDuplicateLookup {
  findMatchesByDedupKey(key: string): Promise<readonly ScholarshipDuplicateScreeningMatch[]>;
}
