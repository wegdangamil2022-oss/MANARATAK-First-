import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AcademicProgramExplorerUseCases } from '../../../packages/application/src/read-models/AcademicProgramExplorerUseCases';
import { AcademicProgramExplorerRouter } from '../../../apps/api/src/presentation/api/router/AcademicProgramExplorerRouter';
import { PrismaUniversityProgramWorkspaceGateway } from '../../../packages/infrastructure/src/universities/PrismaUniversityProgramWorkspaceGateway';
const input = {
  countryReferenceId: 'country',
  degreeLevelId: 'degree',
  majorId: 'major',
  internationalTestId: 'test',
  languageReferenceId: 'language',
  locale: 'en' as const,
  limit: 25,
};
test('academic explorer: selected filters reach the program owner and scholarships are queried by exact program', async () => {
  let observed: any;
  const scholarshipScopes: any[] = [];
  const programs = {
    query: async (query: any, publicOnly: boolean) => {
      observed = { query, publicOnly };
      return {
        items: [{ id: 'matched-program', universityId: 'same-university' }],
        total: 1,
        hasMore: false,
        nextCursor: null,
      };
    },
  };
  const scholarships = {
    listPublished: async (query: any) => {
      scholarshipScopes.push(query);
      return {
        data: [
          {
            id: 'scholarship',
            slug: 'scholarship',
            publicId: 'public',
            displayName: 'Matched grant',
          },
        ],
        total: 1,
        hasMore: false,
        nextCursor: null,
      };
    },
  };
  const result = await new AcademicProgramExplorerUseCases(
    programs as any,
    scholarships as any,
  ).query(input, true);
  assert.deepEqual(observed.query, input);
  assert.equal(observed.publicOnly, true);
  assert.equal(scholarshipScopes[0].academicProgramId, 'matched-program');
  assert.equal('universityId' in scholarshipScopes[0], false);
  assert.equal(result.items[0].scholarships.data[0].ownerId, 'scholarship');
  assert.equal(result.scope.countryReferenceId, 'country');
});
test('academic explorer: failed optional scholarship owner never becomes a zero count', async () => {
  const result = await new AcademicProgramExplorerUseCases(
    { query: async () => ({ items: [{ id: 'p' }], total: 1 }) } as any,
    {
      listPublished: async () => {
        throw new Error('owner offline');
      },
    } as any,
  ).query(input, true);
  assert.equal(result.items[0].scholarships.state, 'UNAVAILABLE');
  assert.equal(result.items[0].scholarshipCount, null);
});
test('academic explorer: scholarship pagination checks the program against the exact current scope', async () => {
  let read = false;
  const explorer = new AcademicProgramExplorerUseCases(
    { query: async () => ({ items: [] }) } as any,
    {
      listPublished: async () => {
        read = true;
      },
    } as any,
  );
  await assert.rejects(
    () => explorer.scholarshipPage(input, 'foreign-program', undefined, true),
    /NOT_IN_SCOPE/,
  );
  assert.equal(read, false);
});
test('academic explorer SQL: all canonical filters apply to one program; total excludes cursor and page limit', async () => {
  const queries: any[] = [];
  const tx = {
    $queryRaw: async (query: any) => {
      queries.push(query);
      return query.sql.includes('SELECT count(*)::bigint AS total') ? [{ total: 2n }] : [];
    },
    universityAcademicProgram: { findMany: async () => [] },
  };
  const gateway = new PrismaUniversityProgramWorkspaceGateway({
    $transaction: async (fn: any) => fn(tx),
  } as any);
  const result = await gateway.query({ ...input, cursor: 'after', limit: 1 }, true);
  assert.equal(result.total, 2);
  for (const value of ['country', 'degree', 'major', 'test', 'language'])
    assert.ok(queries[0].values.includes(value));
  assert.ok(queries[0].sql.includes('"UniversityProgramStudyLanguage"'));
  assert.ok(queries[0].sql.includes('"InternationalTestVersionScoreScale"'));
  assert.ok(queries[0].sql.includes('"currentPublishedVersionId"'));
  assert.equal(queries[1].values.includes('after'), false);
  assert.equal(queries[1].sql.includes('LIMIT'), false);
});
test('academic explorer API: public caller cannot request administrative visibility', async () => {
  let invoked = false;
  const router = AcademicProgramExplorerRouter.create(
    {
      academicProgramExplorerUseCases: {
        query: async () => {
          invoked = true;
        },
      } as any,
      authEvaluatorService: {} as any,
    },
    false,
  );
  const layer = (router as any).stack.find((entry: any) => entry.route?.path === '/');
  let failure: any;
  await layer.route.stack[0].handle(
    { query: { visibility: 'ADMIN_ALL' } },
    { json: () => {} },
    (error: any) => {
      failure = error;
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(invoked, false);
  assert.equal(failure?.name, 'ZodError');
});
test('academic explorer API: university permission alone cannot read private major and test states', async () => {
  let denied = 0;
  const router = AcademicProgramExplorerRouter.create(
    {
      academicProgramExplorerUseCases: {} as any,
      authEvaluatorService: {
        evaluatePermission: async (_id: string, permission: string) => ({
          isGranted: permission === 'admin:universities:manage',
        }),
      } as any,
    },
    true,
  );
  const middleware = (router as any).stack[0].handle;
  const res = {
    setHeader: () => {},
    status: (value: number) => {
      denied = value;
      return res;
    },
    json: () => {},
  };
  await middleware({ authUserId: 'admin', ip: '127.0.0.1' }, res, () => {
    throw new Error('private owner permission bypass');
  });
  assert.equal(denied, 403);
});
import { PrismaScholarshipRepository } from '../../../packages/infrastructure/src/scholarships/PrismaScholarshipRepository';
test('academic explorer: one owner batch supplies exact per-program scholarship pages', async () => {
  let batches = 0;
  const explorer = new AcademicProgramExplorerUseCases(
    {
      query: async () => ({
        items: [{ id: 'a' }, { id: 'b' }],
        total: 2,
        hasMore: false,
        nextCursor: null,
      }),
    } as any,
    {
      listPublishedProgramRelationshipsPage: async (ids: string[]) => {
        ++batches;
        assert.deepEqual(ids, ['a', 'b']);
        return {
          a: {
            data: [{ id: 'grant-a', publicId: 'public-a', slug: 'grant-a', displayName: 'A' }],
            total: 1,
            hasMore: false,
            nextCursor: null,
          },
          b: { data: [], total: 0, hasMore: false, nextCursor: null },
        };
      },
      listPublished: async () => {
        throw new Error('N_PLUS_ONE_OWNER_READ');
      },
    } as any,
  );
  const result = await explorer.query(input, true);
  assert.equal(batches, 1);
  assert.equal(result.items[0].scholarships.data[0].ownerId, 'grant-a');
  assert.equal(result.items[1].scholarshipCount, 0);
});
test('scholarship owner batch: count and continuation stay independent per canonical program', async () => {
  let query: any;
  const repo = new PrismaScholarshipRepository({
    $queryRaw: async (q: any) => {
      query = q;
      return [
        {
          programId: 'a',
          id: 'one',
          publicId: 'one',
          slug: 'one',
          displayName: 'First',
          total: 2n,
        },
        {
          programId: 'a',
          id: 'two',
          publicId: 'two',
          slug: 'two',
          displayName: 'Second',
          total: 2n,
        },
        {
          programId: 'b',
          id: 'other',
          publicId: 'other',
          slug: 'other',
          displayName: 'Other',
          total: 1n,
        },
      ];
    },
  } as any);
  const page = await repo.listPublishedProgramRelationshipsPage(['a', 'b'], 1);
  assert.equal(page.a.total, 2);
  assert.equal(page.a.hasMore, true);
  assert.equal(page.a.data.length, 1);
  assert.equal(page.b.hasMore, false);
  assert.equal(page.b.data[0].id, 'other');
  assert.ok(query.sql.includes('PARTITION BY "programId"'));
  assert.ok(query.sql.includes('sl."universityId"=p."universityId"'));
  assert.ok(query.sql.includes('"MajorLevelProfile"'));
  assert.ok(query.values.includes('a'));
  await assert.rejects(
    () =>
      repo.listPublishedProgramRelationshipsPage(
        Array.from({ length: 51 }, (_, i) => String(i)),
        1,
      ),
    /PROGRAM_PAGE_INVALID/,
  );
});

import {isPublicAdmissionRequirement} from '../../../packages/domain/src/public-boundaries/PublicOwnerPolicy';
test('academic explorer: a hidden test is excluded even when its published version and score are valid',()=>{
 const requirement={status:'ACTIVE',internationalTestId:'test',minimumScore:5,internationalTest:{status:'PUBLISHED',isPubliclyVisible:false,currentPublishedVersion:{status:'PUBLISHED',scoreScales:[{overallMinimum:0,overallMaximum:9}]}}};
 assert.equal(isPublicAdmissionRequirement(requirement),false);
 assert.equal(isPublicAdmissionRequirement({...requirement,internationalTest:{...requirement.internationalTest,isPubliclyVisible:true}}),true);
});
