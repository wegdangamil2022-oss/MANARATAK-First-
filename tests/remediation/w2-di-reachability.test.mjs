import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('MNT-AUD-0109 every production DI registration is runtime reachable', () => {
  const output = execFileSync(process.execPath, ['scripts/architecture/verify-di-reachability.mjs'], { encoding: 'utf8' });
  assert.match(output, /DI_REACHABILITY_VERIFY=PASS/);
  const manifest = JSON.parse(read('docs/remediation/DI_RUNTIME_REACHABILITY_MANIFEST.json'));
  assert.equal(manifest.registrationCount, manifest.reachableCount);
  assert.deepEqual(manifest.unreachable, []);
  assert.ok(manifest.registrations.every((entry) => entry.classification === 'RUNTIME_REACHABLE'));
});

test('MNT-AUD-0109 deferred source cannot masquerade as production DI', () => {
  const container = read('apps/api/src/infrastructure/di/container.ts');
  const manifest = JSON.parse(read('docs/remediation/DI_RUNTIME_REACHABILITY_MANIFEST.json'));
  for (const name of ['manageMonitorsUseCase','manageLogsUseCase','manageSecurityPoliciesUseCase','manageConfigurationsUseCase','manageIntegrationsUseCase','manageLocalizationsUseCase','serviceOperationsUseCases','careerEngagementUseCases','retentionSweepUseCase','monitoringRouter']) {
    assert.doesNotMatch(container, new RegExp(`\\b${name}\\s*:`));
    assert.ok(manifest.deferredOrRemovedSource.some((entry) => entry.registration === name && entry.classification === 'FORMALLY_DEFERRED'));
  }
});

test('MNT-AUD-0109 obsolete shadow database and unsafe legacy diagnostic are gone', () => {
  const container = read('apps/api/src/infrastructure/di/container.ts');
  assert.doesNotMatch(container, /createInMemoryPrismaClient/);
  assert.equal(existsSync('scripts/inspect_legacy.ts'), false);
});
