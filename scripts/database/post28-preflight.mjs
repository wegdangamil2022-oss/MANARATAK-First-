#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preflightTargets} from './post28-isolation.mjs';

export const IDENTITY_SQL = `SELECT current_database() AS database, current_user AS role,
  session_user AS "sessionRole", d.oid::text AS "databaseOid",
  (SELECT system_identifier::text FROM pg_control_system()) AS "serverIdentity",
  shobj_description(d.oid, 'pg_database') AS marker,
  (current_setting('server_version_num')::integer / 10000)::integer AS "postgresMajor",
  current_setting('TimeZone') AS timezone,
  (current_setting('transaction_read_only')='on') AS "probeReadOnly",
  r.rolsuper AS superuser, r.rolcreaterole AS "createRole", r.rolcreatedb AS "createDatabase",
  r.rolreplication AS replication, r.rolbypassrls AS "bypassRls",
  EXISTS(SELECT 1 FROM pg_roles p WHERE (p.rolsuper OR p.rolcreaterole OR p.rolcreatedb OR p.rolreplication OR p.rolbypassrls)
    AND pg_has_role(current_user, p.rolname, 'MEMBER')) AS "privilegedMembership",
  pg_has_role(current_user, 'pg_write_all_data', 'MEMBER') AS "globalWrite",
  pg_has_role(current_user, pg_get_userbyid(d.datdba), 'MEMBER') AS "databaseOwner",
  has_database_privilege(current_user, d.oid, 'CREATE') AS "databaseCreate",
  has_schema_privilege(current_user, 'public', 'CREATE') AS "schemaCreate",
  (SELECT count(*)::integer FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')) AS "publicTables"
  ,(SELECT count(*)::integer FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
      WHERE n.nspname='public' AND NOT c.convalidated) AS "unvalidatedConstraints"
  ,(SELECT count(*)::integer FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid) AS "invalidIndexes"
  FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()`;

export async function readDatabaseIdentity(url) {
  const {PrismaClient} = await import('@prisma/client');
  const client = new PrismaClient({datasources: {db: {url}}, log: [], errorFormat: 'minimal'});
  try {
    const rows = await client.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return tx.$queryRawUnsafe(IDENTITY_SQL);
    });
    if (rows.length !== 1) throw new Error('POST28_IDENTITY_ROW_REQUIRED');
    return rows[0];
  } catch {
    // Driver diagnostics can contain credentials; preserve a stable redacted failure.
    throw new Error('POST28_IDENTITY_READ_FAILED');
  } finally { await client.$disconnect(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const sourceSha = execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim();
    if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE, 'utf8'));
    const declarations = process.argv.includes('--pair')
      ? [{label:'DB-G',url:process.env.GREENFIELD_DATABASE_URL},{label:'DB-S',url:process.env.GREENFIELD_SHADOW_DATABASE_URL}]
      : [{label:process.env.POST28_TARGET_LABEL,url:process.env.DATABASE_URL}];
    const targets = await preflightTargets(contract, declarations, process.env, sourceSha, readDatabaseIdentity,
      {requireEmpty: process.argv.includes('--require-empty')});
    console.log(JSON.stringify({kind:'POST28_READ_ONLY_TARGET_PREFLIGHT',sourceSha,targets,pass:true}));
  } catch (error) {
    const code = error.message?.match(/^(?:POST28_|TARGET_AND_SHADOW_)[A-Z_]+$/)?.[0] ?? 'POST28_PREFLIGHT_INPUT_INVALID';
    console.error(code); process.exitCode=1;
  }
}
