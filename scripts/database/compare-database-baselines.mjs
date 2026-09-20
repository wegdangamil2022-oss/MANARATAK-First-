#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [beforePath, afterPath, declarationsPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('Usage: node scripts/database/compare-database-baselines.mjs <before.json> <after.json> [expected-mutations.json]');
  process.exit(2);
}

const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const before = readJson(beforePath);
const after = readJson(afterPath);
const declarations = declarationsPath ? readJson(declarationsPath) : { version: 1, models: {} };
const errors = [];
const notes = [];
const fail = (message) => errors.push(message);

for (const [label, artifact] of [['before', before], ['after', after]]) {
  if (artifact.mode !== 'READ_ONLY_BASELINE' || artifact.status !== 'PASS') fail(`${label} baseline is not a successful READ_ONLY_BASELINE artifact`);
  if (!artifact.database?.target) fail(`${label} baseline missing database target identity`);
  if (!artifact.source?.schemaSha256 || !artifact.source?.migrationChainSha256) fail(`${label} baseline missing source fingerprints`);
  if (!artifact.migrationLedger?.rows || !Array.isArray(artifact.migrationLedger.rows)) fail(`${label} baseline missing migration ledger evidence`);
  if (!artifact.counts || typeof artifact.counts !== 'object') fail(`${label} baseline missing model counters`);
}

if (before.database?.target !== after.database?.target) fail('database target changed between baseline artifacts');
if (before.manifestVersion !== after.manifestVersion) fail('baseline manifest version changed between artifacts');

const allowSchemaChange = declarations.allowSchemaHashChange === true;
const allowMigrationChange = declarations.allowMigrationChainChange === true;
if (!allowSchemaChange && before.source?.schemaSha256 !== after.source?.schemaSha256) fail('schema hash changed without an expected-mutation declaration');
if (!allowMigrationChange && before.source?.migrationChainSha256 !== after.source?.migrationChainSha256) fail('migration-chain hash changed without an expected-mutation declaration');

const beforeModels = Object.keys(before.counts ?? {}).sort();
const afterModels = Object.keys(after.counts ?? {}).sort();
if (JSON.stringify(beforeModels) !== JSON.stringify(afterModels)) fail('baseline model counter set changed');

for (const model of beforeModels) {
  const b = BigInt(before.counts[model].count);
  const a = BigInt(after.counts[model].count);
  const delta = a - b;
  const rule = declarations.models?.[model] ?? { minDelta: 0, maxDelta: 0 };
  const min = BigInt(rule.minDelta ?? 0);
  const max = BigInt(rule.maxDelta ?? 0);
  if (delta < min || delta > max) {
    fail(`${model} count delta ${delta} outside declared tolerance [${min}, ${max}]`);
  } else if (delta !== 0n) {
    notes.push(`${model} delta ${delta} accepted by declaration`);
  }
}

for (const probe of ['invalidIndexes', 'unvalidatedConstraints']) {
  const value = after.consistency?.[probe];
  if (value !== 0) fail(`${probe} expected 0 after operation, got ${String(value)}`);
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  console.error(`DATABASE_BASELINE_COMPARISON = FAIL ${errors.length} issue(s)`);
  process.exit(1);
}
for (const note of notes) console.log(`PASS ${note}`);
console.log(`PASS model count tolerances checked (${beforeModels.length} models)`);
console.log('PASS database identity and source fingerprints are governed');
console.log('DATABASE_BASELINE_COMPARISON = PASS');
