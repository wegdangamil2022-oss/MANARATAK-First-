#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {requirePost28LocalExecution} from './post28-neon-policy.mjs';
import {readDatabaseIdentity} from './post28-preflight.mjs';
import {preflightTargets} from './post28-isolation.mjs';
import {preflightTransactionProvisioning,TRANSACTION_APPLICATION_TABLES,CERTIFICATE_FIXTURE_APPLICATION_TABLES,COURSE_FIXTURE_APPLICATION_TABLES} from './post28-transaction-provisioning.mjs';
import {requireScopedR06Authorization} from './post28-r06-authorization.mjs';
import {requireDatabaseMutationGate} from '../lib/database-mutation-gate.mjs';
import {digest,migrationInventory,verifyMigrationLedger} from './post28-migration-inventory.mjs';
const fail=code=>{throw new Error(code);};
try{
 const certificateFixtures=process.argv.length===3&&process.argv[2]==='--certificate-fixtures';
 const courseFixtures=process.argv.length===3&&process.argv[2]==='--course-fixtures';
 if((process.argv.length!==2&&!certificateFixtures&&!courseFixtures)||Number(process.versions.node.split('.')[0])!==22)fail('POST28_NODE22_REQUIRED');
 const root=fs.realpathSync(process.cwd()),sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())fail('POST28_CLEAN_SOURCE_REQUIRED');
 const authorization=requireScopedR06Authorization(root);
 if(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()!=='fix/post28-ci-environment-inventory-20261016')fail('POST28_R06_BRANCH_REQUIRED');
 const contractFile=fs.realpathSync(process.env.POST28_TARGET_CONTRACT_FILE),lab=path.dirname(contractFile);
 if(lab===root||lab.startsWith(root+path.sep))fail('POST28_LAB_SECRETS_OUTSIDE_CHECKOUT_REQUIRED');
 const contract=JSON.parse(fs.readFileSync(contractFile,'utf8'));requirePost28LocalExecution(contract);
 if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.DATABASE_URL!==process.env.DIRECT_URL)fail('POST28_TRANSACTION_TEST_TARGET_REQUIRED');
 requireDatabaseMutationGate('post28 new DB-T provisioning',{allowedPurposes:['migrate']});
 const setupEnv={...process.env,DATABASE_URL:process.env.POST28_TRANSACTION_SETUP_URL,DIRECT_URL:process.env.POST28_TRANSACTION_SETUP_URL};
 requireDatabaseMutationGate('post28 declared limited DB-T schema setup',{allowedPurposes:['migrate']},setupEnv);
 const identities=await preflightTransactionProvisioning(contract,process.env.DATABASE_URL,process.env.POST28_TRANSACTION_SETUP_URL,process.env,sourceSha,readDatabaseIdentity,{requireEmpty:true});
 const directory=path.join(lab,'R06-setup');fs.mkdirSync(directory,{mode:0o700});
 const secrets=[process.env.DATABASE_URL,process.env.POST28_TRANSACTION_SETUP_URL].flatMap(s=>[s,decodeURIComponent(new URL(s).password)]);
 const redact=s=>secrets.reduce((v,k)=>v.replaceAll(k,'[REDACTED]'),String(s??'')).replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]');
 const schema='packages/infrastructure/prisma/schema.prisma',checks=[];
 for(const args of [['validate','--schema='+schema],['migrate','deploy','--schema='+schema],['migrate','status','--schema='+schema],['migrate','diff','--from-schema-datasource',schema,'--to-schema-datamodel',schema,'--exit-code']]){
  const startedAt=new Date().toISOString(),result=spawnSync(process.execPath,['node_modules/prisma/build/index.js',...args],{env:setupEnv,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
  const log=path.join(directory,checks.length+'-'+args[0]+'.log');fs.writeFileSync(log,redact(result.stdout)+redact(result.stderr),{mode:0o600});
  checks.push({args,startedAt,finishedAt:new Date().toISOString(),exitCode:result.status,logSha256:digest(fs.readFileSync(log))});fs.writeFileSync(path.join(directory,'checks.json'),JSON.stringify(checks,null,2)+'\n',{mode:0o600});
  if(result.status!==0)fail('POST28_TRANSACTION_SCHEMA_SETUP_FAILED');
 }
 const setup=new PrismaClient({datasources:{db:{url:process.env.POST28_TRANSACTION_SETUP_URL}},log:[],errorFormat:'minimal'});
 let ledger;
 try{
  const rows=await setup.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.$queryRawUnsafe('SELECT id,migration_name,checksum,started_at::text,finished_at::text,rolled_back_at::text,applied_steps_count FROM public._prisma_migrations ORDER BY started_at,id');});
  ledger=verifyMigrationLedger(migrationInventory(root),rows);
  const models=[...fs.readFileSync(schema,'utf8').matchAll(/^model\s+(\w+)\s*\{/gm)].map(m=>m[1]);
  if(models.length!==281||[...TRANSACTION_APPLICATION_TABLES,...CERTIFICATE_FIXTURE_APPLICATION_TABLES,...COURSE_FIXTURE_APPLICATION_TABLES].some(t=>!models.includes(t)))fail('POST28_TRANSACTION_GRANT_TABLE_SET_INVALID');
  const quoted=names=>names.map(n=>'public."'+n+'"').join(',');
  await setup.$executeRawUnsafe('GRANT SELECT ON '+quoted(models)+' TO post28_app');
  await setup.$executeRawUnsafe('GRANT INSERT,UPDATE,DELETE ON '+quoted(TRANSACTION_APPLICATION_TABLES)+' TO post28_app');
  // SELECT FOR UPDATE requires UPDATE privilege even for an absent reference.
  // Default labs receive no INSERT/DELETE on these owners; certificate fixtures require the explicit flag.
  await setup.$executeRawUnsafe('GRANT UPDATE ON public."CertificateTemplate",public."CertificateIssuer" TO post28_app');
  if(certificateFixtures)await setup.$executeRawUnsafe('GRANT INSERT,UPDATE,DELETE ON '+quoted(CERTIFICATE_FIXTURE_APPLICATION_TABLES)+' TO post28_app');
  if(courseFixtures)await setup.$executeRawUnsafe('GRANT INSERT,UPDATE,DELETE ON '+quoted(COURSE_FIXTURE_APPLICATION_TABLES)+' TO post28_app');
 }finally{await setup.$disconnect();}
 const finalIdentity=await preflightTargets(contract,[{label:'DB-T',url:process.env.DATABASE_URL}],process.env,sourceSha,readDatabaseIdentity,{requireValidatedCatalog:true});
 const result={kind:'POST28_R06_LOCAL_DB_T_SETUP',sourceSha,runId:contract.runId,authorization,identities,finalIdentity,ledger,certificateFixtureWriteTables:certificateFixtures?CERTIFICATE_FIXTURE_APPLICATION_TABLES:[],courseFixtureWriteTables:courseFixtures?COURSE_FIXTURE_APPLICATION_TABLES:[],applicationReadTables:281,applicationUpdateOnlyReferenceLockTables:certificateFixtures?[]:['CertificateTemplate','CertificateIssuer'],applicationWriteTables:TRANSACTION_APPLICATION_TABLES,ledgerGranted:false,DDLGranted:false,schemaDiffExitCode:0,R06Accepted:false};
 fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
}catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_TRANSACTION_SETUP_FAILED');process.exitCode=1;}
