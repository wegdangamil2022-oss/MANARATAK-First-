import fs from 'node:fs';
import { hash, DIGEST } from '../release/lib/ReleaseContracts.mjs';
export function recoveryTlsRoot(file, expectedHash) {
  if (
    typeof file !== 'string' ||
    !DIGEST.test(expectedHash ?? '') ||
    fs.lstatSync(file).isSymbolicLink() ||
    !fs.statSync(file).isFile() ||
    fs.statSync(file).size > 1024 * 1024 ||
    hash(fs.readFileSync(file)) !== expectedHash
  )
    throw Error('RECOVERY_TLS_ROOT_IDENTITY_INVALID');
  return fs.realpathSync(file);
}
export function recoveryPrismaUrl(databaseUrl, rootCertificate) {
  const url = new URL(databaseUrl);
  if (url.search || url.hash) throw Error('RECOVERY_TARGET_URL_INVALID');
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('sslaccept', 'strict');
  url.searchParams.set('sslcert', rootCertificate);
  return url.href;
}
export function recoveryLibpqEnvironment(target, rootCertificate, env = process.env) {
  const clean = Object.fromEntries(
    Object.entries(env).filter(([key]) => !key.toUpperCase().startsWith('PG')),
  );
  return {
    ...clean,
    PGSSLMODE: 'verify-full',
    PGSSLROOTCERT: rootCertificate,
    PGHOST: target.host,
    PGPORT: target.port,
    PGDATABASE: target.database,
    PGUSER: target.role,
    PGPASSWORD: target.password,
    PGAPPNAME: 'manaratak-r10-restore',
  };
}
export const RECOVERY_SENTINEL_SQL = `SELECT json_build_object('serverIdentity',(SELECT system_identifier::text FROM pg_control_system()),'database',current_database(),'role',current_user,'superuser',r.rolsuper,'createRole',r.rolcreaterole,'createDatabase',r.rolcreatedb,'replication',r.rolreplication,'bypassRls',r.rolbypassrls,'unsafeRoleMembership',EXISTS(SELECT 1 FROM pg_roles other WHERE other.oid<>r.oid AND pg_has_role(current_user,other.oid,'MEMBER')),'canConnectOtherDatabase',EXISTS(SELECT 1 FROM pg_database d WHERE d.datallowconn AND d.datname<>current_database() AND has_database_privilege(current_user,d.oid,'CONNECT')),'targetFingerprint',g.target_fingerprint,'disposableInstanceId',g.disposable_instance_id,'sentinelOwnedByRestoreRole',pg_get_userbyid(c.relowner)=current_user,'sentinelWritableByRestoreRole',has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') OR has_schema_privilege(current_user,'manaratak_recovery_control','CREATE')) AS value FROM pg_roles r JOIN manaratak_recovery_control.disposable_guard g ON g.guard_key='restore-target' JOIN pg_class c ON c.oid='manaratak_recovery_control.disposable_guard'::regclass WHERE r.rolname=current_user`;
