import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateMigrationMetadata } from '../../scripts/architecture/migration-metadata-policy.mjs';

const manifest = JSON.parse(readFileSync('docs/architecture/persistence/persistence-ownership.manifest.json', 'utf8'));

test('explicitly reviewed historical migrations retain exact SQL bytes via sidecar metadata', () => {
  const names = Object.keys(manifest.historicalMigrationMetadataExceptions);
  assert.deepEqual(names.sort(), [
    "20260907030000_m7_batch_a2_structural_reconciliation",
    "20260907033000_m7_batch_b_index_reconciliation",
    "20260907040000_m7_batch_c_fk_reconciliation",
    "20261009010000_eap_asset_reference_serialization",
    "20261009020000_eap_restore_operation_barrier",
    "20261009030000_eap_archive_operation_barrier",
    "20261009040000_settings_override_history",
    "20261009050000_settings_current_version_ownership",
    "20261009060000_settings_definition_validation_rules",
    "20261010000000_course_assessment_type",
    "20261010170000_p11_unit_source_identity",
    "20261010180000_certificate_issuer_pending_default",
    "20261010183000_p12_scholarship_revision"
  ]);
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
