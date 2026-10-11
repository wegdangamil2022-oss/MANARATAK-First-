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

  public async listForStudent(studentReferenceId: string, cursor?:string, pageSize=50): Promise<StudentCertificateReadModelDto[]> {
    if (!studentReferenceId.trim()) throw new Error('CERTIFICATE_STUDENT_REFERENCE_REQUIRED');
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 51) throw new Error('STUDENT_OWNER_READ_LIMIT_INVALID');
    const rows = await this.repository.listByStudent(studentReferenceId.trim(),1,pageSize,cursor);
    return rows.map((row) => ({
      certificateId: row.id,
      publicId: row.publicId,
      serialNumber: row.serialNumber,
      verificationCode: row.verificationCode,
      verificationUrl: row.verificationUrl,
      status: row.status === 'ACTIVE' && row.expiresAt && new Date(row.expiresAt) <= new Date() ? 'EXPIRED' as import('@manaratak/domain').CertificateStatus : row.status,
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

  public deliveryArtifact(id: string, kind: 'pdf' | 'preview', ownerId: string) { return this.certificates.deliveryArtifact(id, kind, ownerId); }

  public async verifyPublic(verificationCode: string): Promise<PublicCertificateVerificationDto> {
    const row: CertificateVerificationDto = await this.certificates.verifyByCode(verificationCode);
    if (!row.integrityVerified) return {publicId:row.publicId,serialNumber:row.serialNumber,verificationCode:row.verificationCode,status:row.status,lifecycleStatus:row.lifecycleStatus,temporalStatus:row.temporalStatus,verificationFailure:'INTEGRITY_INVALID',isValid:false,integrityVerified:false,skills:[],competencies:[]};
    return {
      lifecycleStatus: row.lifecycleStatus, temporalStatus: row.temporalStatus, verificationFailure: row.verificationFailure,
      publicId: row.publicId,
      serialNumber: row.serialNumber,
      verificationCode: row.verificationCode,
      verificationUrl: row.verificationUrl,
      status: row.status === 'ACTIVE' && row.expiresAt && new Date(row.expiresAt) <= new Date() ? 'EXPIRED' as import('@manaratak/domain').CertificateStatus : row.status,
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
