import { describe, it, expect, vi } from 'vitest';
import { CertificateUseCases } from '../../src/certificates/use-cases/CertificateUseCases';
import { CertificateTrustPolicy } from '../../src/certificates/services/CertificateTrustPolicy';
import { CertificateReadModelService } from '../../src/certificates/use-cases/CertificateReadModelService';
import { CertificateArtifactRenderUseCase } from '../../src/certificates/use-cases/CertificateArtifactRenderUseCase';
import { PrismaCertificateRepository } from '../../../infrastructure/src/certificates/PrismaCertificateRepository';
import { EapCertificateArtifactStore } from '../../../infrastructure/src/certificates/EapCertificateArtifactStore';

const activeImage = {
  state: 'ACTIVE',
  classification: 'INTERNAL',
  metadata: { mimeType: 'image/png' },
  owner: { ownerType: 'CertificateIssuer', ownerId: 'issuer' },
};
const pending = {
  id: 'issuer',
  code: 'MANARATAK',
  name: 'MANARATAK',
  issuerType: 'MANARATAK',
  status: 'PENDING_APPROVAL',
  issuerLogoAssetId: 'logo',
  signingKeyReference: 'key',
  metadata: { trust: { createdBy: 'maker' } },
  updatedAt: new Date('2026-10-10T00:00:00Z'),
};
const context = {
  actorId: 'checker',
  reason: 'Authority evidence reviewed',
  expectedIssuerUpdatedAt: pending.updatedAt.toISOString(),
};
function issuerHarness(issuer: any = pending, asset: any = activeImage) {
  const repository: any = {
    findIssuerById: vi.fn(async () => issuer),
    createIssuer: vi.fn(async (data) => data),
    updateIssuer: vi.fn(async () => issuer),
  };
  const useCases = new CertificateUseCases(
    repository,
    {} as any,
    { findById: async () => asset } as any,
  );
  return { repository, useCases };
}
describe('section 14 authority and privacy regressions', () => {
  it('creates even requested ACTIVE external issuers pending with server-derived maker', async () => {
    const { useCases, repository } = issuerHarness();
    await useCases.createIssuer(
      {
        code: 'UNI',
        name: 'University',
        issuerType: 'UNIVERSITY',
        universityId: 'u',
        issuerLogoAssetId: 'logo',
        signingKeyReference: 'key',
        status: 'ACTIVE',
        accreditationAuthority: 'claimed',
        accreditationReference: 'claimed',
        metadata: { trust: { approvedBy: 'forged' } },
      } as any,
      { actorId: 'maker' },
    );
    expect(repository.createIssuer).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDING_APPROVAL',
        metadata: expect.objectContaining({ trust: { createdBy: 'maker', approvedBy: null } }),
      }),
      { actorId: 'maker' },
    );
  });
  it('rejects self approval', async () => {
    const h = issuerHarness();
    await expect(
      h.useCases.approveIssuer('issuer', 'evidence', 'authority', { ...context, actorId: 'maker' }),
    ).rejects.toThrow('MAKER_CHECKER');
    expect(h.repository.updateIssuer).not.toHaveBeenCalled();
  });
  for (const asset of [
    null,
    { ...activeImage, classification: 'PUBLIC' },
    { ...activeImage, state: 'ARCHIVED' },
    { ...activeImage, owner: { ownerType: 'CertificateIssuer', ownerId: 'other' } },
  ]) {
    it(`rejects untrusted authority evidence ${JSON.stringify(asset)}`, async () => {
      const h = issuerHarness(pending, asset);
      await expect(
        h.useCases.approveIssuer('issuer', 'evidence', 'authority', context),
      ).rejects.toThrow('EVIDENCE_INVALID');
      expect(h.repository.updateIssuer).not.toHaveBeenCalled();
    });
  }
  it('rejects external authority without its canonical owner resolver', async () => {
    const h = issuerHarness({ ...pending, issuerType: 'UNIVERSITY', universityId: 'unknown' });
    await expect(
      h.useCases.approveIssuer('issuer', 'evidence', 'authority', context),
    ).rejects.toThrow('CANONICAL_AUTHORITY_UNVERIFIED');
  });
  it('accepts independent official-issuer approval with private evidence', async () => {
    const h = issuerHarness();
    await h.useCases.approveIssuer('issuer', 'evidence', 'authority', context);
    expect(h.repository.updateIssuer).toHaveBeenCalledWith(
      'issuer',
      { status: 'ACTIVE' },
      expect.objectContaining({
        issuerApproval: { evidenceAssetId: 'evidence', authorityReference: 'authority' },
      }),
    );
  });
  it('blocks direct activation and metadata tampering through ordinary edits', async () => {
    const h = issuerHarness();
    await expect(h.useCases.updateIssuer('issuer', { status: 'ACTIVE' }, context)).rejects.toThrow(
      'APPROVAL_REQUIRED',
    );
    await expect(
      h.useCases.updateIssuer('issuer', { metadata: { trust: { approvedBy: 'forged' } } }, context),
    ).rejects.toThrow('APPROVAL_REQUIRED');
  });
  it('does not expose forged claims from failed public verification', async () => {
    const owner: any = {
      verifyByCode: async () => ({
        publicId: 'p',
        serialNumber: 's',
        verificationCode: 'code',
        status: 'ACTIVE',
        integrityVerified: false,
        isValid: false,
        issuerName: 'FAKE UNIVERSITY',
        recipientDisplayName: 'PRIVATE NAME',
        achievementDisplayName: 'FAKE DEGREE',
      }),
    };
    const result = await new CertificateReadModelService({} as any, owner).verifyPublic('code');
    expect(result.isValid).toBe(false);
    for (const key of ['issuerName', 'recipientDisplayName', 'achievementDisplayName', 'issuedAt'])
      expect(result).not.toHaveProperty(key);
  });
  it('rejects document rendering without a signature guard before any storage', async () => {
    const store: any = { store: vi.fn() };
    const uc = new CertificateArtifactRenderUseCase(
      { findById: async () => ({ id: 'c' }) } as any,
      {} as any,
      store,
    );
    await expect(uc.renderCertificate('c')).rejects.toThrow('TRUST_GUARD_REQUIRED');
    expect(store.store).not.toHaveBeenCalled();
  });
  it('checks a revoked already-rendered certificate before returning stored files', async () => {
    const guard = {
      assertRenderable: vi.fn(async () => {
        throw new Error('CERTIFICATE_ARTIFACT_STATE_INVALID');
      }),
    };
    const store: any = { store: vi.fn() };
    const uc = new CertificateArtifactRenderUseCase(
      {
        findById: async () => ({ id: 'c', status: 'REVOKED', certificatePdfAssetId: 'pdf' }),
      } as any,
      {} as any,
      store,
      guard,
    );
    await expect(uc.renderCertificate('c')).rejects.toThrow('ARTIFACT_STATE_INVALID');
    expect(store.store).not.toHaveBeenCalled();
  });
  for (const kind of ['PDF', 'PREVIEW', 'QR'] as const) {
    it(`stores ${kind} using its intended security classification`, async () => {
      const ingest: any = {
        requestUploadLocator: vi.fn(async () => {
          throw new Error('stop before network');
        }),
      };
      const store = new EapCertificateArtifactStore(
        { findByReference: async () => null } as any,
        ingest,
        {} as any,
      );
      await expect(
        store.store({
          certificateId: 'c',
          renderFingerprint: 'f',
          artifact: {
            kind,
            bytes: new Uint8Array([1]),
            mimeType: 'image/png',
            filename: 'file',
            fileExtension: 'png',
          },
        }),
      ).rejects.toThrow('stop before network');
      expect(ingest.requestUploadLocator.mock.calls[0][0].classification).toBe(
        kind === 'QR' ? 'PUBLIC' : 'INTERNAL',
      );
    });
  }
  it('refuses a legacy PUBLIC private artifact instead of replaying its asset', async () => {
    const store = new EapCertificateArtifactStore(
      {
        findByReference: async () => ({
          ...activeImage,
          owner: { ownerType: 'Certificate', ownerId: 'c' },
          classification: 'PUBLIC',
          id: { value: 'public-file' },
        }),
      } as any,
      {} as any,
      {} as any,
    );
    await expect(
      store.store({
        certificateId: 'c',
        renderFingerprint: 'f',
        artifact: {
          kind: 'PREVIEW',
          bytes: new Uint8Array([1]),
          mimeType: 'image/png',
          filename: 'file',
          fileExtension: 'png',
        },
      }),
    ).rejects.toThrow('SECURITY_MISMATCH');
  });
});
describe('certificate persistence and cryptography', () => {
  it('blocks authority changes on active issuers inside the locked transaction', async () => {
    const tx: any = {
      $queryRaw: vi.fn(),
      certificateIssuer: {
        findUnique: async () => ({ ...pending, status: 'ACTIVE' }),
        update: vi.fn(),
      },
    };
    const repo = new PrismaCertificateRepository({
      $transaction: async (fn: any) => fn(tx),
    } as any);
    await expect(
      repo.updateIssuer('issuer', { name: 'Different authority' }, context),
    ).rejects.toThrow('AUTHORITY_IMMUTABLE');
    expect(tx.certificateIssuer.update).not.toHaveBeenCalled();
  });
  it('rejects an issuer edit opened before a concurrent change', async () => {
    const tx: any = {
      $queryRaw: vi.fn(),
      certificateIssuer: { findUnique: async () => pending, update: vi.fn() },
    };
    const repo = new PrismaCertificateRepository({
      $transaction: async (fn: any) => fn(tx),
    } as any);
    await expect(
      repo.updateIssuer(
        'issuer',
        {},
        { ...context, expectedIssuerUpdatedAt: '2020-01-01T00:00:00.000Z' },
      ),
    ).rejects.toThrow('STALE');
  });
  it('rejects mismatched replacement semantics rather than returning another request result', async () => {
    const tx: any = {
      $queryRaw: vi.fn(),
      certificate: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ replacedByCertificateId: 'new' })
          .mockResolvedValueOnce({ metadata: { replacementRequest: { reason: 'other' } } }),
      },
    };
    const repo = new PrismaCertificateRepository({
      $transaction: async (fn: any) => fn(tx),
    } as any);
    await expect(
      repo.reissue({
        certificateId: 'old',
        actorId: 'actor',
        reason: 'new reason',
        replacement: { templateId: 't' },
      } as any),
    ).rejects.toThrow('REQUEST_CONFLICT');
  });
  it('uses direct certificate and owner predicates for student delivery lookup', async () => {
    const findFirst = vi.fn(async () => null);
    const repo = new PrismaCertificateRepository({ certificate: { findFirst } } as any);
    await repo.findForStudent('certificate', 'student');
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'certificate', studentReferenceId: 'student' },
    });
  });
  it('does not queue a second verification event inside the analytics sampling window', async () => {
    const tx: any = {
      $queryRaw: vi.fn(),
      certificateVerificationLog: { findFirst: async () => ({ id: 'recent' }), create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaCertificateRepository({
      $transaction: async (fn: any) => fn(tx),
    } as any);
    await repo.recordVerification('c', 'VALID', 'PUBLIC_CODE');
    expect(tx.transactionalOutboxRecord.create).not.toHaveBeenCalled();
  });
  it('keeps historical verification after active key rotation', () => {
    const old = new CertificateTrustPolicy({
      signingKeyReference: 'old',
      signingSecret: 'old-secret',
    });
    const signature = old.signHash('digest', 'old');
    const rotated = new CertificateTrustPolicy({
      signingKeyReference: 'new',
      signingSecret: 'new-secret',
      historicalKeys: { old: 'old-secret' },
    });
    expect(rotated.verifyHash('digest', signature, 'old')).toBe(true);
    expect(rotated.verifyHash('tampered', signature, 'old')).toBe(false);
  });
  it('refuses source fallback without an explicit signing secret', () => {
    expect(() => new CertificateTrustPolicy().signHash('hash', 'key')).toThrow('NOT_CONFIGURED');
  });
  it('refuses exportable secret signing in production', () => {
    const policy = new CertificateTrustPolicy({
      productionLike: true,
      signingSecret: 'secret',
      signingKeyReference: 'key',
    });
    expect(() => policy.signHash('hash', 'key')).toThrow('NON_EXPORTABLE_SIGNER_REQUIRED');
    expect(policy.runtimeReadiness().signingProviderConfigured).toBe(false);
  });
});

describe('durable review and render recovery boundaries', () => {
  const updatedAt = new Date('2026-10-10T00:00:00Z');
  const evidenceInput = {
    name: 'Canonical Name',
    evidenceAssetId: 'evidence',
    expectedUpdatedAt: updatedAt.toISOString(),
  };
  function harness(row: any) {
    const tx: any = {
      $queryRaw: vi.fn(),
      certificate: {
        findUnique: async () => row,
        update: vi.fn(async ({ data }: any) => ({ ...row, ...data })),
      },
    };
    return {
      tx,
      repo: new PrismaCertificateRepository({ $transaction: async (fn: any) => fn(tx) } as any),
    };
  }
  it('rejects stale correction approval without changing metadata', async () => {
    const h = harness({ updatedAt, status: 'REVOKED' });
    await expect(
      h.repo.recordReview(
        'c',
        'RECIPIENT_CORRECTION_APPROVED',
        { ...evidenceInput, expectedUpdatedAt: '2020-01-01T00:00:00.000Z' },
        { actorId: 'checker', reason: 'review reason' },
      ),
    ).rejects.toThrow('REVIEW_STALE');
    expect(h.tx.certificate.update).not.toHaveBeenCalled();
  });
  it('does not allow the correction maker to approve their own request', async () => {
    const h = harness({
      updatedAt,
      status: 'REVOKED',
      metadata: {
        recipientCorrection: {
          state: 'PENDING_APPROVAL',
          name: evidenceInput.name,
          evidenceAssetId: 'evidence',
          createdBy: 'maker',
        },
      },
    });
    await expect(
      h.repo.recordReview('c', 'RECIPIENT_CORRECTION_APPROVED', evidenceInput, {
        actorId: 'maker',
        reason: 'review reason',
      }),
    ).rejects.toThrow('MAKER_CHECKER');
    expect(h.tx.certificate.update).not.toHaveBeenCalled();
  });
  it('does not approve evidence substituted after the correction request', async () => {
    const h = harness({
      updatedAt,
      status: 'REVOKED',
      metadata: {
        recipientCorrection: {
          state: 'PENDING_APPROVAL',
          name: evidenceInput.name,
          evidenceAssetId: 'original',
          createdBy: 'maker',
        },
      },
    });
    await expect(
      h.repo.recordReview('c', 'RECIPIENT_CORRECTION_APPROVED', evidenceInput, {
        actorId: 'checker',
        reason: 'review reason',
      }),
    ).rejects.toThrow('STATE_INVALID');
  });
  for (const validUntil of [
    '2020-01-01T00:00:00Z',
    new Date(Date.now() + 366 * 86400000).toISOString(),
  ])
    it(`rejects a revalidation window outside policy ${validUntil}`, async () => {
      const h = harness({ updatedAt, status: 'ACTIVE', requiresRevalidation: true });
      await expect(
        h.repo.recordReview(
          'c',
          'REVALIDATION_APPROVED',
          { ...evidenceInput, validUntil },
          { actorId: 'checker', reason: 'review reason' },
        ),
      ).rejects.toThrow('STATE_INVALID');
    });
  it('does not permit the original issuer actor to revalidate', async () => {
    const h = harness({
      updatedAt,
      status: 'ACTIVE',
      requiresRevalidation: true,
      metadata: { issuedBy: 'maker' },
    });
    await expect(
      h.repo.recordReview(
        'c',
        'REVALIDATION_APPROVED',
        { ...evidenceInput, validUntil: new Date(Date.now() + 86400000).toISOString() },
        { actorId: 'maker', reason: 'review reason' },
      ),
    ).rejects.toThrow('STATE_INVALID');
  });
  it('retains staged files and marks a failed job recoverable', async () => {
    const h = harness({
      status: 'ACTIVE',
      metadata: { renderJob: { fingerprint: 'f', attempts: 1, stored: { PDF: 'private-pdf' } } },
    });
    const stored = await h.repo.checkpointRender('c', 'f', 'FAILED');
    expect(stored).toEqual({ PDF: 'private-pdf' });
    expect(h.tx.certificate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            renderJob: expect.objectContaining({ state: 'RECOVERY_REQUIRED', attempts: 1 }),
          }),
        }),
      }),
    );
  });
  it('requires reconciliation after eight render attempts', async () => {
    const h = harness({
      status: 'ACTIVE',
      metadata: { renderJob: { fingerprint: 'f', attempts: 8 } },
    });
    await expect(h.repo.checkpointRender('c', 'f', 'BEGIN')).rejects.toThrow('RECOVERY_REQUIRED');
    expect(h.tx.certificate.update).not.toHaveBeenCalled();
  });
  it('does not reuse files from another render fingerprint', async () => {
    const h = harness({
      status: 'ACTIVE',
      metadata: { renderJob: { fingerprint: 'old', attempts: 1 } },
    });
    await expect(h.repo.checkpointRender('c', 'new', 'BEGIN')).rejects.toThrow(
      'FINGERPRINT_CONFLICT',
    );
  });
  it('rejects correction evidence owned by another certificate before recording a review', async () => {
    const repo: any = {
      findById: async () => ({ id: 'c', studentReferenceId: 's' }),
      recordReview: vi.fn(),
    };
    const uc = new CertificateUseCases(
      repo,
      {} as any,
      {
        findById: async () => ({
          ...activeImage,
          owner: { ownerType: 'Certificate', ownerId: 'another' },
        }),
      } as any,
    );
    await expect(
      uc.reviewCertificate('c', 'RECIPIENT_CORRECTION_REQUESTED', evidenceInput, {
        actorId: 'maker',
      }),
    ).rejects.toThrow('EVIDENCE_INVALID');
    expect(repo.recordReview).not.toHaveBeenCalled();
  });
});

describe('owner transaction prevents direct artifact and template bypasses', () => {
  for (const asset of [
    {
      ownerType: 'Certificate',
      ownerId: 'other',
      lifecycleState: 'ACTIVE',
      securityClassification: 'INTERNAL',
      metadata: { mimeType: 'application/pdf' },
    },
    {
      ownerType: 'Certificate',
      ownerId: 'c',
      lifecycleState: 'ACTIVE',
      securityClassification: 'PUBLIC',
      metadata: { mimeType: 'application/pdf' },
    },
  ])
    it('refuses a direct private artifact attachment with invalid EAP authority', async () => {
      const tx: any = {
        $queryRaw: vi.fn(),
        certificate: { findUnique: async () => ({ id: 'c', status: 'ACTIVE' }), update: vi.fn() },
        assetRecord: { findUnique: async () => asset },
      };
      const repo = new PrismaCertificateRepository({
        $transaction: async (fn: any) => fn(tx),
      } as any);
      await expect(
        repo.attachArtifacts({
          certificateId: 'c',
          certificatePdfAssetId: 'asset',
          actorId: 'renderer',
        }),
      ).rejects.toThrow('OWNERSHIP_INVALID');
      expect(tx.certificate.update).not.toHaveBeenCalled();
    });
  it('refuses template activation if pinned visual bytes changed inside the transaction', async () => {
    const tx: any = {
      $queryRaw: vi.fn(),
      certificateTemplate: {
        findUnique: async () => ({
          currentVersionId: 'v',
          status: 'APPROVED',
          currentVersion: {
            id: 'v',
            issuerId: 'issuer',
            approvedBy: 'checker',
            logoAssetId: 'logo',
            metadata: { assetProvenance: { logo: 'approved-hash' } },
          },
        }),
        update: vi.fn(),
      },
      certificateIssuer: { findUnique: async () => ({ ...pending, status: 'ACTIVE' }) },
      assetRecord: {
        findUnique: async () => ({
          lifecycleState: 'ACTIVE',
          metadata: { mimeType: 'image/png' },
          checksumAlgorithm: 'SHA256',
          checksumHash: 'modified-hash',
        }),
      },
    };
    const repo = new PrismaCertificateRepository({
      $transaction: async (fn: any) => fn(tx),
    } as any);
    await expect(
      repo.transitionTemplate('template', 'ACTIVE' as any, {
        actorId: 'checker',
        expectedTemplateVersionId: 'v',
        expectedTemplateStatus: 'APPROVED' as any,
      }),
    ).rejects.toThrow('PROVENANCE_CHANGED');
    expect(tx.certificateTemplate.update).not.toHaveBeenCalled();
  });
});

describe('bounded owner-specific cursors', () => {
  it('rejects a student cursor belonging to another owner', async () => {
    const findFirst = vi.fn(async () => null),
      findMany = vi.fn();
    const repo = new PrismaCertificateRepository({ certificate: { findFirst, findMany } } as any);
    await expect(repo.listByStudent('student', 1, 50, 'foreign')).rejects.toThrow('CURSOR_INVALID');
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', studentReferenceId: 'student' },
      select: { id: true, issuedAt: true },
    });
    expect(findMany).not.toHaveBeenCalled();
  });
  it('uses a bounded keyset query rather than a deep offset for student history', async () => {
    const issuedAt = new Date(),
      findMany = vi.fn(async () => []);
    const repo = new PrismaCertificateRepository({
      certificate: { findFirst: async () => ({ id: 'anchor', issuedAt }), findMany },
    } as any);
    await repo.listByStudent('student', 1, 50, 'anchor');
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: {
        studentReferenceId: 'student',
        OR: [{ issuedAt: { lt: issuedAt } }, { issuedAt, id: { lt: 'anchor' } }],
      },
      take: 50,
    });
    expect(findMany.mock.calls[0][0]).not.toHaveProperty('skip');
  });
});

describe('scheduled bounded expiry maintenance', () => {
  it('expires a due row once, audits it, and prunes only the bounded retention batch', async () => {
    const due = { id: 'c', serialNumber: 'MNR-1', expiresAt: new Date('2020-01-01') };
    const tx: any = {
      $queryRaw: vi.fn(async () => [{ id: 'c' }]),
      certificate: {
        findMany: vi.fn(async () => [due]),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      certificateVerificationLog: {
        findMany: vi.fn(async () => [{ id: 'old-log' }]),
        deleteMany: vi.fn(),
      },
      certificateLedgerEntry: { create: vi.fn() },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaCertificateRepository({
      $transaction: async (fn: any) => fn(tx),
    } as any);
    expect(await repo.expireDue(new Date('2026-10-10'), 'maintenance')).toBe(1);
    expect(tx.$queryRaw.mock.calls[0][0].join('')).toContain('LIMIT 100 FOR UPDATE SKIP LOCKED');
    expect(tx.certificateVerificationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(tx.certificateVerificationLog.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-log'] } },
    });
    expect(tx.certificateLedgerEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.auditRecord.create).toHaveBeenCalledTimes(1);
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledTimes(1);
  });
  it('does not create another expiry event after a competing state change', async () => {
    const tx: any = {
      $queryRaw: async () => [{ id: 'c' }],
      certificate: { findMany: async () => [{ id: 'c' }], updateMany: async () => ({ count: 0 }) },
      certificateVerificationLog: { findMany: async () => [] },
      certificateLedgerEntry: { create: vi.fn() },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaCertificateRepository({
      $transaction: async (fn: any) => fn(tx),
    } as any);
    expect(await repo.expireDue(new Date(), 'maintenance')).toBe(0);
    expect(tx.transactionalOutboxRecord.create).not.toHaveBeenCalled();
  });
});
