import { CertificateStatus } from '../enums/CertificateStatus';
import { CertificateTemplateStatus } from '../enums/CertificateTemplateStatus';

export type CertificateLanguage = 'ARABIC' | 'ENGLISH' | 'BILINGUAL';
export type CertificateLayout = 'LANDSCAPE' | 'PORTRAIT';
export type CertificateValidityPolicy = 'PERMANENT' | 'EXPIRING' | 'RENEWABLE';
export type CertificateType =
  | 'COURSE'
  | 'LEARNING_PATH'
  | 'PROGRAM'
  | 'WORKSHOP'
  | 'BOOTCAMP'
  | 'PARTICIPATION'
  | 'ACHIEVEMENT'
  | 'HONOR';

export type CertificateIssuerType =
  | 'MANARATAK'
  | 'UNIVERSITY'
  | 'EDUCATIONAL_INSTITUTION'
  | 'GOVERNMENT'
  | 'TRAINING_CENTER'
  | 'EXTERNAL_PARTNER';
export type CertificateIssuerStatus = 'ACTIVE' | 'SUSPENDED' | 'DEPRECATED';

export interface CreateCertificateIssuerDto {
  publicId: string;
  code: string;
  name: string;
  issuerType: CertificateIssuerType;
  status: CertificateIssuerStatus;
  organizationId?: string | null;
  universityId?: string | null;
  issuerLogoAssetId: string;
  signingKeyReference: string;
  accreditationAuthority?: string | null;
  accreditationReference?: string | null;
  metadata?: Record<string, unknown> | null;
}
export type UpdateCertificateIssuerDto = Partial<
  Omit<CreateCertificateIssuerDto, 'publicId' | 'code'>
>;
export interface CertificateIssuerDto extends CreateCertificateIssuerDto {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateTemplateVersionContent {
  issuerId: string;
  language: CertificateLanguage;
  layout: CertificateLayout;
  accentColor: string;
  secondaryColor: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  signatoryNameAr?: string | null;
  signatoryNameEn?: string | null;
  signatoryTitleAr?: string | null;
  signatoryTitleEn?: string | null;
  logoAssetId?: string | null;
  sealAssetId?: string | null;
  signatureAssetId?: string | null;
  designAssetId?: string | null;
  validityPolicy: CertificateValidityPolicy;
  validityDurationDays?: number | null;
  renewalPeriodDays?: number | null;
  renewalPolicy?: string | null;
  requiresRevalidation: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface CertificateTemplateVersionDto extends CertificateTemplateVersionContent {
  id: string;
  publicId: string;
  templateId: string;
  versionNumber: string;
  status: CertificateTemplateStatus;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
}

/**
 * Authoring DTO is intentionally flattened for API compatibility. Persistence
 * splits stable template identity from an immutable CertificateTemplateVersion.
 */
export interface CreateCertificateTemplateDto extends CertificateTemplateVersionContent {
  publicId: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  templateVersion: string;
  status: CertificateTemplateStatus;
  /** Compatibility projection only; canonical issuerId is authoritative. */
  issuerName?: string | null;
  /** Compatibility projection only; canonical issuerId is authoritative. */
  issuerReferenceId?: string | null;
}
export type UpdateCertificateTemplateDto = Partial<
  Omit<CreateCertificateTemplateDto, 'publicId' | 'code' | 'status'>
>;
export interface CertificateTemplateDto extends CreateCertificateTemplateDto {
  id: string;
  currentVersionId: string;
  currentVersion: CertificateTemplateVersionDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateMutationContext {
  actorId: string;
  correlationId?: string | null;
  reason?: string | null;
}

export interface CertificateAuthoritativeEventEnvelope<TPayload> {
  eventId: string;
  eventType: 'CourseCompleted' | 'LearningPathCompleted';
  eventVersion: string;
  sourceDomain: 'COURSES';
  occurredAt: Date | string;
  payload: TPayload;
}

export interface CertificateSignedEnvelopeV2 {
  schemaVersion: 'certificate-envelope-v2';
  certificateType: CertificateType;
  studentReferenceId: string;
  recipientDisplayName: string | null;
  achievement: {
    type: 'COURSE' | 'LEARNING_PATH';
    id: string;
    displayName: string;
    completionId: string;
    completedAt: string;
  };
  issuedAt: string;
  validity: {
    policy: CertificateValidityPolicy;
    expiresAt: string | null;
    renewalPolicy: string | null;
    requiresRevalidation: boolean;
  };
  template: {
    templateId: string;
    templateVersionId: string;
    versionNumber: string;
  };
  issuer: {
    issuerId: string;
    issuerPublicId: string;
    issuerName: string;
    issuerType: CertificateIssuerType;
    signingKeyReference: string;
  };
  grade: string | null;
  score: number | null;
  skills: string[];
  competencies: string[];
  replacesCertificateId: string | null;
}

export interface CertificateIssuedEventPayload {
  schemaVersion: '2.0';
  studentReferenceId: string;
  certificateId: string;
  publicId: string;
  certificateNumber: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl: string;
  status: CertificateStatus;
  certificateType: CertificateType;
  courseId?: string | null;
  learningPathId?: string | null;
  courseDisplayName?: string | null;
  learningPathDisplayName?: string | null;
  issuedAt: string;
  expiresAt?: string | null;
  certificatePdfAssetId?: string | null;
  previewImageAssetId?: string | null;
}

export interface IssueCertificateDto {
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl: string;
  verificationHash: string;
  status: CertificateStatus;
  certificateType: CertificateType;
  studentReferenceId: string;
  recipientDisplayName?: string | null;
  achievementType: 'COURSE' | 'LEARNING_PATH';
  achievementId: string;
  achievementDisplayName: string;
  sourceCompletionId: string;
  completedAt: Date;
  sourceEventId: string;
  sourceEventType: 'CourseCompleted' | 'LearningPathCompleted';
  sourceEventVersion: string;
  sourceEventPayloadHash: string;
  courseId?: string | null;
  courseDisplayName?: string | null;
  courseCompletionId?: string | null;
  courseCompletedAt?: Date | null;
  learningPathId?: string | null;
  learningPathDisplayName?: string | null;
  learningPathCompletionId?: string | null;
  issuedAt?: Date;
  expiresAt?: Date | null;
  validityPolicy: CertificateValidityPolicy;
  renewalPolicy?: string | null;
  requiresRevalidation?: boolean;
  templateId: string;
  templateVersionId: string;
  templateVersion: string;
  issuerId: string;
  certificatePdfAssetId?: string | null;
  previewImageAssetId?: string | null;
  verificationQrAssetId?: string | null;
  signatureAssetId?: string | null;
  digitalSignature: string;
  signingKeyReference: string;
  issuerName: string;
  issuerReferenceId?: string | null;
  grade?: string | null;
  score?: number | null;
  skills?: string[];
  competencies?: string[];
  metadata: Record<string, unknown>;
  correlationId?: string | null;
  actorId?: string | null;
}

export interface AttachCertificateArtifactsDto {
  certificateId: string;
  certificatePdfAssetId?: string | null;
  previewImageAssetId?: string | null;
  verificationQrAssetId?: string | null;
  renderMetadata?: Record<string, unknown> | null;
  actorId: string;
  correlationId?: string | null;
}

export interface CertificateDto extends IssueCertificateDto {
  id: string;
  issuedAt: Date;
  skills: string[];
  competencies: string[];
  revokedAt?: Date | null;
  revocationReason?: string | null;
  revokedBy?: string | null;
  replacesCertificateId?: string | null;
  replacedByCertificateId?: string | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateVerificationDto {
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl: string;
  verificationHash: string;
  status: CertificateStatus;
  certificateType: CertificateType;
  recipientDisplayName?: string | null;
  achievementType: 'COURSE' | 'LEARNING_PATH';
  achievementDisplayName: string;
  courseDisplayName?: string | null;
  learningPathDisplayName?: string | null;
  completedAt: Date;
  issuedAt: Date;
  expiresAt?: Date | null;
  validityPolicy: CertificateValidityPolicy;
  issuerId: string;
  issuerName: string;
  grade?: string | null;
  skills: string[];
  competencies: string[];
  templateVersion: string;
  revokedAt?: Date | null;
  revocationReason?: string | null;
  isValid: boolean;
  integrityVerified: boolean;
}

export interface RevokeCertificateDto {
  certificateId: string;
  reason: string;
  actorId: string;
  correlationId?: string | null;
}
export interface ReissueCertificateDto {
  certificateId: string;
  reason: string;
  actorId: string;
  recipientDisplayName?: string | null;
  templateId?: string | null;
  correlationId?: string | null;
}
export interface RenewCertificateDto {
  certificateId: string;
  actorId: string;
  reason: string;
  correlationId?: string | null;
}
export interface CertificateLedgerEntryDto {
  id: string;
  certificateId: string;
  action: string;
  actorId: string;
  reason?: string | null;
  payload?: Record<string, unknown> | null;
  occurredAt: Date;
}
export interface CertificateAnalyticsDto {
  total: number;
  active: number;
  revoked: number;
  archived: number;
  expiringSoon: number;
  templates: number;
  verifications: number;
}
export interface CertificateListQuery {
  search?: string;
  status?: CertificateStatus;
  templateId?: string;
  page?: number;
  pageSize?: number;
}
export interface CertificateListResult {
  data: CertificateDto[];
  total: number;
  page: number;
  pageSize: number;
}
