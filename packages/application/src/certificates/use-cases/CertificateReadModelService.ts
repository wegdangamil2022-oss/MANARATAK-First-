import {
  CertificateVerificationDto,
  PublicCertificateVerificationDto,
  ICertificateRepository,
  StudentCertificateReadModelDto,
} from '@manaratak/domain';
import { CertificateUseCases } from './CertificateUseCases';

/**
 * Composition-only P14 read boundary. It deliberately exposes sanitized read
 * DTOs and delegates verification truth to CertificateUseCases.
 */
export class CertificateReadModelService {
  constructor(
    private readonly repository: ICertificateRepository,
    private readonly certificates: CertificateUseCases,
  ) {}

  public async listForStudent(studentReferenceId: string): Promise<StudentCertificateReadModelDto[]> {
    if (!studentReferenceId.trim()) throw new Error('CERTIFICATE_STUDENT_REFERENCE_REQUIRED');
    const rows = await this.repository.listByStudent(studentReferenceId.trim());
    return rows.map((row) => ({
      certificateId: row.id,
      publicId: row.publicId,
      serialNumber: row.serialNumber,
      verificationCode: row.verificationCode,
      verificationUrl: row.verificationUrl,
      status: row.status,
      certificateType: row.certificateType,
      achievementType: row.achievementType,
      achievementId: row.achievementId,
      achievementDisplayName: row.achievementDisplayName,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      certificatePdfAssetId: row.certificatePdfAssetId,
      previewImageAssetId: row.previewImageAssetId,
    }));
  }

  public async verifyPublic(verificationCode: string): Promise<PublicCertificateVerificationDto> {
    const row: CertificateVerificationDto = await this.certificates.verifyByCode(verificationCode);
    return {
      publicId: row.publicId,
      serialNumber: row.serialNumber,
      verificationCode: row.verificationCode,
      verificationUrl: row.verificationUrl,
      status: row.status,
      certificateType: row.certificateType,
      recipientDisplayName: row.recipientDisplayName,
      achievementType: row.achievementType,
      achievementDisplayName: row.achievementDisplayName,
      courseDisplayName: row.courseDisplayName,
      learningPathDisplayName: row.learningPathDisplayName,
      completedAt: row.completedAt,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      validityPolicy: row.validityPolicy,
      issuerName: row.issuerName,
      grade: row.grade,
      skills: [...(row.skills ?? [])],
      competencies: [...(row.competencies ?? [])],
      templateVersion: row.templateVersion,
      revokedAt: row.revokedAt,
      isValid: row.isValid,
      integrityVerified: row.integrityVerified,
    };
  }
}
