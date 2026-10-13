import {
  AttachCertificateArtifactsDto,
  CertificateAnalyticsDto,
  CertificateDto,
  CertificateIssuerDto,
  CertificateLedgerEntryDto,
  CertificateListQuery,
  CertificateListResult,
  CertificateMutationContext,
  CertificateTemplateDto,
  CertificateTemplateVersionDto,
  CreateCertificateIssuerDto,
  CreateCertificateTemplateDto,
  IssueCertificateDto,
  ReissueCertificateDto,
  RevokeCertificateDto,
  UpdateCertificateIssuerDto,
  UpdateCertificateTemplateDto,
} from '../entities/Certificate';
import { CertificateTemplateStatus } from '../enums/CertificateTemplateStatus';

export interface ICertificateRepository {
  createIssuer(
    data: CreateCertificateIssuerDto,
    context: CertificateMutationContext,
  ): Promise<CertificateIssuerDto>;
  updateIssuer(
    id: string,
    data: UpdateCertificateIssuerDto,
    context: CertificateMutationContext,
  ): Promise<CertificateIssuerDto>;
  findIssuerById(id: string): Promise<CertificateIssuerDto | null>;
  findIssuerByCode(code: string): Promise<CertificateIssuerDto | null>;
  listIssuers(): Promise<CertificateIssuerDto[]>;
  listIssuerHistory?(
    id: string,
    cursor?: string,
    limit?: number,
  ): Promise<
    Array<{
      id: string;
      action: string;
      actorId: string;
      timestamp: Date;
      contextMetadata: unknown;
    }>
  >;

  createTemplate(
    data: CreateCertificateTemplateDto,
    context: CertificateMutationContext,
  ): Promise<CertificateTemplateDto>;
  updateTemplate(
    id: string,
    data: UpdateCertificateTemplateDto,
    context: CertificateMutationContext,
  ): Promise<CertificateTemplateDto>;
  transitionTemplate(
    id: string,
    status: CertificateTemplateStatus,
    context: CertificateMutationContext,
  ): Promise<CertificateTemplateDto>;
  templateReview?(
    id: string,
  ): Promise<{
    templateId: string;
    currentVersionId: string;
    status: CertificateTemplateStatus;
    current: CertificateTemplateVersionDto;
    previous: CertificateTemplateVersionDto | null;
  }>;
  findTemplateById(id: string): Promise<CertificateTemplateDto | null>;
  findTemplateVersionById(
    id: string,
  ): Promise<CertificateTemplateVersionDto | null>;
  findActiveTemplateByName(
    name: string,
  ): Promise<CertificateTemplateDto | null>;
  listTemplates(): Promise<CertificateTemplateDto[]>;

  retryRender?(
    id: string,
    expectedFingerprint: string,
    expectedUpdatedAt: string,
    context: CertificateMutationContext,
  ): Promise<void>;
  listAbandonedRenderJobs?(
    limit: number,
  ): Promise<Array<{ id: string; fingerprint: string; attachedIds: string[] }>>;
  markRenderCleanup?(id: string, fingerprint: string): Promise<void>;
  checkpointRender(
    id: string,
    fingerprint: string,
    stage: 'BEGIN' | 'PDF' | 'PREVIEW' | 'QR' | 'FAILED' | 'COMPLETE',
    assetId?: string,
  ): Promise<Record<string, string>>;
  recordReview(
    id: string,
    kind:
      | 'RECIPIENT_CORRECTION_REQUESTED'
      | 'RECIPIENT_CORRECTION_APPROVED'
      | 'REVALIDATION_APPROVED',
    input: {
      name?: string;
      evidenceAssetId: string;
      validUntil?: string;
      expectedUpdatedAt: string;
    },
    context: CertificateMutationContext,
  ): Promise<CertificateDto>;
  issue(data: IssueCertificateDto): Promise<CertificateDto>;
  attachArtifacts(data: AttachCertificateArtifactsDto): Promise<CertificateDto>;
  findById(id: string): Promise<CertificateDto | null>;
  findBySourceEventId(sourceEventId: string): Promise<CertificateDto | null>;
  findBySourceCompletionId(
    sourceCompletionId: string,
  ): Promise<CertificateDto | null>;
  findByCourseCompletionId(
    courseCompletionId: string,
  ): Promise<CertificateDto | null>;
  findByLearningPathCompletionId(
    learningPathCompletionId: string,
  ): Promise<CertificateDto | null>;
  findByVerificationCode(
    verificationCode: string,
  ): Promise<CertificateDto | null>;
  findBySerialNumber(serialNumber: string): Promise<CertificateDto | null>;
  listByStudent(
    studentReferenceId: string,
    page?: number,
    pageSize?: number,
    cursor?: string,
  ): Promise<CertificateDto[]>;
  findForStudent(
    id: string,
    studentReferenceId: string,
  ): Promise<CertificateDto | null>;
  list(query: CertificateListQuery): Promise<CertificateListResult>;
  analytics(): Promise<CertificateAnalyticsDto>;
  revoke(data: RevokeCertificateDto): Promise<CertificateDto>;
  reissue(
    data: ReissueCertificateDto & {
      replacement: IssueCertificateDto;
      eventType?: 'CertificateReissued' | 'CertificateRenewed';
    },
  ): Promise<CertificateDto>;
  expireDue(
    asOf: Date,
    actorId: string,
    correlationId?: string | null,
  ): Promise<number>;
  archive(
    certificateId: string,
    actorId: string,
    reason: string,
    correlationId?: string | null,
  ): Promise<CertificateDto>;
  recordVerification(
    certificateId: string,
    result: string,
    channel: string,
  ): Promise<void>;
  listLedger(
    certificateId: string,
    page?: number,
    cursor?: string,
  ): Promise<CertificateLedgerEntryDto[]>;
}
