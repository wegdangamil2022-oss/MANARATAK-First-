import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixtureId,historicalFixtureManifest,seedHistoricalFixtures,HISTORICAL_STAGE,SELECTED_PREDECESSOR} from '../../scripts/database/post28-historical-fixtures.mjs';
import {UPGRADE_AUDITS,INVARIANT_TABLES,requireZeroUpgradeAudits,bindUpgradeComparisonPlan} from '../../scripts/database/post28-upgrade-measurement.mjs';
import {digest} from '../../scripts/database/post28-migration-inventory.mjs';
const owners=JSON.parse(fs.readFileSync('docs/architecture/persistence/persistence-ownership.manifest.json','utf8')).models;
const manifest=historicalFixtureManifest(owners);
test('manifest deterministic and all rows explicitly belong to registered domain owners',()=>{
 assert.deepEqual(manifest,historicalFixtureManifest(owners));
 assert.equal(manifest.stageSourceSha,HISTORICAL_STAGE);assert.equal(manifest.selectedPredecessorSha,SELECTED_PREDECESSOR);
 assert.equal(new Set(manifest.rows.map(r=>r.model+':'+r.id)).size,manifest.rows.length);
 for(const r of manifest.rows){assert.equal(r.owner,owners[r.model]);assert.equal(r.data.id,r.id);assert.match(r.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);}
 assert.equal(manifest.claims.realPersons,false);assert.equal(manifest.claims.domainApproval,false);assert.equal(manifest.claims.DECApproval,false);
});
test('unknown model ownership fails closed',()=>assert.throws(()=>historicalFixtureManifest({}),/OWNER_REQUIRED/));
test('missing asset is intentional, unique, documented and cannot be silently repaired by the fixture writer',()=>{
 const missing=manifest.rows.filter(r=>r.model==='StudentApplicationDocumentBinding'&&r.data.assetId===manifest.orphan.missingAssetId);
 assert.equal(missing.length,1);assert.equal(missing[0].id,manifest.orphan.bindingId);
 assert.equal(manifest.rows.some(r=>r.model==='AssetRecord'&&r.id===manifest.orphan.missingAssetId),false);
 assert.equal(manifest.orphan.disposition,'BLOCK_UPGRADE_UNTIL_OWNER_REVIEW');
});
test('legacy search actor remains null; whitespace missing revoked future and valid consent remain distinct',()=>{
 const row=scenario=>manifest.rows.find(r=>r.scenario===scenario).data;
 assert.equal(row('search-null').actorReferenceId,null);
 assert.equal(row('whitespace-consent').attestation.consent,'   ');
 assert.equal(row('revoked-consent').attestation.consent,'REVOKED');
 assert.equal(row('missing-consent').reviewConsentGrantedAt,null);
 assert.ok(Date.parse(row('future-consent').reviewConsentGrantedAt)>Date.parse('2026-10-16'));
 assert.ok(Date.parse(row('valid-consent').reviewConsentGrantedAt)<Date.parse('2026-10-16'));
});
test('publication snapshot references precisely its test version and preserves historic payload',()=>{
 const s=manifest.rows.find(r=>r.model==='InternationalTestPublicationSnapshot');assert.equal(s.id,fixtureId('test-version'));
 assert.equal(s.data.payload.versionId,s.id);assert.equal(s.data.testId,fixtureId('test'));
});
test('financial fixtures preserve exact units above safe Number and balance debit/credit',()=>{
 const entries=manifest.rows.filter(r=>r.model==='FinancialLedgerEntryRecord');
 assert.equal(entries.length,2);let total=0n;
 for(const {data} of entries){assert.ok(BigInt(data.amountMinorUnits)>BigInt(Number.MAX_SAFE_INTEGER));total+=(data.direction==='DEBIT'?1n:-1n)*BigInt(data.amountMinorUnits);}
 assert.equal(total,0n);assert.equal(manifest.rows.find(r=>r.model==='FinanceInvoiceRecord').data.dueMinorUnits,'900719925474099302345');
});
test('all eight preservation invariant groups have actual declared fixture rows in every included table',()=>{
 assert.equal(Object.keys(INVARIANT_TABLES).length,8);
 for(const tables of Object.values(INVARIANT_TABLES))for(const model of tables)assert.ok(manifest.rows.some(r=>r.model===model),model);
});
for(const [name,value] of [['missing',[]],['duplicate',UPGRADE_AUDITS.map(()=>({constraint:UPGRADE_AUDITS[0][0],violations:'0'}))],['numeric',UPGRADE_AUDITS.map(([constraint])=>({constraint,violations:0}))],['negative',UPGRADE_AUDITS.map(([constraint])=>({constraint,violations:'-1'}))]])test('audit gate rejects '+name,()=>assert.throws(()=>requireZeroUpgradeAudits(value),/PROOF_INCOMPLETE/));
test('orphan audit prevents permission to continue despite eight clean audits',()=>{
 const clean=UPGRADE_AUDITS.map(([constraint])=>({constraint,violations:'0'}));assert.deepEqual(requireZeroUpgradeAudits(clean),{audits:9,violations:0});
 clean.at(-1).violations='1';assert.throws(()=>requireZeroUpgradeAudits(clean),/OWNER_REMEDIATION_REQUIRED/);
});
for(const state of [{replication:'replica',migrations:108,boundary:false},{replication:'origin',migrations:109,boundary:true},{replication:'origin',migrations:108,boundary:true}])test('historical seeding refuses incompatible database stage before any insert '+JSON.stringify(state),async()=>{
 let inserts=0;const tx={$executeRawUnsafe:async()=>{},$queryRawUnsafe:async()=>[state]};for(const row of manifest.rows)tx[row.model[0].toLowerCase()+row.model.slice(1)]={create:async()=>{inserts++;}};
 await assert.rejects(seedHistoricalFixtures({$transaction:async fn=>fn(tx)},manifest));assert.equal(inserts,0);
});
test('historical seed writes declared rows without bypass on precisely stage108 and requires exactly one orphan',async()=>{
 const written=[];const tx={$executeRawUnsafe:async()=>{},$queryRawUnsafe:async sql=>sql.includes('session_replication_role')?[{replication:'origin',migrations:108,boundary:false}]:[{count:1}]};
 for(const row of manifest.rows)tx[row.model[0].toLowerCase()+row.model.slice(1)]={create:async input=>written.push(input.data)};
 const result=await seedHistoricalFixtures({$transaction:async fn=>fn(tx)},manifest);assert.equal(written.length,manifest.rows.length);assert.equal(result.manifestSha256,digest(JSON.stringify(manifest)));assert.equal(result.triggersBypassed,false);
});
test('comparison plan pins target identity without emitting the bootstrap nonce',()=>{
 const target={host:'127.0.0.1',port:15432,database:'manaratak_post28_upgrade_test',role:'post28_upgrader',roleKind:'MIGRATION',serverIdentity:'123',databaseOid:'456',nonce:'a'.repeat(64)};
 const plan=bindUpgradeComparisonPlan({comparisonPlan:{version:2}},{runId:'run',targets:{'DB-U':target}});
 assert.equal(plan.expectedTarget.markerSha256,digest('POST28_DISPOSABLE:run:DB-U:'+target.nonce));assert.equal(plan.expectedTarget.nonce,undefined);
});

test('every synthetic fixture uses real scalar columns and supplies required values',async()=>{
 const {Prisma}=await import('@prisma/client');
 for(const row of manifest.rows){
  const model=Prisma.dmmf.datamodel.models.find(m=>m.name===row.model);assert.ok(model,row.model);
  const fields=new Map(model.fields.filter(f=>f.kind!=='object').map(f=>[f.name,f]));
  for(const key of Object.keys(row.data))assert.ok(fields.has(key),row.model+'.'+key);
  for(const field of fields.values())if(field.isRequired&&!field.hasDefaultValue&&!field.isUpdatedAt)assert.notEqual(row.data[field.name],undefined,row.model+'.'+field.name);
 }
});


test('translation receipt uses an owner actually permitted by immutable historical SQL',()=>{
 const sql=fs.readFileSync('packages/infrastructure/prisma/migrations/20261014010000_owner_translation_receipt/migration.sql','utf8');
 const row=manifest.rows.find(r=>r.model==='OwnerTranslationTransferReceipt').data;
 assert.match(sql,/IN \('UNIVERSITY','MAJOR'\)/);
 assert.equal(row.ownerDomain,'UNIVERSITY');assert.equal(row.targetId,fixtureId('university'));
 assert.ok(manifest.rows.some(r=>r.model==='UniversityTranslation'&&r.data.universityId===row.targetId));
});
