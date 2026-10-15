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
  cycleId: 'cycle-1', cycleKey: '2027|first', ownerVersionId: 'version-1',
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
        { studentReferenceId:'student', entityType: 'SCHOLARSHIP', entityId: 's', displayName: 'Historical' },
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
test('registry: all26 owners and reviewed owner opt-in discovery explicit', () => {
  validateIntegrationRegistry();
  assert.equal(crossModuleIntegrationRegistry.length, 26);
  assert.equal(integrationEdges.filter((edge) => edge.publicPolicy === 'OWNER_OPT_IN_INDEPENDENT_REVIEW_CURRENT_PUBLIC_REVISIONS').length, 2);
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

// Follow-up source checks: canonical cycles, private fulfillment and permissioned owner reads.
import { ScholarshipStudentApplicationTrackerGateway } from '../../../packages/infrastructure/src/students/ScholarshipStudentApplicationTrackerGateway';
import { CrossModuleIntegrityUseCase } from '../../../packages/application/src/integration/CrossModuleIntegrityUseCase';
import { CrossModuleIntegrityRouter } from '../../../apps/api/src/presentation/api/router/CrossModuleIntegrityRouter';

function cycleGateway(cycles:any[]){
  return new ScholarshipStudentApplicationTrackerGateway({findById:async()=>({...scholarship,versions:[{id:'v',status:'PUBLISHED'}],applicationCycles:cycles}),findPublishedBySlug:async()=>({...scholarship,requiredDocumentItems:[{id:'requirement',displayName:'Transcript',isRequired:true}]})} as any);
}
const publishedCycle={id:'cycle',cycleKey:'2027|fall',versionId:'v',status:'PUBLISHED',closesAt:new Date('2099-01-01')};
test('cycle: only canonical published owner-version cycles are offered',async()=>{
  const gateway=cycleGateway([publishedCycle,{...publishedCycle,id:'draft',status:'DRAFT'},{...publishedCycle,id:'old',versionId:'old'},{...publishedCycle,id:'expired',closesAt:new Date('2000-01-01')},{...publishedCycle,id:'future',opensAt:new Date('2098-01-01')},{...publishedCycle,id:'malformed',opensAt:new Date('invalid')}]);
  const owner=await gateway.resolve('s');assert.equal(owner?.available,true);assert.equal(owner?.cycleId,'cycle');assert.deepEqual(owner?.cycles?.map(c=>c.id),['cycle']);assert.equal(owner?.requirements?.[0].id,'requirement');
  assert.equal((await gateway.resolve('s','draft'))?.available,false);
});
test('cycle: ambiguous owners require explicit selection instead of reusing an old tracker',async()=>{
  const gateway=cycleGateway([publishedCycle,{...publishedCycle,id:'other'}]);
  assert.equal((await gateway.resolve('s'))?.cycleId,null);
  let persisted=false;
  const useCase=new StudentApplicationTrackerUseCases({create:async()=>{persisted=true;}} as any,gateway);
  await assert.rejects(()=>useCase.create({studentReferenceId:'student',scholarshipId:'s'}),/CANONICAL_CYCLE_REQUIRED/);assert.equal(persisted,false);
  assert.equal((await gateway.resolve('s','other'))?.cycleId,'other');
});
test('cycle: create overrides forged owner snapshot and cycle references',async()=>{
  let data:any;
  const useCase=new StudentApplicationTrackerUseCases({create:async(value:any)=>{data=value;return value;}} as any,{resolve:async()=>owner});
  await useCase.create({studentReferenceId:'student',scholarshipId:'s',cycleReferenceId:'forged',ownerSnapshot:{ownerVersionId:'forged'}} as any);
  assert.equal(data.cycleReferenceId,'cycle-1');assert.equal(data.ownerSnapshot.ownerVersionId,'version-1');assert.equal(data.ownerSnapshot.ownerId,'s');
});
test('cycle: archived tracker replay retains history and does not reactivate it',async()=>{
  const archived={id:'old',studentReferenceId:'student',scholarshipId:'s',cycleReferenceId:'cycle',status:'ARCHIVED',version:8,notes:'history',checklist:[]};
  const tx={studentApplicationTracker:{findUnique:async()=>archived,create:async()=>{throw new Error('MUST_NOT_CREATE');},updateMany:async()=>{throw new Error('MUST_NOT_RESET');}}};
  const repo=new PrismaStudentApplicationTrackerRepository({$transaction:async(fn:any)=>fn(tx)} as any);
  const result=await repo.create({studentReferenceId:'student',scholarshipId:'s',cycleReferenceId:'cycle',ownerSnapshot:{cycleId:'cycle'}});
  assert.equal(result.status,'ARCHIVED');assert.equal(result.notes,'history');assert.equal(result.version,8);
});
test('cycle: concurrent unique collision replays only the exact owned cycle',async()=>{
  const current={id:'t',status:'ACTIVE',cycleReferenceId:'cycle',checklist:[]};let key:any;
  const repo=new PrismaStudentApplicationTrackerRepository({$transaction:async()=>{throw Object.assign(new Error('collision'),{code:'P2002'});},studentApplicationTracker:{findUnique:async(query:any)=>{key=query.where;return current;}}} as any);
  assert.equal((await repo.create({studentReferenceId:'student',scholarshipId:'s',cycleReferenceId:'cycle',ownerSnapshot:{cycleId:'cycle'}})).id,'t');
  assert.deepEqual(key.studentReferenceId_scholarshipId_cycleReferenceId,{studentReferenceId:'student',scholarshipId:'s',cycleReferenceId:'cycle'});
});
function documentFixture(options:{assetUnavailable?:boolean;owner?:any;binding?:any;tracker?:any}={}){
  const tracker={id:'t',studentReferenceId:'student',scholarshipId:'s',cycleReferenceId:'cycle-1',status:'ACTIVE',version:3,...options.tracker};
  const requirementOwner={...owner,requirements:[{id:'requirement',displayName:'Transcript',required:true}]};
  const bindings=options.binding?[options.binding]:[];let saved:any;let assetOptions:any;
  const repo={findById:async(student:string)=>student==='student'?tracker:null,listDocumentBindings:async()=>bindings,saveDocumentBinding:async(...args:any[])=>{saved=args;return args[3];}};
  const policy={assertUsable:async(_id:string,input:any)=>{assetOptions=input;if(options.assetUnavailable)throw new Error('OWNER_OR_TRUST_DENIED');return {id:'asset'};}};
  const useCase=new StudentApplicationTrackerUseCases(repo as any,{resolve:async()=>options.owner===undefined?requirementOwner:options.owner},policy as any);
  return {useCase,saved:()=>saved,assetOptions:()=>assetOptions};
}
const binding={id:'b',trackerId:'t',requirementId:'requirement',assetId:'asset',ownerVersionId:'version-1',requirementSnapshot:{displayName:'Transcript',required:true},consentGrantedAt:new Date(),expiresAt:null,retentionUntil:new Date('2099-01-01')};
test('documents: consent and exact current cycle requirement precede persistence',async()=>{
  const f=documentFixture();
  await assert.rejects(()=>f.useCase.bindDocument('student','t',{requirementId:'requirement',assetId:'asset',expectedVersion:3,consent:false}),/CONSENT_REQUIRED/);
  await assert.rejects(()=>f.useCase.bindDocument('student','t',{requirementId:'forged',assetId:'asset',expectedVersion:3,consent:true}),/REQUIREMENT_UNAVAILABLE/);
  assert.equal(f.saved(),undefined);
  await f.useCase.bindDocument('student','t',{requirementId:'requirement',assetId:'asset',expectedVersion:3,consent:true});
  assert.equal(f.saved()[3].ownerVersionId,'version-1');assert.equal(f.assetOptions().expectedOwnerId,'student');assert.deepEqual(f.assetOptions().allowedOwnerTypes,['STUDENT']);
  assert.ok(f.saved()[3].retentionUntil.getTime()-Date.now()<=180*86400000);
});
test('documents: foreign tracker, legacy cycle and foreign owner identity are denied',async()=>{
  for(const [student,options] of [['other',{}],['student',{tracker:{cycleReferenceId:'LEGACY'}}],['student',{owner:{...owner,id:'different',requirements:[{id:'requirement'}]}}]] as any[]){
    const f=documentFixture(options);await assert.rejects(()=>f.useCase.bindDocument(student,'t',{requirementId:'requirement',assetId:'asset',expectedVersion:3,consent:true}));assert.equal(f.saved(),undefined);
  }
});
test('documents: unavailable asset is denied on write and rechecked on read',async()=>{
  const f=documentFixture({binding,assetUnavailable:true});
  await assert.rejects(()=>f.useCase.bindDocument('student','t',{requirementId:'requirement',assetId:'asset',expectedVersion:3,consent:true}),/OWNER_OR_TRUST_DENIED/);
  assert.equal((await f.useCase.documentReadiness('student','t')).entries[0].state,'ASSET_UNAVAILABLE');assert.equal(f.saved(),undefined);
});
test('documents: revision changes, expiry and malformed consent cannot claim readiness',async()=>{
  for(const [change,state] of [[{ownerVersionId:'old'},'REVISION_CHANGED'],[{expiresAt:new Date('2000-01-01')},'EXPIRED'],[{retentionUntil:new Date('invalid')},'EXPIRED'],[{consentGrantedAt:new Date('2099-01-01')},'EXPIRED']] as const){
    const f=documentFixture({binding:{...binding,...change}});assert.equal((await f.useCase.documentReadiness('student','t')).entries[0].state,state);
  }
  const f=documentFixture({binding});const result=await f.useCase.documentReadiness('student','t');assert.equal(result.entries[0].state,'ASSET_AVAILABLE_UNVERIFIED');assert.equal(result.entries[0].verification,'NOT_ATTESTED');assert.equal(result.applicationSubmission,'MANUAL_ONLY');assert.equal(JSON.stringify(result).includes('assetId'),false);
});
test('documents: unavailable owner preserves private requirement history without readiness claim',async()=>{
  const f=documentFixture({binding,owner:null});const report=await f.useCase.documentReadiness('student','t');assert.equal(report.ownerState,'UNAVAILABLE');assert.equal(report.entries[0].state,'OWNER_UNAVAILABLE');assert.equal(report.entries[0].displayName,'Transcript');
});
test('documents: archived tracker can withdraw consent with versioned transaction',async()=>{
  let deleted:any;let version:any;let outbox:any;
  const row={id:'t',studentReferenceId:'student',scholarshipId:'s',status:'ARCHIVED',version:3};
  const tx={studentApplicationTracker:{findFirst:async()=>row,updateMany:async(q:any)=>{version=q;return {count:1};},findUnique:async()=>({...row,version:4})},studentApplicationDocumentBinding:{deleteMany:async(q:any)=>{deleted=q;}},auditRecord:{create:async()=>({})},studentTimelineEntry:{create:async()=>({})},transactionalOutboxRecord:{create:async(q:any)=>{outbox=q;}}};
  const repo=new PrismaStudentApplicationTrackerRepository({$transaction:async(fn:any)=>fn(tx)} as any);await repo.removeDocumentBinding('student','t','requirement',3);
  assert.deepEqual(deleted.where,{trackerId:'t',requirementId:'requirement'});assert.equal(version.where.status,'ARCHIVED');assert.equal(version.where.version,3);assert.equal(JSON.stringify(outbox).includes('assetId'),false);
});
test('documents: retention purge remains bounded and rechecks expiry before deletion',async()=>{
  let query:any,deleted:any;const repo=new PrismaStudentApplicationTrackerRepository({studentApplicationDocumentBinding:{findMany:async(q:any)=>{query=q;return [{id:'expired'}];},deleteMany:async(q:any)=>{deleted=q;return {count:1};}}} as any);
  assert.equal(await repo.purgeExpiredDocumentBindings(1000),1);assert.equal(query.take,100);assert.deepEqual(deleted.where.id.in,['expired']);assert.ok(deleted.where.retentionUntil.lte instanceof Date);
});
test('integrity live owner sample: unauthorized targets are neither read nor returned',async()=>{
  let targetRead=false;const service=new CrossModuleIntegrityUseCase({} as any,{findById:async()=>{targetRead=true;}} as any,{list:async()=>page([{...scholarship,universityLinks:[{universityId:'private-target'}]}])} as any,{} as any);
  const report=await service.execute('SCHOLARSHIPS',new Set(['SCHOLARSHIPS']));assert.equal(targetRead,false);assert.equal(report.findings.length,0);assert.equal(report.coverage,'PARTIAL_OWNER_SAMPLE');assert.equal(report.targetReferencesChecked,0);
  await assert.rejects(()=>service.execute('UNIVERSITIES',new Set(['SCHOLARSHIPS'])),/SCOPE_INVALID/);
});
test('integrity live owner sample: explicit missing target is reported without pretending full catalog coverage',async()=>{
  const service=new CrossModuleIntegrityUseCase({} as any,{findById:async()=>null} as any,{list:async()=>page([{...scholarship,universityLinks:[{universityId:'gone'}]}])} as any,{} as any);
  const report=await service.execute('SCHOLARSHIPS',new Set(['SCHOLARSHIPS','UNIVERSITIES']));assert.equal(report.findings.some(f=>f.code==='MISSING_OWNER_REFERENCE'),true);assert.equal(report.productionIntegrity,'UNVERIFIED');assert.equal(report.coverage,'PARTIAL_OWNER_SAMPLE');
});
test('integrity API: absent identity and denied owner stop before owner reads',async()=>{
  let called=false;
  const router=CrossModuleIntegrityRouter.create({authEvaluatorService:{evaluatePermission:async()=>({isGranted:false})} as any,crossModuleIntegrityUseCase:{execute:async()=>{called=true;}} as any});
  const layer=(router as any).stack.find((entry:any)=>entry.route?.path==='/');
  for(const identity of [undefined,'admin']){let status=0;const res={setHeader:()=>{},status:(n:number)=>{status=n;return res;},json:()=>{}};await layer.route.stack[0].handle({authUserId:identity,query:{owner:'SCHOLARSHIPS'},ip:'127.0.0.1'},res,(error:any)=>{throw error;});assert.equal(status,identity?403:401);}
  assert.equal(called,false);
});
test('integrity live owner sample: canonical program parent mismatch is detected',async()=>{
  const service=new CrossModuleIntegrityUseCase({} as any,{findById:async()=>({id:'u',status:'PUBLISHED'}),findPublishedAcademicProgramsByIds:async()=>[{ownerId:'program',universityOwnerId:'other'}]} as any,{list:async()=>page([{...scholarship,universityLinks:[{universityId:'u',academicProgramId:'program'}]}])} as any,{} as any);
  const report=await service.execute('SCHOLARSHIPS',new Set(['SCHOLARSHIPS','UNIVERSITIES']));assert.equal(report.findings.some(f=>f.code==='OWNER_PARENT_MISMATCH'),true);
});
test('cycle: separate canonical cycle creates a clean checklist and cycle-specific reminder aggregate',async()=>{
  const rows=new Map<string,any>();const intents:any[]=[];
  const tx={studentApplicationTracker:{findUnique:async(query:any)=>rows.get(query.where.studentReferenceId_scholarshipId_cycleReferenceId?.cycleReferenceId)??null,create:async({data}:any)=>{const row={...data,checklist:data.checklist.create,id:`tracker-${data.cycleReferenceId}`,version:1,status:'ACTIVE'};rows.set(data.cycleReferenceId,row);return row;}},auditRecord:{create:async()=>({})},studentTimelineEntry:{create:async()=>({})},transactionalOutboxRecord:{create:async({data}:any)=>{intents.push(data);}}};
  const repo=new PrismaStudentApplicationTrackerRepository({$transaction:async(fn:any)=>fn(tx)} as any);
  for(const cycle of ['year-a','year-b'])await repo.create({studentReferenceId:'student',scholarshipId:'s',cycleReferenceId:cycle,ownerSnapshot:{cycleId:cycle},checklistLabels:['New transcript']});
  assert.equal(rows.size,2);assert.equal(rows.get('year-b').checklist[0].label,'New transcript');assert.equal(rows.get('year-b').stage,'PREPARING_DOCUMENTS');assert.deepEqual(intents.map(i=>i.aggregateId),['tracker-year-a','tracker-year-b']);
});
test('documents: removed requirement stays visible for consent withdrawal without claiming current readiness',async()=>{
  const f=documentFixture({binding,owner:{...owner,requirements:[]}});const result=await f.useCase.documentReadiness('student','t');assert.equal(result.entries[0].state,'REQUIREMENT_REMOVED');assert.equal(result.entries[0].linked,true);assert.equal(result.entries[0].bindable,false);
});
test('documents: concurrent tracker CAS failure prevents binding write and outbox',async()=>{
  let written=false;let emitted=false;
  const tx={studentApplicationTracker:{findFirst:async()=>({id:'t',studentReferenceId:'student',cycleReferenceId:'cycle',status:'ACTIVE',version:3}),updateMany:async()=>({count:0})},studentApplicationDocumentBinding:{findUnique:async()=>null,count:async()=>0,upsert:async()=>{written=true;}},transactionalOutboxRecord:{create:async()=>{emitted=true;}}};
  const repo=new PrismaStudentApplicationTrackerRepository({$transaction:async(fn:any)=>fn(tx)} as any);await assert.rejects(()=>repo.saveDocumentBinding('student','t',3,binding),/VERSION_CONFLICT/);assert.equal(written,false);assert.equal(emitted,false);
});
