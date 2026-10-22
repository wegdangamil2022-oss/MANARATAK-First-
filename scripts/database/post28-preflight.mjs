#!/usr/bin/env node
import {preflightDeclarations} from './post28-lab-profile.mjs';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preflightTargets} from './post28-isolation.mjs';
import {createNeonProviderReader} from './post28-neon-provider.mjs';
import {requireNeonTcpPolicy} from './post28-neon-policy.mjs';

// No pg_control_system/comment prerequisite on managed Neon: the authenticated
// provider binds the TLS endpoint to project/branch, SQL binds DB/session/role.
export const NEON_IDENTITY_SQL = `SELECT current_database() AS database, current_user AS role,
  session_user AS "sessionRole", d.oid::text AS "databaseOid",
  (current_setting('server_version_num')::integer / 10000)::integer AS "postgresMajor",
  current_setting('TimeZone') AS timezone,
  (current_setting('transaction_read_only')='on') AS "probeReadOnly",
  current_setting('session_replication_role') AS "sessionReplicationRole",
  COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false) AS tls,
  (SELECT version FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS "tlsVersion",
  r.rolsuper AS superuser, r.rolcreaterole AS "createRole", r.rolcreatedb AS "createDatabase",
  r.rolreplication AS replication, r.rolbypassrls AS "bypassRls",
  EXISTS(SELECT 1 FROM pg_roles p WHERE (p.rolsuper OR p.rolcreaterole OR p.rolcreatedb OR p.rolreplication OR p.rolbypassrls OR p.rolname='neon_superuser' OR p.rolname LIKE 'pg_%')
    AND pg_has_role(current_user, p.oid, 'MEMBER')) AS "privilegedMembership",
  pg_has_role(current_user, 'pg_write_all_data', 'MEMBER') AS "globalWrite",
  pg_has_role(current_user, 'pg_read_all_data', 'MEMBER') AS "globalRead",
  pg_has_role(current_user, pg_get_userbyid(d.datdba), 'MEMBER') AS "databaseOwner",
  has_database_privilege(current_user, d.oid, 'CREATE') AS "databaseCreate",
  has_database_privilege(current_user, d.oid, 'CONNECT') AS "canConnect",
  has_schema_privilege(current_user, 'public', 'USAGE') AS "schemaUsage",
  has_schema_privilege(current_user, 'public', 'CREATE') AS "schemaCreate",
  EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN ('public','information_schema')
    AND n.nspname NOT LIKE 'pg_%' AND has_schema_privilege(current_user,n.oid,'CREATE')) AS "otherSchemaCreate",
  EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%'
    AND pg_has_role(current_user,c.relowner,'MEMBER')) AS "ownsRelations",
  (SELECT count(*)::integer FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')) AS "publicTables",
  (SELECT count(*)::integer FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
    WHERE n.nspname='public' AND NOT c.convalidated) AS "unvalidatedConstraints",
  (SELECT count(*)::integer FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid) AS "invalidIndexes"
  FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()`;

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

async function createIdentityClient(url) {
  const {PrismaClient} = await import('@prisma/client');
  return new PrismaClient({datasources: {db: {url}}, log: [], errorFormat: 'minimal'});
}

export async function readDatabaseIdentity(url, expected, createClient=createIdentityClient,
  transactionOptions={maxWait:10000,timeout:15000}) {
  if(!Number.isInteger(transactionOptions?.maxWait)||transactionOptions.maxWait<10000||transactionOptions.maxWait>30000||
    !Number.isInteger(transactionOptions?.timeout)||transactionOptions.timeout<15000||transactionOptions.timeout>60000)
    throw new Error('POST28_IDENTITY_BUDGET_INVALID');
  const settings={maxWait:transactionOptions.maxWait,timeout:transactionOptions.timeout};
  let client;
  let phase='construct';
  const failure=error=>Object.assign(new Error('POST28_IDENTITY_READ_FAILED'),{
    phase,code:/^P\d{4}$/.test(error?.code??'')?error.code:undefined,
  });
  try {
    client=await createClient(url);
    // Establish TLS/authentication before starting the bounded read-only transaction.
    phase='connect';
    await client.$connect();
    phase='transaction';
    const rows = await client.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'");
      return tx.$queryRawUnsafe(expected?.provider==='NEON'?NEON_IDENTITY_SQL:IDENTITY_SQL);
    },settings);
    if (rows.length !== 1) throw new Error('POST28_IDENTITY_ROW_REQUIRED');
    return rows[0];
  } catch (error) {
    // Driver diagnostics can contain credentials; preserve a stable redacted failure.
    throw failure(error);
  } finally {
    if(client)try{await client.$disconnect();}catch(error){phase='disconnect';throw failure(error);}
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const sourceSha = execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim();
    if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE, 'utf8'));
    const options={requireEmpty:process.argv.includes('--require-empty')};
    if(contract.kind==='POST28_NEON_TEST_DECLARATIONS') {
      options.registry=JSON.parse(fs.readFileSync(new URL('../../config/testing/post28-neon-target.json',import.meta.url),'utf8'));
      options.readProviderIdentity=createNeonProviderReader();
      const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
      if(branch!==options.registry.git.workingBranch)throw new Error('POST28_NEON_GIT_BRANCH_MISMATCH');
    }
    const declarations = preflightDeclarations(process.argv.slice(2),process.env);
    if(contract.kind==='POST28_NEON_TEST_DECLARATIONS') {
      let policy;
      try{policy=JSON.parse(fs.readFileSync('/etc/codex/network-policy.json','utf8'));}
      catch{throw new Error('POST28_NEON_TCP_ACCESS_NOT_CONFIGURED');}
      for(const {label} of declarations)requireNeonTcpPolicy(contract.targets?.[label],policy);
    }
    const targets = await preflightTargets(contract, declarations, process.env, sourceSha, readDatabaseIdentity,
      options);
    console.log(JSON.stringify({kind:'POST28_READ_ONLY_TARGET_PREFLIGHT',sourceSha,runId:contract.runId,
      targets,pass:true,runtimeExecutionAuthorized:false}));
  } catch (error) {
    const code = error.message?.match(/^(?:POST28_|TARGET_AND_SHADOW_)[A-Z_]+$/)?.[0] ?? 'POST28_PREFLIGHT_INPUT_INVALID';
    console.error(code); process.exitCode=1;
  }
}
