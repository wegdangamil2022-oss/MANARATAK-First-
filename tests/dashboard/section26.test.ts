import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const { MemoryRouter } = createRequire(new URL('../../apps/admin/package.json', import.meta.url))(
  'react-router-dom',
);
import {
  dashboardAllowed,
  dashboardMetricHref,
  dashboardSources,
  isDashboardQueueLinkSupported,
  unmeasuredCoverage,
  analyticsContract,
} from '../../apps/admin/src/features/dashboard/DashboardSources';
import {
  coverageSubtotal,
  effectiveDashboardState,
  initialDashboardReading,
  parseDashboardResponse,
  safeCount,
  strictSum,
} from '../../apps/admin/src/features/dashboard/DashboardContract';
import {
  dashboardRefreshNeeded,
  loadDashboardSources,
  readDashboardSource,
} from '../../apps/admin/src/features/dashboard/DashboardLoader';
import {
  DashboardHealthPanel,
  DashboardMetricCard,
} from '../../apps/admin/src/features/dashboard/DashboardCards';
import {
  dashboardLabel,
  dashboardTime,
} from '../../apps/admin/src/features/dashboard/dashboardText';
import {
  dashboardActivityProjection,
  dashboardAuditOwners,
  type ActivityAuditRecord,
} from '../../apps/api/src/presentation/dashboard/DashboardActivityProjection';
const when = '2026-10-12T04:00:00.000Z',
  now = Date.parse(when),
  signal = new AbortController().signal;
const source = (key: string) => {
  const found = dashboardSources.find((source) => source.key === key);
  assert.ok(found, key);
  return found;
};
const render = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, element));
function healthFixture(status = 'DEGRADED') {
  return {
    protocolVersion: 2,
    checkedAt: when,
    runtimeMode: 'staging',
    runtimeStatus: status,
    decisionScope: 'DIAGNOSTIC_ONLY',
    releaseReady: false,
    releaseGate: {
      environmentEligible: false,
      configurationReady: true,
      runtimeReady: status === 'UP',
      monitoringComplete: true,
    },
    diagnosticAggregationDurationMs: 30,
    api: { status: 'UP', livenessDurationMs: 1, uptimeSeconds: 200 },
    summary: {
      up: 0,
      degraded: 1,
      down: 0,
      unknown: 0,
      productionBlockers: 2,
      productionWarnings: 3,
      monitoredComponents: 1,
      missingProbes: 0,
    },
    components: [
      {
        id: 'database',
        status,
        optional: false,
        checkedAt: when,
        evidenceKind: 'OWNER',
        probeVersion: 1,
        operational: true,
        details: {},
      },
    ],
    coverage: {
      expected: ['database'],
      monitored: ['database'],
      missingProbes: [],
      extraProbes: [],
      requiredUnverified: [],
      expectedCount: 1,
      matchedCount: 1,
      extraCount: 0,
      missingCount: 0,
      operationalCount: 1,
      testedCoverage: 'DIAGNOSTIC',
    },
    productionReadiness: {
      ready: false,
      blockerCount: 2,
      warningCount: 3,
      checkedAt: when,
      findings: [],
    },
  };
}
test('dashboard counter schema: zero distinct from missing, fractional, negative, coerced or nonfinite', () => {
  assert.equal(safeCount(0), 0);
  assert.equal(safeCount(7), 7);
  for (const value of [undefined, null, -1, 0.5, NaN, Infinity, '7', Number.MAX_SAFE_INTEGER + 1])
    assert.equal(safeCount(value), null);
  assert.equal(
    parseDashboardResponse(source('universities:total'), { total: 0 }, when).metrics.total,
    0,
  );
  for (const value of [-2, 1.2, '3', null]) {
    const parsed = parseDashboardResponse(source('universities:total'), { total: value }, when);
    assert.equal(parsed.state, 'unavailable');
    assert.equal(parsed.metrics.total, null);
  }
});
test('strict aggregation and qualified partial arithmetic never drop a missing operand silently', () => {
  assert.equal(strictSum([2, 3]), 5);
  assert.equal(strictSum([2, null]), null);
  assert.equal(strictSum([]), null);
  assert.equal(strictSum([Number.MAX_SAFE_INTEGER, 1]), null);
  assert.deepEqual(coverageSubtotal([5, null, 2]), { knownSubtotal: 7, missing: 1, exact: false });
});
test('permission matrix: platform-only omits owner reads and domain grants never imply audit access', async () => {
  for (const [grants, expected] of [
    [['admin:platform:manage'], ['health']],
    [
      ['admin:platform:manage', 'admin:finance:manage'],
      ['health', 'finance'],
    ],
    [[], []],
  ] as const) {
    const allowed = dashboardSources.filter((source) =>
      dashboardAllowed(source, (permission) => (grants as readonly string[]).includes(permission)),
    );
    assert.deepEqual(
      [...new Set(allowed.map((source) => source.domain))].sort(),
      [...expected].sort(),
    );
  }
  let called = false;
  await readDashboardSource(
    initialDashboardReading(source('finance'), false),
    async () => {
      called = true;
      return {};
    },
    signal,
  );
  assert.equal(called, false);
  const multi = dashboardSources.filter((source) =>
    dashboardAllowed(source, (permission) =>
      ['admin:platform:manage', 'admin:scholarships:manage'].includes(permission),
    ),
  );
  assert.ok(multi.every((source) => ['scholarships', 'health'].includes(source.domain)));
});
test('scholarship review 3 is independent of imported 15 and ready 7', () => {
  const review = source('scholarships:review');
  assert.equal(review.params.status, 'READY_TO_REVIEW');
  assert.equal(parseDashboardResponse(review, { total: 3 }, when).metrics.review, 3);
  assert.equal(
    parseDashboardResponse(source('scholarships:ready'), { total: 7 }, when).metrics.ready,
    7,
  );
  const summary = parseDashboardResponse(
    source('scholarships:quality'),
    { imported: 15, missingFields: 0, needsVerification: 2, needsTranslation: 0 },
    when,
  );
  assert.equal(summary.metrics.imported, 15);
  assert.equal(summary.metrics.review, undefined);
});
test('course canonical review, imported review and link/verification workload stay separate', () => {
  const canonical = parseDashboardResponse(source('courses:review'), { total: 8 }, when);
  const imported = parseDashboardResponse(
    source('courses:imported'),
    { overview: { total: 30, review: 4, incomplete: 2, broken: 1, needsVerification: 3 } },
    when,
  );
  assert.equal(canonical.metrics.review, 8);
  assert.equal(imported.metrics.imported_review, 4);
  assert.equal(imported.metrics.imported_broken, 1);
  assert.equal(imported.metrics.review, undefined);
});
test('CMS 5 in review and 8 ready remain distinct lifecycle counts', () => {
  assert.equal(source('cms:review').params.status, 'IN_REVIEW');
  assert.equal(source('cms:ready').params.status, 'READY_TO_PUBLISH');
  assert.equal(parseDashboardResponse(source('cms:review'), { total: 5 }, when).metrics.review, 5);
  assert.equal(parseDashboardResponse(source('cms:ready'), { total: 8 }, when).metrics.ready, 8);
});
test('owner failure in one metric preserves valid independent counts', async () => {
  const results = new Map();
  await loadDashboardSources(
    ['universities:total', 'universities:published'].map((key) =>
      initialDashboardReading(source(key), true),
    ),
    async (url) => {
      if (url.includes('PUBLISHED')) throw new Error('[500] internal');
      return { total: 50 };
    },
    signal,
    (reading) => results.set(reading.source.key, reading),
  );
  assert.equal(results.get('universities:total').metrics.total, 50);
  assert.equal(results.get('universities:published').metrics.published, null);
});
test('identity envelope reads only human total and routes to identity owner', () => {
  const humans = source('identities');
  assert.equal(humans.params.type, 'Human');
  assert.equal(humans.href, '/identities?type=Human');
  const parsed = parseDashboardResponse(
    humans,
    { data: { total: 12, items: [{ email: 'private@example.test' }] } },
    when,
  );
  assert.equal(parsed.metrics.humans, 12);
  assert.ok(!JSON.stringify(parsed).includes('private@example.test'));
  assert.equal(parseDashboardResponse(humans, { total: 12 }, when).metrics.humans, null);
});
test('import owner counters distinguish observed zero, absent statuses and NaN', () => {
  const parsed = parseDashboardResponse(
    source('imports'),
    {
      totalBatches: 4,
      totalRecords: 60,
      recordStatusCounts: { NEEDS_REVIEW: 0, FAILED: '5', PROMOTED: 10 },
      generatedAt: when,
    },
    when,
  );
  assert.equal(parsed.state, 'partial');
  assert.equal(parsed.metrics.NEEDS_REVIEW, 0);
  assert.equal(parsed.metrics.INCOMPLETE, null);
  assert.equal(parsed.metrics.FAILED, null);
  assert.equal(parsed.metrics.PROMOTED, 10);
});
test('finance projection validates statuses and strips raw attention/financial details', () => {
  const parsed = parseDashboardResponse(
    source('finance'),
    {
      pendingPayments: 1,
      pendingTransfers: 2,
      pendingApprovals: 0,
      reconciliationHealth: 'DEGRADED',
      attention: [{ account: 'private', salary: 999 }],
    },
    when,
  );
  assert.equal(parsed.reconciliation, 'DEGRADED');
  assert.ok(!JSON.stringify(parsed).includes('salary'));
  assert.equal(
    parseDashboardResponse(
      source('finance'),
      { pendingPayments: 1, pendingTransfers: 2, pendingApprovals: 0, reconciliationHealth: 'UP' },
      when,
    ).state,
    'partial',
  );
});
test('403 revocation erases previous finance evidence; 500/503 keep marked stale evidence', async () => {
  const prior = parseDashboardResponse(
    source('finance'),
    {
      pendingPayments: 1,
      pendingTransfers: 2,
      pendingApprovals: 0,
      reconciliationHealth: 'HEALTHY',
    },
    when,
  );
  for (const code of [401, 403]) {
    const result = await readDashboardSource(
      prior,
      async () => {
        throw new Error(`[${code}] name@example.test`);
      },
      signal,
    );
    assert.equal(result.state, 'forbidden');
    assert.equal(result.metrics.pendingPayments, null);
    assert.equal(result.reconciliation, null);
  }
  for (const code of [500, 503]) {
    const result = await readDashboardSource(
      prior,
      async () => {
        throw new Error(`[${code}] private detail`);
      },
      signal,
    );
    assert.equal(result.state, 'stale');
    assert.equal(result.metrics.pendingPayments, 1);
    assert.ok(!JSON.stringify(result).includes('private detail'));
  }
});
test('browser read failure never proves health DOWN', async () => {
  for (const cause of ['[503] service response', '[403] denied', 'network disconnected']) {
    const result = await readDashboardSource(
      initialDashboardReading(source('health'), true),
      async () => {
        throw new Error(cause);
      },
      signal,
    );
    assert.equal(result.health, null);
    assert.ok(['forbidden', 'unavailable', 'network_error'].includes(result.state));
  }
});
test('dashboard consumes protected v2 health status/gate unchanged, including DEGRADED', () => {
  assert.equal(source('health').endpoint, '/admin/monitoring/overview');
  for (const status of ['UP', 'DEGRADED', 'DOWN', 'UNKNOWN']) {
    const owner = healthFixture(status),
      reading = parseDashboardResponse(source('health'), owner, when);
    assert.equal(reading.health!.runtimeStatus, owner.runtimeStatus);
    assert.equal(reading.health!.api.status, 'UP');
    assert.equal(reading.health!.releaseReady, owner.releaseReady);
    assert.deepEqual(reading.health!.releaseGate, owner.releaseGate);
    assert.equal(reading.health!.productionReadiness.blockerCount, 2);
  }
  const malformed = healthFixture();
  malformed.productionReadiness.blockerCount = -1;
  assert.throws(() => parseDashboardResponse(source('health'), malformed, when), /SCHEMA_MISMATCH/);
});
test('freshness ceilings expire health sooner than catalogs and reject future evidence', () => {
  const health = parseDashboardResponse(source('health'), healthFixture('UP'), when);
  const catalog = parseDashboardResponse(source('universities:total'), { total: 10 }, when);
  assert.equal(effectiveDashboardState(health, now + 31000), 'stale');
  assert.equal(effectiveDashboardState(catalog, now + 31000), 'available');
  assert.equal(effectiveDashboardState(catalog, now + 300001), 'stale');
  assert.equal(
    effectiveDashboardState({ ...health, capturedAt: new Date(now + 60000).toISOString() }, now),
    'stale',
  );
  assert.equal(dashboardRefreshNeeded([health], now + 31000), true);
});
test('source timestamps preserve owner capture separately from receipt and are non-atomic', () => {
  const captured = '2026-10-12T03:59:30.000Z';
  const parsed = parseDashboardResponse(source('imports'), { generatedAt: captured }, when);
  assert.equal(parsed.capturedAt, captured);
  assert.equal(parsed.receivedAt, when);
  assert.equal(parsed.consistency, 'BEST_EFFORT_OWNER_READS');
});
test('timeout is bounded and distinct from runtime failure', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = readDashboardSource(
    initialDashboardReading(source('universities:total'), true),
    async () => new Promise(() => {}),
    signal,
  );
  let settled = false;
  void pending.then(() => {
    settled = true;
  });
  t.mock.timers.tick(29999);
  await Promise.resolve();
  assert.equal(settled, false);
  t.mock.timers.tick(2);
  const result = await pending;
  assert.equal(result.state, 'timed_out');
  assert.equal(result.health, null);
});
test('three concurrent sources progress independently despite one failure', async () => {
  let active = 0,
    peak = 0;
  const completed: string[] = [];
  await loadDashboardSources(
    dashboardSources.slice(0, 7).map((source) => initialDashboardReading(source, true)),
    async (url) => {
      ++active;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      --active;
      if (url.includes('PUBLISHED')) throw new Error('[500]');
      return { total: 2 };
    },
    signal,
    (result) => completed.push(result.source.key),
  );
  assert.equal(completed.length, 7);
  assert.ok(peak <= 3);
});
test('replacement/unmount abort suppresses late updates', async () => {
  const abort = new AbortController();
  let committed = false;
  const pending = loadDashboardSources(
    [initialDashboardReading(source('universities:total'), true)],
    async (_url, options) =>
      new Promise((resolve) =>
        options.signal.addEventListener('abort', () => resolve({ total: 10 })),
      ),
    abort.signal,
    () => {
      committed = true;
    },
  );
  abort.abort();
  await pending;
  assert.equal(committed, false);
});
test('contextual attention links use registered queue enums; identities and generic handoffs are explicit', () => {
  for (const descriptor of dashboardSources)
    for (const metric of descriptor.metrics)
      assert.equal(
        isDashboardQueueLinkSupported(dashboardMetricHref(descriptor, metric)),
        true,
        `${descriptor.key}:${metric}`,
      );
  assert.match(
    dashboardMetricHref(source('scholarships:quality'), 'needsVerification'),
    /reason=source_verification/,
  );
  assert.match(
    dashboardMetricHref(source('courses:imported'), 'imported_broken'),
    /reason=broken_link/,
  );
  assert.equal(source('majors:total').params.catalog, 'false');
  assert.equal(source('majors:total').unit, 'major_profiles');
});
test('coverage gaps and analytics stay unmeasured; no private application source exists', () => {
  assert.equal(analyticsContract.state, 'NOT_MEASURED');
  assert.ok(unmeasuredCoverage.includes('notification_dead_letters'));
  assert.ok(
    dashboardSources.every(
      (source) => !/applications|student-workspace|alumni/.test(source.endpoint),
    ),
  );
  assert.ok(analyticsContract.requiredEvidence.includes('consent_and_retention'));
});
function auditRecord(
  type: string,
  id: string,
  at: string,
  targetId = 'target-private',
): ActivityAuditRecord {
  return {
    getId: () => ({ getValue: () => id }),
    getAction: () => ({ getValue: () => 'RECORD_UPDATED' }),
    getTimestamp: () => ({ getValue: () => new Date(at) }),
    getActor: () => ({ getActorType: () => 'USER' }),
    getTarget: () => ({ getTargetType: () => type, getTargetId: () => targetId }),
    getContextMetadata: () => ({
      getData: () => ({ result: 'SUCCESS', email: 'private@example.test', amount: 800 }),
    }),
  };
}
const required = ['admin:platform:manage', 'admin:audit:manage'];
test('activity requires platform, audit and owner grants before querying; denied is not empty history', async () => {
  let calls = 0;
  const port = {
    queryAuditPage: async () => {
      ++calls;
      return { items: [], hasMore: false };
    },
  };
  for (const grants of [[], ['admin:platform:manage'], required]) {
    const result = await dashboardActivityProjection(port, async (permission) =>
      grants.includes(permission),
    );
    assert.equal(result.availability, 'FORBIDDEN');
  }
  assert.equal(calls, 0);
});
test('authorization-only activity excludes finance; finance grant permits only its own event and PII is stripped', async () => {
  for (const ownerGrant of ['admin:authorization:manage', 'admin:finance:manage']) {
    const queried: string[] = [];
    const grants = [...required, ownerGrant];
    const feed = await dashboardActivityProjection(
      {
        queryAuditPage: async ({ targetType }) => {
          queried.push(targetType);
          return { items: [auditRecord(targetType, `event-${targetType}`, when)], hasMore: false };
        },
      },
      async (permission) => grants.includes(permission),
    );
    assert.ok(feed.items.length);
    assert.ok(
      queried.every(
        (type) =>
          dashboardAuditOwners.find((owner) => owner.type === type)!.permission === ownerGrant,
      ),
    );
    assert.ok(!JSON.stringify(feed).includes('private@example.test'));
    assert.ok(!JSON.stringify(feed).includes('target-private'));
    assert.ok(!JSON.stringify(feed).includes('amount'));
    assert.ok(
      feed.items.every(
        (row) => row.owner === (ownerGrant.includes('finance') ? 'finance' : 'authorization'),
      ),
    );
  }
});
test('activity bounded latest ten sort, record policy denial and unknown-target isolation', async () => {
  const feed = await dashboardActivityProjection(
    {
      queryAuditPage: async ({ targetType, limit }) => {
        assert.equal(limit, 10);
        return {
          items: [
            auditRecord(targetType, `${targetType}-old`, '2026-10-11T00:00:00Z'),
            auditRecord(targetType, `${targetType}-new`, when),
            auditRecord(targetType, `${targetType}-denied`, when, 'denied'),
          ],
          hasMore: true,
        };
      },
    },
    async (_permission, id) => id !== 'denied',
  );
  assert.equal(feed.items.length, 10);
  assert.equal(feed.partial, true);
  assert.ok(feed.items.every((row) => row.timestamp === when));
  assert.ok(feed.items.every((row) => !row.id.includes('denied')));
  const collision = await dashboardActivityProjection(
    {
      queryAuditPage: async () => ({
        items: [auditRecord('UNKNOWN_STUDENT_EVENT', 'bad', when)],
        hasMore: false,
      }),
    },
    async (permission) => [...required, 'admin:finance:manage'].includes(permission),
  );
  assert.equal(collision.availability, 'UNAVAILABLE');
  assert.equal(collision.items.length, 0);
});
test('failed activity sources have partial/unavailable scope, not a no-activity verdict', async () => {
  const feed = await dashboardActivityProjection(
    {
      queryAuditPage: async () => {
        throw new Error('private database detail');
      },
    },
    async (permission) => [...required, 'admin:finance:manage'].includes(permission),
  );
  assert.equal(feed.availability, 'UNAVAILABLE');
  assert.equal(feed.partial, true);
  assert.ok(!JSON.stringify(feed).includes('database detail'));
});
test('activity parser returns only allowlisted event fields and rejects over-limit/malformed feed', () => {
  const event = {
    id: '1',
    action: 'RECORD_UPDATED',
    targetClass: 'FINANCE',
    owner: 'finance',
    actorAlias: 'IDENTITY',
    timestamp: when,
    result: 'SUCCESS',
    actorId: 'secret',
  };
  const value = {
    protocolVersion: 1,
    availability: 'AVAILABLE',
    scope: 'PERMISSIONED_OWNER_AUDIT_EVENTS',
    checkedAt: when,
    items: [event],
    partial: false,
  };
  const parsed = parseDashboardResponse(source('activity'), value, when);
  assert.ok(!JSON.stringify(parsed.activity).includes('secret'));
  assert.throws(
    () =>
      parseDashboardResponse(source('activity'), { ...value, items: Array(11).fill(event) }, when),
    /SCHEMA_MISMATCH/,
  );
});
test('AR/EN static rendering: accessible exact/partial/forbidden states and zero distinct from unknown', () => {
  for (const language of ['ar', 'en']) {
    const zero = parseDashboardResponse(source('scholarships:review'), { total: 0 }, when);
    const markup = render(
      createElement(DashboardMetricCard, { reading: zero, metric: 'review', language, now }),
    );
    assert.ok(markup.includes('aria-label'));
    assert.ok(markup.includes(dashboardLabel('review', language)));
    assert.ok(markup.includes('/review-queue?'));
    const denied = render(
      createElement(DashboardMetricCard, {
        reading: initialDashboardReading(source('finance'), false),
        metric: 'pendingPayments',
        language,
        now,
      }),
    );
    assert.ok(denied.includes(dashboardLabel('forbidden', language)));
    assert.ok(!denied.includes('href='));
    assert.ok(dashboardTime(when, language).endsWith(' UTC'));
  }
});
test('stale health render never advertises a current green/UP gate', () => {
  const reading = parseDashboardResponse(source('health'), healthFixture('UP'), when);
  const fresh = render(createElement(DashboardHealthPanel, { reading, language: 'en', now }));
  assert.ok(fresh.includes('<dd>Operational</dd>'));
  const old = render(
    createElement(DashboardHealthPanel, { reading, language: 'en', now: now + 31000 }),
  );
  assert.ok(old.includes('Stale'));
  assert.ok(!old.includes('<dd>Operational</dd>'));
  assert.ok(!old.includes('Current diagnostic gate passed'));
});
test('integration source boundaries: owner guards retained, activity GET query-only, lifecycle cleanup fenced', () => {
  const app = fs.readFileSync('apps/api/src/app.ts', 'utf8');
  assert.ok(app.includes("'/admin/audit', requireAdminPermission('admin:audit:manage')"));
  const router = fs.readFileSync('apps/api/src/presentation/api/router/AuditRouter.ts', 'utf8');
  assert.ok(router.includes("router.get('/dashboard-activity'"));
  assert.ok(router.includes('authEvaluatorService.evaluatePermission'));
  const page = fs.readFileSync('apps/admin/src/pages/AdminDashboardPage.tsx', 'utf8');
  const hook = fs.readFileSync(
    'apps/admin/src/features/dashboard/useExecutiveDashboard.ts',
    'utf8',
  );
  assert.ok(page.includes('useExecutiveDashboard(days)'));
  assert.ok(hook.includes('generation !== periodGeneration.current || controller.signal.aborted'));
  assert.ok(hook.includes('generation === coreGeneration.current && !controller.signal.aborted'));
  assert.ok(hook.includes('controller.abort()'));
  assert.ok(hook.includes('removeEventListener'));
  assert.ok(page.includes('disabled={busy}'));
  assert.ok(!/method:\s*['"](?:POST|PATCH|DELETE|PUT)/.test(page));
});

test('malformed owner and receipt clocks cannot turn a response into fresh evidence', () => {
  assert.throws(
    () =>
      parseDashboardResponse(
        source('scholarships:review'),
        { total: 1, checkedAt: 'invalid' },
        when,
      ),
    /SCHEMA_MISMATCH/,
  );
  assert.throws(
    () => parseDashboardResponse(source('scholarships:review'), { total: 1 }, 'invalid'),
    /SCHEMA_MISMATCH/,
  );
});
test('invalid and future receipt clocks are stale even when capture time is valid', () => {
  const reading = parseDashboardResponse(source('scholarships:review'), { total: 1 }, when);
  for (const patch of [
    { capturedAt: 'invalid' },
    { receivedAt: 'invalid' },
    { receivedAt: new Date(now + 60000).toISOString() },
  ])
    assert.equal(effectiveDashboardState({ ...reading, ...patch }, now), 'stale');
});
test('partial activity semantics must match the owner availability', () => {
  const value = {
    protocolVersion: 1,
    availability: 'AVAILABLE',
    partial: true,
    scope: 'PERMISSIONED_OWNER_AUDIT_EVENTS',
    checkedAt: when,
    items: [],
  };
  assert.throws(() => parseDashboardResponse(source('activity'), value, when), /SCHEMA_MISMATCH/);
  const partial = parseDashboardResponse(
    source('activity'),
    { ...value, availability: 'PARTIAL' },
    when,
  );
  assert.equal(partial.state, 'partial');
});
test('activity cannot carry blank event identities or action fields', () => {
  const item = {
    id: 'event',
    action: 'RECORD_UPDATED',
    targetClass: 'FINANCE',
    owner: 'finance',
    actorAlias: 'SYSTEM',
    timestamp: when,
    result: 'SUCCESS',
  };
  const value = {
    protocolVersion: 1,
    availability: 'AVAILABLE',
    partial: false,
    scope: 'PERMISSIONED_OWNER_AUDIT_EVENTS',
    checkedAt: when,
    items: [item],
  };
  for (const key of ['id', 'action', 'targetClass', 'owner'])
    assert.throws(
      () =>
        parseDashboardResponse(
          source('activity'),
          { ...value, items: [{ ...item, [key]: ' ' }] },
          when,
        ),
      /SCHEMA_MISMATCH/,
    );
});
