import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuditInventory, checkAuditInventory, checkGlobalAuditBoundaries, checkAuditRouteCollisions } from '../../scripts/architecture/verify-admin-audit-coverage.mjs';

const fixture = {
  appSource: "v1Router.use('/admin/test', requireAdminPermission('admin:settings:manage'), lazyRouter('testRouter'));",
  containerSource: 'const bindings = {testRouter: asFunction(() => TestRouter.create())};',
  routerSources: { 'TestRouter.ts': "const router = Router(); router.post('/edit', (req, res) => schema.parse(req.body));" },
  policySource: "export class MutationAuditPolicy {static classify() {return 'CRITICAL_AUDIT_REQUIRED';}}",
};

test('inventory discovers mounted mutations and refuses an unreviewed added route', () => {
  const original = buildAuditInventory(fixture);
  assert.equal(original.length, 1);
  assert.deepEqual(original[0].permissionEvidence, ['admin:settings:manage']);
  assert.equal(original[0].validationEvidence, 'DIRECT_API_PARSE');
  const expanded = buildAuditInventory({ ...fixture, routerSources: {
    'TestRouter.ts': fixture.routerSources['TestRouter.ts'] + " router.delete('/remove', handler);",
  } });
  assert.deepEqual(checkAuditInventory(expanded, original), ['UNREVIEWED_MUTATION:DELETE /admin/test/remove @TestRouter']);
});

test('inventory detects changed permissions/classification and removed routes', () => {
  const original = buildAuditInventory(fixture);
  const changed = buildAuditInventory({ ...fixture, appSource: fixture.appSource.replace('admin:settings:manage', 'admin:finance:manage') });
  assert.match(checkAuditInventory(changed, original)[0], /AUDIT_CONTRACT_CHANGED/);
  assert.match(checkAuditInventory([], original)[0], /REMOVED_MUTATION_REQUIRES_REVIEW/);
});

test('renamed Router variables cannot silently hide new mutations', () => {
  const routes = buildAuditInventory({ ...fixture, routerSources: {
    'TestRouter.ts': "const privateRouter = Router(); privateRouter.post('/hidden', handler);",
  } });
  assert.equal(routes[0].path, '/admin/test/hidden');
});

test('unresolved mounts and dynamic route paths fail closed', () => {
  assert.throws(() => buildAuditInventory({ ...fixture, containerSource: '' }), /BINDING_UNRESOLVED/);
  assert.throws(() => buildAuditInventory({ ...fixture, routerSources: {
    'TestRouter.ts': 'const router = Router(); router.post(dynamicPath, handler);',
  } }), /DYNAMIC_ROUTE_REQUIRES_REVIEW/);
});

test('global audit boundary must follow auth and idempotency and precede mounts', () => {
  const prefix = "v1Router.use('/admin', SecurityMiddlewareFactory.createAdminGuard({}));\n"
    + "v1Router.use('/admin', createCanonicalIdempotencyMiddleware({requireKey: true}));\n";
  const audit = "v1Router.use('/admin', new MutationAuditMiddleware(repository, 'ADMIN').generate());\n";
  assert.deepEqual(checkGlobalAuditBoundaries(prefix + audit + fixture.appSource), []);
  assert.equal(checkGlobalAuditBoundaries(prefix + fixture.appSource + audit).length, 1);
  assert.equal(checkGlobalAuditBoundaries(prefix + '// ' + audit + fixture.appSource).length, 1);
});

test('new collisions between owner routers require a separate explicit review', () => {
  const row = buildAuditInventory(fixture)[0];
  const duplicate = { ...row, owner: 'OtherRouter' };
  assert.equal(checkAuditRouteCollisions([row, duplicate]).length, 1);
  assert.deepEqual(checkAuditRouteCollisions([row, duplicate], [{ method: row.method, path: row.path, owners: [row.owner, duplicate.owner] }]), []);
});

test('inline router construction retains its owner when cradle repositories are resolved', () => {
  const routes = buildAuditInventory({ ...fixture,
    appSource: "v1Router.use('/admin/test', requireAdminPermission('admin:settings:manage'), TestRouter.create({repository: container.resolve('testRepository')}));",
  });
  assert.equal(routes.length, 1);
  assert.equal(routes[0].owner, 'TestRouter');
  assert.deepEqual(routes[0].permissionEvidence, ['admin:settings:manage']);
});

const conditionalPolicy = `
const requiredPermission = (method, path) => path.endsWith('/publish') ? 'admin:cms:publish' : 'admin:cms:author';
router.use(async (req, res, next) => {
  const permission = requiredPermission(req.method, req.path);
  const result = await evaluator.evaluatePermission(req.authUserId, permission);
  if (!result.isGranted) return res.status(403).end();
  next();
});
`;

test('mounted conditional permission policies remain visible and policy changes require review', () => {
  const source = `const router = Router(); ${conditionalPolicy} router.post('/publish', handler);`;
  const input = { ...fixture, routerSources: { 'TestRouter.ts': source } };
  const original = buildAuditInventory(input);
  assert.deepEqual(original[0].permissionEvidence, ['admin:settings:manage', 'admin:cms:author', 'admin:cms:publish']);
  assert.equal(original[0].conditionalPermissionReview, true);
  assert.equal(original[0].conditionalPermissionPolicies[0].resolver, 'requiredPermission');
  // A policy can weaken authorization without changing its permission literals.
  const weakened = buildAuditInventory({ ...input, routerSources: {
    'TestRouter.ts': source.replace('if (!result.isGranted)', 'if (false)'),
  } });
  assert.match(checkAuditInventory(weakened, original)[0], /AUDIT_CONTRACT_CHANGED/);
});

test('unused resolvers, unrelated evaluations and late middleware are not inherited policy evidence', () => {
  for (const policy of [
    conditionalPolicy.replace('evaluator.evaluatePermission(req.authUserId, permission)', 'evaluator.evaluatePermission(req.authUserId, "unrelated")'),
    conditionalPolicy.replace('router.use', 'otherRouter.use'),
    '',
  ]) {
    const inventory = buildAuditInventory({ ...fixture, routerSources: {
      'TestRouter.ts': `const router = Router(); ${policy} router.post('/publish', handler); ${conditionalPolicy}`,
    } });
    assert.deepEqual(inventory[0].permissionEvidence, ['admin:settings:manage']);
    assert.equal(inventory[0].conditionalPermissionPolicies, undefined);
  }
});

test('student-tool tests declare owner encrypted replay rather than generic response storage', () => {
  const inventory = buildAuditInventory({ ...fixture,
    appSource: "v1Router.use('/admin/student-tools', lazyRouter('testRouter'));",
    routerSources: { 'TestRouter.ts': "const router = Router(); router.post('/:toolKey/test', handler); router.post('/:toolKey/release', handler);" },
  });
  assert.equal(inventory.find(row => row.path.endsWith('/test')).idempotency, 'OWNER_ENCRYPTED_EXECUTION_REQUIRED');
  assert.equal(inventory.find(row => row.path.endsWith('/release')).idempotency, 'GLOBAL_ADMIN_REQUIRED');
});


test('finite const route registries enumerate every concrete route and retain security evidence', () => {
  const router = `const router = Router(); const creators = {providers:'createProvider', pricing:'createPrice'} as const;
    for (const kind of Object.keys(creators) as Array<keyof typeof creators>)
      router.post(\`/operations/\${kind}\`, handler(creators[kind], 'admin:services:operations:manage'));`;
  const rows = buildAuditInventory({...fixture, routerSources:{'TestRouter.ts':router}});
  assert.deepEqual(rows.map(row => row.path), ['/admin/test/operations/pricing','/admin/test/operations/providers']);
  assert.ok(rows.every(row => row.permissionEvidence.includes('admin:services:operations:manage')));
  const added = buildAuditInventory({...fixture, routerSources:{'TestRouter.ts':router.replace("pricing:'createPrice'", "pricing:'createPrice', slots:'createSlot'")}});
  assert.match(checkAuditInventory(added, rows).join(), /UNREVIEWED_MUTATION.*slots/);
});
test('mutable, escaped or dynamic route registries are never approved by the finite-loop resolver', () => {
  for (const setup of ["let creators={providers:'create'};", "const creators=getRoutes();", "const creators={...other};", "const creators={providers:'create'}; mutate(creators);", "const creators={providers:'create'}; creators['hidden']='create';"]) {
    assert.throws(() => buildAuditInventory({...fixture, routerSources:{'TestRouter.ts': `const router=Router(); ${setup} for (const kind of Object.keys(creators)) router.post(\`/\${kind}\`, handler);`}}), /DYNAMIC_ROUTE_REQUIRES_REVIEW/);
  }
});

test('inline immutable action lists enumerate mutations and reject nonliteral members', () => {
  const source = "const router=Router(); for (const action of ['publish','archive'] as const) router.post(`/jobs/:id/${action}`, handler);";
  assert.equal(buildAuditInventory({...fixture, routerSources:{'TestRouter.ts':source}}).length, 2);
  assert.throws(() => buildAuditInventory({...fixture, routerSources:{'TestRouter.ts':source.replace("'archive'", 'runtimeAction')}}), /DYNAMIC_ROUTE/);
});

test('finite study destination owner permission factory is verified, fingerprinted, and cannot silently become a no-op', () => {
  const appSource = "v1Router.use('/admin/study-destinations', StudyDestinationAdminRouter.create({}));";
  const router = "const router = Router(); const guard = (action: string) => SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:' + action, evaluatorOverride); router.post('/:iso2Code/publish', guard('publish'), handler);";
  const input = {...fixture, appSource, routerSources: {'StudyDestinationAdminRouter.ts': router}};
  const rows = buildAuditInventory(input);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].permissionEvidence, ['admin:study-destinations:publish']);
  assert.equal(rows[0].guardPolicyFingerprint.length, 64);
  assert.throws(() => buildAuditInventory({...input, routerSources: {'StudyDestinationAdminRouter.ts':
    router.replace("SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:' + action, evaluatorOverride)", '(_req, _res, next) => next()')
  }}), /PERMISSION_GUARD_UNVERIFIED/);
});
