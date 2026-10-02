import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));

test('source recovery gate uses portable paths, fails closed and never connects to a database', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'manaratak-recovery-test-'));
  const schemaDir = path.join(fixture, 'packages/infrastructure/prisma');
  const migrationDir = path.join(schemaDir, 'migrations/fixture');
  try {
    mkdirSync(migrationDir, { recursive: true }); mkdirSync(path.join(fixture, 'scripts/database'), { recursive: true });
    writeFileSync(path.join(schemaDir, 'schema.prisma'), '// source fixture');
    writeFileSync(path.join(migrationDir, 'migration.sql'), '-- source fixture');
    writeFileSync(path.join(migrationDir, 'rollback.sql'), '-- reviewed source fixture');
    writeFileSync(path.join(migrationDir, 'other.sql'), '-- wrong artifact');
    const manifest = path.join(fixture, 'scripts/database/migration-recovery.manifest.json');
    const run = (artifact) => {
      writeFileSync(manifest, JSON.stringify({ version: 1, migrations: { fixture: { recoveryClass: 'ROLLBACK_SQL', artifact, decision: 'Test source classification' } } }));
      return spawnSync(process.execPath, ['--import', pathToFileURL(path.join(repo, 'node_modules/tsx/dist/loader.mjs')).href, path.join(repo, 'scripts/db-remediation-gate.ts'), 'rollback-plan'], {
        cwd: fixture, encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'invalid-do-not-connect', DIRECT_URL: 'invalid-do-not-connect' },
      });
    };
    const valid = run('packages/infrastructure/prisma/migrations/fixture/rollback.sql');
    assert.equal(valid.status, 0, valid.stderr);
    const result = JSON.parse(valid.stdout);
    assert.equal(result.status, 'RECOVERY_PLAN_SOURCE_VALIDATED');
    assert.equal(result.databaseConnectionAttempted, false); assert.equal(result.databaseWrites, 0);
    assert.equal(result.migrations[0].rollback.path, 'packages/infrastructure/prisma/migrations/fixture/rollback.sql');
    const rejected = run('packages/infrastructure/prisma/migrations/fixture/other.sql');
    assert.equal(rejected.status, 1, rejected.stderr);
    assert.deepEqual(JSON.parse(rejected.stdout).recoveryPlanIssues, ['ROLLBACK_ARTIFACT_MISMATCH:fixture']);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
