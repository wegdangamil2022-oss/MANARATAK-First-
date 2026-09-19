import { adminApiClient } from './client';

export type ScholarshipImportOperationalClass =
  | 'REAL'
  | 'TEST'
  | 'DEMO'
  | 'ARCHIVED'
  | 'UNCLASSIFIED';

export type ScholarshipImportDuplicateState =
  | 'NOT_CHECKED'
  | 'NEW'
  | 'DUPLICATE'
  | 'UPDATE'
  | 'COLLISION_REVIEW';

export type ScholarshipImportReviewAction = 'MERGE' | 'KEEP_CURRENT' | 'SPLIT';
export type ScholarshipImportVerificationState = 'PENDING' | 'VERIFIED' | 'FAILED';
export type ScholarshipCanonicalTarget =
  | 'PROVIDER_UNIVERSITY'
  | 'UNIVERSITY'
  | 'ACADEMIC_PROGRAM'
  | 'COUNTRY'
  | 'LANGUAGE'
  | 'CURRENCY'
  | 'DEGREE_LEVEL'
  | 'MAJOR'
  | 'INTERNATIONAL_TEST';

export type ScholarshipSourceType =
  | 'SCHOLARSHIP_WEBSITE'
  | 'GOVERNMENT_SCHOLARSHIP_PORTAL'
  | 'FOUNDATION_DONOR_PORTAL'
  | 'AGGREGATOR'
  | 'MANUAL_FILE';

export type ScholarshipAcquisitionMode = 'WEBSITE' | 'SITEMAP' | 'FEED' | 'API' | 'MANUAL_FILE';
export type ScholarshipSourceStatus = 'ACTIVE' | 'DISABLED' | 'NOT_CONFIGURED';
export type ScholarshipRegistrySourceStatus = 'ACTIVE' | 'NEEDS_REVIEW' | 'DISABLED' | 'BLOCKED';

export interface ScholarshipImportCenterRecordView {
  id: string;
  batchId: string;
  sourceSystem: string;
  sourceRowNumber: number | null;
  importStatus: string;
  operationalClass: ScholarshipImportOperationalClass;
  rawPayload: unknown;
  screeningOrigin: 'PERSISTED_HANDOFF' | 'LEGACY_RECOMPUTED' | 'NOT_AVAILABLE';
  parseState: 'VALID' | 'INVALID';
  parseIssues: string[];
  rawSourceTitle: string | null;
  cleanedScholarshipName: string | null;
  sourceAliases: string[];
  completeness: {
    state: 'INCOMPLETE' | 'NEEDS_REVIEW' | 'COMPLETE' | 'NOT_AVAILABLE';
    missingFields: string[];
    identityMissingFields: string[];
    coreMissingFields: string[];
    optionalMissingFields: string[];
    identityReady: boolean;
  };
  dedupe: {
    duplicateKey: string | null;
    state: ScholarshipImportDuplicateState;
    matchIds: string[];
    requiresReview: boolean;
  };
  verification: {
    state: ScholarshipImportVerificationState;
    sourceTraceable: boolean;
  };
  canonical: {
    state: 'NOT_EXECUTED' | 'CLEAR' | 'REVIEW_REQUIRED';
    unresolvedCount: number;
    ambiguousCount: number;
    reviewRequiredCount: number;
  };
  reviewReasons: string[];
  readyToTransfer: boolean;
  transferred: boolean;
  promotedEntityId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ScholarshipImportCenterOverview {
  operationalClass: ScholarshipImportOperationalClass;
  totalIncoming: number;
  newRecords: number;
  duplicateRecords: number;
  updateRecords: number;
  incomplete: number;
  conflicts: number;
  needsReview: number;
  readyToTransfer: number;
  failedProcessing: number;
  transferred: number;
  countsExact: boolean;
  scanTruncated: boolean;
  scannedRecords: number;
  sourceTotal: number;
  capabilities: {
    reviewDecisionPersistence: 'CONFIGURED' | 'NOT_CONFIGURED';
    atomicTransfer: 'CONFIGURED' | 'NOT_CONFIGURED';
    sourceRegistryRuntime: 'PENDING_RUNTIME';
  };
}

export interface ScholarshipSourceRegistryItem {
  sourceId: string;
  displayName: string;
  baseUrl: string;
  category: string;
  status: ScholarshipRegistrySourceStatus;
  accessClassification: string;
  connectorId: string;
  connectorVersion: string;
  rateLimitPerMinute: number | null;
  metadata: Record<string, unknown>;
}

export interface ScholarshipObservedSourceStatistic {
  sourceSystem: string;
  batches: number;
  totalRecords: number;
  lastBatchAt: string | null;
}

export interface ScholarshipImportCenterSources {
  registryState: 'AUTHORITATIVE_SCHOLARSHIP_SOURCE_REGISTRY' | 'NOT_CONFIGURED';
  sourceRegistryRuntime: 'PENDING_RUNTIME';
  completeRegistry: boolean;
  sources: ScholarshipSourceRegistryItem[];
  observedStatistics: ScholarshipObservedSourceStatistic[];
}

export interface ScholarshipImportCenterRecordList {
  data: ScholarshipImportCenterRecordView[];
  sourceTotal: number;
  filteredTotal: number;
  page: number;
  pageSize: number;
  countsExact: boolean;
  scanTruncated: boolean;
  scannedRecords: number;
}

export interface ScholarshipImportHistoryEvent {
  recordId: string;
  eventType:
    | 'STAGED_RECORD'
    | 'VERIFICATION_DECISION'
    | 'CANONICAL_RESOLUTION_DECISION'
    | 'REVIEW_DECISION'
    | 'TRANSFER_RECEIPT';
  occurredAt: string;
  data: Record<string, unknown>;
}

export interface ScholarshipImportCenterScanResult {
  data: ScholarshipImportCenterRecordView[];
  countsExact: boolean;
  scanTruncated: boolean;
  scannedRecords: number;
  sourceTotal: number;
  events?: ScholarshipImportHistoryEvent[];
}

export interface ScholarshipImportCenterDiff {
  recordId: string;
  duplicateKey: string | null;
  existingScholarshipId: string | null;
  fields: Array<{
    field: string;
    currentValue: unknown;
    incomingValue: unknown;
    state: 'ADDITION' | 'NO_CHANGE' | 'CONFLICT' | 'MISSING_IN_IMPORT';
  }>;
  mutationPerformed: false;
}

export interface ScholarshipImportCenterMergeProposal {
  recordId: string;
  duplicateKey: string | null;
  duplicateState: ScholarshipImportDuplicateState;
  requiresReview: boolean;
  suggestedActions: ScholarshipImportReviewAction[];
  diff: ScholarshipImportCenterDiff;
  automaticMergePerformed: false;
}

export interface ScholarshipSourceCreateInput {
  sourceId: string;
  sourceName: string;
  baseUrl?: string;
  sourceType: ScholarshipSourceType;
  status: ScholarshipSourceStatus;
  acquisitionMode: ScholarshipAcquisitionMode;
  allowedUrlScope?: {
    allowedOrigins: string[];
    allowedPathPrefixes?: string[];
    allowSubdomains?: boolean;
  };
  rateLimitPolicy?: {
    requestsPerMinute: number;
    burstLimit?: number;
    minimumDelayMs?: number;
  };
  lastExecution: { state: 'NEVER_RUN' };
}

export interface ScholarshipSourceRegistrationPlan {
  source: {
    sourceId: string;
    displayName: string;
    baseUrl: string;
    category: string;
    accessClassification: string;
    status: string;
    connectorId: string;
    connectorVersion: string;
    rateLimitPerMinute?: number;
    metadata?: Record<string, unknown>;
  };
  rawSnapshotRequiredBeforeSemanticTransform: true;
  phase6UrlAllowListRequired: true;
  liveConnectorProof: 'PENDING_RUNTIME';
}

export interface ScholarshipImportNewRequest {
  sourceId: string;
  targetUrl?: string;
  parserHint?: 'json' | 'ndjson' | 'csv';
  structuredContent?: unknown;
  fileName?: string;
  contentType?: string;
  approvedAssetReference?: string;
}

export type ScholarshipImportNewResult =
  | {
      state: 'STAGED';
      snapshot: {
        artifactId: string;
        rawArtifactReference: string;
        contentHash: string;
        byteSize: number;
        storedAt: string;
      };
      staging: unknown;
    }
  | {
      state: 'ACQUIRED_AWAITING_EXTRACTION_MAPPING';
      snapshot: {
        artifactId: string;
        rawArtifactReference: string;
        contentHash: string;
        byteSize: number;
        storedAt: string;
      };
      reason: string;
    }
  | { state: 'REJECTED_SOURCE'; reason: string }
  | { state: 'FAILED'; reason: string };

export interface ScholarshipVerificationDecisionInput {
  state: Exclude<ScholarshipImportVerificationState, 'PENDING'>;
  reason: string;
  evidence?: Record<string, unknown>;
}

export interface ScholarshipCanonicalResolutionInput {
  fieldOrRequirementKey: string;
  canonicalEntityType: ScholarshipCanonicalTarget;
  canonicalId?: string;
  rawValue: string;
  resolutionType: 'RESOLVED' | 'NOT_APPLICABLE' | 'REJECTED';
  reason?: string;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

const BASE = '/admin/scholarships/import-center';

export const scholarshipImportCenterApi = {
  overview(operationalClass: ScholarshipImportOperationalClass) {
    return adminApiClient.request<ScholarshipImportCenterOverview>(
      `${BASE}/overview${queryString({ operationalClass })}`,
    );
  },

  sources() {
    return adminApiClient.request<ScholarshipImportCenterSources>(`${BASE}/sources`);
  },

  createSource(input: ScholarshipSourceCreateInput) {
    return adminApiClient.request<ScholarshipSourceRegistrationPlan>(`${BASE}/sources`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  setSourceStatus(sourceId: string, status: 'ACTIVE' | 'DISABLED') {
    return adminApiClient.request<{ sourceId: string; status: 'ACTIVE' | 'DISABLED' }>(
      `${BASE}/sources/${encodeURIComponent(sourceId)}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    );
  },

  importNew(input: ScholarshipImportNewRequest) {
    return adminApiClient.request<ScholarshipImportNewResult>(`${BASE}/import-new`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  records(input: {
    operationalClass: ScholarshipImportOperationalClass;
    page?: number;
    pageSize?: number;
    batchId?: string;
    status?: string;
  }) {
    return adminApiClient.request<ScholarshipImportCenterRecordList>(
      `${BASE}/records${queryString(input)}`,
    );
  },

  scan(
    segment:
      | 'screening'
      | 'duplicates'
      | 'missing-data'
      | 'verification'
      | 'review-queue'
      | 'ready-to-transfer'
      | 'history',
    operationalClass: ScholarshipImportOperationalClass,
  ) {
    return adminApiClient.request<ScholarshipImportCenterScanResult>(
      `${BASE}/${segment}${queryString({ operationalClass })}`,
    );
  },

  record(id: string) {
    return adminApiClient.request<ScholarshipImportCenterRecordView>(
      `${BASE}/records/${encodeURIComponent(id)}`,
    );
  },

  diff(id: string) {
    return adminApiClient.request<ScholarshipImportCenterDiff>(
      `${BASE}/records/${encodeURIComponent(id)}/diff`,
    );
  },

  mergeProposal(id: string) {
    return adminApiClient.request<ScholarshipImportCenterMergeProposal>(
      `${BASE}/records/${encodeURIComponent(id)}/merge-proposal`,
    );
  },

  decision(id: string, action: ScholarshipImportReviewAction, reason?: string) {
    return adminApiClient.request<{
      decisionId: string;
      recordId: string;
      action: ScholarshipImportReviewAction;
      recordedAt: string;
    }>(`${BASE}/records/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  },

  recordVerification(id: string, input: ScholarshipVerificationDecisionInput) {
    return adminApiClient.request<{ decisionId: string; recordedAt: string }>(
      `${BASE}/records/${encodeURIComponent(id)}/verification`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  },

  recordCanonicalResolution(id: string, input: ScholarshipCanonicalResolutionInput) {
    return adminApiClient.request<{ decisionId: string; recordedAt: string }>(
      `${BASE}/records/${encodeURIComponent(id)}/canonical-resolution`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  },

  transfer(id: string) {
    return adminApiClient.request<{
      recordId: string;
      scholarshipId: string;
      transferredAt: string;
      publicationStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    }>(`${BASE}/records/${encodeURIComponent(id)}/transfer`, {
      method: 'POST',
    });
  },
};
