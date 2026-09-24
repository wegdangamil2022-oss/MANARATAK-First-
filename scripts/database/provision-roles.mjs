#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { requireDatabaseMutationGate, databaseTargetIdentity } from '../lib/database-mutation-gate.mjs';

const env = process.env;
requireDatabaseMutationGate('db:roles:provision', { allowedPurposes: ['provision'] }, env);
if (!env.DIRECT_URL || databaseTargetIdentity(env.DIRECT_URL) !== databaseTargetIdentity(env.DATABASE_URL)) {
  throw new Error('DIRECT_URL must identify the approved DATABASE_URL target');
}
const direct = new URL(env.DIRECT_URL);
const tlsMode = direct.searchParams.get('sslmode');
const localTarget = ['localhost', '127.0.0.1', '[::1]'].includes(direct.hostname.toLowerCase());
if (!localTarget && !['require', 'verify-ca', 'verify-full'].includes(tlsMode)) throw new Error('DIRECT_URL must require PostgreSQL TLS for a nonlocal provisioning target');
const roleName = value => {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(value ?? '')) throw new Error('DB role names must be lowercase PostgreSQL identifiers');
  return value;
};
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const roles = [
  [roleName(env.DB_PROBE_ROLE), env.DB_PROBE_PASSWORD],
  [roleName(env.DB_MIGRATION_ROLE), env.DB_MIGRATION_PASSWORD],
  [roleName(env.DB_APPLICATION_ROLE), env.DB_APPLICATION_PASSWORD],
];
if (new Set(roles.map(([name]) => name)).size !== 3 || roles.some(([name,pass]) => name === 'postgres' || name === decodeURIComponent(direct.username) || name.startsWith('pg_') || !/^[A-Za-z0-9_-]{24,}$/.test(pass ?? ''))) {
  throw new Error('Three distinct, non-operator roles and URL-safe strong passwords are required');
}
const [probe, migrator, app] = roles.map(([name]) => name);
const database = decodeURIComponent(direct.pathname.slice(1));
const statement = [
  `REVOKE ALL ON DATABASE "${database.replaceAll('\"','\"\"')}" FROM PUBLIC;`,
  'REVOKE CREATE ON SCHEMA public FROM PUBLIC;',
  'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;',
  'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;',
];
for (const [name, password] of roles) {
  statement.push(`DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = ${literal(name)}) THEN CREATE ROLE ${name} LOGIN; END IF; END $$;`);
  statement.push(`ALTER ROLE ${name} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${literal(password)};`);
  statement.push(`REVOKE ALL ON DATABASE "${database.replaceAll('"','""')}" FROM ${name};`);
  statement.push(`GRANT CONNECT ON DATABASE "${database.replaceAll('"','""')}" TO ${name};`);
  statement.push(`REVOKE ALL ON SCHEMA public FROM ${name};`);
}
statement.push(`GRANT USAGE ON SCHEMA public TO ${probe}, ${app};`);
statement.push(`GRANT USAGE, CREATE ON SCHEMA public TO ${migrator};`);
statement.push(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${probe}, ${app};`);
statement.push(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${probe};`);
statement.push(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${app};`);
statement.push(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${app};`);
statement.push(`ALTER DEFAULT PRIVILEGES FOR ROLE ${migrator} IN SCHEMA public GRANT SELECT ON TABLES TO ${probe};`);
statement.push(`ALTER DEFAULT PRIVILEGES FOR ROLE ${migrator} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${app};`);
statement.push(`ALTER DEFAULT PRIVILEGES FOR ROLE ${migrator} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${app};`);
const childEnv = { ...env, PGHOST: direct.hostname, PGPORT: direct.port || '5432', PGDATABASE: database,
  PGUSER: decodeURIComponent(direct.username), PGPASSWORD: decodeURIComponent(direct.password),
  PGSSLMODE: direct.searchParams.get('sslmode') || 'prefer' };
const result = spawnSync('psql', ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--quiet'], {
  env: childEnv, input: `BEGIN;\n${statement.join('\n')}\nCOMMIT;\n`, encoding: 'utf8', timeout: 30000,
});
if (result.error || result.status !== 0) throw new Error('DB role provisioning failed; inspect psql access and privileges without logging credentials');
console.log('DB_ROLE_PROVISIONING=PASS');
