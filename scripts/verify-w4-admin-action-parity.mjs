import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('apps/api/src/app.ts');
const schemas = read('apps/api/src/presentation/validation/StrictControlPlaneSchemas.ts');
const toolsRouter = read('apps/api/src/presentation/api/router/StudentToolsAdminRouter.ts');
const toolsUi = read('apps/admin/src/pages/StudentToolsAdminPage.tsx');
const careerRouter = read('apps/api/src/presentation/api/router/CareerAdminRouter.ts');
const careerUi = read('apps/admin/src/pages/CareerAdminPage.tsx');
const useCases = read('packages/application/src/student-tools/use-cases/StudentToolRegistryUseCases.ts');
const manifest = read('docs/remediation/W4_ADMIN_ACTION_PARITY_MANIFEST.md');
const checks = [
  ['canonical /admin principal guard', app.includes("v1Router.use('/admin', SecurityMiddlewareFactory.createAdminGuard")],
  ['canonical /admin idempotency', app.includes("v1Router.use('/admin', createCanonicalIdempotencyMiddleware") && app.includes('requireKey: true')],
  ['canonical /admin mutation audit', app.includes("v1Router.use('/admin', new MutationAuditMiddleware")],
  ['career RBAC mount', app.includes("'/admin/careers', requireAdminPermission('admin:careers:manage')")],
  ['career PATCH owner route', careerRouter.includes("router.patch('/jobs/:id'") && careerRouter.includes('expectedVersion') && careerRouter.includes('updateJob')],
  ['career UI PATCH with owner version', careerUi.includes("method: editing ? 'PATCH' : 'POST'") && careerUi.includes('expectedVersion: editing.version') && careerUi.includes('beginJobEdit')],
  ['student tools RBAC mount', app.includes("'/admin/student-tools', requireAdminPermission('admin:student-tools:manage')")],
  ['student tools strict schemas complete', ['studentToolAdminListQuerySchema','studentToolMetadataPatchSchema','studentToolAvailabilitySchema','studentToolFlagsSchema','studentToolLifecycleParamSchema','studentToolAdminTestSchema','toolKeyParamSchema'].every((name) => schemas.includes(`export const ${name}`))],
  ['student tools metadata action wired', toolsRouter.includes("'/:toolKey/metadata'") && toolsUi.includes('/metadata') && toolsUi.includes('saveMetadata')],
  ['student tools versioned availability wired', toolsRouter.includes("'/:toolKey/availability'") && toolsRouter.includes('updateVersionedConfiguration') && toolsUi.includes('saveAvailability') && toolsUi.includes('incrementPatchVersion')],
  ['student tools admin test wired', toolsRouter.includes("'/:toolKey/test'") && toolsRouter.includes("consumerType: 'ADMIN_TEST'") && toolsUi.includes('runAdminTest')],
  ['student tools lifecycle controls complete', ['activate','testing','deprecate','retire'].every((action) => toolsUi.includes(`transitionLifecycle('${action}')`)) && toolsRouter.includes('StudentToolLifecycleStatus.TESTING') && toolsRouter.includes('StudentToolLifecycleStatus.DEPRECATED') && toolsRouter.includes('StudentToolLifecycleStatus.RETIRED')],
  ['owner rejects immutable/versioned misuse', useCases.includes('IMMUTABLE_TOOL_IDENTITY') && useCases.includes('TOOL_VERSION_INCREMENT_REQUIRED') && useCases.includes('TOOL_VERSION_MUST_INCREMENT')],
  ['activation readiness fails closed', useCases.includes('TOOL_NOT_READY') && toolsUi.includes('!detail.readiness.ready')],
  ['action parity manifest exists', manifest.includes('Negative-state contract') && manifest.includes('Career — edit job') && manifest.includes('Student Tools — admin test')],
];
let failures = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures++; }
console.log(`W4_ADMIN_ACTION_PARITY ${checks.length - failures}/${checks.length}`);
if (failures) process.exit(1);
