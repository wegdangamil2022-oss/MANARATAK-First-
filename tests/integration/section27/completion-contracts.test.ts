import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graphArrayPage } from '../../../packages/application/src/read-models/GraphPagination';
import {
  evaluateAdmissionScores,
  admissionPublicationScales,
  assertAdmissionScoreProfiles,
} from '../../../packages/domain/src/tests-platform/AdmissionScoreInterpretation';
import { studentDocumentAttestationState } from '../../../packages/domain/src/students/StudentDocumentAttestationPolicy';
import { StudentDocumentUploadUseCases } from '../../../packages/application/src/students/use-cases/StudentDocumentUploadUseCases';
import { StudentDocumentReviewUseCases } from '../../../packages/application/src/students/use-cases/StudentDocumentReviewUseCases';
import { ScholarshipReferenceLifecycle } from '../../../packages/infrastructure/src/scholarships/ScholarshipReferenceLifecycle';
import { CrossModuleIntegrityUseCase } from '../../../packages/application/src/integration/CrossModuleIntegrityUseCase';
import { publishedAdmissionScoresSql } from '../../../packages/infrastructure/src/international-tests/AdmissionScoreSql';
const scale = (
  minimum: number,
  maximum: number,
  variantId: string | null = null,
  sectionId: string | null = null,
) => ({
  overallMinimum: minimum,
  overallMaximum: maximum,
  metadata: { admissionScoreScope: { variantId, sectionId } },
});
test('graph continuation: 80 canonical references remain reachable after an unrelated insert; cursor scope cannot cross owners', () => {
  const rows = Array.from({ length: 80 }, (_, n) => ({ id: `p-${String(n).padStart(3, '0')}` }));
  const first = graphArrayPage(rows, (row) => row.id, 'owner:a:programs', undefined, 24),
    rest = graphArrayPage(
      [{ id: 'p-000a' }, ...rows],
      (row) => row.id,
      'owner:a:programs',
      first.nextCursor!,
      24,
    );
  assert.equal(first.total, 80);
  assert.equal(rest.total, 81);
  assert.equal(rest.data[0].id, 'p-024');
  assert.equal(
    rest.data.some((row) => first.data.some((prior) => prior.id === row.id)),
    false,
  );
  assert.throws(
    () => graphArrayPage(rows, (row) => row.id, 'owner:b:programs', first.nextCursor!, 24),
    /CURSOR_INVALID/,
  );
  let after: string | undefined,
    count = 0;
  do {
    const page = graphArrayPage(rows, (row) => row.id, 'scope', after, 24);
    count += page.data.length;
    after = page.nextCursor ?? undefined;
  } while (after);
  assert.equal(count, 80);
});
test('test owner scoring: changed published version boundaries and ambiguous scales never use mutable root defaults', () => {
  assert.equal(evaluateAdmissionScores({ minimumScore: 9 }, [scale(0, 9)]).state, 'VALID');
  assert.equal(evaluateAdmissionScores({ minimumScore: 9 }, [scale(10, 100)]).state, 'INVALID');
  assert.equal(evaluateAdmissionScores({ minimumScore: 9 }, []).state, 'UNVERIFIED');
  assert.equal(
    evaluateAdmissionScores({ minimumScore: 9 }, [scale(0, 9), scale(0, 100)]).state,
    'UNVERIFIED',
  );
  assert.equal(
    evaluateAdmissionScores({ minimumScore: 5 }, [{ ...scale(0, 9), scoreIncrement: 0 }]).state,
    'UNVERIFIED',
  );
});
test('test owner scoring: explicit reviewed variant and section scopes are required independently', () => {
  const scores = [scale(0, 9), scale(0, 120, 'computer'), scale(0, 30, 'computer', 'reading')];
  assert.equal(
    evaluateAdmissionScores(
      { variantId: 'computer', minimumScore: 90, sectionScores: { reading: 25 } },
      scores,
    ).state,
    'VALID',
  );
  assert.equal(
    evaluateAdmissionScores({ variantId: 'paper', minimumScore: 90 }, scores).state,
    'UNVERIFIED',
  );
  assert.equal(
    evaluateAdmissionScores({ variantId: 'computer', sectionScores: { writing: 20 } }, scores)
      .state,
    'UNVERIFIED',
  );
  assert.equal(
    evaluateAdmissionScores({ variantId: 'computer', sectionScores: { reading: 31 } }, scores)
      .state,
    'INVALID',
  );
  assert.equal(evaluateAdmissionScores({ sectionScores: ['25'] }, scores).state, 'INVALID');
  assert.equal(
    evaluateAdmissionScores({ minimumScore: 6.25 }, [{ ...scale(0, 9), scoreIncrement: 0.5 }])
      .state,
    'INVALID',
  );
});
test('test owner publication: freeze reviewed interpretation into version-local scales, reject foreign variant/section IDs', () => {
  const owner = {
    scoreScale: { overallMinimum: 0, overallMaximum: 9 },
    variants: [{ id: 'computer', isActive: true }],
    sections: [{ id: 'reading' }],
    optionalFields: {
      admissionScoreProfiles: [
        {
          variantId: 'computer',
          overall: { minimum: 0, maximum: 120 },
          sections: [{ sectionId: 'reading', minimum: 0, maximum: 30 }],
          sourceUrl: 'https://official.example/scores',
        },
      ],
    },
  };
  const rows = admissionPublicationScales(owner);
  assert.equal(rows.length, 3);
  owner.optionalFields.admissionScoreProfiles[0].overall.maximum = 100;
  assert.equal(rows[1].overallMaximum, 120);
  assert.equal(rows[2].metadata.admissionScoreScope.sectionId, 'reading');
  assert.throws(
    () =>
      assertAdmissionScoreProfiles(
        [{ ...owner.optionalFields.admissionScoreProfiles[0], variantId: 'foreign' }],
        owner,
      ),
    /OWNER_INVALID/,
  );
  assert.throws(
    () =>
      assertAdmissionScoreProfiles(
        [
          {
            ...owner.optionalFields.admissionScoreProfiles[0],
            sections: [{ sectionId: 'foreign', minimum: 0, maximum: 9 }],
          },
        ],
        owner,
      ),
    /OWNER_INVALID/,
  );
  const sql = publishedAdmissionScoresSql();
  assert.ok(sql.sql.includes('admissionScoreScope'));
  assert.ok(sql.sql.includes('jsonb_each'));
  assert.ok(sql.sql.includes('"scoreIncrement"'));
});
const now = Date.now(),
  binding: any = {
    id: 'binding',
    trackerId: 'tracker',
    requirementId: 'requirement',
    assetId: 'asset',
    ownerVersionId: 'version',
    requirementSnapshot: { displayName: 'Transcript' },
    consentGrantedAt: new Date(now - 1000),
    reviewConsentGrantedAt: new Date(now - 1000),
    reviewConsentUntil: new Date(now + 86400000),
    retentionUntil: new Date(now + 180 * 86400000),
    expiresAt: null,
    attestation: {
      verdict: 'VERIFIED',
      reviewedBy: 'reviewer',
      reviewedAt: new Date(now - 500).toISOString(),
      assetId: 'asset',
      ownerVersionId: 'version',
      cycleId: 'cycle',
      checksumSha256: 'a'.repeat(64),
      validUntil: new Date(now + 30 * 86400000).toISOString(),
      evidenceReference: 'OFFICIAL:123',
    },
  };
test('private academic attestation: replacement, changed cycle/version/digest, expiry and consent withdrawal invalidate readiness', () => {
  assert.equal(studentDocumentAttestationState(binding, 'cycle', 'a'.repeat(64), now), 'VERIFIED');
  for (const changed of [
    { assetId: 'new-asset' },
    { ownerVersionId: 'new-version' },
    { reviewConsentGrantedAt: null },
    { retentionUntil: new Date(now - 1) },
  ])
    assert.equal(
      studentDocumentAttestationState({ ...binding, ...changed }, 'cycle', 'a'.repeat(64), now),
      'STALE',
    );
  assert.equal(
    studentDocumentAttestationState(binding, 'another-cycle', 'a'.repeat(64), now),
    'STALE',
  );
  assert.equal(studentDocumentAttestationState(binding, 'cycle', 'b'.repeat(64), now), 'STALE');
  assert.equal(
    studentDocumentAttestationState(
      { ...binding, attestation: null },
      'cycle',
      'a'.repeat(64),
      now,
    ),
    'NOT_ATTESTED',
  );
});
test('student document upload: server fixes owner/privacy/retention; malware failure cannot activate or sanitize', async () => {
  let allocated: any;
  const workspace = { findWorkspace: async () => ({ status: 'ACTIVE' }) },
    ingest = {
      requestStudentDocumentUpload: async (input: any) => {
        allocated = input;
        return { assetId: input.assetId, lifecycleState: 'INITIATED', uploadGrant: null };
      },
    };
  const useCase = new StudentDocumentUploadUseCases(
    workspace as any,
    {} as any,
    ingest as any,
    {} as any,
  );
  await useCase.allocate('owned-student', {
    originalFilename: 'transcript.pdf',
    mimeType: 'application/pdf',
    byteSize: 20,
    consent: true,
  });
  assert.equal(allocated.ownerId, 'owned-student');
  assert.equal(allocated.ownerType, 'STUDENT');
  assert.equal(allocated.classification, 'CONFIDENTIAL');
  assert.equal(allocated.retentionCategory, 'TEMPORARY');
  let state = 'QUARANTINED',
    sanitized = false,
    activated = false;
  const record = () => ({
    owner: { ownerId: 'owned-student', ownerType: 'STUDENT' },
    classification: 'CONFIDENTIAL',
    metadata: { extraMetadata: { purpose: 'STUDENT_APPLICATION_PREPARATION' } },
    reference: { value: 'STUDENT-DOCUMENT-asset' },
    retention: { expiresAt: new Date(now + 86400000) },
    state,
    uploadVerification: { signatureVerified: true },
  });
  const complete = new StudentDocumentUploadUseCases(
    workspace as any,
    { findById: async () => record() } as any,
    ingest as any,
    {
      validateAsset: async () => {
        state = 'MALWARE_SCAN_FAILED';
      },
      sanitizeAsset: async () => {
        sanitized = true;
      },
      activateAsset: async () => {
        activated = true;
      },
    } as any,
  );
  await assert.rejects(() => complete.complete('foreign-student', 'asset'), /DENIED/);
  await assert.rejects(() => complete.complete('owned-student', 'asset'), /INCOMPLETE/);
  assert.equal(sanitized, false);
  assert.equal(activated, false);
});
test('private document review: self-review and withdrawn consent stop before delivery grant or audit writes', async () => {
  let grants = 0,
    audits = 0;
  const item = {
    binding,
    tracker: {
      studentReferenceId: 'student',
      scholarshipId: 'scholarship',
      cycleReferenceId: 'cycle',
      version: 2,
      status: 'ACTIVE',
    },
  };
  const repository = {
      findDocumentReview: async () => item,
      recordDocumentReviewAccess: async () => {
        ++audits;
      },
    },
    service = new StudentDocumentReviewUseCases(
      repository as any,
      {} as any,
      {} as any,
      {
        requestDeliveryGrant: async () => {
          ++grants;
        },
      } as any,
    );
  await assert.rejects(() => service.open('binding', 'student'), /UNAVAILABLE/);
  const revoked = new StudentDocumentReviewUseCases(
    {
      ...repository,
      findDocumentReview: async () => ({
        ...item,
        binding: { ...binding, reviewConsentGrantedAt: null },
      }),
    } as any,
    {} as any,
    {} as any,
    {} as any,
  );
  await assert.rejects(() => revoked.open('binding', 'reviewer'), /UNAVAILABLE/);
  assert.equal(grants, 0);
  assert.equal(audits, 0);
});
test('scholarship reference decisions: transaction and independent reviewer are mandatory', async () => {
  const row = {
      id: 'proposal',
      sourceOwnerId: 'old',
      sourceRevision: 3,
      proposedBy: 'maker',
      status: 'PENDING',
    },
    db = { scholarshipReferenceTransition: { findUnique: async () => row } };
  await assert.rejects(
    () =>
      new ScholarshipReferenceLifecycle(db as any).approve(
        'old',
        'proposal',
        3,
        'reviewer',
        'Reviewed',
      ),
    /TRANSACTION_REQUIRED/,
  );
  await assert.rejects(
    () =>
      new ScholarshipReferenceLifecycle(db as any, true).approve(
        'old',
        'proposal',
        3,
        'maker',
        'Reviewed',
      ),
    /INDEPENDENT_REVIEW/,
  );
});
test('integrity CMS: orphan polymorphic reference is reported, unauthorized types are not read, owner failures are not missing rows', async () => {
  let deniedReads = 0;
  const cms = {
    listContent: async () => ({ data: [{ id: 'article', status: 'PUBLISHED' }], total: 1 }),
    findContentById: async () => ({ id: 'article', status: 'PUBLISHED' }),
    listDomainLinks: async () => [
      { targetType: 'UNIVERSITY', targetId: 'gone' },
      { targetType: 'COURSE', targetId: 'private-course' },
      { targetType: 'SCHOLARSHIP', targetId: 'offline' },
    ],
  };
  const service = new CrossModuleIntegrityUseCase(
    {} as any,
    { findById: async () => null } as any,
    {
      findById: async () => {
        throw new Error('SECRET');
      },
    } as any,
    {} as any,
    cms as any,
    {
      findById: async () => {
        ++deniedReads;
      },
    } as any,
  );
  const report = await service.execute('CMS', new Set(['CMS', 'UNIVERSITIES', 'SCHOLARSHIPS']));
  assert.equal(deniedReads, 0);
  assert.ok(
    report.findings.some((f) => f.targetId === 'gone' && f.code === 'MISSING_OWNER_REFERENCE'),
  );
  assert.ok(
    report.findings.some((f) => f.targetId === 'offline' && f.code === 'TARGET_OWNER_UNAVAILABLE'),
  );
  assert.equal(
    report.findings.some((f) => f.targetId === 'private-course'),
    false,
  );
  assert.equal(
    report.findings.some((f) => f.targetId === 'offline' && f.code === 'MISSING_OWNER_REFERENCE'),
    false,
  );
  assert.equal(report.productionIntegrity, 'UNVERIFIED');
});
import { CrossDomainReadModelRouter } from '../../../apps/api/src/presentation/api/router/CrossDomainReadModelRouter';
import { StudentDocumentReviewRouter } from '../../../apps/api/src/presentation/api/router/StudentDocumentReviewRouter';
import { PrismaStudentApplicationTrackerRepository } from '../../../packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository';
test('graph API: native cursor reaches its collection; unsupported edge or shared page cannot be silently ignored', async () => {
  let input: any,
    calls = 0;
  const router = CrossDomainReadModelRouter.create({
    crossDomainGraphReadService: {
      getMajorGraphBySlug: async (_slug: string, options: any) => {
        input = options;
        ++calls;
        return {};
      },
    } as any,
  });
  const route = (router as any).stack.find((layer: any) => layer.route?.path === '/majors/:slug')
    .route.stack[0].handle;
  let failure: any;
  route(
    { params: { slug: 'major' }, query: { universityCursor: 'native-cursor' } },
    { json: () => {} },
    (error: any) => {
      failure = error;
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(input.universityCursor, 'native-cursor');
  assert.equal(calls, 1);
  assert.equal(failure, undefined);
  for (const query of [{ serviceCursor: 'wrong-edge' }, { page: 2 }]) {
    failure = undefined;
    route({ params: { slug: 'major' }, query }, { json: () => {} }, (error: any) => {
      failure = error;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(failure);
    assert.equal(calls, 1);
  }
});
test('academic review API: support access alone cannot inspect or attest consented documents', async () => {
  let called = false;
  const router = StudentDocumentReviewRouter.create({
    studentDocumentReviewUseCases: {
      open: async () => {
        called = true;
      },
    } as any,
    authEvaluatorService: {
      evaluatePermission: async (_actor: string, permission: string) => ({
        isGranted: permission === 'admin:students:support',
      }),
    } as any,
  });
  let status = 0;
  const res = {
    setHeader: () => {},
    status: (value: number) => {
      status = value;
      return res;
    },
    json: () => {},
  };
  await (router as any).stack[0].handle({ authUserId: 'support', ip: '127.0.0.1' }, res, () => {
    called = true;
  });
  assert.equal(status, 403);
  assert.equal(called, false);
});
test('review access: auditing a read does not advance tracker version or invalidate its scheduled reminder', async () => {
  let casWrites = 0,
    audits = 0;
  const tracker = {
    id: 'tracker',
    version: 2,
    status: 'ACTIVE',
    studentReferenceId: 'student',
    workspace: { status: 'ACTIVE' },
  };
  const tx = {
    studentApplicationDocumentBinding: {
      findUnique: async () => ({ ...binding, attestation: null, trackerId: 'tracker', tracker }),
    },
    studentApplicationTracker: {
      updateMany: async () => {
        ++casWrites;
        return { count: 1 };
      },
    },
    $queryRaw: async () => [{ id: 'tracker' }],
    auditRecord: {
      create: async () => {
        ++audits;
      },
    },
  };
  const repo = new PrismaStudentApplicationTrackerRepository({
    $transaction: async (fn: any) => fn(tx),
  } as any);
  await repo.recordDocumentReviewAccess('binding', 2, 'reviewer');
  assert.equal(casWrites, 0);
  assert.equal(audits, 1);
});
test('student document upload: successful processing delegates every security phase to EAP and only returns ACTIVE', async () => {
  let state = 'INITIATED';
  const phases: string[] = [];
  const record = () => ({
    owner: { ownerId: 'student', ownerType: 'STUDENT' },
    classification: 'CONFIDENTIAL',
    metadata: { extraMetadata: { purpose: 'STUDENT_APPLICATION_PREPARATION' } },
    reference: { value: 'STUDENT-DOCUMENT-id' },
    retention: { expiresAt: new Date(now + 86400000) },
    state,
    uploadVerification: state === 'INITIATED' ? undefined : { signatureVerified: true },
    assertCanDeliver: () => {
      assert.equal(state, 'ACTIVE');
    },
  });
  const service = new StudentDocumentUploadUseCases(
    { findWorkspace: async () => ({ status: 'ACTIVE' }) } as any,
    { findById: async () => record() } as any,
    {} as any,
    {
      finalizeUploadedAsset: async () => {
        phases.push('VERIFY_UPLOADED_BYTES');
        state = 'QUARANTINED';
      },
      validateAsset: async () => {
        phases.push('SCAN');
        state = 'VALIDATING';
      },
      sanitizeAsset: async () => {
        phases.push('SANITIZE_AND_RESCAN');
        state = 'SANITIZING';
      },
      activateAsset: async () => {
        phases.push('ACTIVATE_VERIFIED_BYTES');
        state = 'ACTIVE';
      },
    } as any,
  );
  assert.equal((await service.complete('student', 'id')).lifecycleState, 'ACTIVE');
  assert.deepEqual(phases, [
    'VERIFY_UPLOADED_BYTES',
    'SCAN',
    'SANITIZE_AND_RESCAN',
    'ACTIVATE_VERIFIED_BYTES',
  ]);
  await service.complete('student', 'id');
  assert.equal(phases.length, 4);
});
test('integrity symmetry: probe exact scholarship/program identity, not absence on an unrelated first page', async () => {
  let query: any;
  const source = {
    id: 'scholarship',
    status: 'PUBLISHED',
    publicationStatus: 'PUBLISHED',
    verificationStatus: 'VERIFIED',
    completenessStatus: 'COMPLETE',
    universityLinks: [{ academicProgramId: 'program', resolutionStatus: 'RESOLVED' }],
  };
  const service = new CrossModuleIntegrityUseCase(
    {} as any,
    {
      readProgramIntegrityReference: async () => ({
        id: 'program',
        universityId: 'university',
        publiclyEligible: true,
      }),
    } as any,
    {
      list: async () => ({ data: [source], total: 1 }),
      findById: async () => source,
      listPublished: async (input: any) => {
        query = input;
        return { data: [], total: 0 };
      },
    } as any,
    {} as any,
  );
  const report = await service.execute('SCHOLARSHIPS', new Set(['SCHOLARSHIPS', 'PROGRAMS']));
  assert.deepEqual(query, { ownerId: 'scholarship', academicProgramId: 'program', limit: 1 });
  assert.equal(report.symmetry.pairsChecked, 1);
  assert.ok(
    report.findings.some(
      (f) =>
        f.code === 'REVERSE_RELATIONSHIP_MISMATCH' &&
        f.ownerId === 'scholarship' &&
        f.targetId === 'program',
    ),
  );
});
test('scholarship merge review: changed target revision cannot adopt a replacement after proposal', async () => {
  let changed = false;
  const db = {
    scholarshipReferenceTransition: {
      findUnique: async () => ({
        id: 'proposal',
        sourceOwnerId: 'old',
        sourceRevision: 3,
        targetOwnerId: 'new',
        targetRevision: 4,
        status: 'PENDING',
        proposedBy: 'maker',
      }),
      findFirst: async () => null,
      updateMany: async () => {
        changed = true;
        return { count: 1 };
      },
    },
    $queryRaw: async () => [{ id: 'locked' }],
    scholarship: {
      findUnique: async ({ where }: any) =>
        where.id === 'old'
          ? { id: 'old', revision: 3 }
          : {
              id: 'new',
              revision: 5,
              status: 'PUBLISHED',
              publicationStatus: 'PUBLISHED',
              verificationStatus: 'VERIFIED',
              completenessStatus: 'COMPLETE',
              versions: [{ id: 'version' }],
            },
    },
  };
  await assert.rejects(
    () =>
      new ScholarshipReferenceLifecycle(db as any, true).approve(
        'old',
        'proposal',
        3,
        'reviewer',
        'Reviewed independently',
      ),
    /TARGET_CHANGED/,
  );
  assert.equal(changed, false);
});
import { isPublicAdmissionRequirement } from '../../../packages/domain/src/public-boundaries/PublicOwnerPolicy';
test('admission variant: a mutable active root variant is not proof it belonged to the published version', () => {
  const requirement = {
    status: 'ACTIVE',
    internationalTestId: 'test',
    testVariantId: 'variant',
    testVariant: { testId: 'test', isActive: true },
    internationalTest: {
      status: 'PUBLISHED',
      currentPublishedVersion: { id: 'v',testId:'test', status: 'PUBLISHED', scoreScales: [] },
    },
  };
  assert.equal(isPublicAdmissionRequirement(requirement), false);
  assert.equal(
    isPublicAdmissionRequirement({
      ...requirement,
      internationalTest: {
        ...requirement.internationalTest,
        currentPublishedVersion: {
          ...requirement.internationalTest.currentPublishedVersion,
          metadata: { publishedVariantIds: ['variant'] },
        },
      },
    }),
    true,
  );
});
test('private review delivery: authenticated path is capped by consent and original asset retention without changing reminder version', async () => {
  const deadline = new Date(Date.now() + 25000),
    item = {
      binding: { ...binding, attestation: null },
      tracker: {
        studentReferenceId: 'student',
        scholarshipId: 'scholarship',
        cycleReferenceId: 'cycle',
        version: 2,
        status: 'ACTIVE',
      },
    };
  let deliveryConfigured = false,
    accesses = 0;
  const service = new StudentDocumentReviewUseCases(
    {
      findDocumentReview: async () => item,
      recordDocumentReviewAccess: async () => {
        ++accesses;
      },
    } as any,
    {
      resolve: async () => ({
        id: 'scholarship',
        cycleId: 'cycle',
        ownerVersionId: 'version',
        available: true,
        requirements: [{ id: 'requirement' }],
      }),
    } as any,
    {
      assertUsable: async () => ({
        checksum: { hash: 'a'.repeat(64) },
        metadata: { mimeType: 'application/pdf' },
        retention: { expiresAt: deadline },
      }),
    } as any,
    {
      assertAuthenticatedDeliveryConfigured: () => {deliveryConfigured=true;},
    } as any,
  );
  const result = await service.open('binding', 'reviewer');
  const ttl=(Date.parse(result.delivery.expiresAt)-Date.now())/1000;
  assert.equal(deliveryConfigured,true);
  assert.equal(result.delivery.kind,'AUTHENTICATED_REVIEW');
  assert.match(result.delivery.path,/^\/admin\/student-document-reviews\//);
  assert.equal('url' in result.delivery,false);
  assert.ok(ttl > 0 && ttl <= 25);
  assert.equal(accesses, 1);
  assert.equal(result.expectedVersion, 2);
  assert.equal(result.retentionUntil.getTime(), deadline.getTime());
  assert.equal('studentReferenceId' in result, false);
  assert.equal('assetId' in result, false);
});
import { UniversityStudentSavedItemHydrationGateway } from '../../../packages/infrastructure/src/students/StudentSavedItemHydrationGateways';
test('saved owner lifecycle: reuse of an old slug cannot silently move private history to another canonical owner', async () => {
  const gateway = new UniversityStudentSavedItemHydrationGateway({
      findPublishedByIds: async () => [],
      findPublishedBySlug: async () => ({
        id: 'new-owner',
        publicId: 'new-public',
        slug: 'old-slug',
        status: 'PUBLISHED',
        displayName: 'New owner',
      }),
    } as any),
    item = {
      id: 'saved',
      studentReferenceId: 'student',
      entityId: 'deleted-owner',
      entitySlug: 'old-slug',
      entityType: 'UNIVERSITY',
    } as any;
  const retained = await gateway.hydrate(item);
  assert.equal(retained.available, false);
  assert.equal(retained.ownerId, 'deleted-owner');
  const explicitNewSave = await gateway.hydrate(item, 'CANONICALIZE_NEW_SAVE');
  assert.equal(explicitNewSave.ownerId, 'new-owner');
  assert.equal(explicitNewSave.available, true);
});
test('private review: withdrawal during authenticated content read prevents bytes from being returned', async () => {
  let consented = true;
  const pending = { ...binding, attestation: null },
    tracker = {
      studentReferenceId: 'student',
      scholarshipId: 'scholarship',
      cycleReferenceId: 'cycle',
      version: 2,
      status: 'ACTIVE',
    };
  const service = new StudentDocumentReviewUseCases(
    {
      findDocumentReview: async () => ({
        binding: consented ? pending : { ...pending, reviewConsentGrantedAt: null },
        tracker,
      }),
      recordDocumentReviewAccess: async () => {},
    } as any,
    {
      resolve: async () => ({
        id: 'scholarship',
        cycleId: 'cycle',
        ownerVersionId: 'version',
        available: true,
        requirements: [{ id: 'requirement' }],
      }),
    } as any,
    {
      assertUsable: async () => ({
        checksum: { hash: 'a'.repeat(64) },
        metadata: { mimeType: 'application/pdf' },
        retention: {},
      }),
    } as any,
    {
      assertAuthenticatedDeliveryConfigured:()=>{},
      readAuthenticatedDelivery: async () => {
        consented = false;
        return {
          bytes:Buffer.from('synthetic unit content'),mimeType:'application/pdf',checksumSha256:'a'.repeat(64),
        };
      },
    } as any,
  );
  const opened=await service.open('binding','reviewer');
  await assert.rejects(() => service.readContent('binding','reviewer',opened.expectedVersion,Date.parse(opened.delivery.expiresAt)), /UNAVAILABLE/);
});
