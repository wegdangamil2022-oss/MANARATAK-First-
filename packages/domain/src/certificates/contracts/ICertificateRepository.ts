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
  createIssuer(data: CreateCertificateIssuerDto, context: CertificateMutationContext): Promise<CertificateIssuerDto>;
  updateIssuer(id: string, data: UpdateCertificateIssuerDto, context: CertificateMutationContext): Promise<CertificateIssuerDto>;
  findIssuerById(id: string): Promise<CertificateIssuerDto | null>;
  findIssuerByCode(code: string): Promise<CertificateIssuerDto | null>;
  listIssuers(): Promise<CertificateIssuerDto[]>;

  createTemplate(data: CreateCertificateTemplateDto, context: CertificateMutationContext): Promise<CertificateTemplateDto>;
  updateTemplate(id: string, data: UpdateCertificateTemplateDto, context: CertificateMutationContext): Promise<CertificateTemplateDto>;
  transitionTemplate(id: string, status: CertificateTemplateStatus, context: CertificateMutationContext): Promise<CertificateTemplateDto>;
  findTemplateById(id: string): Promise<CertificateTemplateDto | null>;
  findTemplateVersionById(id: string): Promise<CertificateTemplateVersionDto | null>;
  findActiveTemplateByName(name: string): Promise<CertificateTemplateDto | null>;
  listTemplates(): Promise<CertificateTemplateDto[]>;

  issue(data: IssueCertificateDto): Promise<CertificateDto>;
  attachArtifacts(data: AttachCertificateArtifactsDto): Promise<CertificateDto>;
  findById(id: string): Promise<CertificateDto | null>;
  findBySourceEventId(sourceEventId: string): Promise<CertificateDto | null>;
  findBySourceCompletionId(sourceCompletionId: string): Promise<CertificateDto | null>;
  findByCourseCompletionId(courseCompletionId: string): Promise<CertificateDto | null>;
  findByLearningPathCompletionId(learningPathCompletionId: string): Promise<CertificateDto | null>;
  findByVerificationCode(verificationCode: string): Promise<CertificateDto | null>;
  findBySerialNumber(serialNumber: string): Promise<CertificateDto | null>;
  listByStudent(studentReferenceId: string): Promise<CertificateDto[]>;
  list(query: CertificateListQuery): Promise<CertificateListResult>;
  analytics(): Promise<CertificateAnalyticsDto>;
  revoke(data: RevokeCertificateDto): Promise<CertificateDto>;
  reissue(data: ReissueCertificateDto & { replacement: IssueCertificateDto; eventType?: 'CertificateReissued' | 'CertificateRenewed' }): Promise<CertificateDto>;
  expireDue(asOf: Date, actorId: string, correlationId?: string | null): Promise<number>;
  archive(certificateId: string, actorId: string, reason: string, correlationId?: string | null): Promise<CertificateDto>;
  recordVerification(certificateId: string, result: string, channel: string): Promise<void>;
  listLedger(certificateId: string): Promise<CertificateLedgerEntryDto[]>;
}
