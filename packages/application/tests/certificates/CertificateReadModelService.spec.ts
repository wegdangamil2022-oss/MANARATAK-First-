import { describe, expect, it, vi } from 'vitest';
import { CertificateStatus } from '@manaratak/domain';
import { CertificateReadModelService } from '../../src/certificates/use-cases/CertificateReadModelService';

describe('P6 certificate read models', () => {
  it('returns a sanitized P14-owned student projection without signature or internal metadata', async () => {
    const repository = {
      listByStudent: vi.fn().mockResolvedValue([{
        id: 'cert-1', publicId: 'public-1', serialNumber: 'MNR-1', verificationCode: 'VERIFY-1', verificationUrl: '/verify/1',
        status: CertificateStatus.ACTIVE, certificateType: 'COURSE', achievementType: 'COURSE', achievementId: 'course-1',
        achievementDisplayName: 'Course One', issuedAt: new Date('2026-09-03T00:00:00Z'), expiresAt: null,
        certificatePdfAssetId: 'asset-pdf', previewImageAssetId: 'asset-preview', digitalSignature: 'secret-signature',
        signingKeyReference: 'kms://internal', metadata: { internal: true }, verificationHash: 'internal-hash',
      }]),
    } as any;
    const useCases = { verifyByCode: vi.fn() } as any;
    const service = new CertificateReadModelService(repository, useCases);
    const [row] = await service.listForStudent('student-1');
    expect(row).toEqual(expect.objectContaining({ certificateId: 'cert-1', publicId: 'public-1', verificationCode: 'VERIFY-1' }));
    expect(row).not.toHaveProperty('digitalSignature');
    expect(row).not.toHaveProperty('signingKeyReference');
    expect(row).not.toHaveProperty('verificationHash');
    expect(row).not.toHaveProperty('metadata');
  });

  it('delegates public verification truth to the P14 use case instead of duplicating it', async () => {
    const repository = { listByStudent: vi.fn() } as any;
    const useCases = { verifyByCode: vi.fn().mockResolvedValue({ verificationCode: 'VERIFY-1', isValid: true }) } as any;
    const service = new CertificateReadModelService(repository, useCases);
    await expect(service.verifyPublic('VERIFY-1')).resolves.toEqual(expect.objectContaining({ isValid: true }));
    expect(useCases.verifyByCode).toHaveBeenCalledWith('VERIFY-1');
  });
});
