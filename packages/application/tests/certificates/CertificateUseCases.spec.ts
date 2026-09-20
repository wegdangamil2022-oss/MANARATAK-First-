import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CertificateStatus,
  CertificateTemplateStatus,
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
} from '@manaratak/domain';
import { CertificateUseCases } from '../../src/certificates/use-cases/CertificateUseCases';

const issuer = {
  id: 'issuer-1', publicId: 'issuer-public-1', code: 'MNR', name: 'MANARATAK',
  issuerType: 'MANARATAK', status: 'ACTIVE', issuerLogoAssetId: 'asset-logo-1',
  signingKeyReference: 'kms://manaratak/certificate-signing', metadata: null,
  createdAt: new Date(), updatedAt: new Date(),
} as const;

const version = {
  id: 'template-version-1', publicId: 'template-version-public-1', templateId: 'template-1',
  issuerId: issuer.id, versionNumber: '1.0.0', status: CertificateTemplateStatus.ACTIVE,
  language: 'BILINGUAL', layout: 'LANDSCAPE', accentColor: '#075E45', secondaryColor: '#C9A227',
  titleAr: 'شهادة', titleEn: 'Certificate', bodyAr: 'نص طويل للشهادة', bodyEn: 'Certificate body text',
  validityPolicy: 'EXPIRING', validityDurationDays: 365, renewalPeriodDays: null,
  renewalPolicy: null, requiresRevalidation: false, metadata: null,
  createdBy: 'maker-1', approvedBy: 'checker-1', approvedAt: new Date(), createdAt: new Date(),
} as const;

const template = {
  id: 'template-1', publicId: 'template-public-1', code: 'MNR-SIGNATURE',
  name: 'MANARATAK Signature Certificate', nameAr: 'قالب', nameEn: 'Template',
  templateVersion: '1.0.0', status: CertificateTemplateStatus.ACTIVE, issuerId: issuer.id,
  issuerName: issuer.name, issuerReferenceId: issuer.publicId,
  language: version.language, layout: version.layout, accentColor: version.accentColor,
  secondaryColor: version.secondaryColor, titleAr: version.titleAr, titleEn: version.titleEn,
  bodyAr: version.bodyAr, bodyEn: version.bodyEn, validityPolicy: version.validityPolicy,
  validityDurationDays: version.validityDurationDays, renewalPeriodDays: version.renewalPeriodDays,
  renewalPolicy: version.renewalPolicy, requiresRevalidation: version.requiresRevalidation,
  currentVersionId: version.id, currentVersion: version, metadata: null,
  createdAt: new Date(), updatedAt: new Date(),
} as any;

const course = {
  id: 'course-1', publicId: 'course-public-1', slug: 'native-course', canonicalName: 'Native Course',
  canonicalDedupKey: 'native-course', displayName: 'Native Course', accessType: CourseAccessType.FREE_CERTIFICATE,
  originType: CourseOriginType.NATIVE_MANARATAK_COURSE, directCourseUrl: '/courses/native-course',
  status: CourseStatus.PUBLISHED, completenessStatus: CourseImportCompletenessState.COMPLETE,
  certificateAvailable: true, createdAt: new Date(), updatedAt: new Date(),
};

function courseEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'course-completed:course-1:student-1:v1', eventType: 'CourseCompleted' as const,
    eventVersion: '1.0.0', sourceDomain: 'COURSES' as const, occurredAt: new Date(),
    payload: {
      courseId: 'course-1', studentReferenceId: 'student-1', completedAt: new Date(),
      completionId: 'completion-1', eligibleForCertificate: true,
      certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform' as const,
      sourcePhase: 'Phase 13 - Learning Platform' as const,
    },
    ...overrides,
  };
}

describe('CertificateUseCases W10 trust model', () => {
  let repository: any;
  let courses: any;
  let learningPaths: any;
  let useCases: CertificateUseCases;

  beforeEach(() => {
    repository = {
      findBySourceEventId: vi.fn().mockResolvedValue(null),
      findBySourceCompletionId: vi.fn().mockResolvedValue(null),
      findByLearningPathCompletionId: vi.fn().mockResolvedValue(null),
      findActiveTemplateByName: vi.fn().mockResolvedValue(template),
      findTemplateById: vi.fn().mockResolvedValue(template),
      findIssuerById: vi.fn().mockResolvedValue(issuer),
      issue: vi.fn().mockImplementation(async (data: any) => ({ id: 'cert-1', ...data, createdAt: new Date(), updatedAt: new Date() })),
      reissue: vi.fn().mockImplementation(async ({ replacement }: any) => ({ id: 'replacement-1', ...replacement, createdAt: new Date(), updatedAt: new Date() })),
      listTemplates: vi.fn().mockResolvedValue([]), listIssuers: vi.fn().mockResolvedValue([]),
      createIssuer: vi.fn(), updateIssuer: vi.fn(), createTemplate: vi.fn(), updateTemplate: vi.fn(), transitionTemplate: vi.fn(),
      findById: vi.fn(), findByCourseCompletionId: vi.fn(), findByVerificationCode: vi.fn(), findBySerialNumber: vi.fn(),
      listByStudent: vi.fn(), list: vi.fn(), analytics: vi.fn(), revoke: vi.fn(), expireDue: vi.fn(), archive: vi.fn(), recordVerification: vi.fn(), listLedger: vi.fn(),
    };
    courses = { findById: vi.fn().mockResolvedValue(course) };
    learningPaths = { findById: vi.fn().mockResolvedValue({ id: 'path-1', title: 'AI Learning Path' }) };
    useCases = new CertificateUseCases(repository, courses, undefined, {
      signingKeyReference: issuer.signingKeyReference,
      signingSecret: 'test-secret',
      productionLike: false,
    }, learningPaths);
  });

  it('issues only from an authoritative persisted CourseCompleted envelope and seals trust semantics', async () => {
    const certificate = await useCases.consumeCompletionEvent(courseEvent());
    expect(certificate.status).toBe(CertificateStatus.ACTIVE);
    expect(repository.issue).toHaveBeenCalledWith(expect.objectContaining({
      sourceEventId: 'course-completed:course-1:student-1:v1',
      sourceCompletionId: 'completion-1',
      issuerId: issuer.id,
      templateVersionId: version.id,
      validityPolicy: 'EXPIRING',
      expiresAt: expect.any(Date),
      metadata: expect.objectContaining({
        signedEnvelope: expect.objectContaining({
          schemaVersion: 'certificate-envelope-v2',
          certificateType: 'COURSE',
          issuer: expect.objectContaining({ issuerId: issuer.id, signingKeyReference: issuer.signingKeyReference }),
          validity: expect.objectContaining({ policy: 'EXPIRING', expiresAt: expect.any(String) }),
          template: expect.objectContaining({ templateVersionId: version.id }),
        }),
      }),
    }));
  });

  it('rejects a completion envelope from a non-authoritative domain', async () => {
    await expect(useCases.consumeCompletionEvent(courseEvent({ sourceDomain: 'IMPORTS' } as any))).rejects.toThrow('DOMAIN_INVALID');
    expect(repository.issue).not.toHaveBeenCalled();
  });

  it('supports LearningPathCompleted as a first-class issuance contract', async () => {
    await useCases.consumeCompletionEvent({
      eventId: 'learning-path-completed:path-1:student-1:v1', eventType: 'LearningPathCompleted', eventVersion: '1.0.0', sourceDomain: 'COURSES', occurredAt: new Date(),
      payload: { learningPathId: 'path-1', studentReferenceId: 'student-1', completedAt: new Date(), eligibleForCertificate: true, certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform', sourcePhase: 'Phase 13 - Learning Platform' },
    });
    expect(repository.issue).toHaveBeenCalledWith(expect.objectContaining({
      certificateType: 'LEARNING_PATH', achievementType: 'LEARNING_PATH', learningPathId: 'path-1',
      learningPathCompletionId: 'learning-path-completed:path-1:student-1:v1',
    }));
  });

  it('fails closed when no governed ACTIVE template exists instead of auto-activating one', async () => {
    repository.findActiveTemplateByName.mockResolvedValue(null);
    await expect(useCases.consumeCompletionEvent(courseEvent())).rejects.toThrow('ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED');
    expect(repository.createTemplate).not.toHaveBeenCalled();
  });

  it('builds reissue replacement from an allow-listed credential state without revocation metadata', async () => {
    repository.findById.mockResolvedValue({
      id: 'old-cert', status: CertificateStatus.REVOKED, certificateType: 'COURSE', studentReferenceId: 'student-1', recipientDisplayName: 'Student',
      achievementType: 'COURSE', achievementId: 'course-1', achievementDisplayName: 'Native Course', sourceCompletionId: 'completion-1', completedAt: new Date(),
      sourceEventId: 'event-1', sourceEventType: 'CourseCompleted', sourceEventVersion: '1.0.0', sourceEventPayloadHash: 'payload-hash',
      courseId: 'course-1', courseDisplayName: 'Native Course', courseCompletionId: 'completion-1', courseCompletedAt: new Date(),
      validityPolicy: 'EXPIRING', templateId: 'template-1', templateVersionId: version.id, templateVersion: '1.0.0', issuerId: issuer.id,
      issuerName: issuer.name, issuerReferenceId: issuer.publicId, verificationUrl: '/verify', verificationHash: 'old', verificationCode: 'OLD', serialNumber: 'OLD', publicId: 'old',
      digitalSignature: 'old', signingKeyReference: issuer.signingKeyReference, skills: [], competencies: [], metadata: {}, issuedAt: new Date(),
      revokedAt: new Date(), revocationReason: 'reason', revokedBy: 'admin', createdAt: new Date(), updatedAt: new Date(),
    });
    await useCases.reissue('old-cert', 'Administrative correction', 'checker-1');
    const replacement = repository.reissue.mock.calls[0][0].replacement;
    expect(replacement.status).toBe(CertificateStatus.ACTIVE);
    expect(replacement).not.toHaveProperty('revokedAt');
    expect(replacement).not.toHaveProperty('revocationReason');
    expect(replacement).not.toHaveProperty('revokedBy');
    expect(replacement.metadata.signedEnvelope.replacesCertificateId).toBe('old-cert');
  });

  it('is idempotent for duplicate trusted completion events and never issues twice', async () => {
    const existing = { id: 'cert-existing', sourceEventId: 'course-completed:course-1:student-1:v1' } as any;
    repository.findBySourceEventId.mockResolvedValue(existing);
    const result = await useCases.consumeCompletionEvent(courseEvent());
    expect(result).toBe(existing);
    expect(repository.issue).not.toHaveBeenCalled();
  });

  it('records revocation only through the P14 repository lifecycle boundary', async () => {
    repository.revoke.mockResolvedValue({ id: 'cert-1', status: CertificateStatus.REVOKED });
    await expect(useCases.revoke('cert-1', 'Credential integrity correction', 'checker-1')).resolves.toEqual(
      expect.objectContaining({ status: CertificateStatus.REVOKED }),
    );
    expect(repository.revoke).toHaveBeenCalledWith(expect.objectContaining({
      certificateId: 'cert-1', actorId: 'checker-1', reason: 'Credential integrity correction',
    }));
    expect(() => useCases.revoke('cert-1', 'short', 'checker-1')).toThrow('REVOCATION_REASON_TOO_SHORT');
  });

  it('verifies signed certificate integrity and records the public verification ledger event', async () => {
    const issued = await useCases.consumeCompletionEvent(courseEvent());
    repository.findByVerificationCode.mockResolvedValue(issued);
    repository.recordVerification.mockResolvedValue(undefined);
    const verification = await useCases.verifyByCode(issued.verificationCode);
    expect(verification.isValid).toBe(true);
    expect(verification.integrityVerified).toBe(true);
    expect(repository.recordVerification).toHaveBeenCalledWith(issued.id, 'VALID', 'PUBLIC_CODE');
  });

});
