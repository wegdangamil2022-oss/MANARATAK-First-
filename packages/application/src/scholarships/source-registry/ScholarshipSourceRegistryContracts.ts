import type { ImportSourceDefinition } from '@manaratak/domain';

export type ScholarshipSourceStatus = 'ACTIVE' | 'DISABLED' | 'NOT_CONFIGURED';

export type ScholarshipSourceType =
  | 'SCHOLARSHIP_WEBSITE'
  | 'GOVERNMENT_SCHOLARSHIP_PORTAL'
  | 'FOUNDATION_DONOR_PORTAL'
  | 'AGGREGATOR'
  | 'MANUAL_FILE';

export type ScholarshipAcquisitionMode =
  | 'WEBSITE'
  | 'SITEMAP'
  | 'FEED'
  | 'API'
  | 'MANUAL_FILE';

export interface ScholarshipAllowedUrlScope {
  allowedOrigins: string[];
  allowedPathPrefixes?: string[];
  allowSubdomains?: boolean;
}

export interface ScholarshipRateLimitPolicy {
  requestsPerMinute: number;
  burstLimit?: number;
  minimumDelayMs?: number;
}

export interface ScholarshipLastExecutionMetadata {
  state: 'NEVER_RUN' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
  executionId?: string;
  startedAt?: string;
  finishedAt?: string;
  recordsObserved?: number;
  errorsObserved?: number;
  durationMs?: number;
}

export interface ScholarshipSourceConfiguration {
  sourceId: string;
  sourceName: string;
  baseUrl?: string;
  sourceType: ScholarshipSourceType;
  status: ScholarshipSourceStatus;
  acquisitionMode: ScholarshipAcquisitionMode;
  allowedUrlScope?: ScholarshipAllowedUrlScope;
  rateLimitPolicy?: ScholarshipRateLimitPolicy;
  lastExecution: ScholarshipLastExecutionMetadata;
}

export interface ScholarshipPhase6RegistrationPlan {
  source: ImportSourceDefinition;
  rawSnapshotRequiredBeforeSemanticTransform: true;
  phase6UrlAllowListRequired: true;
  liveConnectorProof: 'PENDING_RUNTIME';
}

export interface ScholarshipAcquisitionPlan {
  sourceId: string;
  acquisitionMode: ScholarshipAcquisitionMode;
  targetUrl: string | null;
  phase6ConnectorId: string;
  phase6ConnectorVersion: string;
  rawSnapshot: {
    owner: 'PHASE6';
    requiredBeforeSemanticTransform: true;
    rawArtifactReferenceRequired: true;
  };
  security: {
    configuredScopeValidated: boolean;
    phase6SsrfAndAllowListRequiredAtRuntime: true;
  };
  rateLimitPolicy: ScholarshipRateLimitPolicy | null;
  execution: 'SOURCE_READY_RUNTIME_NOT_PROVEN';
}

export const SCHOLARSHIP_LIVE_CONNECTOR_PROOF = 'PENDING_RUNTIME' as const;
