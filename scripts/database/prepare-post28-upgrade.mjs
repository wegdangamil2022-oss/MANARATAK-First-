#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {digest} from './post28-migration-inventory.mjs';
const fail=code=>{throw new Error(code);};
export function prepareUpgradeCandidate(root,predecessorRef){
 if(!/^[a-f0-9]{7,40}$/.test(predecessorRef??''))fail('POST28_UPGRADE_PREDECESSOR_COMMIT_REQUIRED');
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
 const beforeSha=git('rev-parse','--verify',`${predecessorRef}^{commit}`),afterSha=git('rev-parse','HEAD');
 if(beforeSha===afterSha||spawnSync('git',['merge-base','--is-ancestor',beforeSha,afterSha],{cwd:root}).status!==0)fail('POST28_UPGRADE_PREDECESSOR_ANCESTOR_REQUIRED');
 const read=(sha,file)=>execFileSync('git',['show',`${sha}:${file}`],{cwd:root,maxBuffer:16*1024*1024});
 const inventory=sha=>{
  const schema=read(sha,'packages/infrastructure/prisma/schema.prisma');
  const lockBytes=read(sha,'package-lock.json'),lock=JSON.parse(lockBytes);
  const prismaCliVersion=lock.packages?.['node_modules/prisma']?.version,prismaClientVersion=lock.packages?.['node_modules/@prisma/client']?.version;
  if(!prismaCliVersion||!prismaClientVersion)fail('POST28_UPGRADE_CLIENT_VERSION_REQUIRED');
  const files=git('ls-tree','-r','--name-only',sha,'--','packages/infrastructure/prisma/migrations').split('\n').filter(x=>/\/\d{14}_[a-z0-9_]+\/migration\.sql$/.test(x)).sort();
  const migrations=files.map(file=>({name:file.split('/').at(-2),checksum:digest(read(sha,file))}));
  if(!migrations.length)fail('POST28_UPGRADE_PREDECESSOR_MIGRATIONS_REQUIRED');
  const models=[...schema.toString('utf8').matchAll(/^model\s+(\w+)\s*\{/gm)].map(x=>x[1]).sort();
  return {sourceSha:sha,schemaSha256:digest(schema),migrationChainSha256:digest(JSON.stringify(migrations)),
   lockSha256:digest(lockBytes),migrations,models,
   clientGeneration:{prismaCliVersion,prismaClientVersion,generated:false,runtimeCompatibilityExecuted:false,sourceSchemaSha256:digest(schema)}};
 };
 const before=inventory(beforeSha),after=inventory(afterSha);
 if(before.migrations.length>=after.migrations.length||JSON.stringify(before.migrations)!==JSON.stringify(after.migrations.slice(0,before.migrations.length)))fail('POST28_UPGRADE_IMMUTABLE_MIGRATION_PREFIX_REQUIRED');
 if(JSON.stringify(before.models)!==JSON.stringify(after.models))fail('POST28_UPGRADE_MODEL_DELTA_REVIEW_REQUIRED');
 return {version:1,kind:'POST28_R05_UPGRADE_CANDIDATE',runtimeExecuted:false,runtimeAcceptance:false,
  cleanSource:git('status','--porcelain')==='',before,after,prefixChecksumsMatched:before.migrations.length,
  pendingMigrations:after.migrations.slice(before.migrations.length),
  comparisonPlan:{version:2,runId:null,beforeSourceSha:beforeSha,afterSourceSha:afterSha,
   beforeSchemaSha256:before.schemaSha256,afterSchemaSha256:after.schemaSha256,
   beforeMigrationChainSha256:before.migrationChainSha256,afterMigrationChainSha256:after.migrationChainSha256,
   expectedTarget:null,requiredModels:after.models,
   requiredInvariants:['immutableReceipts','financialLedger','studentConsent','assetBindings','universityPrograms','scholarshipTargets','courseProjections','publishedVersions']},
  gates:{R04Evidence:'docs/remediation/POST28_R04_LOCAL_CLOSURE_2026-10-16.md',
   separateUpgradeAndRestoreVerificationTargets:'REQUIRED_NOT_PROVISIONED',
   fixtureContract:'REQUIRES_OWNER_REVIEW_AND_REPRESENTABILITY_PROOF',backupAndStructuralRestore:'NOT_EXECUTED',
   priorClientRuntime:'NOT_EXECUTED',safeInterruptionAndRetry:'NOT_EXECUTED'},
  fixturePolicy:{newOrphanOn109Prefix:'Forbidden by already installed NOT VALID FK; NOT VALID still enforces new writes.',
   historicalOrphan:'Requires a known pre-FK source stage and documented historical migration path; never DISABLE TRIGGER or session_replication_role=replica.',
   consentAndFinancialLegacy:'Use declared owner fixtures, exact integer money, immutable receipts and source-bound IDs; no invented DEC or deletion.'}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4)fail('POST28_UPGRADE_PREPARATION_ARGUMENTS_REQUIRED');
  const root=fs.realpathSync(execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim());
  const result=prepareUpgradeCandidate(root,process.argv[2]);
  if(!result.cleanSource)fail('POST28_CLEAN_SOURCE_REQUIRED');
  const output=process.argv[3];if(!path.isAbsolute(output))fail('POST28_EVIDENCE_ABSOLUTE_PATH_REQUIRED');
  const parent=fs.realpathSync(path.dirname(output));
  if(parent===root||parent.startsWith(root+path.sep))fail('POST28_EVIDENCE_OUTSIDE_CHECKOUT_REQUIRED');
  fs.writeFileSync(path.join(parent,path.basename(output)),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({kind:result.kind,beforeSourceSha:result.before.sourceSha,afterSourceSha:result.after.sourceSha,prefixChecksumsMatched:result.prefixChecksumsMatched,pendingMigrations:result.pendingMigrations.length,runtimeExecuted:false}));
 }catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_UPGRADE_PREPARATION_FAILED');process.exitCode=1;}
}
