import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { inspectSeedManifest } from '../../scripts/database/seed-manifest-inspection.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('MNT-AUD-0035 manifest is ordered, versioned and separates operator/catalog workflows', () => {
  const manifest = JSON.parse(read('scripts/database/greenfield-seed.manifest.json'));
  assert.equal(manifest.version, 1);
  assert.ok(manifest.seedSetVersion);
  const required = manifest.steps.filter((step) => step.required);
  assert.deepEqual(required.map((step) => step.order), [...required.map((step) => step.order)].sort((a,b) => a-b));
  assert.ok(required.every((step) => step.owner && step.provenance && step.expected));
  assert.equal(manifest.operatorBootstraps.find((item) => item.id === 'initial-admin').includedInDbSeed, false);
  assert.equal(manifest.policy.largeCatalogImportsExcluded, true);
});

test('MNT-AUD-0035 source inspection preserves declared blockers without executing seeds', () => {
  const manifest = JSON.parse(read('scripts/database/greenfield-seed.manifest.json'));
  const states = ['BLOCKED_SOURCE_REVIEW', 'BLOCKED_SOURCE_DATASET_MISSING', 'BLOCKED_SOURCE_DATASET_MISSING'];
  for (const [index, id] of ['reference-countries', 'reference-currencies', 'reference-languages'].entries()) {
    manifest.steps.find(step => step.id === id).state = states[index];
  }
  assert.deepEqual(inspectSeedManifest(manifest, root).blockers, [
    'reference-countries:BLOCKED_SOURCE_REVIEW',
    'reference-currencies:BLOCKED_SOURCE_DATASET_MISSING',
    'reference-languages:BLOCKED_SOURCE_DATASET_MISSING',
  ]);
});

test('MNT-AUD-0035 current ready sources exist and match their governed hashes', () => {
  const manifest = JSON.parse(read('scripts/database/greenfield-seed.manifest.json'));
  const output = inspectSeedManifest(manifest, root);
  assert.deepEqual(output.sourceErrors, []);
  assert.equal(output.steps.length, manifest.steps.length);
});

test('MNT-AUD-0035 missing, changed and incomplete ready sources are rejected', () => {
  const manifest = JSON.parse(read('scripts/database/greenfield-seed.manifest.json'));
  const step = manifest.steps.find(item => item.id === 'reference-currencies');
  step.sourcePath = 'workspace/reference-data/does-not-exist.csv';
  assert.ok(inspectSeedManifest(manifest, root).sourceErrors.some(error => error.startsWith('SOURCE_MISSING:reference-currencies:')));
  step.sourcePath = 'package.json';
  assert.ok(inspectSeedManifest(manifest, root).sourceErrors.includes('SOURCE_HASH_MISMATCH:reference-currencies'));
  delete step.sourceSha256;
  assert.ok(inspectSeedManifest(manifest, root).sourceErrors.includes('READY_SOURCE_CONTRACT_MISSING:reference-currencies'));
});

test('MNT-AUD-0035 all approval and source gates precede migration status and seed execution', () => {
  const source = read('scripts/database/seed-orchestrator.mjs');
  const gate = source.indexOf("requireDatabaseMutationGate('greenfield-db-seed'");
  const migration = source.indexOf('requireMigrationStatusClean();');
  assert.ok(gate > source.indexOf('if (inspection.sourceErrors.length) fail'));
  assert.ok(gate > source.indexOf('if (inspection.blockers.length) fail'));
  assert.ok(migration > gate);
  assert.ok(source.indexOf('for (const step of inspection.steps.filter') > migration);
});

test('MNT-AUD-0035 country seed is hash/review/gate controlled and reconciliation is explicit', () => {
  const countries = read('scripts/seed-reference-countries.ts');
  const reconcile = read('scripts/database/verify-seed-reconciliation.ts');
  assert.match(countries, /REFERENCE_COUNTRY_SEED_SOURCE_HASH_MISMATCH/);
  assert.match(countries, /REFERENCE_COUNTRY_SEED_REVIEW_REQUIRED/);
  assert.match(countries, /requireDatabaseMutationGate\('seed-reference-countries'/);
  assert.match(reconcile, /SEED_RECONCILIATION_PREREQUISITES_BLOCKED/);
  assert.match(reconcile, /SEED_RECONCILIATION_EXACT_MISMATCH/);
  assert.match(reconcile, /SEED_RECONCILIATION_MINIMUM_MISMATCH/);
});

test('MNT-AUD-0035 root commands distinguish deploy, seed, provision and development-only Prisma mutations', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const name of ['db:migrate:deploy','db:seed','db:seed:plan','db:seed:source-verify','db:provision','db:provision:verify','db:dev:push','db:dev:migrate']) {
    assert.ok(pkg.scripts[name], `missing ${name}`);
  }
  assert.equal(pkg.scripts['db:push'], undefined);
  assert.equal(pkg.scripts['db:migrate'], undefined);
});
