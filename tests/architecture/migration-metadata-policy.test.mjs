import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateMigrationMetadata } from '../../scripts/architecture/migration-metadata-policy.mjs';

const manifest = JSON.parse(readFileSync('docs/architecture/persistence/persistence-ownership.manifest.json', 'utf8'));

test('explicitly reviewed historical migrations retain exact SQL bytes via sidecar metadata', () => {
  const names = Object.keys(manifest.historicalMigrationMetadataExceptions);
  // Coverage comes from every current non-baseline migration, not a stale count/list.
  const inventory = JSON.parse(readFileSync('docs/reviews/evidence/b04-migration-inventory-2026-10-15.json', 'utf8'));
  assert.ok(names.length > 0);
  const actualNames = readdirSync('packages/infrastructure/prisma/migrations').filter(name => existsSync(`packages/infrastructure/prisma/migrations/${name}/migration.sql`)).sort();
  assert.ok(inventory.migrations.every(entry => actualNames.includes(entry.name)));
  for (const name of actualNames.filter(name => !inventory.migrations.some(entry => entry.name === name))) {
    assert.deepEqual(validateMigrationMetadata(name, readFileSync(`packages/infrastructure/prisma/migrations/${name}/migration.sql`), manifest), []);
  }
  for (const entry of inventory.migrations) {
    const sql = readFileSync(`packages/infrastructure/prisma/migrations/${entry.name}/migration.sql`);
    assert.equal(createHash('sha256').update(sql).digest('hex'), entry.sha256);
    assert.equal(entry.databaseApplicationStatus, 'UNKNOWN_NOT_QUERIED');
    if (entry.metadataSource !== 'historical-baseline') assert.deepEqual(validateMigrationMetadata(entry.name, sql, manifest), []);
  }
  for (const name of names) {
    const sql = readFileSync(`packages/infrastructure/prisma/migrations/${name}/migration.sql`);
    assert.equal(createHash('sha256').update(sql).digest('hex'), manifest.historicalMigrationMetadataExceptions[name].sha256);
    assert.deepEqual(validateMigrationMetadata(name, sql, manifest), []);
    assert.ok(validateMigrationMetadata(name, Buffer.concat([sql, Buffer.from('\n-- modified')]), manifest).some((error) => error.includes('checksum differs')));
  }
});

test('an unlisted future migration cannot inherit a historical metadata waiver', () => {
  const errors = validateMigrationMetadata('20261001000000_future', '-- no ownership metadata', manifest);
  assert.equal(errors.length, 3);
  const valid = '-- MANARATAK_MIGRATION_OWNER: reference\n-- MANARATAK_MIGRATION_SCOPE: owner_only\n-- MANARATAK_ARCH_DECISION: ADR-028\n';
  assert.deepEqual(validateMigrationMetadata('20261001000000_future', valid, manifest), []);
  assert.ok(validateMigrationMetadata('20261001000000_future', valid.replace('owner_only', 'owner_only_unapproved'), manifest).some((error) => error.includes('SCOPE')));
});

test('sidecar metadata cannot waive checks with an unknown owner or incomplete review reference', () => {
  const name = Object.keys(manifest.historicalMigrationMetadataExceptions)[0];
  const sql = readFileSync(`packages/infrastructure/prisma/migrations/${name}/migration.sql`);
  const changed = structuredClone(manifest); changed.historicalMigrationMetadataExceptions[name].owner = 'UNKNOWN';
  assert.ok(validateMigrationMetadata(name, sql, changed).some((error) => error.includes('invalid sidecar')));
  changed.historicalMigrationMetadataExceptions[name].owner = 'cross_context'; changed.historicalMigrationMetadataExceptions[name].reviewReference = '';
  assert.ok(validateMigrationMetadata(name, sql, changed).some((error) => error.includes('invalid sidecar')));
});
