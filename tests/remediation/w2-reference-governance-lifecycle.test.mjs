import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function loadGovernanceModule() {
  const source = read('packages/domain/src/reference-data/governance/ReferenceGovernance.ts');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(exports,module){${js}\n})(module.exports,module);`, { module, exports: module.exports, Error });
  return module.exports;
}

test('MNT-AUD-0013 lifecycle state machine is linear and terminal', () => {
  const g = loadGovernanceModule();
  assert.doesNotThrow(() => g.assertReferenceLifecycleTransition(g.ReferenceLifecycleState.ACTIVE, g.ReferenceLifecycleState.DEPRECATED));
  assert.doesNotThrow(() => g.assertReferenceLifecycleTransition(g.ReferenceLifecycleState.DEPRECATED, g.ReferenceLifecycleState.ARCHIVED));
  assert.doesNotThrow(() => g.assertReferenceLifecycleTransition(g.ReferenceLifecycleState.DEPRECATED, g.ReferenceLifecycleState.SUPERSEDED, 'target-1'));
  assert.doesNotThrow(() => g.assertReferenceLifecycleTransition(g.ReferenceLifecycleState.DEPRECATED, g.ReferenceLifecycleState.MERGED, 'target-1'));
  assert.throws(() => g.assertReferenceLifecycleTransition(g.ReferenceLifecycleState.ACTIVE, g.ReferenceLifecycleState.ARCHIVED), /TRANSITION_NOT_ALLOWED/);
  assert.throws(() => g.assertReferenceLifecycleTransition(g.ReferenceLifecycleState.DEPRECATED, g.ReferenceLifecycleState.SUPERSEDED), /TARGET_REQUIRED/);
  assert.throws(() => g.assertReferenceLifecycleTransition(g.ReferenceLifecycleState.ARCHIVED, g.ReferenceLifecycleState.ACTIVE), /TERMINAL_STATE/);
});

test('MNT-AUD-0013 persistence no longer resolves aliases/provider IDs from opaque metadata', () => {
  const repo = read('packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts');
  assert.match(repo, /FROM "ReferenceAliasRecord"/);
  assert.match(repo, /FROM "ReferenceProviderMappingRecord"/);
  assert.doesNotMatch(repo, /jsonb_array_elements[\s\S]{0,300}metadata/);
  assert.match(repo, /ReferenceVersionRecord/);
  assert.match(repo, /transitionReferenceLifecycleInTransaction/);
  assert.match(repo, /REFERENCE_LIFECYCLE_COMMAND_REQUIRED/);
});

test('MNT-AUD-0013 migration preserves legacy governance and creates explicit immutable history tables', () => {
  const sql = read('packages/infrastructure/prisma/migrations/20260906204000_reference_governance_lifecycle/migration.sql');
  for (const table of ['ReferenceVersionRecord', 'ReferenceAliasRecord', 'ReferenceProviderMappingRecord', 'ReferenceRelationshipRecord']) {
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(sql, /metadata"->'aliases'/);
  assert.match(sql, /metadata"->'providerMappings'/);
  assert.match(sql, /MNT-AUD-0013_BASELINE/);
  assert.match(sql, /lifecycleState_check/);
  assert.match(sql, /ReferenceRelationshipRecord_no_self_check/);
});

test('MNT-AUD-0013 Admin boundary separates data updates from lifecycle authority', () => {
  const router = read('apps/api/src/presentation/api/router/ReferenceDataAdminRouter.ts');
  assert.doesNotMatch(router, /isActive:\s*z\.boolean/);
  assert.match(router, /\/governance\/:entityType\/:referenceId\/lifecycle/);
  assert.match(router, /\/governance\/:entityType\/:referenceId\/history/);
  assert.match(router, /\/governance\/:entityType\/:referenceId\/relationships/);
  assert.match(router, /AUTHENTICATED_ADMIN_ACTOR_REQUIRED/);
});

test('MNT-AUD-0013 new governance models remain covered by ADR-028 ownership and recovery baseline manifests', () => {
  const ownership = JSON.parse(read('docs/architecture/persistence/persistence-ownership.manifest.json'));
  const baseline = JSON.parse(read('scripts/database/database-baseline.manifest.json'));
  for (const model of ['ReferenceVersionRecord','ReferenceAliasRecord','ReferenceProviderMappingRecord','ReferenceRelationshipRecord']) {
    assert.equal(ownership.models[model], 'reference');
    assert.deepEqual(baseline.models[model], { owner: 'reference', required: true });
  }
});
