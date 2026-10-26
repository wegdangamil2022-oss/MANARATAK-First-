import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';
import * as domainEnums from '../../packages/domain/dist/index.js';
import {
  reviewSources,
  sourceAllowed,
  unsupportedCoverage,
} from '../../apps/admin/src/features/review-queue/ReviewSources';
import {
  ageBucket,
  matchesReviewItem,
  mergeReviewItems,
  parseReviewFilters,
  projectReviewItem,
  safeSourceUrl,
  serializeReviewFilters,
  signalSla,
} from '../../apps/admin/src/features/review-queue/ReviewContracts';
import {
  auditQuery,
  parseAuditPreview,
  initialSourceState,
  loadReviewSources,
  readNextReviewPage,
  type ReviewRequest,
} from '../../apps/admin/src/features/review-queue/ReviewLoader';
import { ScholarshipImportCenterUseCases } from '../../packages/application/src/scholarships/import-center/ScholarshipImportCenterUseCases';
import { ImportedCourseAdminUseCases } from '../../packages/application/src/courses/use-cases/ImportedCourseAdminUseCases';
const source = reviewSources.find((entry) => entry.key === 'scholarships:workflow_review:0')!;
const capturedAt = '2026-10-12T00:00:00Z';
const signal = new AbortController().signal;
const row = (id = 'one', extra: Record<string, unknown> = {}) => ({ id, title: id, ...extra });
const fixture: ReviewRequest = async (url) => {
  const query = new URL(url, 'https://fixture.invalid').searchParams;
  const page = Number(query.get('page')),
    pageSize = Number(query.get('pageSize'));
  const total = 301;
  return {
    data: Array.from(
      { length: Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize)) },
      (_, offset) =>
        row(
          String((page - 1) * pageSize + offset),
          page === 7 ? { reviewPriority: 'critical' } : {},
        ),
    ),
    total,
    page,
    pageSize,
  };
};
test('301 rows: one bounded page, accurate partial scope and critical row on seventh continuation', async () => {
  let state = initialSourceState(source, true);
  state = await readNextReviewPage(state, fixture, signal);
  assert.equal(state.scanned, 50);
  assert.equal(state.total, 301);
  assert.equal(state.availability, 'partial');
  const pages: number[] = [1];
  while (state.nextPage !== null) {
    pages.push(state.nextPage);
    state = await readNextReviewPage(state, fixture, signal);
  }
  assert.deepEqual(pages, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(state.scanned, 301);
  assert.equal(state.rows.length, 301);
  assert.equal(state.rows.at(-1)!.signals[0].priority, 'critical');
  assert.equal(state.nextPage, null);
});
test('0, 1 and 1000 owner fixtures: valid empty versus bounded retention', async () => {
  for (const total of [0, 1, 1000]) {
    let state = initialSourceState(source, true);
    const request: ReviewRequest = async (url) => {
      const page = Number(new URL(url, 'https://fixture.invalid').searchParams.get('page'));
      return {
        data: Array.from(
          { length: Math.min(50, Math.max(0, total - (page - 1) * 50)) },
          (_, offset) => row(String((page - 1) * 50 + offset)),
        ),
        total,
        page,
        pageSize: 50,
      };
    };
    while (state.nextPage !== null) state = await readNextReviewPage(state, request, signal);
    assert.equal(state.rows.length, Math.min(500, total));
    assert.equal(state.scanned, total);
    assert.equal(state.windowLimited, total > 500);
    assert.equal(state.availability, total > 500 ? 'partial' : 'ready');
  }
});
test('role matrix: platform, owner, audit and import grants are independent; private coverage unsupported', () => {
  const has = (permissions: string[]) => (required: string) => permissions.includes(required);
  assert.equal(
    reviewSources.filter((entry) => sourceAllowed(entry, has(['admin:platform:manage']))).length,
    0,
  );
  assert.equal(
    reviewSources.filter((entry) => sourceAllowed(entry, has(['admin:audit:manage']))).length,
    0,
  );
  const ownerSources = reviewSources.filter((entry) =>
    sourceAllowed(entry, has(['admin:scholarships:manage'])),
  );
  assert.ok(ownerSources.length);
  assert.ok(
    ownerSources.every(
      (entry) => entry.domain === 'scholarships' && entry.key !== 'scholarships:import',
    ),
  );
  assert.ok(
    sourceAllowed(
      reviewSources.find((entry) => entry.key === 'scholarships:import')!,
      has(['admin:scholarships:manage', 'admin:imports:manage']),
    ),
  );
  assert.ok(unsupportedCoverage.includes('finance'));
  assert.ok(unsupportedCoverage.includes('student-applications'));
  assert.ok(
    reviewSources.every((entry) => !/applications|finance|alumni|students/.test(entry.endpoint)),
  );
});
test('denied source never issues a request; 403 erases previous data and is not zero', async () => {
  let calls = 0;
  const denied = await readNextReviewPage(
    initialSourceState(source, false),
    async () => {
      ++calls;
      return {};
    },
    signal,
  );
  assert.equal(calls, 0);
  assert.equal(denied.total, null);
  const prior = await readNextReviewPage(initialSourceState(source, true), fixture, signal);
  const result = await readNextReviewPage(
    prior,
    async () => {
      throw new Error('[403] detail with secret');
    },
    signal,
  );
  assert.equal(result.availability, 'access_denied');
  assert.equal(result.rows.length, 0);
  assert.equal(result.total, null);
  assert.equal(result.errorCode, 'ACCESS_DENIED');
});
test('404/500 failures retain stale evidence and never expose raw errors', async () => {
  const prior = await readNextReviewPage(initialSourceState(source, true), fixture, signal);
  for (const status of [404, 500]) {
    const result = await readNextReviewPage(
      prior,
      async () => {
        throw new Error(`[${status}] user@example.test secret`);
      },
      signal,
    );
    assert.equal(result.availability, 'stale');
    assert.equal(result.rows.length, 50);
    assert.equal(result.errorCode, 'SOURCE_UNAVAILABLE');
  }
});
test('malformed/empty intermediate page cannot silently reach completion', async () => {
  for (const response of [
    { data: [], total: 500, page: 1, pageSize: 50 },
    { data: [row()], page: 1, pageSize: 50 },
    { data: [row()], total: 1, page: 2, pageSize: 50 },
  ]) {
    const state = await readNextReviewPage(
      initialSourceState(source, true),
      async () => response,
      signal,
    );
    assert.equal(state.availability, 'unavailable');
    assert.equal(state.errorCode, 'SOURCE_CONTRACT_INVALID');
    assert.equal(state.nextPage, 1);
  }
});
test('live total transition is stale and cross-page duplicates are retained once', async () => {
  let state = await readNextReviewPage(initialSourceState(source, true), fixture, signal);
  state = await readNextReviewPage(
    state,
    async () => ({ data: [row('0')], total: 300, page: 2, pageSize: 50 }),
    signal,
  );
  assert.equal(state.availability, 'stale');
  assert.equal(state.rows.length, 50);
  assert.equal(state.consistency, 'LIVE_OFFSET_RECHECK_REQUIRED');
});
test('bounded concurrency: one unavailable source does not suppress other owners', async () => {
  let active = 0,
    peak = 0;
  const completed: string[] = [];
  await loadReviewSources(
    reviewSources.slice(0, 7).map((entry) => initialSourceState(entry, true)),
    async (url) => {
      ++active;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      --active;
      if (url.includes('FAILED')) throw new Error('[500]');
      return { data: [], total: 0, page: 1, pageSize: 50 };
    },
    signal,
    (result) => {
      completed.push(result.source.key);
    },
  );
  assert.ok(peak <= 3);
  assert.equal(completed.length, 7);
});
test('obsolete reads abort and never commit late results', async () => {
  const abort = new AbortController();
  let finish: (value: unknown) => void = () => {};
  let committed = false;
  const pending = loadReviewSources(
    [initialSourceState(source, true)],
    async (_url, options) =>
      new Promise((resolve) => {
        finish = resolve;
        options.signal.addEventListener('abort', () =>
          resolve({ data: [], total: 0, page: 1, pageSize: 50 }),
        );
      }),
    abort.signal,
    () => {
      committed = true;
    },
  );
  abort.abort();
  finish({ data: [], total: 0, page: 1, pageSize: 50 });
  await pending;
  assert.equal(committed, false);
});
test('source time clocks, unknown SLA and priority provenance cannot be inferred from modification', () => {
  const item = projectReviewItem(
    source,
    row('one', { updatedAt: capturedAt, createdAt: capturedAt, assignedTo: 'private-person' }),
    capturedAt,
  )!;
  assert.equal(signalSla(item.signals[0]), 'unknown');
  assert.equal(item.importedAt, null);
  assert.equal(item.sourceKind, 'unknown');
  assert.equal(item.signals[0].priorityBasis, 'suggested');
  assert.equal(item.signals[0].priority, 'medium');
  assert.ok(!JSON.stringify(item).includes('private-person'));
  assert.equal(ageBucket(null), 'unknown');
  const first = {
    ...item.signals[0],
    reviewEnteredAt: '2026-09-01T00:00:00Z',
    dueAt: '2026-09-02T00:00:00Z',
    policy: 'owner-v1',
  };
  assert.equal(signalSla(first, Date.parse(capturedAt)), 'overdue');
  assert.equal(signalSla({ ...first, policy: null }), 'unknown');
});
test('multiple reasons preserve each source and entry time rather than resetting SLA', () => {
  const old = projectReviewItem(
    source,
    row('same', { reviewEnteredAt: '2026-09-01T00:00:00Z' }),
    capturedAt,
  )!;
  const next = projectReviewItem(
    reviewSources.find(
      (entry) => entry.domain === 'scholarships' && entry.reason === 'incomplete',
    )!,
    row('same', { reviewEnteredAt: capturedAt }),
    capturedAt,
  )!;
  const merged = mergeReviewItems([old, next]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].signals.length, 2);
  assert.deepEqual(
    merged[0].signals.map((entry) => entry.reviewEnteredAt),
    ['2026-09-01T00:00:00.000Z', new Date(capturedAt).toISOString()],
  );
  assert.equal(old.signals.length, 1);
});
test('import owner reason codes retain independent provenance and batch/row identity', () => {
  const item = projectReviewItem(
    reviewSources.find((entry) => entry.key === 'scholarships:import')!,
    row('r1', { batchId: 'b1', reviewReasons: ['VERIFICATION:PENDING', 'DEDUPE:UPDATE'] }),
    capturedAt,
  )!;
  assert.equal(item.kind, 'import_record');
  assert.equal(item.batchId, 'b1');
  assert.equal(item.signals.length, 2);
  assert.equal(item.auditTarget!.type, 'SCHOLARSHIP_IMPORT_RECORD');
});
test('imported today ignores an old import modified today; missing import clock is unknown', () => {
  const imported = reviewSources.find((entry) => entry.key === 'courses:verification')!;
  const item = projectReviewItem(
    imported,
    row('one', { importedAt: '2026-09-01', updatedAt: capturedAt }),
    capturedAt,
  )!;
  const filters = parseReviewFilters(new URLSearchParams('view=imported_today'));
  assert.equal(matchesReviewItem(item, filters, Date.parse(capturedAt)), false);
});
test('typed owner targets block collision and permission-free audit queries', () => {
  const item = projectReviewItem(source, row(), capturedAt)!;
  assert.equal(auditQuery(item, false), null);
  const query = new URL(auditQuery(item, true, 'cursor')!, 'https://fixture.invalid');
  assert.equal(query.searchParams.get('targetType'), 'SCHOLARSHIP');
  assert.equal(query.searchParams.get('targetId'), 'one');
  assert.equal(query.searchParams.get('cursor'), 'cursor');
  const university = projectReviewItem(
    reviewSources.find((entry) => entry.domain === 'universities')!,
    row(),
    capturedAt,
  )!;
  assert.equal(university.detail, true);
  assert.equal(new URL(university.href, 'https://fixture.invalid').pathname, '/universities/one');
  assert.equal(
    new URL(university.href, 'https://fixture.invalid').searchParams.get('reviewSearch'),
    null,
  );
  const cms = projectReviewItem(
    reviewSources.find((entry) => entry.domain === 'cms')!,
    row(),
    capturedAt,
  )!;
  assert.equal(cms.auditTarget!.type, 'CmsContent');
  const events = Array.from({ length: 12 }, (_, index) => ({
    id: String(index),
    action: 'READ',
    timestamp: capturedAt,
    target: { targetId: 'one', targetType: 'SCHOLARSHIP' },
    actor: { actorId: 'private' },
  }));
  const preview = parseAuditPreview({ items: events, hasMore: true, nextCursor: 'page2' }, item);
  assert.equal(preview.hasMore, true);
  assert.ok(!JSON.stringify(preview).includes('private'));
  assert.throws(() =>
    parseAuditPreview(
      {
        items: [{ ...events[0], target: { targetId: 'one', targetType: 'COURSE' } }],
        hasMore: false,
        nextCursor: null,
      },
      item,
    ),
  );
});
test('diff is supported only for scholarship import identity, distinct from unsupported/NA', () => {
  const ordinary = projectReviewItem(source, row(), capturedAt)!;
  assert.equal(ordinary.diff, 'not_applicable');
  const imported = projectReviewItem(
    reviewSources.find((entry) => entry.key === 'courses:verification')!,
    row(),
    capturedAt,
  )!;
  assert.equal(imported.diff, 'unsupported');
  const scholarship = projectReviewItem(
    source,
    row('s1', { sourceImportRecordId: 'i1' }),
    capturedAt,
  )!;
  assert.equal(scholarship.diff, 'supported');
});
test('unsafe URLs blocked, external HTTP kept explicitly recognizable and imported origin is authoritative', () => {
  for (const value of [
    'javascript:alert(1)',
    'https://user:pass@host.test',
    '/relative',
    'data:text/plain,hello',
  ])
    assert.equal(safeSourceUrl(value), null);
  assert.equal(safeSourceUrl('http://host.test'), 'http://host.test/');
  const cms = projectReviewItem(
    reviewSources.find((entry) => entry.domain === 'cms')!,
    row('i1', { sourceKind: 'imported' }),
    capturedAt,
  )!;
  assert.equal(cms.sourceKind, 'imported');
});
test('URL enums round-trip and tampering/IDs/PII never enter a shareable query', () => {
  const safe = parseReviewFilters(
    new URLSearchParams(
      'domain=scholarships&reason=source_verification&priority=high&studentId=private&q=name@example.test',
    ),
  );
  assert.equal(
    serializeReviewFilters(safe).toString(),
    'domain=scholarships&reason=source_verification&priority=high',
  );
  assert.equal(
    parseReviewFilters(
      new URLSearchParams('domain=finance&priority=admin&sort=javascript:alert(1)'),
    ).domain,
    'all',
  );
  assert.deepEqual(parseReviewFilters(serializeReviewFilters(safe)), safe);
});
// Evaluate the actual owner Zod declarations from the checked-out source, not copied schemas.
function ownerSchema(file: string, name: string) {
  const code = fs.readFileSync(`apps/api/src/presentation/api/router/${file}.ts`, 'utf8');
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const declarations = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
      declarations.set(node.name.text, node.initializer.getText(ast));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  const context: Record<string, unknown> = { z, ...domainEnums };
  const evaluate = (key: string) => {
    if (key in context) return context[key];
    const expression = declarations.get(key);
    assert.ok(expression, `missing schema/dependency ${key}`);
    for (const dependency of [
      'allAsUndefined',
      'cleanOptionalEnum',
      'cleanOptionalString',
      'optionalPositiveInt',
      'slug',
    ])
      if (expression.includes(dependency) && dependency !== key && !(dependency in context))
        context[dependency] = evaluate(dependency);
    const js = ts.transpile(`const result = ${expression};`, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    });
    return new Function(...Object.keys(context), `${js};return result;`)(...Object.values(context));
  };
  return evaluate(name) as z.ZodType;
}
for (const [owner, file, name] of [
  ['scholarships', 'ScholarshipAdminRouter', 'listQuerySchema'],
  ['universities', 'UniversityAdminRouter', 'listQuerySchema'],
  ['majors', 'MajorAdminRouter', 'listQuerySchema'],
  ['courses', 'CourseAdminRouter', 'listQuerySchema'],
  ['tests', 'InternationalTestAdminRouter', 'querySchema'],
  ['services', 'ServiceAdminRouter', 'listQuerySchema'],
  ['cms', 'CmsAdminRouter', 'querySchema'],
  ['study-destinations', 'StudyDestinationAdminRouter', 'listSchema'],
])
  test(`actual owner ${owner} source schema accepts every registered filter and rejects invalid workflow state`, () => {
    const schema = ownerSchema(file, name);
    const sources = reviewSources.filter(
      (entry) =>
        entry.domain === owner &&
        entry.endpoint ===
          (owner === 'cms'
            ? '/admin/cms/content'
            : source.endpoint.replace(
                'scholarships',
                owner === 'tests' ? 'international-tests' : owner,
              )),
    );
    assert.ok(sources.length);
    for (const entry of sources)
      assert.ok(
        schema.safeParse({ ...entry.params, page: '1', pageSize: '50' }).success,
        entry.key,
      );
    assert.equal(
      schema.safeParse({ status: 'NOT_AN_OWNER_STATE', page: '1', pageSize: '50' }).success,
      false,
    );
  });
test('bounded REAL import owner page reads 25/25/10, filters TEST/DEMO and strips raw content', async () => {
  const pages: number[] = [];
  const records = Array.from({ length: 60 }, (_, index) => ({
    id: String(index),
    rawPayload: { secret: 'secret-contact' },
  }));
  const gateway = {
    listRecords: async (query: { page: number; pageSize: number; dataType: string }) => {
      assert.equal(query.dataType, 'SCHOLARSHIPS');
      pages.push(query.page);
      return {
        data: records.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: 60,
        page: query.page,
        pageSize: query.pageSize,
      };
    },
  };
  const owner = new ScholarshipImportCenterUseCases(gateway as any, {} as any);
  (owner as any).analyzeWithBatch = async (record: { id: string }) => ({
    ...record,
    batchId: 'b1',
    sourceSystem: 'owner',
    operationalClass: record.id === '5' ? 'TEST' : record.id === '6' ? 'DEMO' : 'REAL',
    transferred: false,
    reviewReasons: ['VERIFICATION:PENDING'],
    verification: { state: 'PENDING' },
    updatedAt: capturedAt,
  });
  let returned = 0;
  for (let page = 1; page <= 3; ++page) {
    const response = await owner.listReviewPage({ page, pageSize: 25 });
    returned += response.data.length;
    assert.equal(response.scannedRecords, page === 3 ? 10 : 25);
    assert.equal(response.hasMore, page < 3);
    assert.equal(response.totalScope, 'owner_candidates');
    assert.ok(!JSON.stringify(response.data).includes('secret-contact'));
  }
  assert.equal(returned, 58);
  assert.deepEqual(pages, [1, 2, 3]);
  const emptyRealPage = await readNextReviewPage(
    initialSourceState(
      reviewSources.find((entry) => entry.key === 'scholarships:import')!,
      true,
    ),
    async () => ({
      data: [],
      total: 60,
      page: 1,
      pageSize: 25,
      scannedRecords: 25,
      hasMore: true,
      totalScope: 'owner_candidates',
    }),
    signal,
  );
  assert.equal(emptyRealPage.nextPage, 2);
  assert.equal(emptyRealPage.availability, 'partial');
});
test('imported course owner states TRUE/FALSE/absent remain VERIFIED/NEEDS_VERIFICATION/UNKNOWN', async () => {
  const owner = new ImportedCourseAdminUseCases(
    {
      listImportedCourses: async () => ({
        data: [{ id: '1', sourceVerified: true }, { id: '2', sourceVerified: false }, { id: '3' }],
        total: 3,
        page: 1,
        pageSize: 50,
      }),
    } as any,
    {} as any,
    {} as any,
    {} as any,
  );
  assert.deepEqual(
    (await owner.list({})).data.map((entry) => entry.verificationState),
    ['VERIFIED', 'NEEDS_VERIFICATION', 'UNKNOWN'],
  );
});
test('source integration boundaries: owner guards remain, review has no mutation and health contract untouched', () => {
  const page = fs.readFileSync('apps/admin/src/pages/AdminReviewQueuePage.tsx', 'utf8');
  assert.ok(!/method:\s*['"](?:POST|PATCH|PUT|DELETE)/.test(page));
  assert.ok(page.includes('ReviewWorkspacePage'));
  const workspace=fs.readFileSync('apps/admin/src/features/review-queue/ReviewWorkspacePage.tsx','utf8');
  const preview=fs.readFileSync('apps/admin/src/features/review-queue/WorkspacePreview.tsx','utf8');
  const text=fs.readFileSync('apps/admin/src/features/review-queue/WorkspaceText.ts','utf8');
  assert.ok(workspace.includes('AbortController'));
  assert.ok(workspace.includes('requestGeneration.current'));
  assert.ok(preview.includes('noopener noreferrer'));
  assert.ok(preview.includes('aria-modal="true"'));
  assert.ok(text.includes("timeZone: 'UTC'"));
  const router = fs.readFileSync(
    'apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts',
    'utf8',
  );
  assert.ok(
    router.includes("SecurityMiddlewareFactory.createAdminPermissionGuard('admin:imports:manage')"),
  );
  const app = fs.readFileSync('apps/api/src/app.ts', 'utf8');
  for (const [path, permission] of [
    ['scholarships', 'scholarships'],
    ['careers', 'careers'],
  ])
    assert.ok(
      app.includes(`'/admin/${path}', requireAdminPermission('admin:${permission}:manage')`),
    );
  assert.ok(app.includes("'/admin/courses', createCourseAccessGuard(container.resolve('courseAccessService'))"));
  assert.ok(app.includes("'/admin/courses/imported', requireAdminPermission('admin:courses:manage')"));
});


test('session expiry clears retained source evidence and disables continuation', async () => {
  const initial = initialSourceState(source, true);
  const good = await readNextReviewPage(initial, fixture, signal);
  assert.ok(good.rows.length > 0);
  const denied = await readNextReviewPage(good, async () => { throw new Error('[401] session expired'); }, signal);
  assert.equal(denied.availability, 'access_denied');
  assert.equal(denied.errorCode, 'SESSION_REQUIRED');
  assert.deepEqual(denied.rows, []);
  assert.equal(denied.total, null);
  assert.equal(denied.nextPage, null);
});
test('changed owner totals remain stale until a fresh first-page scan', async () => {
  const first = await readNextReviewPage(initialSourceState(source, true), fixture, signal);
  const changed: ReviewRequest = async (url, options) => ({ ...(await fixture(url, options) as object), total: 302 });
  const second = await readNextReviewPage(first, changed, signal);
  assert.equal(second.availability, 'stale');
  const third = await readNextReviewPage(second, changed, signal);
  assert.equal(third.availability, 'stale');
  assert.equal(third.errorCode, 'SOURCE_CHANGED_RECHECK');
  const refreshed = await readNextReviewPage(initialSourceState(source, true), changed, signal);
  assert.equal(refreshed.availability, 'partial');
  assert.equal(refreshed.errorCode, null);
});
test('malformed review clocks never imply an owner SLA or an old age', () => {
  const item = projectReviewItem(source, row(), capturedAt)!;
  const base = { ...item.signals[0], policy: 'owner-policy', reviewEnteredAt: capturedAt, dueAt: '2026-10-13T00:00:00Z' };
  assert.equal(signalSla({ ...base, reviewEnteredAt: 'invalid' }), 'unknown');
  assert.equal(signalSla({ ...base, dueAt: 'invalid' }), 'unknown');
  assert.equal(ageBucket('invalid'), 'unknown');
});

test('owner-total drift is not forgotten after a temporary continuation failure', async () => {
  const first = await readNextReviewPage(initialSourceState(source, true), fixture, signal);
  const changed: ReviewRequest = async (url, options) => ({ ...(await fixture(url, options) as object), total: 302 });
  const second = await readNextReviewPage(first, changed, signal);
  const failed = await readNextReviewPage(second, async () => { throw new Error('offline'); }, signal);
  const resumed = await readNextReviewPage(failed, changed, signal);
  assert.equal(resumed.availability, 'stale');
  assert.equal(resumed.ownerChanged, true);
  assert.equal(resumed.errorCode, 'SOURCE_CHANGED_RECHECK');
});
