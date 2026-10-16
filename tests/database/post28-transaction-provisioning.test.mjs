import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {preflightTransactionProvisioning,TRANSACTION_APPLICATION_TABLES} from '../../scripts/database/post28-transaction-provisioning.mjs';
import {validateTargetDeclaration} from '../../scripts/database/post28-isolation.mjs';
import {localLabProfile} from '../../scripts/database/post28-lab-profile.mjs';
import {requireScopedR06Authorization} from '../../scripts/database/post28-r06-authorization.mjs';
const sha='a'.repeat(40),env={NODE_ENV:'test',POST28_ISOLATED_EXECUTION:'YES',DATABASE_TARGET_CLASS:'DISPOSABLE'};
const target={host:'127.0.0.1',port:15432,database:'manaratak_post28_transactions_test',role:'post28_app',roleKind:'APPLICATION',serverIdentity:'12345',databaseOid:'16387',nonce:'b'.repeat(64)};
const contract={version:1,kind:'POST28_LOCAL_DATABASE_TARGETS',sourceSha:sha,runId:'11111111-1111-4111-8111-111111111111',postgresMajor:16,targets:{'DB-T':target},provisioning:{label:'DB-T',role:'post28_tx_migrator',roleKind:'MIGRATION'}};
const app='postgresql://post28_app:synthetic@127.0.0.1:15432/manaratak_post28_transactions_test?schema=public',setup=app.replace('post28_app:','post28_tx_migrator:');
const live=(expected,overrides={})=>({database:expected.database,role:expected.role,sessionRole:expected.role,serverIdentity:expected.serverIdentity,databaseOid:expected.databaseOid,marker:expected.marker,postgresMajor:16,timezone:'UTC',probeReadOnly:true,publicTables:0,schemaCreate:expected.roleKind==='MIGRATION',...Object.fromEntries(['superuser','createRole','createDatabase','replication','bypassRls','privilegedMembership','globalWrite','databaseOwner','databaseCreate'].map(k=>[k,false])),...overrides});
test('DB-T profile creates a new transaction database with application runtime and separate setup principal',()=>{
 const p=localLabProfile('transactions');assert.equal(p.primary,'DB-T');assert.equal(p.secondary,null);assert.equal(p.targets.length,1);assert.equal(p.targets[0].roleKind,'APPLICATION');assert.deepEqual(p.roles,['tx_migrator']);
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);assert.equal(new Set(TRANSACTION_APPLICATION_TABLES).size,TRANSACTION_APPLICATION_TABLES.length);
});
test('provisioning proves both roles with read-only identities and does not relax DB-T runtime kind',async()=>{
 let reads=0;const result=await preflightTransactionProvisioning(contract,app,setup,env,sha,async(_,expected)=>{reads++;return live(expected);},{requireEmpty:true});
 assert.equal(reads,2);assert.equal(result.runtime.role,'post28_app');assert.equal(result.setup.role,'post28_tx_migrator');
 assert.throws(()=>validateTargetDeclaration({...contract,targets:{'DB-T':{...target,roleKind:'MIGRATION'}}},'DB-T',app,env,sha),/ROLE_KIND_MISMATCH/);
});
for(const [name,c,u] of [
 ['wrong declared role',{...contract,provisioning:{...contract.provisioning,role:'post28_admin'}},setup],
 ['missing setup principal',{...contract,provisioning:null},setup],
 ['extra target',{...contract,targets:{...contract.targets,'DB-G':target}},setup],
 ['other database',contract,setup.replace('transactions_test','other_test')],
 ['remote',contract,setup.replace('127.0.0.1','remote.invalid')],
 ['wrong password role',contract,setup.replace('post28_tx_migrator:','post28_bootstrap:')],
 ['connection option',contract,setup+'&sslmode=disable'],
 ['wrong port',contract,setup.replace('15432','15433')]
])test('refuses '+name+' before SQL construction',async()=>{
 let reads=0;await assert.rejects(preflightTransactionProvisioning(c,app,u,env,sha,async()=>{reads++;}));assert.equal(reads,0);
});
for(const [name,override] of [['owner',{databaseOwner:true}],['elevated',{superuser:true}],['marker',{marker:'wrong'}],['not empty',{publicTables:1}],['no DDL',{schemaCreate:false}]])test('refuses unsafe live setup '+name,async()=>{
 await assert.rejects(preflightTransactionProvisioning(contract,app,setup,env,sha,async(_,e)=>live(e,e.roleKind==='MIGRATION'?override:{}),{requireEmpty:true}));
});
test('application DDL is rejected even when setup role has the expected grants',async()=>{
 await assert.rejects(preflightTransactionProvisioning(contract,app,setup,env,sha,async(_,e)=>live(e,e.roleKind==='APPLICATION'?{schemaCreate:true}:{})),/APPLICATION_DDL_FORBIDDEN/);
});
test('R06 disposition preserves the real R05 blocker and never grants full acceptance or deployment',()=>{
 const r=requireScopedR06Authorization();assert.equal(r.R05,'BLOCKED_USER_AUTHORIZED_SCOPED_R06');assert.equal(r.fullR06Acceptance,false);assert.equal(r.deploymentAuthorized,false);
});
test('missing or tampered stage authority cannot silently allow R06',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'post28-disposition-'));
 try{
  assert.throws(()=>requireScopedR06Authorization(tmp));fs.mkdirSync(path.join(tmp,'config/testing'),{recursive:true});
  const d=JSON.parse(fs.readFileSync('config/testing/post28-stage-disposition.json','utf8'));d.R05.acceptance=true;
  fs.writeFileSync(path.join(tmp,'config/testing/post28-stage-disposition.json'),JSON.stringify(d));assert.throws(()=>requireScopedR06Authorization(tmp),/AUTHORIZATION_REQUIRED/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});


test('Post28 asset suites require real DB-T preflight rather than an environment-only allow flag',async()=>{
 const {assertPost28RuntimeTarget}=await import('./post28-runtime-target.mjs');
 for(const env of [{},{POST28_ISOLATED_EXECUTION:'YES',POST28_TARGET_LABEL:'DB-G'},{POST28_ISOLATED_EXECUTION:'YES',POST28_TARGET_LABEL:'DB-T',POST28_DATABASE_SUITE:'assets',DATABASE_URL:'u',DIRECT_URL:'different'}])await assert.rejects(assertPost28RuntimeTarget(env),/POST28_ASSET_RUNTIME_TARGET_REQUIRED/);
 for(const file of ['PrismaAssetPostgres.database.spec.ts','PrismaAssetReferenceSerialization.database.spec.ts'])assert.match(fs.readFileSync('packages/infrastructure/tests/asset-platform/'+file,'utf8'),/await assertPost28RuntimeTarget\(\)/);
});

test('owner workflow profile keeps all nineteen real cases and grants only declared owner tables',async()=>{
 const {databaseSuite}=await import('../../config/testing/post28-database-suites.mjs');const p=databaseSuite('owner-workflows');
 assert.equal(p.minimumCases,19);assert.deepEqual(p.files,['tests/database/post28-owner-workflows.database.spec.mjs']);
 for(const table of ['AuditRecord','StudentPrivacyConsentDecision','StudentSavedItem','StudentSearchHistory','FinancialAccountRecord','FinancialTransactionRecord','FinancialLedgerEntryRecord','ReferenceCurrency'])assert.ok(TRANSACTION_APPLICATION_TABLES.includes(table));
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);
 assert.ok(fs.readFileSync('vitest.config.ts','utf8').includes('**/*.database.spec.mjs'));
});

test('document consent suite requires ten cases and only adds timeline DML to the declared application whitelist',async()=>{
 const {databaseSuite}=await import('../../config/testing/post28-database-suites.mjs');
 assert.equal(databaseSuite('document-consent').minimumCases,10);
 assert.ok(TRANSACTION_APPLICATION_TABLES.includes('StudentTimelineEntry'));
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);
});

test('university relation suite declares seven cases and explicit owner fixture tables',async()=>{
 const {databaseSuite}=await import('../../config/testing/post28-database-suites.mjs');
 assert.equal(databaseSuite('university-relations').minimumCases,7);
 for(const table of ['University','UniversityAcademicProgram','DegreeLevel','Major','MajorLevelProfile','MajorVersion'])assert.ok(TRANSACTION_APPLICATION_TABLES.includes(table));
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);
});

test('owner relations declares twenty cases and only explicit relation fixture grants',async()=>{
 const {databaseSuite}=await import('../../config/testing/post28-database-suites.mjs');
 assert.equal(databaseSuite('owner-relations').minimumCases,20);
 for(const table of ['UniversityCampus','UniversityOrganizationUnit','UniversityProgramCampus','InternationalTestVersion','ScholarshipApplicationCycle'])assert.ok(TRANSACTION_APPLICATION_TABLES.includes(table));
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);
});

test('HTTP finance suite declares fourteen cases and limited identity and execution tables',async()=>{
 const {databaseSuite}=await import('../../config/testing/post28-database-suites.mjs');
 assert.equal(databaseSuite('http-finance').minimumCases,14);
 for(const table of ['IdentityRecord','UserRecord','AccountRecord','RoleRecord','RoleAssignmentRecord','SessionRecord','ApiIdempotencyRecord','FinanceExchangeRateRecord'])assert.ok(TRANSACTION_APPLICATION_TABLES.includes(table));
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);
});

test('atomic relation commands declare eight cases and explicit scholarship link and sponsor grants',async()=>{
 const {databaseSuite}=await import('../../config/testing/post28-database-suites.mjs');
 assert.equal(databaseSuite('relation-commands').minimumCases,8);
 for(const table of ['ScholarshipUniversityLink','ScholarshipSponsorContext'])assert.ok(TRANSACTION_APPLICATION_TABLES.includes(table));
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);
});

test('scholarship Admin runtime declares eighteen cases without widening application grants',async()=>{
 const {databaseSuite}=await import('../../config/testing/post28-database-suites.mjs');
 assert.equal(databaseSuite('scholarship-admin').minimumCases,18);
 for(const table of ['ScholarshipUniversityLink','ScholarshipSponsorContext','RoleRecord','ApiIdempotencyRecord'])assert.ok(TRANSACTION_APPLICATION_TABLES.includes(table));
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);
});

test('scholarship public relation profile declares four real owner count cases without additional grants',async()=>{
 const {databaseSuite}=await import('../../config/testing/post28-database-suites.mjs');
 assert.equal(databaseSuite('scholarship-public-relations').minimumCases,4);
 assert.equal(TRANSACTION_APPLICATION_TABLES.length,55);
 assert.equal(TRANSACTION_APPLICATION_TABLES.includes('_prisma_migrations'),false);
});
