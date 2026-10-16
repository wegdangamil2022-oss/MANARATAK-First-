#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {preflightTargets} from './post28-isolation.mjs';
import {readDatabaseIdentity} from './post28-preflight.mjs';
import {requirePost28LocalExecution} from './post28-neon-policy.mjs';
import {requireDatabaseMutationGate} from '../lib/database-mutation-gate.mjs';
import {verificationRestoreList} from './post28-backup-contract.mjs';
import {measureUpgradeCatalog} from './post28-upgrade-catalog.mjs';
import {digest} from './post28-migration-inventory.mjs';
const fail=code=>{throw new Error(code);};
try{
 if(Number(process.versions.node.split('.')[0])!==22)fail('POST28_NODE22_REQUIRED');
 const mode=process.argv[2];if(process.argv.length!==3||!['backup','verify'].includes(mode))fail('POST28_BACKUP_MODE_INVALID');
 const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())fail('POST28_CLEAN_SOURCE_REQUIRED');
 const contractFile=fs.realpathSync(process.env.POST28_TARGET_CONTRACT_FILE),lab=path.dirname(contractFile),root=fs.realpathSync(process.cwd());
 if(lab===root||lab.startsWith(root+path.sep))fail('POST28_LAB_SECRETS_OUTSIDE_CHECKOUT_REQUIRED');
 const contract=JSON.parse(fs.readFileSync(contractFile,'utf8'));requirePost28LocalExecution(contract);
 requireDatabaseMutationGate('post28 isolated upgrade backup verification',{allowedPurposes:['maintenance']});
 if(mode==='verify')requireDatabaseMutationGate('post28 explicit DB-V restore authorization',{allowedPurposes:['maintenance']},{...process.env,DATABASE_URL:process.env.UPGRADE_VERIFY_DATABASE_URL,DIRECT_URL:process.env.UPGRADE_VERIFY_DATABASE_URL,DATABASE_MUTATION_TARGET:process.env.POST28_UPGRADE_VERIFY_MUTATION_TARGET});
 if(!contract.targets?.['DB-U']||!contract.targets?.['DB-V']||contract.targets['DB-G']||contract.targets['DB-S'])fail('POST28_UPGRADE_PROFILE_REQUIRED');
 const declarations=[{label:'DB-U',url:process.env.UPGRADE_DATABASE_URL},{label:'DB-V',url:process.env.UPGRADE_VERIFY_DATABASE_URL}];
 await preflightTargets(contract,declarations,process.env,sourceSha,readDatabaseIdentity);
 const baseline=JSON.parse(fs.readFileSync(path.join(lab,'R05-baseline/result.json'),'utf8'));
 if(baseline.sourceSha!==sourceSha||baseline.runId!==contract.runId||baseline.ledger.applied!==109)fail('POST28_BACKUP_PREDECESSOR_PROOF_REQUIRED');
 const state=JSON.parse(fs.readFileSync(path.join(lab,'lab-state.json'),'utf8'));
 const dockerEnv={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
 const docker=(args,options={})=>spawnSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnv,timeout:120000,maxBuffer:64*1024*1024,...options});
 const inspected=docker(['inspect',state.containerId,'--format','{{index .Config.Labels "codex.post28.run"}} {{index .Config.Labels "codex.post28.scope"}} {{.State.Running}}'],{encoding:'utf8'});
 if(inspected.status!==0||inspected.stdout.trim()!==`${contract.runId} DISPOSABLE true`||state.sourceSha!==sourceSha)fail('POST28_BACKUP_CONTAINER_IDENTITY_MISMATCH');
 const directory=path.join(lab,'R05-backup');
 if(mode==='backup')fs.mkdirSync(directory,{mode:0o700});else if(!fs.existsSync(directory))fail('POST28_BACKUP_ARTIFACT_REQUIRED');
 const archive=path.join(directory,'predecessor.dump');
 const pg=(label,args,input)=>{
  const url=new URL(declarations.find(x=>x.label===label).url);
  const envFile=path.join(directory,label+'.pg.env');
  fs.writeFileSync(envFile,`PGHOST=127.0.0.1\nPGPORT=5432\nPGDATABASE=${decodeURIComponent(url.pathname.slice(1))}\nPGUSER=${decodeURIComponent(url.username)}\nPGPASSWORD=${decodeURIComponent(url.password)}\nPGSSLMODE=disable\nPGOPTIONS=-c statement_timeout=30000 -c lock_timeout=3000${mode==='backup'?' -c default_transaction_read_only=on':''}\n`,{mode:0o600});
  const result=docker(['exec','-i','--env-file',envFile,state.containerId,...args],{input});
  if(result.status!==0)fail('POST28_BACKUP_NATIVE_TOOL_FAILED');
  return result.stdout;
 };
 const sourceClient=new PrismaClient({datasources:{db:{url:process.env.UPGRADE_DATABASE_URL}},log:[],errorFormat:'minimal'});
 try{
  const source=await measureUpgradeCatalog(sourceClient);
  if(mode==='backup'){
   const bytes=pg('DB-U',['pg_dump','--format=custom','--no-owner','--no-acl']);
   if(bytes.subarray(0,5).toString()!=='PGDMP')fail('POST28_BACKUP_FORMAT_INVALID');
   fs.writeFileSync(archive,bytes,{mode:0o600,flag:'wx'});
   const list=pg('DB-U',['pg_restore','--list'],bytes).toString();verificationRestoreList(list);
   const sql=pg('DB-U',['pg_restore','--no-owner','--no-acl','--file=-'],bytes); // Parse the entire archive; never execute its SQL.
   fs.writeFileSync(path.join(directory,'archive-list.txt'),list,{mode:0o600});
   fs.writeFileSync(path.join(directory,'source-snapshot.json'),JSON.stringify(source,null,2)+'\n',{mode:0o600});
   const result={sourceSha,runId:contract.runId,kind:'POST28_R05_CUSTOM_BACKUP',archiveSha256:digest(bytes),bytes:bytes.length,archiveReadable:true,sqlMaterializationSha256:digest(sql),sourceTableContentSha256:source.tableContentSha256,sourceCatalogSha256:source.catalogSha256,restoreExecuted:false};
   fs.writeFileSync(path.join(directory,'backup-result.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
  }else{
   const proof=JSON.parse(fs.readFileSync(path.join(directory,'backup-result.json'),'utf8')),bytes=fs.readFileSync(archive);
   if(proof.sourceSha!==sourceSha||proof.runId!==contract.runId||proof.archiveSha256!==digest(bytes))fail('POST28_BACKUP_DIGEST_MISMATCH');
   assert.equal(source.tableContentSha256,proof.sourceTableContentSha256);assert.equal(source.catalogSha256,proof.sourceCatalogSha256);
   await preflightTargets(contract,[declarations[1]],process.env,sourceSha,readDatabaseIdentity,{requireEmpty:true});
   const list=verificationRestoreList(pg('DB-U',['pg_restore','--list'],bytes).toString());
   const listFile=path.join(directory,'verification-list.txt');fs.writeFileSync(listFile,list.text,{mode:0o600});
   const remoteList='/tmp/post28-'+contract.runId+'.list';
   if(docker(['cp',listFile,state.containerId+':'+remoteList]).status!==0)fail('POST28_BACKUP_LIST_TRANSFER_FAILED');
   pg('DB-V',['pg_restore','--single-transaction','--exit-on-error','--no-owner','--no-acl','--use-list='+remoteList,'--dbname='+contract.targets['DB-V'].database],bytes);
   const verifyClient=new PrismaClient({datasources:{db:{url:process.env.UPGRADE_VERIFY_DATABASE_URL}},log:[],errorFormat:'minimal'});
   let restored;try{restored=await measureUpgradeCatalog(verifyClient);}finally{await verifyClient.$disconnect();}
   assert.deepEqual(restored.tables,source.tables);assert.deepEqual(restored.catalog,source.catalog);
   const sourceAfter=await measureUpgradeCatalog(sourceClient);assert.deepEqual(sourceAfter,source);
   const identities=await preflightTargets(contract,declarations,process.env,sourceSha,readDatabaseIdentity);
   fs.writeFileSync(path.join(directory,'restored-snapshot.json'),JSON.stringify(restored,null,2)+'\n',{mode:0o600});
   const result={sourceSha,runId:contract.runId,kind:'POST28_R05_STRUCTURAL_BACKUP_VERIFICATION',archiveSha256:proof.archiveSha256,identities,restoredTables:restored.tables.length,allRowContentMatched:true,allCatalogDefinitionsMatched:true,sourceUnchanged:true,tableContentSha256:restored.tableContentSha256,catalogSha256:restored.catalogSha256,excludedPreprovisionedObjects:list.excluded,R05Accepted:false,representativeFixturesPresent:false};
   fs.writeFileSync(path.join(directory,'verification-result.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
  }
 }finally{await sourceClient.$disconnect();}
}catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_BACKUP_VERIFICATION_FAILED');process.exitCode=1;}
