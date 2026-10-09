import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const schemaPath = resolve('packages/infrastructure/prisma/schema.prisma');
const migrationPath = resolve('packages/infrastructure/prisma/migrations/20261009050000_settings_current_version_ownership/migration.sql');
const sourceOnlyUrl = 'postgresql://source_only:source_only@127.0.0.1:1/source_only';
const normalize = sql => sql.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();

test('reviewed deferred ownership plan matches the ORM composite relation; no database execution', { timeout: 30000 }, () => {
  const schema = readFileSync(schemaPath, 'utf8');
  const sql = readFileSync(migrationPath, 'utf8');
  // Derive just the prior pointer-less model; all unrelated schema remains identical.
  const baseline = schema.replace(/model SettingAssignmentRecord \{[\s\S]*?\n\}/, model => model
    .replace(/^  currentVersion SettingVersionRecord[^\n]*\n/m, '')
    .replace(/^  @@unique\(\[id, currentVersionId\]\)\n/m, ''))
    .replace(/model SettingVersionRecord \{[\s\S]*?\n\}/, model => model
      .replace(/^  currentForAssignment SettingAssignmentRecord[^\n]*\n/m, '')
      .replace(/^  @@unique\(\[assignmentId, id\]\)\n/m, ''));
  assert.notEqual(schema, baseline);
  const folder = mkdtempSync(join(tmpdir(), 'settings-ownership-source-'));
  try {
    const prior = join(folder, 'prior.prisma'); writeFileSync(prior, baseline);
    const generated = execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'diff',
      '--from-schema-datamodel', prior, '--to-schema-datamodel', schemaPath, '--script'], {
      encoding: 'utf8', timeout: 20000,
      env: { ...process.env, DATABASE_URL: sourceOnlyUrl, DIRECT_URL: sourceOnlyUrl },
    });
    const reviewed = normalize(sql);
    assert.equal((reviewed.match(/DEFERRABLE INITIALLY DEFERRED NOT VALID/g) ?? []).length, 1);
    assert.equal(normalize(reviewed.replace(' DEFERRABLE INITIALLY DEFERRED NOT VALID', '')), normalize(generated));
    assert.match(generated, /FOREIGN KEY \("id", "currentVersionId"\) REFERENCES "SettingVersionRecord"\("assignmentId", "id"\)/);
    assert.doesNotMatch(reviewed, /\b(?:DELETE FROM|UPDATE "|INSERT INTO|VALIDATE CONSTRAINT|CASCADE)\b/i);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
