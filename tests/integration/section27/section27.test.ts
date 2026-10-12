import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPublicUniversityProgram,
  isPublicAdmissionRequirement,
  isPublicScholarshipOwner,
  assertUniversityProgramParent,
  publicGraphRouteKey,
  publicScoreDecision,
} from '../../../packages/domain/src/public-boundaries/PublicOwnerPolicy';
import { CrossDomainGraphReadService } from '../../../packages/application/src/read-models/CrossDomainGraphReadService';
import {
  graphOwnerRead,
  createGraphReadScope,
  reviewedGraphLabel,
  requireGraphFirstPage,
} from '../../../packages/application/src/read-models/GraphReadPolicy';
import { projectPublicUniversity } from '../../../packages/application/src/universities/use-cases/UniversityPublicProjection';
import { projectPublishedScholarship } from '../../../packages/application/src/scholarships/use-cases/ScholarshipPublicProjection';
import { StudentApplicationTrackerUseCases } from '../../../packages/application/src/students/use-cases/StudentApplicationTrackerUseCases';
import { StudentApplicationReminderDeliveryPolicy } from '../../../packages/application/src/students/use-cases/StudentApplicationReminderDeliveryPolicy';
import { StudentWorkspaceOutboxDeliveryGateway } from '../../../packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway';
import { StudentWorkspaceUseCases } from '../../../packages/application/src/students/use-cases/StudentWorkspaceUseCases';
import { StudentSavedItemHydrationService } from '../../../packages/application/src/students/use-cases/StudentSavedItemHydrationService';
import { PrismaStudentApplicationTrackerRepository } from '../../../packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository';
import { PrismaUniversityRepository } from '../../../packages/infrastructure/src/universities/PrismaUniversityRepository';
import { CmsStudentSavedItemHydrationGateway } from '../../../packages/infrastructure/src/students/StudentSavedItemHydrationGateways';
import {
  validateIntegrationRegistry,
  crossModuleIntegrationRegistry,
  integrationEdges,
} from '../../../packages/application/src/integration/IntegrationRegistry';
import { crossModuleIntegrityReport } from '../../../packages/application/src/integration/CrossModuleIntegrityReport';
import {
  publicRelationshipRouteKey,
  shouldRefreshPublicGraph,
  COUNTRY_COURSE_SCOPE,
} from '../../../apps/web/src/features/public-template/PublicGraphNavigationPolicy';
import { CrossDomainReadModelRouter } from '../../../apps/api/src/presentation/api/router/CrossDomainReadModelRouter';

const program: any = {
  id: 'p',
  universityId: 'u',
  sourceProgramName: 'CS',
  status: 'ACTIVE',
  majorMappingState: 'CANONICALLY_MAPPED',
  majorId: 'm',
  degreeLevelId: 'd',
  campusIds: [],
  admissionRequirements: [],
  major: {
    status: 'PUBLISHED',
    levelProfiles: [{ degreeLevelId: 'd', status: 'PUBLISHED', currentPublishedVersionId: 'mv' }],
  },
};
const university: any = {
  id: 'u',
  slug: 'university',
  publicId: 'INS-1',
  displayName: 'University',
  status: 'PUBLISHED',
  academicPrograms: [program],
};
const scholarship: any = {
  id: 's',
  slug: 'scholarship',
  publicId: 'SCH-1',
  displayName: 'Scholarship',
  publicationStatus: 'PUBLISHED',
  status: 'PUBLISHED',
  verificationStatus: 'VERIFIED',
  completenessStatus: 'COMPLETE',
  universityLinks: [],
};
const page = (data: any[] = []) => ({
  data,
  total: data.length,
  page: 1,
  pageSize: 12,
  limit: 12,
  totalPages: 1,
  hasMore: false,
  nextCursor: null,
});
const req: any = {
  status: 'ACTIVE',
  internationalTestId: 't',
  minimumScore: 6,
  internationalTest: {
    status: 'PUBLISHED',
    currentPublishedVersion: {
      id: 'v',
      status: 'PUBLISHED',
      scoreScales: [{ overallMinimum: 0, overallMaximum: 9 }],
    },
  },
};

for (const status of ['DRAFT', 'ARCHIVED', 'REVIEW_REQUIRED', 'PUBLISHED'])
  test(`program-parity: mapped ${status} excluded`, () =>
    assert.equal(isPublicUniversityProgram({ ...program, status }), false));
test('program-parity: matching active published profile passes', () =>
  assert.equal(isPublicUniversityProgram(program), true));
test('program-parity: different degree profile fails', () =>
  assert.equal(isPublicUniversityProgram({ ...program, degreeLevelId: 'other' }), false));
test('program-parity: public university projection omits unpublished children', () => {
  const dto = projectPublicUniversity({
    ...university,
    academicPrograms: [program, { ...program, id: 'bad', status: 'DRAFT' }],
  });
  assert.equal(dto.academicPrograms?.length, 1);
  assert.equal('metadata' in dto, false);
});
test('program-parent: program-only derives canonical parent', () =>
  assert.equal(assertUniversityProgramParent(null, { id: 'p', ownerId: 'u' }), 'u'));
test('program-parent: mismatched manual/import parent fails', () =>
  assert.throws(
    () => assertUniversityProgramParent('wrong', { id: 'p', ownerId: 'u' }),
    /MISMATCH/,
  ));
test('program-parent: unknown owner never becomes resolved', () =>
  assert.throws(() => assertUniversityProgramParent(null, { id: 'p' }), /UNVERIFIED/));
test('program-parent: public scholarship retains program-only canonical parent', () => {
  const dto = projectPublishedScholarship(
    {
      ...scholarship,
      universityLinks: [
        {
          linkKey: 'program',
          academicProgramId: 'p',
          resolutionStatus: 'RESOLVED',
          academicProgram: { ...program, university: { status: 'PUBLISHED' } },
        },
      ],
    } as any,
    'Scholarship',
  );
  assert.equal(dto.universityLinks?.[0]?.universityId, 'u');
});
test('test-proof: published owner/version and verified score passes', () =>
  assert.equal(isPublicAdmissionRequirement(req), true));
for (const patch of [
  { internationalTest: { status: 'DRAFT' } },
  { testVersionId: 'x', testVersion: { testId: 't', status: 'DRAFT' } },
  { minimumScore: 10 },
  {
    minimumScore: 6,
    internationalTest: {
      status: 'PUBLISHED',
      currentPublishedVersion: { status: 'PUBLISHED', scoreScales: [] },
    },
  },
  { testVariantId: 'var', testVariant: { testId: 'other', isActive: true } },
  { sectionScores: { reading: 6 } },
])
  test(`test-proof: ${JSON.stringify(patch)} fails closed`, () =>
    assert.equal(isPublicAdmissionRequirement({ ...req, ...patch }), false));
test('test-proof: missing scale is unverified', () =>
  assert.equal(publicScoreDecision(6, null), 'UNVERIFIED'));
test('test-proof: retired tests omitted from scholarship public projection', () => {
  const dto = projectPublishedScholarship(
    {
      ...scholarship,
      eligibilityItems: [
        {
          itemKey: 'retired',
          internationalTestId: 't',
          resolutionStatus: 'RESOLVED',
          internationalTest: { status: 'ARCHIVED' },
        },
      ],
    } as any,
    'Scholarship',
  );
  assert.deepEqual(dto.eligibilityItems, []);
});
function graph(universityRows: any[] = []) {
  const programs = {
    data: [
      {
        ownerId: 'p',
        universityOwnerId: 'u2',
        universitySlug: 'u2',
        universityPublicId: 'INS-2',
        universityDisplayName: 'U2',
        majorId: 'm',
        degreeLevelId: 'd',
        status: 'ACTIVE',
        majorMappingState: 'CANONICALLY_MAPPED',
        sourceProgramName: 'CS',
      },
    ],
    total: 40,
    majorTotal: 8,
    hasMore: true,
    nextCursor: 'cursor-2',
  };
  return new CrossDomainGraphReadService(
    {
      findBySlug: async () => ({
        id: 'm',
        slug: 'major',
        displayName: 'Major',
        status: 'PUBLISHED',
      }),
      findPublishedByIds: async () => [
        { id: 'm', slug: 'major', displayName: 'Major', status: 'PUBLISHED' },
      ],
    } as any,
    {
      listPublished: async () => page(universityRows),
      findBySlug: async () => university,
      listPublishedProgramGraph: async () => programs,
    } as any,
    { listPublished: async () => page() } as any,
    { listPublished: async () => page() } as any,
    {
      listPublishedRelatedCourses: async () => page(),
      listPublishedCoursesForMajor: async () => page(),
    } as any,
    {
      getCountry: async () => ({ id: 'country', iso2Code: 'YE', name: 'Yemen', isActive: true }),
    } as any,
    {
      listPublishedByDomainTarget: async () => {
        throw new Error('SECRET_DB_ERROR');
      },
    } as any,
  );
}
test('country: programs/majors independent of empty university page', async () => {
  const dto = await graph().getCountryGraphByIso2Code('YE');
  assert.equal(dto.relationships.academicPrograms[0].ownerId, 'p');
  assert.equal(dto.readScope?.collections.academicPrograms.total, 40);
  assert.equal(dto.readScope?.collections.majors.total, 8);
  assert.equal(dto.readScope?.collections.majors.scope, 'PROGRAM_PAGE_SAMPLE');
  assert.equal(dto.readScope?.collections.academicPrograms.nextCursor, 'cursor-2');
});
test('country: optional failure is unavailable with unknown total, not successful zero', async () => {
  const dto = await graph().getCountryGraphByIso2Code('YE');
  assert.equal(dto.readScope?.collections.editorialContent.state, 'UNAVAILABLE');
  assert.equal(dto.readScope?.collections.services.state, 'NOT_INTEGRATED');
  assert.equal(dto.readScope?.collections.services.total, null);
  assert.equal(JSON.stringify(dto).includes('SECRET_DB_ERROR'), false);
});
test('graph: optional CMS failure also isolated for university', async () => {
  const dto = await graph().getUniversityGraphBySlug('university');
  assert.equal(dto.relationships.academicPrograms.length, 1);
  assert.equal(dto.readScope?.collections.editorialContent.state, 'UNAVAILABLE');
});
test('graph: page two explicitly unsupported', () =>
  assert.throws(() => requireGraphFirstPage(2), /UNSUPPORTED/));
test('graph: reviewed locale only; draft translation ignored', () => {
  const label = reviewedGraphLabel(
    {
      displayName: 'Owner',
      translations: [{ locale: 'en', reviewStatus: 'NEEDS_REVIEW', displayName: 'Draft' }],
    },
    'en',
  );
  assert.equal(label.displayName, 'Owner');
  assert.equal(label.localeFallback, true);
  assert.equal(
    reviewedGraphLabel(
      {
        displayName: 'Owner',
        translations: [{ locale: 'en', reviewStatus: 'PUBLISHED', displayName: 'English' }],
      },
      'en',
    ).displayName,
    'English',
  );
});
test('graph: owner outage reports sanitized failure', async () => {
  const scope = createGraphReadScope();
  assert.deepEqual(
    await graphOwnerRead(
      scope,
      'x',
      async () => {
        throw new Error('secret');
      },
      [],
    ),
    [],
  );
  assert.equal(scope.collections.x.errorCode, 'OWNER_READ_UNAVAILABLE');
});
test('program repository: owner SQL requires exact degree/published profile before counts and cursor', async () => {
  const queries: string[] = [];
  const repo = new PrismaUniversityRepository({
    $queryRaw: async (q: any) => {
      queries.push(q.sql);
      return queries.length === 1 ? [{ ownerId: 'p' }] : [{ total: 8n, majorTotal: 3n }];
    },
  } as any);
  const data = await repo.listPublishedProgramGraph({ countryReferenceId: 'country', limit: 1 });
  assert.equal(data.total, 8);
  assert.ok(
    queries.every(
      (q) => q.includes('lp."degreeLevelId"=p."degreeLevelId"') && q.includes("p.status='ACTIVE'"),
    ),
  );
  assert.ok(queries[0].includes('ORDER BY p.id ASC'));
});
const owner = {
  id: 's',
  slug: 'canonical',
  displayName: 'Scholarship',
  available: true,
  deadlineAt: new Date('2099-01-01'),
};
test('student-owner: create replaces forged slug, deadline and canonical alias', async () => {
  let written: any;
  const uc = new StudentApplicationTrackerUseCases(
    {
      create: async (x: any) => {
        written = x;
        return x;
      },
    } as any,
    { resolve: async () => owner },
  );
  await uc.create({
    studentReferenceId: 'student',
    scholarshipId: 'alias',
    scholarshipSlug: 'forged',
    deadlineAt: new Date('2090-01-01'),
  } as any);
  assert.equal(written.scholarshipId, 's');
  assert.equal(written.scholarshipSlug, 'canonical');
  assert.equal(written.deadlineAt, owner.deadlineAt);
});
test('student-owner: basic published without verification is denied', () =>
  assert.equal(
    isPublicScholarshipOwner({ ...scholarship, verificationStatus: 'NEEDS_REVIEW' }),
    false,
  ));
test('student-owner: caller cannot edit official deadline', async () => {
  const uc = new StudentApplicationTrackerUseCases({} as any, { resolve: async () => owner });
  await assert.rejects(
    () => uc.update('student', 'tracker', { expectedVersion: 1, deadlineAt: new Date() }),
    /OWNER_CONTROLLED/,
  );
});
test('student-owner: orphan history retained without actionable URL/eligibility claim', async () => {
  const uc = new StudentApplicationTrackerUseCases(
    {
      list: async () => [
        {
          id: 'tracker',
          scholarshipId: 'gone',
          scholarshipSlug: 'old',
          deadlineAt: owner.deadlineAt,
        },
      ],
    } as any,
    { resolve: async () => null },
  );
  const [dto] = await uc.list('student');
  assert.equal(dto.scholarshipSlug, null);
  assert.equal(dto.deadlineAt, null);
  assert.equal(dto.applicationMode, 'MANUAL_PLANNING');
  assert.equal(dto.eligibilityState, 'UNKNOWN');
  assert.equal(dto.snapshotDeadlineAt, owner.deadlineAt);
});
test('student-owner: bounded pull updates current facts, owner outage stays retryable', async () => {
  let limit: number | undefined;
  let fact: any;
  const uc = new StudentApplicationTrackerUseCases(
    {
      listOwnerReconciliationPage: async (_: any, l: number) => {
        limit = l;
        return {
          items: [{ id: 'tracker', studentReferenceId: 'student', scholarshipId: 's', version: 1 }],
          nextCursor: null,
        };
      },
      reconcileOwnerFacts: async (...args: any[]) => {
        fact = args[3];
        return true;
      },
    } as any,
    { resolve: async () => owner },
  );
  assert.equal((await uc.reconcileOwnerPage()).changed, 1);
  assert.equal(limit, 50);
  assert.equal(fact.deadlineAt, owner.deadlineAt);
});
test('student-owner: reconcile CAS/outbox failure rolls back tracker update', async () => {
  let rolledBack = false;
  const current = {
    id: 'tracker',
    studentReferenceId: 'student',
    scholarshipId: 's',
    status: 'ACTIVE',
    version: 1,
    deadlineAt: null,
    scholarshipSlug: null,
  };
  const tx = {
    studentApplicationTracker: {
      findFirst: async () => current,
      updateMany: async () => ({ count: 1 }),
    },
    auditRecord: { create: async () => {} },
    studentTimelineEntry: { create: async () => {} },
    transactionalOutboxRecord: {
      create: async () => {
        throw new Error('OUTBOX_FAILURE');
      },
    },
  };
  const repo = new PrismaStudentApplicationTrackerRepository({
    $transaction: async (fn: any) => {
      try {
        return await fn(tx);
      } catch (e) {
        rolledBack = true;
        throw e;
      }
    },
  } as any);
  await assert.rejects(
    () =>
      repo.reconcileOwnerFacts('student', 'tracker', 1, {
        scholarshipId: 's',
        slug: 'canonical',
        deadlineAt: owner.deadlineAt,
      }),
    /OUTBOX_FAILURE/,
  );
  assert.equal(rolledBack, true);
});
const tracker = {
  id: 'tracker',
  studentReferenceId: 'student',
  scholarshipId: 's',
  status: 'ACTIVE',
  version: 1,
  deadlineAt: owner.deadlineAt,
};
const candidate: any = {
  id: 'student-application-deadline-tracker-v1',
  templateId: 'student-application-deadline-v1',
  recipientReference: 'student',
  variables: {
    trackerId: 'tracker',
    trackerVersion: '1',
    scholarshipId: 's',
    deadlineAt: owner.deadlineAt.toISOString(),
  },
};
test('reminder: changed official deadline suppresses stale intent', async () => {
  const policy = new StudentApplicationReminderDeliveryPolicy(
    { findById: async () => tracker } as any,
    { findById: async () => ({ type: 'Human', status: 'ACTIVE' }) } as any,
    { findByIdentityId: async () => [{ roleId: 'student' }] } as any,
    { resolve: async () => ({ ...owner, deadlineAt: new Date('2099-02-01') }) },
  );
  assert.equal(await policy.isEligible(candidate), false);
});
test('reminder: unpublished owner suppresses intent', async () => {
  const policy = new StudentApplicationReminderDeliveryPolicy(
    { findById: async () => tracker } as any,
    {} as any,
    {} as any,
    { resolve: async () => ({ ...owner, available: false }) },
  );
  assert.equal(await policy.isEligible(candidate), false);
});
function roleGateway(roles: any[], status = 'ACTIVE') {
  const events: any[] = [];
  const gateway = new StudentWorkspaceOutboxDeliveryGateway(
    { consumeIntegrationEvent: async (e: any) => events.push(e) } as any,
    { findByIdentityId: async () => roles } as any,
    { findById: async () => ({ type: 'Human', status }) } as any,
  );
  return { events, gateway };
}
const revoked: any = {
  id: 'event',
  domain: 'AUTHORIZATION',
  eventType: 'RoleAssignmentRevoked',
  payload: { assignmentId: 'a', identityId: 'student', roleId: 'student' },
  aggregate: { aggregateType: 'ROLE_ASSIGNMENT', aggregateId: 'a' },
  metadata: { schemaVersion: '1.0.0' },
  createdAt: new Date(),
};
test('role: final student role revoked suspends projection', async () => {
  const { events, gateway } = roleGateway([]);
  await gateway.deliver(revoked, { idempotencyKey: 'event' } as any);
  assert.equal(events[0].eventType, 'StudentIdentitySuspended');
});
test('role: reordered revoke with another valid grant retains active state', async () => {
  const { events, gateway } = roleGateway([{ roleId: 'student' }]);
  await gateway.deliver(revoked, { idempotencyKey: 'event' } as any);
  assert.equal(events[0].eventType, 'StudentIdentityActivated');
});
test('role: suspended identity plus remaining grant cannot reactivate', async () => {
  const { events, gateway } = roleGateway([{ roleId: 'student' }], 'SUSPENDED');
  await gateway.deliver(revoked, { idempotencyKey: 'event' } as any);
  assert.equal(events[0].eventType, 'StudentIdentitySuspended');
});
test('role: forged aggregate refused', async () => {
  const { gateway } = roleGateway([]);
  await assert.rejects(
    () =>
      gateway.deliver(
        { ...revoked, aggregate: { aggregateType: 'ROLE_ASSIGNMENT', aggregateId: 'wrong' } },
        { idempotencyKey: 'event' } as any,
      ),
    /SOURCE_INVALID/,
  );
});
test('saved: canonical owner replaces caller labels and alias', async () => {
  let written: any;
  const repo = {
    findWorkspace: async () => ({ status: 'ACTIVE' }),
    saveItem: async (data: any) => {
      written = data;
      return data;
    },
  };
  const uc = new StudentWorkspaceUseCases(repo as any, null, undefined, [
    {
      supports: () => true,
      hydrate: async () => ({
        ownerType: 'SCHOLARSHIP',
        ownerId: 's',
        slug: 'canonical',
        displayName: 'Owner',
        available: true,
      }),
    },
  ] as any);
  await uc.saveItem({
    studentReferenceId: 'student',
    entityType: 'SCHOLARSHIP',
    entityId: 'alias',
    displayName: 'forged',
  } as any);
  assert.equal(written.entityId, 's');
  assert.equal(written.displayName, 'Owner');
});
test('saved: unsupported private owner fails closed', async () => {
  const uc = new StudentWorkspaceUseCases({
    findWorkspace: async () => ({ status: 'ACTIVE' }),
  } as any);
  await assert.rejects(
    () =>
      uc.saveItem({
        studentReferenceId: 'student',
        entityType: 'CERTIFICATE',
        entityId: 'someone-elses',
      } as any),
    /NOT_INTEGRATED/,
  );
});
test('saved: CMS spoofed slug cannot bind draft ID to other published content', async () => {
  let slug: string | undefined;
  const gateway = new CmsStudentSavedItemHydrationGateway({
    findContentById: async () => ({ id: 'private', slug: 'draft', siteIdentifier: 'site' }),
    getPublishedBySlug: async (s: string) => {
      slug = s;
      return { contentId: 'different', title: 'Public' };
    },
  } as any);
  const result = await gateway.hydrate({
    entityType: 'CMS_CONTENT',
    entityId: 'private',
    entitySlug: 'public',
  } as any);
  assert.equal(slug, 'draft');
  assert.equal(result.available, false);
});
test('saved: historical hydration hides current private owner draft fields', async () => {
  const svc = new StudentSavedItemHydrationService(
    {
      listSavedItems: async () => [
        { entityType: 'SCHOLARSHIP', entityId: 's', displayName: 'Historical' },
      ],
    } as any,
    [
      {
        supports: () => true,
        hydrate: async () => ({
          ownerType: 'SCHOLARSHIP',
          ownerId: 's',
          available: false,
          displayName: 'Private draft',
          slug: 'secret',
        }),
      },
    ] as any,
  );
  const dto = await svc.listHydrated('student');
  assert.equal(JSON.stringify(dto).includes('Private draft'), false);
  assert.equal(dto[0].savedItem.displayName, 'Historical');
});
test('navigation: no internal ID/publicId fallback', () => {
  assert.equal(publicGraphRouteKey({ publicId: 'INS-1' }), null);
  assert.equal(publicRelationshipRouteKey({ slug: 'a/b' }), null);
  assert.equal(publicRelationshipRouteKey({ slug: 'reviewed-slug' }), 'reviewed-slug');
});
test('navigation: refocus freshness bounded at 30s, no polling', () => {
  assert.equal(shouldRefreshPublicGraph(0, 29999, true), false);
  assert.equal(shouldRefreshPublicGraph(0, 30000, true), true);
  assert.equal(shouldRefreshPublicGraph(0, 30000, false), false);
  assert.equal(COUNTRY_COURSE_SCOPE, 'PROVIDER_HEADQUARTERS_NOT_STUDY_DESTINATION');
});
test('registry: all26 owners and unsupported test discovery explicit', () => {
  validateIntegrationRegistry();
  assert.equal(crossModuleIntegrationRegistry.length, 26);
  assert.equal(integrationEdges.filter((edge) => edge.publicPolicy === 'NOT_INTEGRATED').length, 2);
});
test('integrity: partial sample never asserts missing FK/production readiness', () => {
  const report = crossModuleIntegrityReport(
    [
      {
        owner: 'SCHOLARSHIPS',
        id: 's',
        status: 'PUBLISHED',
        references: [{ owner: 'UNIVERSITIES', id: 'missing' }],
      },
    ],
    new Set(['SCHOLARSHIPS', 'UNIVERSITIES']),
    'CI_FIXTURE',
    false,
  );
  assert.equal(report.findings.length, 0);
  assert.equal(report.productionIntegrity, 'UNVERIFIED');
});
test('integrity: declared complete broken reference detected without private values', () => {
  const report = crossModuleIntegrityReport(
    [
      {
        owner: 'SCHOLARSHIPS',
        id: 's',
        status: 'PUBLISHED',
        references: [{ owner: 'UNIVERSITIES', id: 'missing', publiclyEligible: false }],
      },
    ],
    new Set(['SCHOLARSHIPS', 'UNIVERSITIES']),
    'CI_FIXTURE',
    true,
  );
  assert.equal(report.findings.length, 2);
});
test('integrity: students and finance cannot be added through untyped allowed scope', () =>
  assert.throws(
    () => crossModuleIntegrityReport([], new Set(['STUDENTS']) as any, 'CI_FIXTURE', true),
    /SCOPE_INVALID/,
  ));
test('API fixture: unsupported graph page rejected before owner invocation', async () => {
  let invoked = false;
  const router = CrossDomainReadModelRouter.create({
    crossDomainGraphReadService: {
      getCountryGraphByIso2Code: async () => {
        invoked = true;
        return {};
      },
    } as any,
  });
  const layer = (router as any).stack.find(
    (item: any) => item.route?.path === '/countries/:iso2Code',
  );
  let error: any;
  await layer.route.stack[0].handle(
    { params: { iso2Code: 'YE' }, query: { page: '2' } },
    {
      json: () => {
        throw new Error('unexpected response');
      },
    },
    (e: any) => {
      error = e;
    },
  );
  assert.equal(invoked, false);
  assert.equal(error?.name, 'ZodError');
});
