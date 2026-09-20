import type { AtomicPersistenceContext } from '@manaratak/domain';

export type CourseImportTransferState =
  | 'READY_TO_TRANSFER'
  | 'TRANSFERRED_CREATED'
  | 'TRANSFERRED_UPDATED'
  | 'TRANSFERRED_UNCHANGED'
  | 'BLOCKED_REVIEW'
  | 'FAILED';

export interface CourseImportTransferApproval {
  expectedAnalysisId: string;
  approvedFields: string[];
  urlVerified?: boolean;
  reason: string;
}

export interface CourseImportTransferRequest {
  recordId: string;
  actorId: string;
  correlationId?: string;
  approval?: CourseImportTransferApproval;
}

export interface CourseImportTransferResult {
  recordId: string;
  courseId: string;
  publicId: string;
  state: Exclude<CourseImportTransferState, 'READY_TO_TRANSFER' | 'BLOCKED_REVIEW' | 'FAILED'>;
  transferredAt: string;
  publicationStatus: 'IMPORTED' | 'INCOMPLETE';
}

export interface CourseImportTransferPreview {
  recordId: string;
  state: 'READY_TO_TRANSFER' | 'BLOCKED_REVIEW';
  analysisId: string;
  changeState: string;
  requiresReview: boolean;
  requiredApprovalFields: string[];
  urlVerificationRequired: boolean;
  reasons: string[];
}

export interface CourseImportTransferStoredRecord {
  id: string;
  batchId: string;
  status: string;
  rawPayload: unknown;
  validationErrors?: unknown;
  processingNotes?: string | null;
  promotedEntityId?: string | null;
  sourceRowNumber?: number | null;
  updatedAt?: Date;
}

export interface CourseImportTransferBatch {
  id: string;
  dataType: string;
  batchStatus?: string;
}

export interface CourseImportTransferAnalysis {
  id: string;
  importRecordId: string;
  resolvedProviderId?: string | null;
  sourceNativeKey?: string | null;
  normalizedPayload: Record<string, unknown>;
  eligibilityState: string;
  completenessState: string;
  matchState: string;
  matchedCourseId?: string | null;
  changeState: string;
  fieldDiffs?: Record<string, unknown> | null;
  relationshipProposals?: Record<string, unknown> | null;
  requiresReview: boolean;
  analyzedAt: Date;
  updatedAt: Date;
}

export interface CourseImportTransferSourceIdentity {
  id: string;
  courseId?: string | null;
  providerId: string;
  sourceNativeKey: string;
  languageVersionKey: string;
  currentUrl: string;
  status: string;
}

export interface CourseFieldProvenanceWrite {
  courseId: string;
  fieldKey: string;
  importRecordId: string;
  sourceArtifactHash: string;
  sourceRowNumber?: number;
  providerId: string;
  sourceUrl?: string;
  valueHash: string;
  reviewedBy?: string;
  reviewStatus: 'UNREVIEWED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
}

export interface CourseImportTransferGateway {
  withTransaction(context: AtomicPersistenceContext): CourseImportTransferGateway;
  getRecordById(recordId: string): Promise<CourseImportTransferStoredRecord | null>;
  getBatchById(batchId: string): Promise<CourseImportTransferBatch | null>;
  getAnalysisByRecordId(recordId: string): Promise<CourseImportTransferAnalysis | null>;
  getSourceIdentity(identityId: string): Promise<CourseImportTransferSourceIdentity | null>;
  updateImportLink(input: {
    recordId: string;
    courseId: string;
    processingNotes: string;
  }): Promise<void>;
  linkAnalysisCourse(input: {
    importRecordId: string;
    courseId: string;
    eligibilityState: string;
    completenessState: string;
  }): Promise<void>;
  linkSourceIdentity(input: {
    identityId: string;
    courseId: string;
    currentUrl: string;
  }): Promise<void>;
  applyVerifiedUrlChange(input: {
    identityId: string;
    previousUrl: string;
    nextUrl: string;
    normalizedNextUrl: string;
    importRecordId: string;
  }): Promise<void>;
  writeFieldProvenance(input: CourseFieldProvenanceWrite[]): Promise<void>;
}
