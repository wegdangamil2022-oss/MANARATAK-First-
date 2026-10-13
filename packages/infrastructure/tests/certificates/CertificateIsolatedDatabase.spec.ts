import { randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CertificateStatus, type IssueCertificateDto } from '@manaratak/domain';
import { PrismaCertificateRepository } from '../../src/certificates/PrismaCertificateRepository';
const isolated = process.env.CERTIFICATE_RUNTIME_ISOLATED === '1';
const url = new URL(
  process.env.DATABASE_URL ?? 'postgresql://unused@127.0.0.1:1/unavailable',
);
if (
  isolated &&
  (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/manaratak_certificate_verification')
)
  throw new Error('CERTIFICATE_DISPOSABLE_DATABASE_REQUIRED');
const first = new PrismaClient(),
  second = new PrismaClient();
const issuerId = randomUUID(),
  templateId = randomUUID(),
  versionId = randomUUID(),
  studentId = randomUUID();
const key = 'fixture-only-key';
const repository = new PrismaCertificateRepository(first, {
  read: async () => ({ retentionDays: null }),
});
const other = new PrismaCertificateRepository(second, {
  read: async () => ({ retentionDays: null }),
});
function issuance(): IssueCertificateDto {
  const identity = randomUUID(),
    now = new Date();
  return {
    publicId: identity,
    serialNumber: `FIXTURE-${identity}`,
    verificationCode: identity,
    verificationUrl: `https://fixture.invalid/verify/${identity}`,
    verificationHash: createHash('sha256').update(identity).digest('hex'),
    status: CertificateStatus.ACTIVE,
    certificateType: 'COURSE',
    studentReferenceId: studentId,
    recipientDisplayName: 'Isolated learner',
    achievementType: 'COURSE',
    achievementId: randomUUID(),
    achievementDisplayName: 'Isolated course',
    sourceCompletionId: randomUUID(),
    completedAt: now,
    sourceEventId: randomUUID(),
    sourceEventType: 'CourseCompleted',
    sourceEventVersion: '1.0.0',
    sourceEventPayloadHash: createHash('sha256')
      .update('fixture')
      .digest('hex'),
    issuedAt: now,
    validityPolicy: 'PERMANENT',
    requiresRevalidation: false,
    templateId,
    templateVersionId: versionId,
    templateVersion: '1.0.0',
    issuerId,
    issuerName: 'Isolated MANARATAK',
    digitalSignature: 'fixture-signature',
    signingKeyReference: key,
    skills: [],
    competencies: [],
    metadata: { signedEnvelope: { issuer: { authorityVersion: 1 } } },
    actorId: 'fixture-checker',
  };
}
describe.skipIf(!isolated)(
  'deferred PostgreSQL certificate owner contracts',
  () => {
    beforeAll(async () => {
      // Synthetic owner anchor for DB locking tests, not a storage/scanner proof.
      const logoId = randomUUID();
      await first.assetRecord.create({
        data: {
          id: logoId,
          reference: `fixture-logo:${logoId}`,
          ownerId: issuerId,
          ownerType: 'CertificateIssuer',
          lifecycleState: 'ACTIVE',
          securityClassification: 'INTERNAL',
          retentionCategory: 'PERMANENT',
          metadata: {
            originalFilename: 'fixture-logo.png',
            mimeType: 'image/png',
            fileExtension: 'png',
            byteSize: 1,
          },
          checksumAlgorithm: 'sha256',
          checksumHash: createHash('sha256')
            .update('fixture-logo')
            .digest('hex'),
        },
      });
      await first.certificateIssuer.create({
        data: {
          id: issuerId,
          publicId: randomUUID(),
          code: `FIXTURE-${randomUUID()}`,
          name: 'Isolated MANARATAK',
          issuerType: 'MANARATAK',
          status: 'ACTIVE',
          issuerLogoAssetId: logoId,
          signingKeyReference: key,
          metadata: { authorityVersion: 1 },
        },
      });
      await first.certificateTemplate.create({
        data: {
          id: templateId,
          publicId: randomUUID(),
          code: `FIXTURE-${randomUUID()}`,
          name: 'Fixture',
          nameAr: 'قالب تجريبي',
          nameEn: 'Fixture',
          status: 'ACTIVE',
          issuerId,
        },
      });
      await first.certificateTemplateVersion.create({
        data: {
          id: versionId,
          publicId: randomUUID(),
          templateId,
          issuerId,
          versionNumber: '1.0.0',
          status: 'ACTIVE',
          titleAr: 'شهادة تجريبية',
          titleEn: 'Fixture certificate',
          bodyAr: 'تجربة معزولة فقط',
          bodyEn: 'Isolated fixture only',
          createdBy: 'fixture-maker',
          approvedBy: 'fixture-checker',
          approvedAt: new Date(),
        },
      });
      await first.certificateTemplate.update({
        where: { id: templateId },
        data: { currentVersionId: versionId },
      });
    });
    afterAll(async () => {
      await Promise.all([first.$disconnect(), second.$disconnect()]);
    });
    it('serializes two independent clients to one replacement and matching ledger/outbox', async () => {
      const initial = await repository.issue(issuance());
      await repository.revoke({
        certificateId: initial.id,
        actorId: 'fixture-checker',
        reason: 'Isolated replacement proof',
      });
      const responses = await Promise.all([
        repository.reissue({
          certificateId: initial.id,
          actorId: 'fixture-checker',
          reason: 'Isolated replacement proof',
          replacement: issuance(),
        }),
        other.reissue({
          certificateId: initial.id,
          actorId: 'fixture-checker',
          reason: 'Isolated replacement proof',
          replacement: issuance(),
        }),
      ]);
      expect(responses[0].id).toBe(responses[1].id);
      expect(
        await first.certificate.count({
          where: { replacesCertificateId: initial.id },
        }),
      ).toBe(1);
      expect(
        (
          await first.certificate.findUniqueOrThrow({
            where: { id: initial.id },
          })
        ).replacedByCertificateId,
      ).toBe(responses[0].id);
      expect(
        await first.certificateLedgerEntry.count({
          where: { certificateId: responses[0].id, action: 'REISSUED' },
        }),
      ).toBe(1);
      expect(
        await first.transactionalOutboxRecord.count({
          where: {
            aggregateId: responses[0].id,
            eventType: 'CertificateReissued',
          },
        }),
      ).toBe(1);
      await expect(
        other.reissue({
          certificateId: initial.id,
          actorId: 'fixture-checker',
          reason: 'Different competing reason',
          replacement: issuance(),
        }),
      ).rejects.toThrow('CONFLICT');
    });
    it('keeps effective expiry consistent before sweeps and records expiry once across clients', async () => {
      const initial = await repository.issue({
        ...issuance(),
        validityPolicy: 'EXPIRING',
        expiresAt: new Date(Date.now() - 1000),
      });
      const listed = await repository.list({
        studentReferenceId: studentId,
        status: CertificateStatus.EXPIRED,
        page: 1,
        pageSize: 50,
      });
      expect(listed.data.find((row) => row.id === initial.id)?.status).toBe(
        CertificateStatus.EXPIRED,
      );
      await Promise.all([
        repository.expireDue(new Date(), 'fixture-worker-a'),
        other.expireDue(new Date(), 'fixture-worker-b'),
      ]);
      expect(
        await first.certificateLedgerEntry.count({
          where: { certificateId: initial.id, action: 'EXPIRED' },
        }),
      ).toBe(1);
      const page = await repository.listByStudent(studentId, 1, 1);
      expect(page.length).toBe(1);
      const next = await repository.listByStudent(studentId, 1, 1, page[0].id);
      expect(next.some((row) => row.id === page[0].id)).toBe(false);
      expect(
        await repository.findForStudent(initial.id, randomUUID()),
      ).toBeNull();
    });
  },
);
