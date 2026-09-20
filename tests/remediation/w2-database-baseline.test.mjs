import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const artifact = (overrides = {}) => ({
  mode: 'READ_ONLY_BASELINE',
  status: 'PASS',
  manifestVersion: 1,
  database: { target: 'db.internal:5432/manaratak' },
  source: { schemaSha256: 'schema-a', migrationChainSha256: 'migrations-a' },
  migrationLedger: { rows: [{ name: '001', applied: true, rolledBack: false }] },
  counts: {
    ReferenceCountry: { owner: 'reference', count: '194' },
    Course: { owner: 'learning', count: '10' },
  },
  consistency: { invalidIndexes: 0, unvalidatedConstraints: 0 },
  ...overrides,
});

function compare(before, after, declarations) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mnt-baseline-'));
  const beforePath = path.join(dir, 'before.json');
  const afterPath = path.join(dir, 'after.json');
  const declarationPath = path.join(dir, 'expected.json');
  fs.writeFileSync(beforePath, JSON.stringify(before));
  fs.writeFileSync(afterPath, JSON.stringify(after));
  const args = ['scripts/database/compare-database-baselines.mjs', beforePath, afterPath];
  if (declarations) {
    fs.writeFileSync(declarationPath, JSON.stringify(declarations));
    args.push(declarationPath);
  }
  return spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
}

test('MNT-AUD-0083 baseline source fails closed instead of swallowing ledger/counter errors', () => {
  const source = read('scripts/db-remediation-gate.ts');
  assert.doesNotMatch(source, /_prisma_migrations[\s\S]{0,300}\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(source, /'UNAVAILABLE'\s*\|/);
  assert.match(source, /BASELINE_REQUIRED_COUNTER_UNAVAILABLE/);
  assert.match(source, /migrationChainSha256/);
  assert.match(source, /DATABASE_BASELINE_OUTPUT/);
});

test('MNT-AUD-0083 baseline manifest covers every persistence-owned Prisma model', () => {
  const baseline = JSON.parse(read('scripts/database/database-baseline.manifest.json'));
  const ownership = JSON.parse(read('docs/architecture/persistence/persistence-ownership.manifest.json'));
  assert.deepEqual(Object.keys(baseline.models).sort(), Object.keys(ownership.models).sort());
  assert.ok(Object.keys(baseline.models).length >= 206);
  assert.ok(Object.values(baseline.models).every((item) => item.required === true && item.owner));
});

test('MNT-AUD-0083 before/after comparison is fail-closed by default and declaration-aware', () => {
  const before = artifact();
  const afterUnexpected = artifact({ counts: { ...before.counts, Course: { owner: 'learning', count: '11' } } });
  const rejected = compare(before, afterUnexpected);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Course count delta 1 outside declared tolerance/);

  const allowed = compare(before, afterUnexpected, { version: 1, models: { Course: { minDelta: 0, maxDelta: 1 } } });
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.match(allowed.stdout, /DATABASE_BASELINE_COMPARISON = PASS/);
});

test('MNT-AUD-0083 comparison rejects source fingerprint drift unless explicitly declared', () => {
  const before = artifact();
  const after = artifact({ source: { schemaSha256: 'schema-b', migrationChainSha256: 'migrations-b' } });
  const rejected = compare(before, after);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /schema hash changed/);
  const allowed = compare(before, after, { version: 1, allowSchemaHashChange: true, allowMigrationChainChange: true, models: {} });
  assert.equal(allowed.status, 0, allowed.stderr);
});
