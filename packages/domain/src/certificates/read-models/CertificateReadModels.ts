import { CertificateStatus } from '../enums/CertificateStatus';
import { CertificateType, CertificateValidityPolicy } from '../entities/Certificate';

/** Sanitized P14-owned private projection intended for authenticated P15 composition. */
export interface StudentCertificateReadModelDto {
  certificateId: string;
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl: string;
  status: CertificateStatus;
  certificateType: CertificateType;
  achievementType: 'COURSE' | 'LEARNING_PATH';
  achievementId: string;
  achievementDisplayName: string;
  issuedAt: Date;
  expiresAt?: Date | null;
  certificatePdfAssetId?: string | null;
  previewImageAssetId?: string | null;
}


/** Public, privacy-minimized P14 verification projection. Internal hashes, student IDs,
 * signing-key references and administrative revocation reasons are deliberately omitted. */
export interface PublicCertificateVerificationDto {
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl?: string | null;
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
  issuerName: string;
  grade?: string | null;
  skills: string[];
  competencies: string[];
  templateVersion: string;
  revokedAt?: Date | null;
  isValid: boolean;
  integrityVerified: boolean;
}
