#!/usr/bin/env node
import {prepareKnownSourcePacket,manifestWithKnownSource} from './post28-r05-known-source.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {prepareUpgradeCandidate} from './prepare-post28-upgrade.mjs';
import {preflightTargets} from './post28-isolation.mjs';
import {readDatabaseIdentity} from './post28-preflight.mjs';
import {requirePost28LocalExecution} from './post28-neon-policy.mjs';
import {requireDatabaseMutationGate} from '../lib/database-mutation-gate.mjs';
import {digest,verifyMigrationLedger} from './post28-migration-inventory.mjs';
import {historicalFixtureManifest,seedHistoricalFixtures,SELECTED_PREDECESSOR,HISTORICAL_STAGE} from './post28-historical-fixtures.mjs';
const fail=code=>{throw new Error(code);};
try{
 const knownSource=process.argv.length===4&&process.argv[3]==='--historical-known-source';
 const historical=process.argv.length===4&&(process.argv[3]==='--historical-fixtures'||knownSource);
 if(process.argv.length!==3&&!historical)fail('POST28_UPGRADE_PREDECESSOR_COMMIT_REQUIRED');
 const root=fs.realpathSync(process.cwd()),plan=prepareUpgradeCandidate(root,process.argv[2]);
 let stage,manifest,fixtureProof;
 if(historical){
  if(plan.before.sourceSha!==SELECTED_PREDECESSOR||plan.before.migrations.length!==109)fail('POST28_SELECTED_PREDECESSOR_REQUIRED');
  stage=prepareUpgradeCandidate(root,HISTORICAL_STAGE);
  if(stage.before.migrations.length!==108||JSON.stringify(stage.before.migrations)!==JSON.stringify(plan.before.migrations.slice(0,108)))fail('POST28_HISTORICAL_PREFIX_REQUIRED');
  manifest=historicalFixtureManifest(JSON.parse(fs.readFileSync('docs/architecture/persistence/persistence-ownership.manifest.json','utf8')).models);
 }
 if(!plan.cleanSource)fail('POST28_CLEAN_SOURCE_REQUIRED');
 if(Number(process.versions.node.split('.')[0])!==22)fail('POST28_NODE22_REQUIRED');
 const contractFile=fs.realpathSync(process.env.POST28_TARGET_CONTRACT_FILE),lab=path.dirname(contractFile);
 if(lab===root||lab.startsWith(root+path.sep))fail('POST28_LAB_SECRETS_OUTSIDE_CHECKOUT_REQUIRED');
 const contract=JSON.parse(fs.readFileSync(contractFile,'utf8'));requirePost28LocalExecution(contract);
 if(!contract.targets?.['DB-U']||!contract.targets?.['DB-V']||contract.targets['DB-G']||contract.targets['DB-S'])fail('POST28_UPGRADE_PROFILE_REQUIRED');
 const primary=new URL(process.env.UPGRADE_DATABASE_URL);
 if(process.env.DATABASE_URL!==primary.href||process.env.DIRECT_URL!==primary.href)fail('POST28_UPGRADE_CONNECTION_BINDING_REQUIRED');
 requireDatabaseMutationGate('post28 known predecessor baseline',{allowedPurposes:['migrate']});
 const declarations=[{label:'DB-U',url:process.env.UPGRADE_DATABASE_URL},{label:'DB-V',url:process.env.UPGRADE_VERIFY_DATABASE_URL}];
 await preflightTargets(contract,declarations,process.env,plan.after.sourceSha,readDatabaseIdentity,{requireEmpty:true});
 const closure=JSON.parse(fs.readFileSync('docs/reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/closure.json','utf8'));
 if(closure.status!=='PASS')fail('POST28_R04_ACCEPTANCE_REQUIRED');
 const r04=JSON.parse(fs.readFileSync('docs/reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/migration-inventory.json','utf8'));
 if(r04.schemaSha256!==plan.after.schemaSha256||r04.chainSha256!==plan.after.migrationChainSha256)fail('POST28_R04_ACCEPTANCE_STALE');
 const directory=path.join(lab,'R05-baseline');fs.mkdirSync(directory,{mode:0o700});
 if(knownSource){
  const tracker=manifest.rows.find(row=>row.model==='StudentApplicationTracker');
  const owners=JSON.parse(fs.readFileSync('docs/architecture/persistence/persistence-ownership.manifest.json','utf8')).models;
  const packet=prepareKnownSourcePacket(path.join(directory,'known-source'),{checkoutRoot:root,sourceSha:plan.after.sourceSha,runId:contract.runId,assetId:manifest.orphan.missingAssetId,bindingId:manifest.orphan.bindingId,ownerId:tracker.data.studentReferenceId,assetOwner:owners.AssetRecord,documentOwner:owners.StudentApplicationDocumentBinding});
  manifest=manifestWithKnownSource(manifest,packet);
 }
 const read=file=>execFileSync('git',['show',`${plan.before.sourceSha}:${file}`],{maxBuffer:16*1024*1024});
 const schemaBytes=read('packages/infrastructure/prisma/schema.prisma');
 fs.writeFileSync(path.join(directory,'source.schema.prisma'),schemaBytes,{mode:0o600});
 if(digest(schemaBytes)!==plan.before.schemaSha256)fail('POST28_UPGRADE_SCHEMA_HASH_MISMATCH');
 // Resolve the installed, version-checked dependency tree without network auto-install.
 fs.symlinkSync(path.join(root,'node_modules'),path.join(directory,'node_modules'),'dir');
 const clientDirectory=path.join(directory,'previous-client');
 const schema=schemaBytes.toString('utf8').replace(/generator client\s*\{/,match=>match+'\n  output = '+JSON.stringify(clientDirectory));
 if(schema===schemaBytes.toString('utf8'))fail('POST28_UPGRADE_CLIENT_GENERATOR_REQUIRED');
 const schemaFile=path.join(directory,'schema.prisma');fs.writeFileSync(schemaFile,schema,{mode:0o600});
 fs.mkdirSync(path.join(directory,'migrations'),{mode:0o700});
 fs.writeFileSync(path.join(directory,'migrations/migration_lock.toml'),read('packages/infrastructure/prisma/migrations/migration_lock.toml'),{mode:0o600});
 for(const migration of plan.before.migrations.slice(0,historical?108:plan.before.migrations.length)){
  const bytes=read(`packages/infrastructure/prisma/migrations/${migration.name}/migration.sql`);
  if(digest(bytes)!==migration.checksum)fail('POST28_UPGRADE_MIGRATION_HASH_MISMATCH');
  const folder=path.join(directory,'migrations',migration.name);fs.mkdirSync(folder,{mode:0o700});fs.writeFileSync(path.join(folder,'migration.sql'),bytes,{mode:0o600});
 }
 const currentCli=JSON.parse(fs.readFileSync('node_modules/prisma/package.json','utf8')).version;
 if(currentCli!==plan.before.clientGeneration.prismaCliVersion||currentCli!==plan.before.clientGeneration.prismaClientVersion)fail('POST28_UPGRADE_PINNED_PRISMA_VERSION_REQUIRED');
 const redact=text=>String(text).replaceAll(process.env.UPGRADE_DATABASE_URL,'[REDACTED]').replaceAll(decodeURIComponent(primary.password),'[REDACTED]').replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]');
 const checks=[];
 const commands=[['validate'],['generate'],['migrate','deploy'],...(historical?[['migrate','deploy']]:[]),['migrate','status']];
 for(const [index,args] of commands.entries()){
  if(historical&&index===3){
   const {PrismaClient:PreviousClient}=createRequire(import.meta.url)(path.join(clientDirectory,'index.js'));
   const previous=new PreviousClient({datasources:{db:{url:process.env.UPGRADE_DATABASE_URL}},log:[],errorFormat:'minimal'});
   try{
    const stageLedger=await previous.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.$queryRawUnsafe('SELECT id,migration_name,checksum,started_at::text,finished_at::text,rolled_back_at::text,applied_steps_count FROM public._prisma_migrations ORDER BY started_at,id');});
    const stageLedgerProof=verifyMigrationLedger({migrations:stage.before.migrations},stageLedger);
    fs.writeFileSync(path.join(directory,'historical-stage-ledger.json'),JSON.stringify({sourceSha:stage.before.sourceSha,verification:stageLedgerProof,rows:stageLedger},null,2)+'\n',{mode:0o600});
    fixtureProof=await seedHistoricalFixtures(previous,manifest);
   }catch(error){fs.writeFileSync(path.join(directory,'fixture-error.log'),redact(error.message),{mode:0o600});throw error;}finally{await previous.$disconnect();}
   fs.writeFileSync(path.join(directory,'fixture-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
   fs.writeFileSync(path.join(directory,'fixture-result.json'),JSON.stringify(fixtureProof,null,2)+'\n',{mode:0o600});
   const migration=plan.before.migrations.at(-1),bytes=read(`packages/infrastructure/prisma/migrations/${migration.name}/migration.sql`);
   if(digest(bytes)!==migration.checksum)fail('POST28_UPGRADE_MIGRATION_HASH_MISMATCH');
   const folder=path.join(directory,'migrations',migration.name);fs.mkdirSync(folder,{mode:0o700});fs.writeFileSync(path.join(folder,'migration.sql'),bytes,{mode:0o600});
  }
  const startedAt=new Date().toISOString();const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js',...args,'--schema='+schemaFile],{env:{...process.env,PRISMA_GENERATE_SKIP_AUTOINSTALL:'1'},encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
  const log=path.join(directory,index+'-'+args.join('-')+'.log');fs.writeFileSync(log,redact(result.stdout)+redact(result.stderr),{mode:0o600});
  checks.push({args,startedAt,finishedAt:new Date().toISOString(),exitCode:result.status,privateLog:log,logSha256:digest(fs.readFileSync(log))});
  fs.writeFileSync(path.join(directory,'checks.json'),JSON.stringify(checks,null,2)+'\n',{mode:0o600});
  if(result.status!==0)fail('POST28_UPGRADE_BASELINE_STEP_FAILED');
 }
 const {PrismaClient,Prisma}=createRequire(import.meta.url)(path.join(clientDirectory,'index.js'));
 if(Prisma.prismaVersion.client!==currentCli||Prisma.dmmf.datamodel.models.length!==plan.before.models.length)fail('POST28_UPGRADE_PREVIOUS_CLIENT_MISMATCH');
 const client=new PrismaClient({datasources:{db:{url:process.env.UPGRADE_DATABASE_URL}},log:[],errorFormat:'minimal'});
 let snapshot;
 try{snapshot=await client.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe("SET LOCAL statement_timeout='10s'");
  const ledger=await tx.$queryRawUnsafe(`SELECT COALESCE(json_agg(row_to_json(x) ORDER BY started_at,id),'[]'::json) AS rows FROM (SELECT id,migration_name,checksum,started_at,finished_at,rolled_back_at,applied_steps_count FROM public._prisma_migrations) x`);
  const tables=await tx.$queryRawUnsafe("SELECT tablename AS name FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const modelNames=new Set(Prisma.dmmf.datamodel.models.map(m=>m.dbName??m.name));
  if(tables.filter(t=>t.name!=='_prisma_migrations').length!==modelNames.size||tables.some(t=>t.name!=='_prisma_migrations'&&!modelNames.has(t.name)))fail('POST28_UPGRADE_MODEL_TABLE_MISMATCH');
  for(const table of tables){const name='"'+table.name.replaceAll('"','""')+'"';const [row]=await tx.$queryRawUnsafe(`SELECT count(*)::integer AS count FROM public.${name}`);table.rows=row.count;}
  const [catalog]=await tx.$queryRawUnsafe(`SELECT (SELECT count(*)::integer FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND NOT c.convalidated) AS unvalidated,
   (SELECT count(*)::integer FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid) AS invalid_indexes`);
  // Real generated previous delegates, not just an engine/raw SQL connection.
  const providerCount=await tx.externalCourseProvider.count();
  const countryCount=await tx.referenceCountry.count();
  return {ledger:ledger[0].rows,tables,catalog,previousClientDelegateProbes:{providerCount,countryCount}};
 },{timeout:60000});}finally{await client.$disconnect();}
 const ledger=verifyMigrationLedger({migrations:plan.before.migrations},snapshot.ledger);
 const identities=await preflightTargets(contract,declarations,process.env,plan.after.sourceSha,readDatabaseIdentity);
 const result={kind:'POST28_R05_PREDECESSOR_BASELINE',sourceSha:plan.after.sourceSha,predecessorSha:plan.before.sourceSha,runId:contract.runId,
  identities,ledger,publicTables:snapshot.tables.length,previousClientGenerated:true,previousClientReadProbes:snapshot.previousClientDelegateProbes,
  previousClientVersion:currentCli,sourceSchemaSha256:plan.before.schemaSha256,generationSchemaSha256:digest(schema),
  generatedSchemaSha256:digest(fs.readFileSync(path.join(clientDirectory,'schema.prisma'))),
  applicationRows:snapshot.tables.filter(t=>t.name!=='_prisma_migrations').reduce((n,t)=>n+t.rows,0),catalog:snapshot.catalog,
  representativeFixturesProvisioned:historical,fixtureProof:fixtureProof??null,historicalStageSourceSha:historical?HISTORICAL_STAGE:null,ownerRemediationApproved:false,upgradeExecuted:false,R05Accepted:false};
 for(const [name,value] of Object.entries({plan,snapshot,result}))fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(result));
}catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_UPGRADE_BASELINE_FAILED');process.exitCode=1;}
