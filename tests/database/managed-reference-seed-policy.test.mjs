import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManagedReferenceSeed, validateManagedSeedIdentity } from '../../scripts/database/managed-reference-seed-policy.mjs';
const now=Date.parse('2026-10-22T01:00:00Z');
const inputs=[{id:'reference-currencies',sourceHash:'c'.repeat(64)},{id:'reference-languages',sourceHash:'d'.repeat(64)},{id:'reference-countries',sourceHash:'e'.repeat(64)}];
const source={sourceSha:'a'.repeat(40),schemaSha256:'b'.repeat(64),manifestSha256:'f'.repeat(64),inputs,now};
const target={projectId:'new-independent-123',branchId:'br-new-test',host:'ep-new-test.eu-central-1.aws.neon.tech',database:'neondb',role:'manaratak_app',databaseOid:'16384'};
const approval={kind:'MANAGED_DEVELOPMENT_REFERENCE_SEED',environment:'development',independent:true,authorization:'DELEGATED_PROJECT_OWNER_REFERENCE_BOOTSTRAP',actorId:'delegated-owner-codex',runId:'a'.repeat(8)+'-1234-4321-8123-'+'b'.repeat(12),
  ...source,inputs:undefined,now:undefined,sourceHashes:Object.fromEntries(inputs.map(x=>[x.id,x.sourceHash])),expiresAt:new Date(now+3600000).toISOString(),target};
const uri='postgresql://manaratak_app:synthetic@'+target.host+'/neondb?sslmode=require&sslaccept=strict';
test('managed reference scope binds exact source and independent target without changing local R04',()=>{
  assert.deepEqual(validateManagedReferenceSeed(approval,source,uri,{NODE_ENV:'development'}).target,target);
  assert.deepEqual(validateManagedReferenceSeed(approval,source,uri+'&pool_timeout=30',{NODE_ENV:'development'}).target,target);
  for(const timeout of ['0','-1','300','forever','30&pool_timeout=30'])assert.throws(()=>validateManagedReferenceSeed(approval,source,uri+'&pool_timeout='+timeout,{NODE_ENV:'development'}),/MANAGED_SEED/);
  for(const change of [{environment:'production'},{sourceSha:'0'.repeat(40)},{schemaSha256:'0'.repeat(64)},
    {manifestSha256:'0'.repeat(64)},{independent:false},{authorization:'CI'},{sourceHashes:{}},
    {expiresAt:new Date(now+4*3600000).toISOString()},
    {target:{...target,projectId:'lively-feather-03681988'}}]){
    assert.throws(()=>validateManagedReferenceSeed({...approval,...change},source,uri,{NODE_ENV:'development'}),/MANAGED_SEED/);
  }
  for(const changed of [uri.replace(target.host,'ep-other.neon.tech'),uri.replace('manaratak_app:','neondb_owner:'),uri.replace('strict','accept_invalid_certs'),uri+'&sslaccept=accept_invalid_certs']){
    assert.throws(()=>validateManagedReferenceSeed(approval,source,changed,{NODE_ENV:'development'}),/MANAGED_SEED/);
  }
  assert.throws(()=>validateManagedReferenceSeed(approval,source,uri,{NODE_ENV:'production'}),/MANAGED_SEED/);
});
test('live preflight requires least privilege and the same database OID and ledger isolation',()=>{
  const live={database:target.database,role:target.role,sessionRole:target.role,databaseOid:target.databaseOid,postgresMajor:16,tls:true,
    schemaCreate:false,databaseCreate:false,databaseOwner:false,ownsRelations:false,superuser:false,createRole:false,createDatabase:false,
    replication:false,bypassRls:false,privilegedMembership:false,globalRead:false,globalWrite:false,otherSchemaCreate:false,
    probeReadOnly:true,canConnect:true,schemaUsage:true,unvalidatedConstraints:0,invalidIndexes:0};
  const transport={host:target.host,authorized:true,protocol:'TLSv1.3',certificateFingerprint256:'AA:BB',verifiedAt:new Date().toISOString()};
  validateManagedSeedIdentity(target,live,false,transport);
  validateManagedSeedIdentity(target,{...live,tls:false},false,transport);
  for(const key of ['superuser','createRole','databaseCreate','schemaCreate','privilegedMembership','globalRead','ownsRelations']){
    assert.throws(()=>validateManagedSeedIdentity(target,{...live,[key]:true},false,transport),/MANAGED_SEED/);
  }
  assert.throws(()=>validateManagedSeedIdentity(target,{...live,databaseOid:'2'},false,transport),/MANAGED_SEED/);
  assert.throws(()=>validateManagedSeedIdentity(target,live,true,transport),/MANAGED_SEED/);
  for(const changed of [undefined,{...transport,authorized:false},{...transport,host:'other'},
    {...transport,protocol:'TLSv1.1'},{...transport,verifiedAt:new Date(Date.now()-120000).toISOString()}]){
    assert.throws(()=>validateManagedSeedIdentity(target,live,false,changed),/MANAGED_SEED/);
  }
});
