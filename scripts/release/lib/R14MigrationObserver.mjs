import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// Provisioning only, in the newly owned lab. The actual probe uses an ordinary
// role with SELECT on the migration ledger alone, never the setup principal.
export async function provisionMigrationObserver({ docker, state, applicationUrl, secrets, PrismaClient }) {
  const identity = JSON.parse(docker(['inspect', state.containerId]))[0];
  assert.equal(identity.Config.Labels['codex.post28.run'], state.runId);
  assert.equal(identity.Config.Labels['codex.post28.scope'], 'DISPOSABLE');
  const url = new URL(applicationUrl);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.username, 'post28_app');
  assert.equal(url.pathname, '/manaratak_post28_transactions_test');
  const password = randomBytes(32).toString('hex');
  url.username = 'post28_migration_observer'; url.password = password;
  secrets.push(password, url.href);
  const sql = `CREATE ROLE post28_migration_observer LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
ALTER ROLE post28_migration_observer SET default_transaction_read_only=on;
GRANT CONNECT ON DATABASE manaratak_post28_transactions_test TO post28_migration_observer;
GRANT USAGE ON SCHEMA public TO post28_migration_observer;
GRANT SELECT ON public._prisma_migrations TO post28_migration_observer;`;
  docker(['exec', '-i', state.containerId, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'post28_bootstrap', '-d', 'manaratak_post28_transactions_test'], sql);
  const client = new PrismaClient({ datasources: { db: { url: url.href } }, log: [], errorFormat: 'minimal' });
  try {
    const [rights] = await client.$queryRaw`SELECT current_user AS role, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
      has_schema_privilege(current_user,'public','CREATE') AS ddl,
      has_table_privilege(current_user,'public._prisma_migrations','SELECT') AS ledgerRead,
      has_table_privilege(current_user,'public._prisma_migrations','INSERT,UPDATE,DELETE,TRUNCATE') AS ledgerWrite,
      has_table_privilege(current_user,'public."StudentWorkspace"','SELECT') AS applicationDataRead,
      current_setting('default_transaction_read_only') AS defaultReadOnly,
      (SELECT count(*)::int FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)) AS memberships
      FROM pg_roles WHERE rolname=current_user`;
    assert.equal(rights.role, 'post28_migration_observer');
    for (const key of ['rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolreplication', 'rolbypassrls', 'ddl', 'ledgerwrite', 'applicationdataread']) assert.equal(rights[key], false);
    assert.equal(rights.ledgerread, true); assert.equal(rights.defaultreadonly, 'on'); assert.equal(rights.memberships, 0);
    return {
      identity: rights,
      fingerprint: () => client.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        return tx.$queryRawUnsafe("SELECT id, encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') AS sha256 FROM public._prisma_migrations t ORDER BY id");
      }),
      disconnect: () => client.$disconnect(),
    };
  } catch (error) { await client.$disconnect(); throw error; }
}
