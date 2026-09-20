import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

test('MNT-AUD-0035 current reference-data blockers are explicit and preflight before any mutation', () => {
  const plan = spawnSync(process.execPath, ['scripts/database/seed-orchestrator.mjs', 'plan'], { cwd: root, encoding: 'utf8' });
  assert.equal(plan.status, 0, plan.stderr);
  const output = JSON.parse(plan.stdout);
  assert.equal(output.status, 'BLOCKED');
  assert.deepEqual(output.blockers, [
    'reference-countries:BLOCKED_SOURCE_REVIEW',
    'reference-currencies:BLOCKED_SOURCE_DATASET_MISSING',
    'reference-languages:BLOCKED_SOURCE_DATASET_MISSING',
  ]);
  assert.equal(output.databaseWrites, 0);

  const apply = spawnSync(process.execPath, ['scripts/database/seed-orchestrator.mjs', 'apply'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(apply.status, 0);
  assert.match(apply.stderr, /^SEED_PRECONDITION_BLOCKED:/);
  assert.doesNotMatch(apply.stderr, /PRISMA_CLI_MISSING|DATABASE_MUTATION_BLOCKED/);
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
