import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { applicationPrivilegesSql } from '../../scripts/database/runtime-role-privileges.mjs';

test('application grants exclude migration history and revoke automatic grants to future tables', () => {
  const sql = applicationPrivilegesSql('platform_app');
  assert.match(sql, /relname <> '_prisma_migrations'/);
  assert.match(sql, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM platform_app/);
  assert.match(sql, /REVOKE ALL ON TABLE public\."_prisma_migrations" FROM platform_app, PUBLIC/);
  assert.match(sql, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I\.%I TO %I/);
  assert.doesNotMatch(sql, /GRANT .*ON ALL TABLES/);
});

test('role identifiers cannot inject SQL or target reserved administrative identities', () => {
  for (const role of ['', 'postgres', 'pg_read_all_data', 'bad-role', 'app; DROP SCHEMA public', 'a'.repeat(64)]) {
    assert.throws(() => applicationPrivilegesSql(role), /APPLICATION_ROLE_INVALID/);
  }
});

test('provisioning and post-migration finalization share the same protected grant policy', () => {
  const provision = fs.readFileSync('scripts/database/provision-roles.mjs', 'utf8');
  const deploy = fs.readFileSync('scripts/db-remediation-gate.ts', 'utf8');
  assert.match(provision, /applicationPrivilegesSql\(app\)/);
  assert.doesNotMatch(provision, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO/);
  assert.ok(deploy.indexOf('finalizeApplicationGrants();') > deploy.indexOf("runPrisma(['migrate', 'deploy'"));
  assert.ok(deploy.indexOf('finalizeApplicationGrants();') < deploy.indexOf("runPrisma(['migrate', 'status'", deploy.indexOf("if (mode === 'deploy')")));
});

test('finalization refuses a missing mutation approval before contacting PostgreSQL', () => {
  const result = spawnSync(process.execPath, ['scripts/database/finalize-application-grants.mjs'], {
    encoding: 'utf8', env: { ...process.env, DATABASE_PROVISIONING_GATE: '', DATABASE_URL: '' },
  });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /APPLICATION_GRANTS_FINALIZED=PASS/);
  assert.doesNotMatch(result.stderr, /APPLICATION_GRANTS_FAILED/);
});
