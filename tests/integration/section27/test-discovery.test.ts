import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TestDiscoveryOwnerUseCases } from '../../../packages/application/src/integration/TestDiscoveryOwnerUseCases';
import {
  StudentToolTestDiscoveryOwnerGateway,
  ServiceTestDiscoveryOwnerGateway,
} from '../../../packages/infrastructure/src/integration/TestDiscoveryOwnerGateways';
import { PrismaStudentToolTestDiscoveryLinkRepository } from '../../../packages/infrastructure/src/student-tools/PrismaStudentToolTestDiscoveryLinkRepository';
import { testDiscoveryOwnerRouter } from '../../../apps/api/src/presentation/api/router/TestDiscoveryOwnerRouter';
import { parseTestDiscoveryPage } from '../../../apps/web/src/features/public-template/TestDiscoveryContract';
const descriptor = {
  ownerKey: 'owner',
  revision: '4',
  publicId: 'public',
  slug: 'owner',
  displayName: 'Owner',
  href: '/tools/owner',
};
const link = {
  id: 'link',
  ownerKey: 'owner',
  testId: 'test',
  ownerRevision: '4',
  testRevision: 'published-version',
  status: 'APPROVED',
  version: 2,
  proposedBy: 'maker',
  reviewedBy: 'checker',
  reason: 'Reviewed link',
  createdAt: new Date(),
  updatedAt: new Date(),
};
function fixture(change: { owner?: any; test?: any; link?: any; hasMore?: boolean } = {}) {
  let written: any;
  let ownerReads = 0;
  const test =
    change.test === undefined
      ? {
          id: 'test',
          slug: 'exam',
          status: 'PUBLISHED',
          currentPublishedVersionId: 'published-version',
        }
      : change.test;
  const repository = {
    ownerDomain: 'STUDENT_TOOLS',
    listApproved: async () => ({
      data: [change.link ?? link],
      hasMore: change.hasMore ?? false,
      nextCursor: change.hasMore ? 'link' : null,
    }),
    find: async () => change.link ?? link,
    propose: async (value: any) => {
      written = value;
      return value;
    },
    review: async (value: any) => {
      written = value;
      return value;
    },
  };
  const service = new TestDiscoveryOwnerUseCases(
    repository as any,
    {
      resolve: async () => {
        ++ownerReads;
        return change.owner === undefined ? descriptor : change.owner;
      },
    },
    { findById: async () => test, findPublishedBySlug: async () => test } as any,
  );
  return { service, written: () => written, ownerReads: () => ownerReads };
}
test('test-discovery: published, independently reviewed current owner link is advertised', async () => {
  const f = fixture();
  const page = await f.service.publicPage('test', 'en');
  assert.equal(page.state, 'AVAILABLE');
  assert.equal(page.data[0].displayName, 'Owner');
  assert.equal(JSON.stringify(page).includes('proposedBy'), false);
  assert.equal(page.hasMore, false);
});
test('test-discovery: unlinked and revision-changed owners do not advertise stale links', async () => {
  for (const change of [
    { owner: null },
    { owner: { ...descriptor, revision: '5' } },
    { link: { ...link, testRevision: 'old' } },
    { link: { ...link, reviewedBy: 'maker' } },
  ])
    assert.equal((await fixture(change).service.publicPage('test', 'ar')).data.length, 0);
});
test('test-discovery: unknown or unpublished test stops owner reads', async () => {
  for (const test of [
    null,
    { id: 'test', slug: 'exam', status: 'ARCHIVED', currentPublishedVersionId: 'v' },
  ]) {
    const f = fixture({ test });
    await assert.rejects(() => f.service.publicPage('test', 'ar'), /TEST_NOT_PUBLIC/);
    assert.equal(f.ownerReads(), 0);
  }
});
test('test-discovery: empty filtered candidate page with continuation does not assert globally empty', async () => {
  const page = await fixture({ owner: null, hasMore: true }).service.publicPage('test', 'ar');
  assert.equal(page.state, 'AVAILABLE');
  assert.equal(page.data.length, 0);
  assert.equal(page.hasMore, true);
  assert.equal(page.nextCursor, 'link');
});
test('test-discovery: proposal binds current owner and test revisions rather than caller values', async () => {
  const f = fixture();
  await f.service.propose(
    'owner',
    { testId: 'test', expectedVersion: 0, reason: 'Explicit opt in' },
    'maker',
  );
  assert.equal(f.written().ownerRevision, '4');
  assert.equal(f.written().testRevision, 'published-version');
  assert.equal(f.written().actorId, 'maker');
});
test('test-discovery: approval requires a different reviewer and unchanged owner revision', async () => {
  const same = fixture({ link: { ...link, status: 'PENDING' } });
  await assert.rejects(
    () =>
      same.service.review(
        'owner',
        'test',
        { expectedVersion: 2, status: 'APPROVED', reason: 'Reviewed' },
        'maker',
      ),
    /INDEPENDENT_REVIEW/,
  );
  assert.equal(same.written(), undefined);
  const stale = fixture({
    link: { ...link, status: 'PENDING' },
    owner: { ...descriptor, revision: '5' },
  });
  await assert.rejects(
    () =>
      stale.service.review(
        'owner',
        'test',
        { expectedVersion: 2, status: 'APPROVED', reason: 'Reviewed' },
        'checker',
      ),
    /REVIEW_STALE/,
  );
  assert.equal(stale.written(), undefined);
});
test('test-discovery: revoke does not need a still-published owner', async () => {
  const f = fixture({ owner: null, test: null });
  await f.service.review(
    'owner',
    'test',
    { expectedVersion: 2, status: 'REVOKED', reason: 'Withdraw opt in' },
    'maker',
  );
  assert.equal(f.written().status, 'REVOKED');
});
const tool = {
  toolKey: 'tool',
  revision: 4,
  nameAr: 'أداة',
  nameEn: 'Tool',
  implementationStatus: 'IMPLEMENTED',
  lifecycle: 'ACTIVE',
  visibility: 'ACTIVE',
  supportedLocales: ['ar', 'en'],
  availability: {
    publicEnabled: true,
    adminOnly: false,
    maintenanceMode: false,
    allowedRegions: [],
    allowedLocales: [],
    anonymousEnabled: false,
    authenticatedEnabled: true,
  },
  featureFlags: {
    globallyEnabled: true,
    maintenanceMode: false,
    anonymousEnabled: false,
    authenticatedEnabled: true,
  },
};
test('test-discovery tool owner: locale, lifecycle and access flags are enforced', async () => {
  const gateway = (value: any) =>
    new StudentToolTestDiscoveryOwnerGateway({ findByKey: async () => value } as any);
  const visible = await gateway(tool).resolve('tool', 'en');
  assert.equal(visible?.displayName, 'Tool');
  assert.equal(visible?.href, '/tools/tool');
  assert.equal(visible?.requiresSignIn, true);
  for (const value of [
    { ...tool, lifecycle: 'RETIRED' },
    { ...tool, supportedLocales: ['ar'] },
    { ...tool, availability: { ...tool.availability, allowedRegions: ['XX'] } },
    { ...tool, featureFlags: { ...tool.featureFlags, authenticatedEnabled: false } },
  ])
    assert.equal(await gateway(value).resolve('tool', 'en'), null);
});
const service = {
  id: 'service',
  publicId: 'svc',
  slug: 'advising',
  status: 'PUBLISHED',
  version: 4,
  serviceAvailabilityStatus: 'AVAILABLE',
  fulfillmentPolicy: 'CHARGEABLE',
  fulfillmentType: 'CONSULTATION',
  providerReferenceId: 'provider',
  localizedContent: { ar: { displayName: 'إرشاد' }, en: { displayName: 'Advising' } },
  approvedPrice: {
    amountMinorUnits: '10000',
    currencyCode: 'USD',
    scale: 2,
    effectiveTo: '2099-01-01',
  },
};
const provider = { status: 'QUALIFIED', supportedServiceIds: ['service'] };
test('test-discovery service owner: paid price and current provider qualification are checked', async () => {
  const gateway = (row: any, p: any) =>
    new ServiceTestDiscoveryOwnerGateway(
      { findById: async () => row } as any,
      { findProviderById: async () => p } as any,
    );
  const item = await gateway(service, provider).resolve('service', 'en');
  assert.equal(item?.fulfillmentPolicy, 'CHARGEABLE');
  assert.equal(item?.price?.amountMinorUnits, '10000');
  for (const [row, p] of [
    [service, { ...provider, status: 'SUSPENDED' }],
    [{ ...service, serviceAvailabilityStatus: 'PAUSED' }, provider],
    [{ ...service, approvedPrice: { ...service.approvedPrice, effectiveTo: 'invalid' } }, provider],
    [{ ...service, status: 'ARCHIVED' }, provider],
  ])
    assert.equal(await gateway(row, p).resolve('service', 'en'), null);
});
test('test-discovery persistence: failed CAS cannot write approval or its audit event', async () => {
  let audited = false;
  const delegate = {
    findUnique: async () => ({ ...link, status: 'PENDING' }),
    updateMany: async () => ({ count: 0 }),
  };
  const tx = {
    studentToolTestDiscoveryLink: delegate,
    auditRecord: {
      create: async () => {
        audited = true;
      },
    },
  };
  const repo = new PrismaStudentToolTestDiscoveryLinkRepository({
    $transaction: async (fn: any) => fn(tx),
  } as any);
  await assert.rejects(
    () =>
      repo.review({
        ownerKey: 'owner',
        testId: 'test',
        expectedVersion: 2,
        status: 'APPROVED',
        actorId: 'checker',
        reason: 'Reviewed',
      }),
    /VERSION_CONFLICT/,
  );
  assert.equal(audited, false);
});
test('test-discovery API: uppercase or trailing-slash approval cannot bypass reviewer permission', async () => {
  let permission = '';
  const router = testDiscoveryOwnerRouter(
    {} as any,
    {
      evaluatePermission: async (_id: string, p: string) => {
        permission = p;
        return { isGranted: false };
      },
    } as any,
    { view: 'view', propose: 'propose', review: 'review' },
  );
  for (const path of ['/test/approve', '/test/approve/', '/test/APPROVE/']) {
    let status = 0;
    const res = {
      setHeader: () => {},
      status: (code: number) => {
        status = code;
        return res;
      },
      json: () => {},
    };
    await (router as any).stack[0].handle(
      { authUserId: 'admin', method: 'POST', path, ip: '127.0.0.1' },
      res,
      () => {
        throw new Error('permission bypass');
      },
    );
    assert.equal(permission, 'review');
    assert.equal(status, 403);
  }
});
test('test-discovery web contract: rejects unrelated owner, false emptiness and unsafe URLs', () => {
  const page = {
    ownerDomain: 'STUDENT_TOOLS',
    state: 'AVAILABLE',
    hasMore: false,
    nextCursor: null,
    data: [descriptor],
  };
  assert.equal(parseTestDiscoveryPage({ data: page }, 'STUDENT_TOOLS').data.length, 1);
  for (const row of [
    { ...page, ownerDomain: 'SERVICES' },
    { ...page, state: 'EMPTY' },
    { ...page, data: [{ ...descriptor, href: 'https://evil.example' }] },
    { ...page, data: [{ ...descriptor, href: '/tools/%2f..' }] },
    { ...page, hasMore: true, nextCursor: null },
  ])
    assert.throws(() => parseTestDiscoveryPage({ data: row }, 'STUDENT_TOOLS'), /RESPONSE_INVALID/);
});
