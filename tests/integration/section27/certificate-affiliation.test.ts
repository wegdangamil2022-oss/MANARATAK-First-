import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CertificateAffiliationReadService } from '../../../packages/application/src/certificates/use-cases/CertificateAffiliationReadService';
import { CertificateReadModelService } from '../../../packages/application/src/certificates/use-cases/CertificateReadModelService';
import { CertificateUseCases } from '../../../packages/application/src/certificates/use-cases/CertificateUseCases';
const snapshot = { ownerType: 'UNIVERSITY' as const, ownerId: 'old' };
const issuer = {
  id: 'issuer',
  issuerType: 'UNIVERSITY',
  status: 'ACTIVE',
  universityId: 'old',
  name: 'Issuer now',
  metadata: {
    trust: {
      approvedBy: 'reviewer',
      authorityReference: 'authority',
      evidenceChecksum: 'private-checksum',
    },
  },
};
function service(
  input: { issuer?: any; universities?: Record<string, any>; trusted?: boolean } = {},
) {
  return new CertificateAffiliationReadService(
    { findIssuerById: async () => (input.issuer === undefined ? issuer : input.issuer) } as any,
    {
      findById: async (id: string) =>
        input.universities
          ? (input.universities[id] ?? null)
          : {
              id: 'old',
              slug: 'new-university-name',
              displayName: 'Renamed university',
              status: 'PUBLISHED',
            },
    } as any,
    { validate: async () => input.trusted ?? true } as any,
  );
}
test('certificate affiliation: renamed university label is current while historical issuer name remains immutable', async () => {
  const affiliates = service();
  const row = {
    issuerId: 'issuer',
    issuerType: 'UNIVERSITY',
    issuerAffiliationSnapshot: snapshot,
    issuerName: 'Signed historical name',
    integrityVerified: true,
    isValid: true,
    skills: [],
    competencies: [],
  };
  const read = new CertificateReadModelService(
    {} as any,
    { verifyByCode: async () => row } as any,
    affiliates,
  );
  const result = await read.verifyPublic('code');
  assert.equal(result.issuerName, 'Signed historical name');
  assert.equal(result.issuerAffiliation?.currentDisplayName, 'Renamed university');
  assert.equal(result.issuerAffiliation?.state, 'CURRENT');
  assert.equal(result.isValid, true);
  assert.equal(JSON.stringify(result).includes('private-checksum'), false);
  assert.equal('issuerAffiliationSnapshot' in result, false);
});
test('certificate affiliation: archived university retires affiliation without invalidating certificate signature', async () => {
  const affiliates = service({
    universities: { old: { status: 'ARCHIVED', displayName: 'Not public' } },
  });
  const result = await new CertificateReadModelService(
    {} as any,
    {
      verifyByCode: async () => ({
        issuerId: 'issuer',
        issuerType: 'UNIVERSITY',
        issuerAffiliationSnapshot: snapshot,
        issuerName: 'Original',
        integrityVerified: true,
        isValid: true,
        skills: [],
        competencies: [],
      }),
    } as any,
    affiliates,
  ).verifyPublic('code');
  assert.equal(result.issuerAffiliation?.state, 'RETIRED');
  assert.equal(result.issuerAffiliation?.currentDisplayName, undefined);
  assert.equal(result.integrityVerified, true);
  assert.equal(result.isValid, true);
});
test('certificate affiliation: reviewed successor binding is explicit and preserves historical owner status', async () => {
  const affiliates = service({
    issuer: { ...issuer, universityId: 'successor' },
    universities: {
      old: { status: 'ARCHIVED' },
      successor: { status: 'PUBLISHED', displayName: 'Successor', slug: 'successor' },
    },
  });
  const result = await affiliates.resolve('issuer', 'UNIVERSITY', snapshot);
  assert.equal(result.state, 'CHANGED');
  assert.equal(result.historicalOwnerState, 'RETIRED');
  assert.equal(result.currentDisplayName, 'Successor');
});
test('certificate affiliation: changed binding without current delegation proof is unverified', async () => {
  const result = await service({
    issuer: { ...issuer, universityId: 'successor' },
    trusted: false,
  }).resolve('issuer', 'UNIVERSITY', snapshot);
  assert.equal(result.state, 'UNVERIFIED');
  assert.equal(result.currentDisplayName, undefined);
});
test('certificate affiliation: absent owner and legacy snapshots never invent an affiliation', async () => {
  assert.equal(
    (await service({ issuer: null }).resolve('issuer', 'UNIVERSITY', snapshot)).state,
    'UNAVAILABLE',
  );
  assert.equal(
    (await service().resolve('issuer', 'UNIVERSITY', undefined)).state,
    'LEGACY_UNVERIFIED',
  );
  assert.equal((await service().resolve('issuer', 'ABSHEER', undefined)).state, 'NOT_APPLICABLE');
});
test('certificate affiliation: invalid signature never triggers current affiliation lookup', async () => {
  let called = false;
  const result = await new CertificateReadModelService(
    {} as any,
    { verifyByCode: async () => ({ integrityVerified: false, isValid: false }) } as any,
    {
      resolve: async () => {
        called = true;
        return { state: 'CURRENT' };
      },
    },
  ).verifyPublic('code');
  assert.equal(called, false);
  assert.equal(result.issuerAffiliation, undefined);
});
test('certificate affiliation: new signed envelope captures owner identity independently of later issuer edits', () => {
  const issue = new CertificateUseCases({} as any, {} as any);
  const envelope = (issue as any).signedEnvelope({
    serialNumber: 'serial',
    verificationCode: 'verify',
    certificateType: 'COURSE',
    studentReferenceId: 'student',
    recipientDisplayName: null,
    achievement: {
      type: 'COURSE',
      id: 'course',
      displayName: 'Course',
      completionId: 'completion',
      completedAt: new Date(),
    },
    issuedAt: new Date(),
    expiresAt: null,
    template: {
      validityPolicy: 'PERMANENT',
      id: 'template',
      currentVersionId: 'version',
      templateVersion: '1',
    },
    issuer: { ...issuer, publicId: 'public', signingKeyReference: 'key' },
    replacesCertificateId: null,
  });
  assert.deepEqual(envelope.issuer.affiliation, snapshot);
  assert.equal(envelope.issuer.issuerName, 'Issuer now');
});
