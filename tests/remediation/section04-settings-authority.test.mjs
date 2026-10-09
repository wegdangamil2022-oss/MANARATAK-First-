import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const read = name => readFileSync(new URL('../../' + name, import.meta.url), 'utf8');

test('active composition keeps one Settings value authority and no orphan Configuration Foundation wiring', () => {
  const composition = read('apps/api/src/infrastructure/di/container.ts');
  assert.match(composition, /new ConfigurationResolutionService\(settingDefinitionRepo, settingAssignmentRepo\)/);
  assert.match(composition, /new ResolveConfigurationUseCase\(configurationResolutionService\)/);
  assert.doesNotMatch(composition, /ManageConfigurationsUseCase|PrismaConfigurationRepository|configurationRepository\s*:/);
});

test('diagnostic settings reads retain existing control-plane permission protection', () => {
  const app = read('apps/api/src/app.ts');
  assert(app.includes("v1Router.use('/settings', ...protectControlPlane('admin:settings:manage', 'settingsRuntimeRouter'))"));
  const router = read('apps/api/src/presentation/api/router/SettingsRuntimeRouter.ts');
  assert.match(router, /router\.get\('\/inspect\/:key'/);
  assert.doesNotMatch(router, /router\.(post|put|patch|delete)\(/);
});


test('summary and lazy history remain under the existing admin Settings permission', () => {
  const app = read('apps/api/src/app.ts');
  assert(app.includes("v1Router.use('/admin/settings', requireAdminPermission('admin:settings:manage'), lazyRouter('settingsAdminRouter'))"));
  const router = read('apps/api/src/presentation/api/router/SettingsAdminRouter.ts');
  assert.match(router, /router\.get\('\/assignments\/:id\/history'/);
  assert.match(router, /listAssignmentSummaries\(filters\)/);
});
