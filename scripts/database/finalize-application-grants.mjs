import { spawnSync } from 'node:child_process';
import { databaseTargetIdentity, requireDatabaseMutationGate } from '../lib/database-mutation-gate.mjs';
import { applicationPrivilegesSql } from './runtime-role-privileges.mjs';

const env = process.env;
requireDatabaseMutationGate('db:roles:finalize', { allowedPurposes: ['provision', 'migrate'] }, env);
if (!env.DIRECT_URL || databaseTargetIdentity(env.DIRECT_URL) !== databaseTargetIdentity(env.DATABASE_URL)) throw new Error('ROLE_FINALIZATION_TARGET_MISMATCH');
const uri = new URL(env.DIRECT_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname) && !['require', 'verify-ca', 'verify-full'].includes(uri.searchParams.get('sslmode'))) throw new Error('ROLE_FINALIZATION_TLS_REQUIRED');
if (env.DB_APPLICATION_ROLE === decodeURIComponent(uri.username)) throw new Error('APPLICATION_ROLE_MUST_DIFFER_FROM_MIGRATOR');
const sql = applicationPrivilegesSql(env.DB_APPLICATION_ROLE);
const result = spawnSync('psql', ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--quiet'], {
  env: { ...env, PGHOST: uri.hostname, PGPORT: uri.port || '5432', PGDATABASE: decodeURIComponent(uri.pathname.slice(1)),
    PGUSER: decodeURIComponent(uri.username), PGPASSWORD: decodeURIComponent(uri.password),
    PGSSLMODE: uri.searchParams.get('sslmode') || 'prefer', PGCONNECT_TIMEOUT: '20' },
  input: `BEGIN;\n${sql}\nCOMMIT;\n`, encoding: 'utf8', timeout: 60000, windowsHide: true,
});
if (result.error || result.status !== 0) throw new Error('APPLICATION_GRANTS_FAILED: inspect target ownership without logging credentials');
console.log('APPLICATION_GRANTS_FINALIZED=PASS MIGRATION_LEDGER_ACCESS=DENIED');
