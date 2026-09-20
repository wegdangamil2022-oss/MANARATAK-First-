import { CertificateType } from '../entities/Certificate';
import { CertificateStatus } from '../enums/CertificateStatus';

export const CERTIFICATE_ISSUED_EVENT_TYPE = 'CertificateIssued' as const;
export const CERTIFICATE_REVOKED_EVENT_TYPE = 'CertificateRevoked' as const;
export const CERTIFICATE_REISSUED_EVENT_TYPE = 'CertificateReissued' as const;
export const CERTIFICATE_RENEWED_EVENT_TYPE = 'CertificateRenewed' as const;
export const CERTIFICATE_EXPIRED_EVENT_TYPE = 'CertificateExpired' as const;
export const CERTIFICATE_VERIFIED_EVENT_TYPE = 'CertificateVerified' as const;

export interface CertificateIssuedIntegrationEventPayload {
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

export interface CertificateRevokedIntegrationEventPayload {
  certificateId: string;
  studentReferenceId: string;
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  status: CertificateStatus;
  courseDisplayName?: string | null;
  learningPathDisplayName?: string | null;
  issuedAt: string;
  revokedAt: string;
  reason: string;
}

export interface CertificateReissuedIntegrationEventPayload {
  studentReferenceId: string;
  certificateId: string;
  replacesCertificateId: string;
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  status: CertificateStatus;
  courseDisplayName?: string | null;
  learningPathDisplayName?: string | null;
  issuedAt: string;
  expiresAt?: string | null;
}

export interface CertificateRenewedIntegrationEventPayload {
  certificateId: string;
  certificateNumber: string;
  studentReferenceId: string;
  renewedAt: string;
  newExpirationDate?: string | null;
}

export interface CertificateExpiredIntegrationEventPayload {
  certificateId: string;
  certificateNumber: string;
  expiredAt?: string | null;
}

export interface CertificateVerifiedIntegrationEventPayload {
  certificateId: string;
  verificationStatus: string;
  channel: string;
}
