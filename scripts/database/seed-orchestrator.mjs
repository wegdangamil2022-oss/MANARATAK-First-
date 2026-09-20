#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { requireDatabaseMutationGate } from '../lib/database-mutation-gate.mjs';

const root = process.cwd();
const mode = process.argv[2] ?? 'plan';
const manifestPath = path.join(root, 'scripts/database/greenfield-seed.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const inspection = inspectManifest();
if (mode === 'plan' || mode === 'source-verify') {
  console.log(JSON.stringify({
    mode: mode.toUpperCase().replace('-', '_'),
    seedSetVersion: manifest.seedSetVersion,
    orderedSteps: inspection.steps,
    blockers: inspection.blockers,
    status: inspection.blockers.length ? 'BLOCKED' : 'READY',
    databaseWrites: 0,
  }, null, 2));
  if (mode === 'source-verify' && inspection.sourceErrors.length) process.exit(1);
  process.exit(0);
}

if (mode !== 'apply') throw new Error(`Unsupported seed orchestrator mode: ${mode}`);
if (inspection.sourceErrors.length) fail(`SEED_SOURCE_INVALID: ${inspection.sourceErrors.join('; ')}`);
if (inspection.blockers.length) fail(`SEED_PRECONDITION_BLOCKED: ${inspection.blockers.join('; ')}`);

requireMigrationStatusClean();
const gate = requireDatabaseMutationGate('greenfield-db-seed', { allowedPurposes: ['seed'] });
const tsxCli = path.join(root, 'node_modules/tsx/dist/cli.mjs');
if (!fs.existsSync(tsxCli)) fail('TSX_RUNTIME_MISSING: run npm ci; tooling is never downloaded implicitly');

for (const step of inspection.steps.filter((item) => item.required)) {
  const script = path.join(root, step.script);
  console.log(`SEED_STEP_START=${step.id}`);
  const result = spawnSync(process.execPath, [tsxCli, script], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, MANARATAK_SEED_STEP_ID: step.id, MANARATAK_SEED_SET_VERSION: manifest.seedSetVersion },
  });
  if (result.status !== 0) fail(`SEED_STEP_FAILED:${step.id}`);
  console.log(`SEED_STEP_PASS=${step.id}`);
}

console.log(JSON.stringify({
  mode: 'SEED_APPLY',
  status: 'PASS',
  seedSetVersion: manifest.seedSetVersion,
  environment: gate.environment,
  target: gate.target,
  executedSteps: inspection.steps.filter((item) => item.required).map((item) => item.id),
}, null, 2));

function inspectManifest() {
  const blockers = [];
  const sourceErrors = [];
  if (manifest.version !== 1 || !manifest.seedSetVersion || !Array.isArray(manifest.steps)) sourceErrors.push('MANIFEST_SHAPE_INVALID');
  const seenIds = new Set();
  const seenOrders = new Set();
  const steps = [...manifest.steps].sort((a, b) => a.order - b.order).map((step) => {
    if (!step.id || seenIds.has(step.id)) sourceErrors.push(`DUPLICATE_OR_MISSING_STEP_ID:${step.id ?? '(missing)'}`);
    if (!Number.isInteger(step.order) || seenOrders.has(step.order)) sourceErrors.push(`DUPLICATE_OR_INVALID_STEP_ORDER:${step.id}`);
    seenIds.add(step.id); seenOrders.add(step.order);
    if (step.required && step.state !== 'READY') blockers.push(`${step.id}:${step.state}`);
    if (step.script && !fs.existsSync(path.join(root, step.script))) sourceErrors.push(`SCRIPT_MISSING:${step.id}:${step.script}`);
    if (step.sourcePath) {
      const full = path.join(root, step.sourcePath);
      if (!fs.existsSync(full)) sourceErrors.push(`SOURCE_MISSING:${step.id}:${step.sourcePath}`);
      else if (step.sourceSha256 && sha256(full) !== step.sourceSha256) sourceErrors.push(`SOURCE_HASH_MISMATCH:${step.id}`);
    }
    return step;
  });
  return { steps, blockers, sourceErrors };
}

function requireMigrationStatusClean() {
  const cli = path.join(root, 'node_modules/prisma/build/index.js');
  if (!fs.existsSync(cli)) fail('PRISMA_CLI_MISSING: run npm ci; tooling is never downloaded implicitly');
  const result = spawnSync(process.execPath, [cli, 'migrate', 'status', '--schema', 'packages/infrastructure/prisma/schema.prisma'], {
    cwd: root, stdio: 'inherit', env: process.env,
  });
  if (result.status !== 0) fail('MIGRATION_STATUS_NOT_CLEAN');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
