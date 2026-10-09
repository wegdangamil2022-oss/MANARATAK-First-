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
