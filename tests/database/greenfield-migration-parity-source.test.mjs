import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prismaDiffArguments } from '../../scripts/database/prisma-env-diff.mjs';

const root = process.cwd();
const source = readFileSync(join(root, 'scripts/database/verify-greenfield-migration-parity.sh'), 'utf8');
const runbook = readFileSync(join(root, 'docs/operations/GREENFIELD_MIGRATION_PARITY_VERIFICATION.md'), 'utf8');

test('greenfield parity gate replays migrations and diffs replayed DB plus migration directory', () => {
  assert.match(source, /migrate deploy/);
  assert.match(source, /export DIRECT_URL="\$TARGET_URL"/);
  assert.match(source, /--from-schema-datasource/);
  assert.match(source, /post28-preflight\.mjs --pair --require-empty/);
  assert.doesNotMatch(source, /node - "\$TARGET_URL"|psql "\$TARGET_URL"|--from-url "\$TARGET_URL"/);
  assert.match(source, /--from-migrations/);
  assert.match(source, /--to-schema-datamodel/);
  assert.match(source, /--shadow-database-url/);
  for (const mode of ['replayed','migrations']) assert.ok(prismaDiffArguments(mode, {GREENFIELD_SHADOW_DATABASE_URL:'fixture-url'}).includes('--exit-code'));
  assert.match(source, /prisma-env-diff\.mjs replayed/);
  assert.match(source, /prisma-env-diff\.mjs migrations/);
});

test('greenfield parity gate fails closed on unsafe targets and incomplete catalog state', () => {
  assert.match(source, /GREENFIELD_DATABASE_IS_DISPOSABLE/);
  assert.match(source, /TARGET_AND_SHADOW_MUST_DIFFER/);
  assert.match(source, /prod\|production\|live/);
  assert.match(source, /Migration ledger mismatch/);
  assert.match(source, /Invalid indexes detected/);
  assert.match(source, /Unvalidated constraints detected/);
  assert.match(source, /Unexpected user schemas violate ADR-028/);
});

test('runbook makes migration replay authoritative and rejects db push as production proof', () => {
  assert.match(runbook, /Source verification alone does not claim database parity/);
  assert.match(runbook, /db push` is not an acceptable staging\/production provisioning mechanism/);
});
