import { describe, expect, it, vi } from 'vitest';
import { CertificateStatus, CertificateTemplateStatus } from '@manaratak/domain';
import { PrismaCertificateRepository } from '../../src/certificates/PrismaCertificateRepository';

const issueData: any = {
  publicId: 'public-1', serialNumber: 'MNR-CRS-2026-1', verificationCode: 'MNR-VERIFY-1', verificationUrl: '/api/v1/public/certificates/verify/MNR-VERIFY-1', verificationHash: 'hash',
  status: CertificateStatus.ACTIVE, certificateType: 'COURSE', studentReferenceId: 'student-1', achievementType: 'COURSE', achievementId: 'course-1', achievementDisplayName: 'Course',
  sourceCompletionId: 'completion-1', completedAt: new Date(), sourceEventId: 'event-1', sourceEventType: 'CourseCompleted', sourceEventVersion: '1.0.0', sourceEventPayloadHash: 'payload-hash',
  courseId: 'course-1', courseDisplayName: 'Course', courseCompletionId: 'completion-1', courseCompletedAt: new Date(), validityPolicy: 'PERMANENT', requiresRevalidation: false,
  templateId: 'template-1', templateVersionId: 'version-1', templateVersion: '1.0.0', issuerId: 'issuer-1', issuerName: 'MANARATAK', issuerReferenceId: 'issuer-public',
  digitalSignature: 'sig', signingKeyReference: 'kms://issuer/key', skills: [], competencies: [], metadata: { signedEnvelope: {} }, actorId: 'phase14-system',
};

describe('PrismaCertificateRepository W10 trust model', () => {
  it('atomically persists issuance inbox, certificate, ledger/audit and the Phase 15-complete CertificateIssued event', async () => {
    const tx: any = {
      certificateIssuanceInbox: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      certificate: { findUnique: vi.fn().mockResolvedValue(null), findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation(({ data }) => ({ id: 'cert-1', ...data, issuedAt: new Date(), createdAt: new Date(), updatedAt: new Date() })) },
      certificateTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 'template-1', status: CertificateTemplateStatus.ACTIVE, issuerId: 'issuer-1' }) },
      certificateTemplateVersion: { findUnique: vi.fn().mockResolvedValue({ id: 'version-1', templateId: 'template-1', issuerId: 'issuer-1', status: CertificateTemplateStatus.ACTIVE }) },
      certificateIssuer: { findUnique: vi.fn().mockResolvedValue({ id: 'issuer-1', status: 'ACTIVE', signingKeyReference: 'kms://issuer/key' }) },
      certificateLedgerEntry: { create: vi.fn() }, auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    };
    const repository = new PrismaCertificateRepository({ $transaction: (callback: any) => callback(tx) } as any);
    const result = await repository.issue(issueData);
    expect(result.id).toBe('cert-1');
    expect(tx.certificateIssuanceInbox.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventId: 'event-1', payloadHash: 'payload-hash', certificateId: 'cert-1' }) }));
    const outbox = tx.transactionalOutboxRecord.create.mock.calls[0][0].data;
    expect(outbox.eventType).toBe('CertificateIssued');
    expect(outbox.payload).toEqual(expect.objectContaining({ studentReferenceId: 'student-1', certificateId: 'cert-1', certificateNumber: 'MNR-CRS-2026-1', serialNumber: 'MNR-CRS-2026-1', verificationCode: 'MNR-VERIFY-1', verificationUrl: expect.any(String), courseId: 'course-1' }));
  });

  it('creates immutable template versions and records template governance audit/outbox', async () => {
    const tx: any = {
      certificateIssuer: { findUnique: vi.fn().mockResolvedValue({ id: 'issuer-1', status: 'ACTIVE', issuerLogoAssetId: 'asset', signingKeyReference: 'key' }) },
      certificateTemplate: {
        create: vi.fn().mockResolvedValue({ id: 'template-1' }),
        update: vi.fn().mockImplementation(({ data }) => ({ id: 'template-1', publicId: 'tpl-public', code: 'TPL', name: 'Template', nameAr: 'قالب', nameEn: 'Template', status: 'DRAFT', issuerId: 'issuer-1', currentVersion: { id: data.currentVersionId, publicId: 'v-public', templateId: 'template-1', issuerId: 'issuer-1', versionNumber: '1.0.0', status: 'DRAFT', language: 'BILINGUAL', layout: 'LANDSCAPE', accentColor: '#075E45', secondaryColor: '#C9A227', titleAr: 'شهادة', titleEn: 'Cert', bodyAr: 'نص طويل', bodyEn: 'body long', validityPolicy: 'PERMANENT', requiresRevalidation: false, createdBy: 'maker-1', createdAt: new Date() }, issuer: { name: 'MANARATAK', publicId: 'issuer-public' }, createdAt: new Date(), updatedAt: new Date() })),
      },
      certificateTemplateVersion: { create: vi.fn().mockImplementation(({ data }) => ({ id: 'version-1', ...data })) },
      auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    };
    const repository = new PrismaCertificateRepository({ $transaction: (callback: any) => callback(tx) } as any);
    await repository.createTemplate({ publicId: 'tpl-public', code: 'TPL', name: 'Template', nameAr: 'قالب', nameEn: 'Template', templateVersion: '1.0.0', status: CertificateTemplateStatus.DRAFT, issuerId: 'issuer-1', language: 'BILINGUAL', layout: 'LANDSCAPE', accentColor: '#075E45', secondaryColor: '#C9A227', titleAr: 'شهادة', titleEn: 'Cert', bodyAr: 'نص طويل', bodyEn: 'body long', validityPolicy: 'PERMANENT', requiresRevalidation: false }, { actorId: 'maker-1' });
    expect(tx.certificateTemplateVersion.create).toHaveBeenCalledOnce();
    expect(tx.auditRecord.create).toHaveBeenCalledOnce();
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
  });

  it('enforces maker-checker separation for template approval', async () => {
    const tx: any = {
      certificateTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 'template-1', status: CertificateTemplateStatus.PENDING_APPROVAL, currentVersion: { id: 'version-1', createdBy: 'maker-1' } }) },
    };
    const repository = new PrismaCertificateRepository({ $transaction: (callback: any) => callback(tx) } as any);
    await expect(repository.transitionTemplate('template-1', CertificateTemplateStatus.APPROVED, { actorId: 'maker-1' })).rejects.toThrow('MAKER_CHECKER_REQUIRED');
  });

  it('clears revocation lifecycle fields on replacement creation', async () => {
    const tx: any = {
      certificate: {
        findUnique: vi.fn().mockResolvedValue({ id: 'old', status: CertificateStatus.REVOKED, replacedByCertificateId: null }),
        create: vi.fn().mockImplementation(({ data }) => ({ id: 'new', ...data, createdAt: new Date(), updatedAt: new Date() })),
        update: vi.fn(),
      },
      certificateTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 'template-1', status: CertificateTemplateStatus.ACTIVE, issuerId: 'issuer-1' }) },
      certificateTemplateVersion: { findUnique: vi.fn().mockResolvedValue({ id: 'version-1', templateId: 'template-1', issuerId: 'issuer-1', status: CertificateTemplateStatus.ACTIVE }) },
      certificateIssuer: { findUnique: vi.fn().mockResolvedValue({ id: 'issuer-1', status: 'ACTIVE', signingKeyReference: 'kms://issuer/key' }) },
      certificateLedgerEntry: { create: vi.fn() }, auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    };
    const repository = new PrismaCertificateRepository({ $transaction: (callback: any) => callback(tx) } as any);
    await repository.reissue({ certificateId: 'old', reason: 'correction', actorId: 'checker', replacement: { ...issueData, sourceEventId: 'reissue-event', sourceCompletionId: 'reissue-completion', revokedAt: new Date(), revocationReason: 'old', revokedBy: 'old-admin' } as any });
    const created = tx.certificate.create.mock.calls[0][0].data;
    expect(created.revokedAt).toBeNull();
    expect(created.revocationReason).toBeNull();
    expect(created.revokedBy).toBeNull();
    expect(created.status).toBe(CertificateStatus.ACTIVE);
  });
});
