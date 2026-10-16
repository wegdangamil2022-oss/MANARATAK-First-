import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateTargetDeclaration,inspectLiveTarget,preflightTargets} from '../../scripts/database/post28-isolation.mjs';
import {databaseSuite} from '../../config/testing/post28-database-suites.mjs';
import {verifyDiscovery,verifySuiteResults} from '../../scripts/database/post28-suite-policy.mjs';

const sha='a'.repeat(40),runId='11111111-1111-4111-8111-111111111111';
const env={NODE_ENV:'test',POST28_ISOLATED_EXECUTION:'YES',DATABASE_TARGET_CLASS:'DISPOSABLE'};
const target={host:'127.0.0.1',port:15432,database:'manaratak_post28_greenfield_test',role:'post28_migrator',roleKind:'MIGRATION',serverIdentity:'12345678',databaseOid:'12345',nonce:'b'.repeat(64)};
const contract={version:1,kind:'POST28_LOCAL_DATABASE_TARGETS',sourceSha:sha,runId,postgresMajor:16,targets:{'DB-G':target,'DB-S':{...target,database:'manaratak_post28_shadow_test',role:'post28_shadow',roleKind:'SHADOW',databaseOid:'12346'}}};
const url='postgresql://post28_migrator:disposable-only@127.0.0.1:15432/manaratak_post28_greenfield_test?schema=public';
const shadow=url.replaceAll('post28_migrator','post28_shadow').replace('greenfield','shadow');
const expected=validateTargetDeclaration(contract,'DB-G',url,env,sha);
const live={database:target.database,role:target.role,sessionRole:target.role,databaseOid:target.databaseOid,
  serverIdentity:target.serverIdentity,marker:expected.marker,postgresMajor:16,timezone:'UTC',probeReadOnly:true,
  superuser:false,createRole:false,createDatabase:false,replication:false,bypassRls:false,
  privilegedMembership:false,globalWrite:false,databaseOwner:false,databaseCreate:false,schemaCreate:true,publicTables:0};

for(const [label,bad] of [['remote',url.replace('127.0.0.1','production.example')],['restore',url.replace('greenfield_test','restore_test')],
  ['production',url.replace('greenfield_test','production_test')],['schema',url.replace('schema=public','schema=other')],
  ['port',url.replace('15432','15433')],['role',url.replace('post28_migrator','postgres')]]) {
  test(`rejects ${label} target before client/query creation`,async()=>{
    let reads=0;await assert.rejects(preflightTargets(contract,[{label:'DB-G',url:bad}],env,sha,async()=>{reads++;return live;}));
    assert.equal(reads,0);
  });
}
test('missing isolation flags, stale SHA and forbidden restore label fail before any read',async()=>{
  for(const [c,label,e,s] of [[contract,'DB-G',{...env,NODE_ENV:'production'},sha],
    [contract,'DB-G',{...env,POST28_ISOLATED_EXECUTION:''},sha],[contract,'DB-G',env,'c'.repeat(40)],[contract,'DB-R',env,sha]]) {
    let reads=0;await assert.rejects(preflightTargets(c,[{label,url}],e,s,async()=>{reads++;return live;}));assert.equal(reads,0);
  }
});
test('different credentials/loopback spelling cannot disguise a shared target/shadow',async()=>{
  const aliases={...contract,targets:{...contract.targets,'DB-S':{...contract.targets['DB-S'],database:target.database,databaseOid:target.databaseOid}}};
  let reads=0;await assert.rejects(preflightTargets(aliases,[{label:'DB-G',url},{label:'DB-S',url:shadow.replace('shadow_test','greenfield_test').replace('127.0.0.1','localhost')}],env,sha,async()=>{reads++;return live;}),/TARGET_AND_SHADOW_MUST_DIFFER/);assert.equal(reads,0);
});
for(const flag of ['superuser','createRole','createDatabase','replication','bypassRls','privilegedMembership','globalWrite','databaseOwner','databaseCreate'])
  test(`rejects live elevated role flag ${flag}`,()=>{assert.throws(()=>inspectLiveTarget(expected,{...live,[flag]:true}),/POST28_ELEVATED_DATABASE_ROLE/);});
for(const field of ['database','role','sessionRole','databaseOid','serverIdentity','marker','postgresMajor','timezone'])
  test(`rejects changed live ${field}`,()=>{assert.throws(()=>inspectLiveTarget(expected,{...live,[field]:'wrong'}),/POST28_LIVE_TARGET_IDENTITY_MISMATCH/);});
test('application cannot inherit migration DDL privileges; nonempty greenfield is rejected',()=>{
  assert.throws(()=>inspectLiveTarget({...expected,roleKind:'APPLICATION'},live),/POST28_APPLICATION_DDL_FORBIDDEN/);
  assert.throws(()=>inspectLiveTarget(expected,{...live,publicTables:1},{requireEmpty:true}),/POST28_EMPTY_DATABASE_REQUIRED/);
});
test('valid distinct target/shadow declarations and live identities reach two read-only probes',async()=>{
  let reads=0;const results=await preflightTargets(contract,[{label:'DB-G',url},{label:'DB-S',url:shadow}],env,sha,async raw=>{
    reads++;const label=raw===url?'DB-G':'DB-S';const e=validateTargetDeclaration(contract,label,raw,env,sha);
    return {...live,database:e.database,role:e.role,sessionRole:e.role,databaseOid:e.databaseOid,marker:e.marker};
  },{requireEmpty:true});assert.equal(reads,2);assert.equal(results.length,2);
});
test('suite catalogue includes both actual asset DB suites and rejects an unknown profile',()=>{
  assert.equal(databaseSuite('assets').files.length,2);
  assert.throws(()=>databaseSuite('__proto__'),/POST28_DATABASE_SUITE_UNKNOWN/);
});
test('suite result policy rejects missing cases, skipped tests, wrong files and mismatched identities',()=>{
  const suite=databaseSuite('leases'),root='/project';
  const rows=suite.files.map((file,i)=>({file:root+'/'+file,name:'case '+i}));
  const report={success:true,numFailedTests:0,numPendingTests:0,numTotalTests:2,numPassedTests:2,
    testResults:rows.map(row=>({name:row.file,status:'passed',assertionResults:[{ancestorTitles:[],title:row.name,fullName:row.name,status:'passed'}]}))};
  assert.equal(verifySuiteResults('leases',rows,report,root).passed,2);
  for (const patch of [
    {ancestorTitles:['forged'],title:rows[0].name,fullName:'forged '+rows[0].name},
    {ancestorTitles:[],title:rows[0].name,fullName:'forged'},
    {ancestorTitles:undefined,title:rows[0].name},
  ]) {
    const changed=structuredClone(report);
    Object.assign(changed.testResults[0].assertionResults[0],patch);
    assert.throws(()=>verifySuiteResults('leases',rows,changed,root));
  }
  assert.throws(()=>verifySuiteResults('leases',rows,{...report,testResults:[...report.testResults,
    {name:root+'/extra.spec.ts',status:'passed',assertionResults:[]}]},root),/FILES_MISMATCH/);
  assert.throws(()=>verifySuiteResults('leases',rows,{...report,testResults:[...report.testResults,
    report.testResults[0]]},root),/FILES_MISMATCH/);

  assert.throws(()=>verifyDiscovery('leases',rows.slice(0,1),root));
  assert.throws(()=>verifySuiteResults('leases',rows,{...report,numPendingTests:1},root));
  assert.throws(()=>verifySuiteResults('leases',rows,{...report,numPassedTests:0,numTotalTests:0},root));
  assert.throws(()=>verifySuiteResults('leases',rows,{...report,testResults:[{...report.testResults[0],assertionResults:[{fullName:'forged',status:'passed'}]},report.testResults[1]]},root));
  assert.throws(()=>verifyDiscovery('leases',rows.map(row=>({...row,file:'/project/unknown.spec.ts'})),root));
  assert.throws(()=>verifySuiteResults('leases',rows,{...report,testResults:[{...report.testResults[0],assertionResults:[{fullName:rows[0].name,status:'pending'}]},report.testResults[1]]},root));
});

test('Prisma connection URLs are passed through private JS argv, absent from OS arguments', async()=>{
  const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),cp=await import('node:child_process');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-argv-'));
  try {
    const cli=path.join(root,'fixture.cjs'),entry=path.join(root,'entry.mjs');
    fs.writeFileSync(cli,"console.log(JSON.stringify({os:require('node:fs').readFileSync('/proc/self/cmdline','utf8'),args:process.argv}));");
    fs.writeFileSync(entry,`import {runPrismaMain,prismaDiffArguments} from ${JSON.stringify(new URL('../../scripts/database/prisma-env-diff.mjs',import.meta.url).href)}; runPrismaMain(${JSON.stringify(cli)},prismaDiffArguments('migrations',process.env));`);
    const fixtureUrl='postgresql://fixture:credential-not-for-os-argv@127.0.0.1/shadow';
    const result=cp.spawnSync(process.execPath,[entry],{encoding:'utf8',env:{...process.env,GREENFIELD_SHADOW_DATABASE_URL:fixtureUrl}});
    assert.equal(result.status,0,result.stderr);const observed=JSON.parse(result.stdout);
    assert.equal(observed.os.includes('credential-not-for-os-argv'),false);
    assert.ok(observed.args.includes(fixtureUrl));
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('destructive database suites reject restore references and protected aliases before test imports',async()=>{
  const {rejectProtectedSuiteTargets}=await import('./post28-database-safety.setup.mjs');
  rejectProtectedSuiteTargets({DATABASE_URL:url});
  for(const bad of [
    {DATABASE_URL:url.replace('greenfield_test','restore_test')},
    {W3_DATABASE_TEST_DATABASE_URL:url.replace('greenfield_test','production_test')},
    {DIRECT_URL:url.replace('post28_migrator','manaratak_restore_runner')},
    {POST28_TARGET_LABEL:'DB-R'}, {DATABASE_TARGET_CLASS:'RECOVERY_REFERENCE'},
  ])assert.throws(()=>rejectProtectedSuiteTargets(bad));
});
test('runtime suite preflight rejects NOT VALID constraints and invalid indexes',()=>{
  for(const extra of [{unvalidatedConstraints:1,invalidIndexes:0},{unvalidatedConstraints:0,invalidIndexes:1},{}])
    assert.throws(()=>inspectLiveTarget(expected,{...live,...extra},{requireValidatedCatalog:true}),/POST28_CATALOG_VALIDATION_REQUIRED/);
  assert.ok(inspectLiveTarget(expected,{...live,unvalidatedConstraints:0,invalidIndexes:0},{requireValidatedCatalog:true}));
});

test('Vitest refuses a protected restore target before importing test modules',async()=>{
  const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),cp=await import('node:child_process');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-protected-suite-'));
  try {
    const marker=path.join(root,'imported'),config=path.join(root,'config.mjs');
    const guard=new URL('./post28-database-safety.setup.mjs',import.meta.url).pathname;
    const vitest=new URL('../../node_modules/vitest/dist/index.js',import.meta.url).href;
    fs.writeFileSync(path.join(root,'inert.test.mjs'),`import {test} from ${JSON.stringify(vitest)}; import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)},'imported'); test('inert, no database',()=>{});`);
    fs.writeFileSync(config,`export default {test:{root:${JSON.stringify(root)},include:['inert.test.mjs'],globalSetup:[${JSON.stringify(guard)}],passWithNoTests:false}};`);
    const args=['node_modules/vitest/vitest.mjs','run','--config',config];
    const blocked=cp.spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,DATABASE_URL:url.replace('greenfield_test','restore_test')}});
    assert.notEqual(blocked.status,0);assert.match(blocked.stdout+blocked.stderr,/POST28_DESTRUCTIVE_SUITE_PROTECTED_TARGET_FORBIDDEN/);
    assert.equal(fs.existsSync(marker),false);
    const allowed=cp.spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,DATABASE_URL:url,DIRECT_URL:url,W3_DATABASE_TEST_DATABASE_URL:'',POST28_TARGET_LABEL:'DB-T',DATABASE_TARGET_CLASS:'DISPOSABLE'}});
    assert.equal(allowed.status,0,allowed.stderr);assert.equal(fs.existsSync(marker),true);
    for(const configFile of ['vitest.database.config.ts','config/testing/post28-database-vitest.config.ts'])
      assert.match(fs.readFileSync(configFile,'utf8'),/globalSetup:[^\n]*post28-database-safety\.setup\.mjs/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('identity probe must itself run in a read-only transaction',()=>{assert.throws(()=>inspectLiveTarget(expected,{...live,probeReadOnly:false}),/POST28_READ_ONLY_PROBE_REQUIRED/);});

test('lab provisioning rejects missing authorization and production mode before creating resources',async()=>{
  const {spawnSync}=await import('node:child_process');
  for(const values of [{NODE_ENV:'test',POST28_LOCAL_LAB_CREATE:''},{NODE_ENV:'production',POST28_LOCAL_LAB_CREATE:'YES'}]) {
    const result=spawnSync(process.execPath,['scripts/database/create-post28-lab.mjs'],{encoding:'utf8',env:{...process.env,...values}});
    assert.equal(result.status,1);assert.match(result.stderr,/POST28_LOCAL_LAB_CREATION_NOT_AUTHORIZED/);
    assert.doesNotMatch(result.stderr,/POST28_LAB_DIAGNOSTICS/);
  }
});

test('source unit gate explicitly excludes DB profiles and rejects empty discovery',async()=>{
  const fs=await import('node:fs');
  const source=fs.readFileSync('vitest.config.ts','utf8');
  assert.match(source,/passWithNoTests: false/);
  assert.ok(source.includes('**/*.database.spec.ts'));
  assert.ok(source.includes('packages/infrastructure/tests/database/WholePlatformPersistence.integration.spec.ts'));
});

test('actual Vitest discovery and JSON report identities agree with the case-count policy (inert fixture)',async()=>{
  const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),cp=await import('node:child_process');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-report-policy-'));
  try {
    const suite=databaseSuite('leases'),config=path.join(root,'config.mjs'),report=path.join(root,'results.json');
    const vitest=new URL('../../node_modules/vitest/dist/index.js',import.meta.url).href;
    for(const file of suite.files){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),`import {describe,it} from ${JSON.stringify(vitest)}; describe('lease fixture',()=>{describe('nested > literal',()=>{it('inert  case > no database',()=>{});});}); it('top level',()=>{}); it.each([1,2])('parameter %s',()=>{});`);}
    fs.writeFileSync(config,`export default {test:{root:${JSON.stringify(root)},include:${JSON.stringify(suite.files)},maxWorkers:1,passWithNoTests:false}};`);
    const collect=cp.spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','list','--config',config,'--json'],{encoding:'utf8'});
    assert.equal(collect.status,0,collect.stderr);const rows=JSON.parse(collect.stdout);
    const run=cp.spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--config',config,'--reporter=json','--outputFile',report],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const actual=JSON.parse(fs.readFileSync(report,'utf8'));
    assert.equal(verifySuiteResults('leases',rows,actual,root).passed,8);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('DB-U requires the limited migration role kind before any live probe',async()=>{
 const upgradeUrl=url.replaceAll('post28_migrator','post28_upgrade').replace('greenfield_test','upgrade_test');
 for(const roleKind of ['APPLICATION','SHADOW','INSPECTOR']){
  const c={...contract,targets:{...contract.targets,'DB-U':{...target,database:'manaratak_post28_upgrade_test',role:'post28_upgrade',roleKind}}};
  let reads=0;await assert.rejects(preflightTargets(c,[{label:'DB-U',url:upgradeUrl}],env,sha,async()=>{reads++;return live;}),/ROLE_KIND_MISMATCH/);assert.equal(reads,0);
 }
 const c={...contract,targets:{...contract.targets,'DB-U':{...target,database:'manaratak_post28_upgrade_test',role:'post28_upgrade',roleKind:'MIGRATION'}}};
 assert.equal(validateTargetDeclaration(c,'DB-U',upgradeUrl,env,sha).roleKind,'MIGRATION');
});

test('DB-V requires the limited migration role kind before any live probe',async()=>{
 const verifyUrl=url.replaceAll('post28_migrator','post28_verifier').replace('greenfield_test','upgrade_verify_test');
 for(const roleKind of ['APPLICATION','SHADOW','INSPECTOR']){
  const c={...contract,targets:{...contract.targets,'DB-V':{...target,database:'manaratak_post28_upgrade_verify_test',role:'post28_verifier',roleKind}}};
  let reads=0;await assert.rejects(preflightTargets(c,[{label:'DB-V',url:verifyUrl}],env,sha,async()=>{reads++;return live;}),/ROLE_KIND_MISMATCH/);assert.equal(reads,0);
 }
 const c={...contract,targets:{...contract.targets,'DB-V':{...target,database:'manaratak_post28_upgrade_verify_test',role:'post28_verifier',roleKind:'MIGRATION'}}};
 assert.equal(validateTargetDeclaration(c,'DB-V',verifyUrl,env,sha).roleKind,'MIGRATION');
});

test('memory-backed labs reject non-transaction profiles and unknown storage before creating resources',async()=>{
  const {spawnSync}=await import('node:child_process');
  for(const [profile,storage,error] of [['upgrade','tmpfs','POST28_MEMORY_STORAGE_TRANSACTION_ONLY'],['greenfield','tmpfs','POST28_MEMORY_STORAGE_TRANSACTION_ONLY'],['transactions','external','POST28_LAB_STORAGE_INVALID']]){
    const result=spawnSync(process.execPath,['scripts/database/create-post28-lab.mjs'],{encoding:'utf8',env:{...process.env,NODE_ENV:'test',POST28_LOCAL_LAB_CREATE:'YES',POST28_LOCAL_LAB_PROFILE:profile,POST28_LOCAL_LAB_STORAGE:storage}});
    assert.equal(result.status,1);assert.match(result.stderr,new RegExp(error));assert.doesNotMatch(result.stderr,/POST28_LAB_DIAGNOSTICS/);
  }
});

test('parent-host creation refuses non-memory scope and a fabricated parent before Docker or target mutation',async()=>{
 const {spawnSync}=await import('node:child_process');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'post28-parent-'));
 try{const file=path.join(temp,'state.json');fs.writeFileSync(file,JSON.stringify({kind:'FOREIGN_HOST'}));
  for(const [profile,storage,error] of [['upgrade','tmpfs','POST28_PARENT_TRANSACTION_MEMORY_ONLY'],['transactions','volume','POST28_PARENT_TRANSACTION_MEMORY_ONLY'],['transactions','tmpfs','POST28_PARENT_MEMORY_LAB_REQUIRED']]){
   const r=spawnSync(process.execPath,['scripts/database/create-post28-lab.mjs'],{encoding:'utf8',env:{...process.env,NODE_ENV:'test',POST28_LOCAL_LAB_CREATE:'YES',POST28_LOCAL_LAB_PROFILE:profile,POST28_LOCAL_LAB_STORAGE:storage,POST28_LOCAL_LAB_PARENT_STATE:file}});
   assert.equal(r.status,1);assert.match(r.stderr,new RegExp(error));assert.doesNotMatch(r.stderr,/POST28_LAB_DIAGNOSTICS/);
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
