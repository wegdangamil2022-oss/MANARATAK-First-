import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preflightTargets,validateTargetDeclaration} from '../../scripts/database/post28-isolation.mjs';
import {inspectNeonLiveIdentity,requireNeonTcpPolicy,requirePost28LocalExecution} from '../../scripts/database/post28-neon-policy.mjs';
import {createNeonProviderReader} from '../../scripts/database/post28-neon-provider.mjs';
import {inspectDisposableDatabaseTarget} from '../../scripts/lib/disposable-database-target-guard.mjs';
import {NEON_IDENTITY_SQL,readDatabaseIdentity} from '../../scripts/database/post28-preflight.mjs';

const registry=JSON.parse(fs.readFileSync('config/testing/post28-neon-target.json','utf8'));
const sha='a'.repeat(40),runId='11111111-1111-4111-8111-111111111111';
const env={NODE_ENV:'test',DATABASE_TARGET_CLASS:'DISPOSABLE',POST28_ISOLATED_EXECUTION:'YES'};
const g={branchId:'br-synthetic-g',branchName:'post28-synthetic-g',endpointId:'ep-synthetic-g',
  directHost:'ep-synthetic-g.c-8.eu-central-1.aws.neon.tech',database:'manaratak_post28_greenfield_test',
  role:'post28_migrator',roleKind:'MIGRATION'};
const s={...g,branchId:'br-synthetic-s',branchName:'post28-synthetic-s',endpointId:'ep-synthetic-s',
  directHost:g.directHost.replace('synthetic-g','synthetic-s'),database:'manaratak_post28_shadow_test',role:'post28_shadow',roleKind:'SHADOW'};
const contract={version:1,kind:'POST28_NEON_TEST_DECLARATIONS',purpose:'READ_ONLY_PREFLIGHT',sourceSha:sha,runId,
  projectId:registry.neon.projectId,referenceBranchId:registry.neon.validationBranchId,postgresMajor:16,
  targets:{'DB-G':g,'DB-S':s}};
const urlFor=t=>`postgresql://${t.role}:synthetic-not-a-secret@${t.directHost}/${t.database}?schema=public&sslmode=require&sslaccept=strict`;
const declarations=[{label:'DB-G',url:urlFor(g)},{label:'DB-S',url:urlFor(s)}];
const providerFor=t=>({project:{id:t.projectId,pg_version:16,region_id:registry.neon.regionId},
  branch:{id:t.branchId,project_id:t.projectId,name:t.branchName,parent_id:t.referenceBranchId,
    default:false,primary:false,current_state:'ready'},
  endpoint:{id:t.endpointId,project_id:t.projectId,branch_id:t.branchId,host:t.directHost,type:'read_write',disabled:false},
  database:{name:t.database,branch_id:t.branchId,owner_name:'separate_owner'},role:{name:t.role,branch_id:t.branchId}});
const liveFor=t=>({database:t.database,role:t.role,sessionRole:t.role,databaseOid:'16394',postgresMajor:16,
  timezone:'UTC',probeReadOnly:true,sessionReplicationRole:'origin',tls:true,tlsVersion:'TLSv1.3',
  superuser:false,createRole:false,createDatabase:false,replication:false,bypassRls:false,
  privilegedMembership:false,globalWrite:false,globalRead:false,databaseOwner:false,databaseCreate:false,
  otherSchemaCreate:false,canConnect:true,schemaUsage:true,schemaCreate:true,ownsRelations:false,publicTables:0,
  unvalidatedConstraints:0,invalidIndexes:0});
const opts={registry,requireEmpty:true,readProviderIdentity:async t=>providerFor(t)};
const expected=validateTargetDeclaration(contract,'DB-G',urlFor(g),env,sha,opts);

test('Neon pair is bound to SHA/run/provider and remains read-only after successful inert probes',async()=>{
  const calls=[];
  const result=await preflightTargets(contract,declarations,env,sha,async(_url,t)=>{
    calls.push('sql:'+t.label);return liveFor(t);
  },{...opts,readProviderIdentity:async t=>{calls.push('api:'+t.label);return providerFor(t);}});
  assert.deepEqual(calls,['api:DB-G','api:DB-S','sql:DB-G','sql:DB-S','api:DB-G','api:DB-S']);
  assert.equal(result.length,2);
  for(const row of result){assert.equal(row.sourceSha,sha);assert.equal(row.runId,runId);
    assert.equal(row.liveIdentityVerified,true);assert.equal(row.runtimeExecutionAuthorized,false);}
  assert.equal(JSON.stringify(result).includes('synthetic-not-a-secret'),false);
});

for(const [name,change] of [
  ['other project',c=>{c.projectId='other-project';}],['stale SHA',c=>{c.sourceSha='b'.repeat(40);}],
  ['missing run',c=>{delete c.runId;}],['wrong purpose',c=>{c.purpose='MIGRATE';}],
  ['wrong reference',c=>{c.referenceBranchId='br-other';}],['wrong PG',c=>{c.postgresMajor=17;}],
  ['reference branch target',c=>{c.targets['DB-G'].branchId=registry.neon.validationBranchId;}],
  ['default branch name',c=>{c.targets['DB-G'].branchName='main';}],
  ['role mismatch',c=>{c.targets['DB-G'].roleKind='APPLICATION';}],
])test(`Neon rejects ${name} before SQL or provider reads`,async()=>{
  const bad=structuredClone(contract);change(bad);let reads=0;
  await assert.rejects(preflightTargets(bad,declarations,env,sha,async()=>{reads++;},
    {...opts,readProviderIdentity:async()=>{reads++;}}));assert.equal(reads,0);
});
for(const [name,patch] of [
  ['production',{NODE_ENV:'production'}],['missing flag',{POST28_ISOLATED_EXECUTION:''}],
  ['wrong class',{DATABASE_TARGET_CLASS:'SHARED'}],['TLS environment bypass',{NODE_TLS_REJECT_UNAUTHORIZED:'0'}],
  ['TLS disabled',{PGSSLMODE:'disable'}],
])test(`Neon rejects ${name} before opening any client`,async()=>{
  let reads=0;await assert.rejects(preflightTargets(contract,declarations,{...env,...patch},sha,async()=>{reads++;},
    {...opts,readProviderIdentity:async()=>{reads++;}}));assert.equal(reads,0);
});

for(const [name,mutate] of [
  ['unregistered host',u=>u.replace('ep-synthetic-g.','ep-other.')],
  ['pooler',u=>u.replace('ep-synthetic-g.','ep-synthetic-g-pooler.')],
  ['production name',u=>u.replace('greenfield_test','production_test')],
  ['owner role',u=>u.replace('post28_migrator:','manaratak_test_owner:')],
  ['TLS absent',u=>u.replace('&sslmode=require','')],
  ['TLS duplicate',u=>u+'&sslmode=disable'],['CA bypass',u=>u.replace('sslaccept=strict','sslaccept=accept_invalid_certs')],
  ['query injection',u=>u+'&options=-c%20session_replication_role=replica'],
])test(`Neon refuses ${name} connection before provider/SQL reads`,async()=>{
  let reads=0;await assert.rejects(preflightTargets(contract,[{label:'DB-G',url:mutate(urlFor(g))}],env,sha,
    async()=>{reads++;},{...opts,readProviderIdentity:async()=>{reads++;}}));assert.equal(reads,0);
});

test('all Neon declarations and aliases are checked before provider or SQL reads',async()=>{
  for(const collision of [
    {...s,branchId:g.branchId,database:g.database},
    {...s,endpointId:g.endpointId,directHost:g.directHost,database:g.database},
    {...s,role:g.role},
  ]){
    const c=structuredClone(contract);c.targets['DB-S']=collision;let reads=0;
    await assert.rejects(preflightTargets(c,[declarations[0],{label:'DB-S',url:urlFor(collision)}],env,sha,
      async()=>{reads++;},{...opts,readProviderIdentity:async()=>{reads++;}}));assert.equal(reads,0);
  }
});
test('Neon cannot use local declaration proof, missing provider callback, empty list or duplicate labels',async()=>{
  for(const [c,ds,o] of [[contract,declarations,{registry}],[contract,[],opts],
    [contract,[declarations[0],declarations[0]],opts],
    [{...contract,kind:'POST28_LOCAL_DATABASE_TARGETS'},declarations,opts]]){
    let reads=0;await assert.rejects(preflightTargets(c,ds,env,sha,async()=>{reads++;},o));assert.equal(reads,0);
  }
});
for(const [group,key,value] of [
  ['project','id','other'],['project','pg_version',17],['project','region_id','aws-us-east-1'],
  ['branch','id','br-other'],['branch','project_id','other'],['branch','name','main'],
  ['branch','parent_id','br-other'],['branch','default',true],['branch','primary',true],['branch','current_state','init'],
  ['endpoint','id','ep-other'],['endpoint','project_id','other'],['endpoint','branch_id','br-other'],
  ['endpoint','host','untrusted.neon.tech'],['endpoint','type','read_only'],['endpoint','disabled',true],
  ['database','name','other'],['database','branch_id','br-other'],['database','owner_name',g.role],['database','owner_name',null],
  ['role','name','owner'],['role','branch_id','br-other'],
])test(`Neon provider rejects changed ${group}.${key} before SQL`,async()=>{
  let reads=0;
  await assert.rejects(preflightTargets(contract,declarations,env,sha,async()=>{reads++;},
    {...opts,readProviderIdentity:async t=>{const p=providerFor(t);p[group][key]=value;return p;}}),/PROVIDER_IDENTITY_MISMATCH/);
  assert.equal(reads,0);
});
test('provider reassignment during the read-only run invalidates the result',async()=>{
  let reads=0;
  await assert.rejects(preflightTargets(contract,[declarations[0]],env,sha,async(_u,t)=>liveFor(t),
    {...opts,readProviderIdentity:async t=>{const p=providerFor(t);if(++reads===2)p.endpoint.branch_id='br-other';return p;}}),/PROVIDER_IDENTITY_MISMATCH/);
});
for(const flag of ['superuser','createRole','createDatabase','replication','bypassRls','privilegedMembership',
  'globalWrite','globalRead','databaseOwner','databaseCreate','otherSchemaCreate'])
  test(`Neon rejects elevated ${flag} including inherited permissions`,()=>{
    assert.throws(()=>inspectNeonLiveIdentity(expected,{...liveFor(expected),[flag]:true}),/ELEVATED_DATABASE_ROLE/);
    const missing=liveFor(expected);delete missing[flag];
    assert.throws(()=>inspectNeonLiveIdentity(expected,missing),/ELEVATED_DATABASE_ROLE/);
  });
for(const [key,value] of [['database','other'],['role','other'],['sessionRole','other'],['databaseOid',''],
  ['postgresMajor',17],['timezone','Europe/Berlin'],['sessionReplicationRole','replica'],['probeReadOnly',false],
  ['tls',false],['tlsVersion','TLSv1.1'],['canConnect',false],['schemaUsage',false]])
  test(`Neon live probe rejects wrong ${key}`,()=>assert.throws(()=>inspectNeonLiveIdentity(expected,{...liveFor(expected),[key]:value})));
test('Neon requires empty greenfield and validated runtime catalog; app cannot own objects or create schema',()=>{
  assert.throws(()=>inspectNeonLiveIdentity(expected,{...liveFor(expected),publicTables:1},{requireEmpty:true}));
  assert.throws(()=>inspectNeonLiveIdentity(expected,{...liveFor(expected),unvalidatedConstraints:1},{requireValidatedCatalog:true}));
  assert.throws(()=>inspectNeonLiveIdentity(expected,{...liveFor(expected),invalidIndexes:1},{requireValidatedCatalog:true}));
  const app={...expected,roleKind:'APPLICATION'};
  for(const flags of [{schemaCreate:true,ownsRelations:false},{schemaCreate:false,ownsRelations:true}])
    assert.throws(()=>inspectNeonLiveIdentity(app,{...liveFor(app),...flags}),/APPLICATION_DDL_FORBIDDEN/);
  assert.equal(inspectNeonLiveIdentity(app,{...liveFor(app),schemaCreate:false}).runtimeExecutionAuthorized,false);
});
test('API credential requirement and HTTP failures are redacted; no fallback to another project',async()=>{
  assert.throws(()=>createNeonProviderReader({}),/PROVIDER_CREDENTIAL_REQUIRED/);
  const reader=createNeonProviderReader({NEON_API_KEY:'synthetic'},async()=>{throw new Error(urlFor(g));});
  await assert.rejects(reader(expected),e=>e.message==='POST28_NEON_PROVIDER_READ_FAILED');
});
test('provider reader uses exact GET resource paths and discards password-bearing metadata',async()=>{
  const p=providerFor(expected),calls=[];
  const values=[{project:p.project},{branch:p.branch},{endpoint:p.endpoint},{database:p.database},
    {role:{...p.role,password:'must-never-be-returned'}}];
  const reader=createNeonProviderReader({NEON_API_KEY:'synthetic'},async resource=>{calls.push(resource);return values[calls.length-1];});
  assert.deepEqual(await reader(expected),p);assert.equal(calls.length,5);
  assert.equal(calls[0],`projects/${registry.neon.projectId}`);
  assert.equal(calls[4],`projects/${registry.neon.projectId}/branches/${g.branchId}/roles/${g.role}`);
});
test('legacy CI flags cannot authorize any Neon mutation, while local and CI service paths remain intact',()=>{
  const values={NODE_ENV:'test',DATABASE_TARGET_CLASS:'DISPOSABLE',ALLOW_DISPOSABLE_DB_MUTATIONS:'YES',
    CI:'true',DATABASE_DISPOSABLE_REMOTE_APPROVED:'YES',DATABASE_URL:urlFor(g),
    DATABASE_DISPOSABLE_CONFIRM_TARGET:`${g.directHost}:5432/${g.database}`};
  assert.equal(inspectDisposableDatabaseTarget('migrate-dev',values).ok,false);
  for(const host of ['127.0.0.1','postgres'])
    assert.equal(inspectDisposableDatabaseTarget('migrate-dev',{...values,DATABASE_URL:`postgresql://u:p@${host}:5432/testdb`,
      DATABASE_DISPOSABLE_CONFIRM_TARGET:`${host}:5432/testdb`}).ok,true);
});
test('TCP grant must name the exact Direct host, never HTTPS availability or wildcard alone',()=>{
  for(const policy of [null,{version:1,tcp_network_access:{domains:[]}},
    {version:1,tcp_network_access:{domains:['*.neon.tech']}},
    {version:1,tcp_network_access:{domains:[s.directHost]}}])
    assert.throws(()=>requireNeonTcpPolicy(expected,policy),/TCP_ACCESS_NOT_CONFIGURED/);
  assert.doesNotThrow(()=>requireNeonTcpPolicy(expected,{version:1,tcp_network_access:{domains:[g.directHost]}}));
});
test('Neon identity SQL measures TLS and inherited privileges without pg_control_system or writes',()=>{
  assert.match(NEON_IDENTITY_SQL,/pg_stat_ssl/);assert.match(NEON_IDENTITY_SQL,/neon_superuser/);
  assert.match(NEON_IDENTITY_SQL,/pg_read_all_data/);assert.match(NEON_IDENTITY_SQL,/session_replication_role/);
  assert.doesNotMatch(NEON_IDENTITY_SQL,/pg_control_system|\b(?:INSERT|DELETE|UPDATE|ALTER|DROP)\b/i);
});

test('remote read-only proof cannot authorize existing parity, diff or destructive suite runners',()=>{
  for(const c of [contract,{},null])assert.throws(()=>requirePost28LocalExecution(c),/NEON_RUNTIME_NOT_AUTHORIZED/);
  assert.doesNotThrow(()=>requirePost28LocalExecution({kind:'POST28_LOCAL_DATABASE_TARGETS'}));
  for(const [file,operation] of [
    ['scripts/database/verify-greenfield-migration-parity.sh','"$PRISMA_BIN" migrate deploy'],
    ['scripts/database/prisma-env-diff.mjs','await preflightTargets'],
    ['scripts/database/run-post28-suite.mjs','const targets=await preflightTargets'],
  ]){
    const source=fs.readFileSync(file,'utf8');
    assert.ok(source.indexOf('requirePost28LocalExecution(contract)')<source.indexOf(operation),file);
    assert.ok(source.includes('requirePost28LocalExecution(contract)'));
  }
});
test('identity reader uses READ ONLY before the exact Neon SELECT and always disconnects (inert client)',async()=>{
  const calls=[];
  const client={$transaction:async(fn,settings)=>{assert.equal(settings.timeout,15000);
    return fn({$executeRawUnsafe:async sql=>{calls.push(sql);},$queryRawUnsafe:async sql=>{
      assert.equal(sql,NEON_IDENTITY_SQL);calls.push('SELECT');return [liveFor(expected)];}});},
  $disconnect:async()=>{calls.push('disconnect');}};
  const result=await readDatabaseIdentity(urlFor(g),expected,async raw=>{assert.equal(raw,urlFor(g));return client;});
  assert.equal(result.database,g.database);
  assert.deepEqual(calls,['SET TRANSACTION READ ONLY',"SET LOCAL statement_timeout = '10000ms'",'SELECT','disconnect']);
});
for(const step of ['construct','transaction','empty row','disconnect'])
  test(`identity reader redacts ${step} failure without leaking driver credentials`,async()=>{
    let disconnected=0;
    const client={$transaction:async()=>{
      if(step==='transaction')throw new Error(urlFor(g));return step==='empty row'?[]:[liveFor(expected)];
    },$disconnect:async()=>{disconnected++;if(step==='disconnect')throw new Error(urlFor(g));}};
    await assert.rejects(readDatabaseIdentity(urlFor(g),expected,async()=>{
      if(step==='construct')throw new Error(urlFor(g));return client;
    }),e=>e.message==='POST28_IDENTITY_READ_FAILED');
    assert.equal(disconnected,step==='construct'?0:1);
  });
test('provider connection or authorization failure aborts before creating a SQL client',async()=>{
  let reads=0;
  await assert.rejects(preflightTargets(contract,declarations,env,sha,async()=>{reads++;},
    {...opts,readProviderIdentity:createNeonProviderReader({NEON_API_KEY:'synthetic'},async()=>{throw new Error('403 synthetic');})}),
  /PROVIDER_READ_FAILED/);assert.equal(reads,0);
});
test('migration/shadow require schema CREATE; missing role facts and catalog evidence are refused',()=>{
  assert.throws(()=>inspectNeonLiveIdentity(expected,{...liveFor(expected),schemaCreate:false}),/ROLE_GRANTS_REQUIRED/);
  for(const key of ['canConnect','schemaUsage','schemaCreate','ownsRelations']){
    const live=liveFor(expected);delete live[key];assert.throws(()=>inspectNeonLiveIdentity(expected,live));
  }
  const live=liveFor(expected);delete live.invalidIndexes;
  assert.throws(()=>inspectNeonLiveIdentity(expected,live,{requireValidatedCatalog:true}));
});

test('Neon baseline and all Neon aliases are rejected before any destructive test-module import',async()=>{
  const {rejectProtectedSuiteTargets}=await import('./post28-database-safety.setup.mjs');
  for(const name of ['DATABASE_URL','DIRECT_URL','W3_DATABASE_TEST_DATABASE_URL'])
    assert.throws(()=>rejectProtectedSuiteTargets({[name]:urlFor(g),CI:'true',DATABASE_DISPOSABLE_REMOTE_APPROVED:'YES'}),
      /NEON_RUNTIME_NOT_AUTHORIZED/);
  const os=await import('node:os'),path=await import('node:path'),cp=await import('node:child_process');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-neon-no-import-'));
  try{
    const config=path.join(root,'config.mjs'),marker=path.join(root,'imported');
    fs.writeFileSync(path.join(root,'inert.test.mjs'),`import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},'unsafe import');`);
    const setup=new URL('./post28-database-safety.setup.mjs',import.meta.url).pathname;
    fs.writeFileSync(config,`export default {test:{root:${JSON.stringify(root)},include:['inert.test.mjs'],globalSetup:[${JSON.stringify(setup)}]}};`);
    const result=cp.spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--config',config],
      {encoding:'utf8',env:{...process.env,DATABASE_URL:urlFor(g),DIRECT_URL:'',W3_DATABASE_TEST_DATABASE_URL:'',
        POST28_TARGET_LABEL:'DB-T',DATABASE_TARGET_CLASS:'DISPOSABLE',CI:'true',DATABASE_DISPOSABLE_REMOTE_APPROVED:'YES'}});
    assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/POST28_NEON_RUNTIME_NOT_AUTHORIZED/);
    assert.equal(fs.existsSync(marker),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('a bad shadow provider binding aborts before even the valid greenfield SQL client',async()=>{
  let reads=0;
  await assert.rejects(preflightTargets(contract,declarations,env,sha,async()=>{reads++;},
    {...opts,readProviderIdentity:async t=>{const p=providerFor(t);if(t.label==='DB-S')p.branch.default=true;return p;}}));
  assert.equal(reads,0);
});
test('distinct names cannot hide duplicate live OIDs in the same Neon branch',async()=>{
  const other={...s,branchId:g.branchId,branchName:g.branchName,endpointId:g.endpointId,directHost:g.directHost};
  const c={...contract,targets:{'DB-G':g,'DB-S':other}};
  await assert.rejects(preflightTargets(c,[declarations[0],{label:'DB-S',url:urlFor(other)}],env,sha,
    async(_u,t)=>liveFor(t),opts),/TARGET_ALIAS_COLLISION/);
});
test('default provider transport sends credentials only on stdin and pins verified HTTPS GET (inert curl)',async()=>{
  const os=await import('node:os'),path=await import('node:path');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-neon-curl-'));
  try{
    const argsFile=path.join(root,'args.jsonl'),provider=providerFor(expected);
    const script=`#!${process.execPath}\nimport fs from 'node:fs';
      const input=fs.readFileSync(0,'utf8');
      if(!input.includes('https://api.neon.tech/v2/projects/')||!input.includes('Authorization: Bearer synthetic-token'))process.exit(2);
      fs.appendFileSync(${JSON.stringify(argsFile)},JSON.stringify(process.argv.slice(2))+'\\n');
      console.log(${JSON.stringify(JSON.stringify({...provider,role:{...provider.role,password:'must-not-escape'}}))});`;
    // A symlink preserves the .mjs entry while exposing the synthetic curl name.
    const entry=path.join(root,'curl.mjs');fs.writeFileSync(entry,script,{mode:0o700});
    fs.symlinkSync(entry,path.join(root,'curl'));
    const reader=createNeonProviderReader({PATH:root,NEON_API_KEY:'synthetic-token'});
    assert.deepEqual(await reader(expected),provider);
    const calls=fs.readFileSync(argsFile,'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(calls.length,5);
    for(const args of calls){assert.equal(args[0],'--disable');assert.ok(args.includes('--no-insecure'));
      assert.ok(args.includes('GET'));assert.equal(args.join(' ').includes('synthetic-token'),false);}
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
