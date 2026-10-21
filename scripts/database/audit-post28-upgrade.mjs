#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {preflightTargets} from './post28-isolation.mjs';
import {readDatabaseIdentity} from './post28-preflight.mjs';
import {requirePost28LocalExecution} from './post28-neon-policy.mjs';
import {measureUpgradeState,requireZeroUpgradeAudits} from './post28-upgrade-measurement.mjs';
import {measureUpgradeCatalog} from './post28-upgrade-catalog.mjs';
import {digest} from './post28-migration-inventory.mjs';
const fail=code=>{throw new Error(code);};
try{
 if(process.argv.length!==2||Number(process.versions.node.split('.')[0])!==22)fail('POST28_UPGRADE_AUDIT_NODE22_REQUIRED');
 const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),root=fs.realpathSync(process.cwd());
 if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())fail('POST28_CLEAN_SOURCE_REQUIRED');
 const contractFile=fs.realpathSync(process.env.POST28_TARGET_CONTRACT_FILE),lab=path.dirname(contractFile);
 if(lab===root||lab.startsWith(root+path.sep))fail('POST28_LAB_SECRETS_OUTSIDE_CHECKOUT_REQUIRED');
 const read=name=>JSON.parse(fs.readFileSync(path.join(lab,name),'utf8'));
 const contract=read('targets.json');requirePost28LocalExecution(contract);
 if(!contract.targets?.['DB-U']||!contract.targets?.['DB-V']||contract.targets['DB-G']||contract.targets['DB-S'])fail('POST28_UPGRADE_PROFILE_REQUIRED');
 const declarations=[{label:'DB-U',url:process.env.UPGRADE_DATABASE_URL},{label:'DB-V',url:process.env.UPGRADE_VERIFY_DATABASE_URL}];
 const identities=await preflightTargets(contract,declarations,process.env,sourceSha,readDatabaseIdentity);
 const baseline=read('R05-baseline/result.json'),candidate=read('R05-baseline/plan.json'),manifest=read('R05-baseline/fixture-manifest.json'),backup=read('R05-backup/verification-result.json');
 if(baseline.sourceSha!==sourceSha||baseline.runId!==contract.runId||!baseline.representativeFixturesProvisioned||baseline.fixtureProof?.manifestSha256!==digest(JSON.stringify(manifest)))fail('POST28_HISTORICAL_FIXTURE_PROOF_REQUIRED');
 if(backup.sourceSha!==sourceSha||backup.runId!==contract.runId||!backup.representativeFixturesPresent||backup.fixtureManifestSha256!==baseline.fixtureProof.manifestSha256||!backup.allRowContentMatched||!backup.allCatalogDefinitionsMatched||!backup.sourceUnchanged)fail('POST28_REPRESENTATIVE_BACKUP_PROOF_REQUIRED');
 if(candidate.after.sourceSha!==sourceSha||candidate.before.sourceSha!==baseline.predecessorSha)fail('POST28_UPGRADE_CANDIDATE_BINDING_REQUIRED');
 const directory=path.join(lab,'R05-preupgrade');fs.mkdirSync(directory,{mode:0o700});
 const {PrismaClient}=createRequire(import.meta.url)(path.join(lab,'R05-baseline/previous-client/index.js'));
 const client=new PrismaClient({datasources:{db:{url:process.env.UPGRADE_DATABASE_URL}},log:[],errorFormat:'minimal'});
 let result;
 try{
  const catalogBefore=await measureUpgradeCatalog(client);
  assert.equal(catalogBefore.tableContentSha256,backup.tableContentSha256);assert.equal(catalogBefore.catalogSha256,backup.catalogSha256);
  const measured=await measureUpgradeState(client,candidate,contract);
  const fixtureReadProbes=await client.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
   for(const row of manifest.rows){
    const actual=await tx[row.model[0].toLowerCase()+row.model.slice(1)].findUnique({where:{id:row.data.id}});
    assert.ok(actual);for(const [key,value] of Object.entries(row.data))assert.deepEqual(JSON.parse(JSON.stringify(actual[key])),value,`fixture mismatch ${row.model}.${key}`);
   }
   return {rows:manifest.rows.length,allDeclaredFieldsMatched:true,readOnly:true};
  },{timeout:30000});
  const catalogAfter=await measureUpgradeCatalog(client);assert.deepEqual(catalogAfter,catalogBefore);
  let gate='PASS',reason=null;try{requireZeroUpgradeAudits(measured.audits);}catch(error){if(error.message!=='POST28_UPGRADE_OWNER_REMEDIATION_REQUIRED')throw error;gate='BLOCKED';reason=error.message;}
  result={kind:'POST28_R05_PREUPGRADE_AUDIT',sourceSha,predecessorSha:baseline.predecessorSha,runId:contract.runId,identities,gate,reason,audits:measured.audits,modelsMeasured:Object.keys(measured.measurement.counts).length,invariantsMeasured:Object.keys(measured.measurement.invariants).length,financialGroups:measured.measurement.financialTotals.length,financialTotals:measured.measurement.financialTotals,legacyUnattributedSearchRows:measured.legacyUnattributedSearchRows,fixtureReadProbes,sourceUnchanged:true,tableContentSha256:catalogAfter.tableContentSha256,catalogSha256:catalogAfter.catalogSha256,readOnly:true,mutationCommandsExecuted:0,upgradeExecuted:false,R05Accepted:false};
  for(const [name,value] of Object.entries({result,measurement:measured.measurement,comparisonPlan:measured.plan,tableHashes:measured.tableHashes}))fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n',{mode:0o600});
 }finally{await client.$disconnect();}
 console.log(JSON.stringify(result));if(result.gate==='BLOCKED')process.exitCode=2;
}catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_UPGRADE_AUDIT_FAILED');process.exitCode=1;}
