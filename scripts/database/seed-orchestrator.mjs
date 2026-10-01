#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { requireDatabaseMutationGate } from '../lib/database-mutation-gate.mjs';
import { inspectSeedManifest } from './seed-manifest-inspection.mjs';

const root = process.cwd();
const mode = process.argv[2] ?? 'plan';
const manifestPath = path.join(root, 'scripts/database/greenfield-seed.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const inspection = inspectSeedManifest(manifest, root);
if (mode === 'plan' || mode === 'source-verify') {
  console.log(JSON.stringify({
    mode: mode.toUpperCase().replace('-', '_'),
    seedSetVersion: manifest.seedSetVersion,
    orderedSteps: inspection.steps,
    blockers: inspection.blockers,
    sourceErrors: inspection.sourceErrors,
    status: inspection.blockers.length || inspection.sourceErrors.length ? 'BLOCKED' : 'READY',
    databaseWrites: 0,
  }, null, 2));
  if (mode === 'source-verify' && inspection.sourceErrors.length) process.exit(1);
  process.exit(0);
}

if (mode !== 'apply') throw new Error(`Unsupported seed orchestrator mode: ${mode}`);
if (inspection.sourceErrors.length) fail(`SEED_SOURCE_INVALID: ${inspection.sourceErrors.join('; ')}`);
if (inspection.blockers.length) fail(`SEED_PRECONDITION_BLOCKED: ${inspection.blockers.join('; ')}`);

const gate = requireDatabaseMutationGate('greenfield-db-seed', { allowedPurposes: ['seed'] });
requireMigrationStatusClean();
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
