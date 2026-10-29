import test from 'node:test';
import assert from 'node:assert/strict';
import {migrationInventory,verifyMigrationLedger} from '../../scripts/database/post28-migration-inventory.mjs';
import {verifyUpgradePreservation} from '../../scripts/database/post28-upgrade-preservation.mjs';
const inventory={migrations:[{name:'20260101000000_first',checksum:'a'.repeat(64)},{name:'20260102000000_next',checksum:'b'.repeat(64)}]};
const ledger=inventory.migrations.map((row,i)=>({migration_name:row.name,checksum:row.checksum,started_at:`2026-01-0${i+1}T00:00:00Z`,finished_at:`2026-01-0${i+1}T00:00:01Z`,rolled_back_at:null,applied_steps_count:1}));
test('migration source inventory reads and hashes every actual migration',()=>{
  const actual=migrationInventory();assert.ok(actual.migrations.length>0);assert.match(actual.chainSha256,/^[a-f0-9]{64}$/);
  assert.equal(new Set(actual.migrations.map(row=>row.name)).size,actual.migrations.length);
});
test('exact ordered ledger accepts the full chain, not merely a count',()=>assert.equal(verifyMigrationLedger(inventory,ledger).checksumsMatched,2));
for(const [name,mutate] of [
  ['same-count name substitution',rows=>{rows[0].migration_name='other';}],
  ['checksum substitution',rows=>{rows[0].checksum='c'.repeat(64);}],
  ['duplicate',rows=>{rows[1]=rows[0];}],
  ['reordered',rows=>rows.reverse()],
  ['missing finish',rows=>{rows[0].finished_at=null;}],
  ['rollback',rows=>{rows[0].rolled_back_at=rows[0].finished_at;}],
  ['resolved without replay',rows=>{rows[0].applied_steps_count=0;}],
  ['invalid time',rows=>{rows[0].started_at='invalid';}],
  ['overlapping execution',rows=>{rows[1].started_at=rows[0].started_at;}],
])test(`ledger refuses ${name}`,()=>{const rows=structuredClone(ledger);mutate(rows);assert.throws(()=>verifyMigrationLedger(inventory,rows));});
const target={label:'DB-U',host:'127.0.0.1',port:15432,database:'manaratak_post28_upgrade_test',role:'post28_upgrade',roleKind:'MIGRATION',serverIdentity:'123',databaseOid:'456',markerSha256:'1'.repeat(64)};
const plan={version:2,expectedTarget:target,beforeSchemaSha256:'c'.repeat(64),afterSchemaSha256:'c'.repeat(64),beforeMigrationChainSha256:'d'.repeat(64),afterMigrationChainSha256:'d'.repeat(64),runId:'11111111-1111-4111-8111-111111111111',beforeSourceSha:'a'.repeat(40),afterSourceSha:'b'.repeat(40),requiredModels:['Invoice','Binding'],requiredInvariants:['receipts','relationships']};
const before={version:1,kind:'POST28_UPGRADE_MEASUREMENT',runId:plan.runId,sourceSha:plan.beforeSourceSha,target:structuredClone(target),sessionReplicationRole:'origin',schemaSha256:'c'.repeat(64),migrationChainSha256:'d'.repeat(64),counts:{Invoice:'9007199254740993',Binding:'2'},invariants:{receipts:'e'.repeat(64),relationships:'f'.repeat(64)},financialTotals:[{accountId:'synthetic',currency:'USD',scale:2,balanceUnits:'9007199254740993'}]};
const after={...structuredClone(before),sourceSha:plan.afterSourceSha};
test('upgrade comparison handles exact integer money above JS safe range without declaring acceptance',()=>{
  const result=verifyUpgradePreservation(plan,before,after);assert.equal(result.runtimeAcceptance,false);assert.equal(result.models,2);
});
for(const [name,mutate] of [
  ['missing counter',row=>{delete row.counts.Binding;}],['extra counter',row=>{row.counts.Other='0';}],
  ['same-count model substitution',row=>{delete row.counts.Binding;row.counts.Other='2';}],
  ['lost row',row=>{row.counts.Invoice='9007199254740992';}],
  ['changed relation',row=>{row.invariants.relationships='a'.repeat(64);}],
  ['changed receipt',row=>{row.invariants.receipts='a'.repeat(64);}],
  ['changed money',row=>{row.financialTotals[0].balanceUnits='9007199254740992';}],
  ['changed scale',row=>{row.financialTotals[0].scale=3;}],['changed currency',row=>{row.financialTotals[0].currency='EUR';}],
  ['duplicate money group',row=>{row.financialTotals.push(row.financialTotals[0]);}],
  ['numeric count',row=>{row.counts.Binding=2;}],['missing money',row=>{row.financialTotals=[];}],
  ['restore target',row=>{row.target.label='DB-R';}],['changed database',row=>{row.target.databaseOid='789';}],
  ['wrong run',row=>{row.runId='wrong';}],['stale SHA',row=>{row.sourceSha=plan.beforeSourceSha;}],
  ['trigger bypass',row=>{row.sessionReplicationRole='replica';}],
])test(`upgrade refuses ${name}`,()=>{const row=structuredClone(after);mutate(row);assert.throws(()=>verifyUpgradePreservation(plan,before,row));});
test('an unspecified predecessor cannot be turned into an upgrade result',()=>assert.throws(()=>verifyUpgradePreservation({...plan,beforeSourceSha:null},before,after)));

test('greenfield runner requires fresh external evidence, exact ledger and idempotent deploy',async()=>{
  const {readFileSync}=await import('node:fs');
  const script=readFileSync('scripts/database/verify-greenfield-migration-parity.sh','utf8');
  assert.match(script,/POST28_EVIDENCE_OUTSIDE_CHECKOUT_REQUIRED/);
  assert.match(script,/verify-post28-migration-ledger\.mjs/);
  assert.match(script,/migration-ledger-after-redeploy/);
  assert.equal((script.match(/"\$PRISMA_BIN" migrate deploy/g)||[]).length,2);
});
test('preparation inventories real source and keeps all later execution unaccepted',async()=>{
  const {prepareAcceptance}=await import('../../scripts/database/prepare-post28-acceptance.mjs');
  const plan=prepareAcceptance();assert.equal(plan.runtimeAcceptance,false);assert.equal(plan.runtimeExecuted,false);
  assert.equal(plan.databaseHosting.existingGuardSupport,'LOCAL_ONLY');
  assert.equal(plan.relationCoverage.rows,77);assert.equal(plan.relationCoverage.cases,42);
  const {readFileSync}=await import('node:fs');
  const schemaModels=[...readFileSync('packages/infrastructure/prisma/schema.prisma','utf8').matchAll(/^model\s+(\w+)\s*\{/gm)].map(match=>match[1]).sort();
  assert.equal(schemaModels.length,308);
  assert.deepEqual(plan.R05.upgradePlan.requiredModels,schemaModels);
  for(const model of ['PublicAnalyticsConsent','PublicAnalyticsEvent','DashboardMeasurementEpoch','ServiceApplicationEvidence','DirectApplicationReport'])assert.ok(schemaModels.includes(model));
  assert.equal(plan.laterStages.length,9);
  assert.ok(plan.notValidCandidates.length>1);
});
test('preparation CLI never overwrites artifacts or writes into the checkout (including symlinks)',async()=>{
  const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),cp=await import('node:child_process');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-preparation-'));
  try {
    const run=file=>cp.spawnSync(process.execPath,['scripts/database/prepare-post28-acceptance.mjs',file],{encoding:'utf8'});
    const output=path.join(root,'plan.json');assert.equal(run(output).status,0);
    const original=fs.readFileSync(output,'utf8');assert.notEqual(run(output).status,0);assert.equal(fs.readFileSync(output,'utf8'),original);
    fs.symlinkSync(process.cwd(),path.join(root,'checkout'),process.platform==='win32'?'junction':'dir');
    const inside=path.join(root,'checkout','must-not-write.json');assert.notEqual(run(inside).status,0);assert.equal(fs.existsSync(inside),false);
    assert.notEqual(run(path.join(process.cwd(),'must-not-write.json')).status,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

const neonSha='a'.repeat(40);
const neonTarget={branchId:'br-synthetic',endpointId:'ep-synthetic',directHost:'ep-synthetic.us-east-2.aws.neon.tech',database:'manaratak_post28_greenfield_test',role:'post28_migrator',roleKind:'MIGRATION'};
const neonContract={version:1,kind:'POST28_NEON_TEST_DECLARATIONS',sourceSha:neonSha,projectId:'synthetic-project',postgresMajor:16,targets:{'DB-G':neonTarget}};
const neonUrl='postgresql://post28_migrator:synthetic-not-a-secret@ep-synthetic.us-east-2.aws.neon.tech/manaratak_post28_greenfield_test?schema=public&sslmode=require&sslaccept=strict';
test('Neon declaration validation never authorizes remote execution or claims live identity',async()=>{
  const {validateNeonDeclaration}=await import('../../scripts/database/post28-neon-policy.mjs');
  const result=validateNeonDeclaration(neonContract,'DB-G',neonUrl,neonSha);
  assert.equal(result.liveIdentityVerified,false);assert.equal(result.runtimeExecutionAuthorized,false);
  assert.equal(JSON.stringify(result).includes('synthetic-not-a-secret'),false);
});
for(const [name,change] of [
  ['pooled endpoint',url=>url.replace('ep-synthetic.','ep-synthetic-pooler.')],
  ['different host',url=>url.replace('ep-synthetic.','ep-other.')],
  ['TLS disabled',url=>url.replace('sslmode=require','sslmode=disable')],
  ['certificate acceptance',url=>url.replace('sslaccept=strict','sslaccept=accept_invalid_certs')],
  ['duplicate TLS option',url=>url+'&sslmode=disable'],
  ['host override option',url=>url+'&host=production.example'],
  ['restore database',url=>url.replace('greenfield_test','restore_test')],
  ['owner role',url=>url.replace('post28_migrator:','neondb_owner:')],
])test(`Neon declaration refuses ${name}`,async()=>{
  const {validateNeonDeclaration}=await import('../../scripts/database/post28-neon-policy.mjs');
  assert.throws(()=>validateNeonDeclaration(neonContract,'DB-G',change(neonUrl),neonSha));
});
test('Neon cannot hide the same branch/database behind two endpoints',async()=>{
  const {validateNeonDeclaration,requireDistinctNeonDeclarations}=await import('../../scripts/database/post28-neon-policy.mjs');
  const a=validateNeonDeclaration(neonContract,'DB-G',neonUrl,neonSha);
  assert.throws(()=>requireDistinctNeonDeclarations(a,{...a,endpointId:'ep-other',directHost:'ep-other.us-east-2.aws.neon.tech'}));
  assert.doesNotThrow(()=>requireDistinctNeonDeclarations(a,{...a,database:'manaratak_post28_shadow_test'}));
});

for(const field of ['beforeSchemaSha256','afterSchemaSha256','beforeMigrationChainSha256','afterMigrationChainSha256']){
 test('upgrade refuses missing expected '+field,()=>{const p=structuredClone(plan);delete p[field];assert.throws(()=>verifyUpgradePreservation(p,before,after),/EXPECTED_DIGESTS_REQUIRED/);});
 test('upgrade refuses substituted expected '+field,()=>{const p=structuredClone(plan);p[field]='f'.repeat(64);assert.throws(()=>verifyUpgradePreservation(p,before,after),/EXPECTED_DIGEST_MISMATCH/);});
}
test('matching tampered targets before and after cannot override the plan',()=>{
 const a=structuredClone(before),b=structuredClone(after);a.target.databaseOid=b.target.databaseOid='999';
 assert.throws(()=>verifyUpgradePreservation(plan,a,b),/EXPECTED_TARGET_MISMATCH/);
});
for(const [field,value] of [['host','remote.example'],['role','post28_bootstrap'],['roleKind','APPLICATION'],['label','DB-R'],['markerSha256',null],['database','manaratak_post28_restore_test']])
 test('upgrade expected target rejects '+field+':'+value,()=>{const p=structuredClone(plan);p.expectedTarget[field]=value;assert.throws(()=>verifyUpgradePreservation(p,before,after),/EXPECTED_TARGET_REQUIRED/);});
test('old plans without pinned identities and digests cannot execute comparison',()=>assert.throws(()=>verifyUpgradePreservation({...plan,version:1},before,after),/PLAN_INCOMPLETE/));
