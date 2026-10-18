import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {PrismaClient} from './r07-filtered/node_modules/@prisma/client/default.js';
import {readDatabaseIdentity} from './r07-filtered/scripts/database/post28-preflight.mjs';
import {preflightTransactionProvisioning} from './r07-filtered/scripts/database/post28-transaction-provisioning.mjs';
import {requireDatabaseMutationGate} from './r07-filtered/scripts/lib/database-mutation-gate.mjs';
import {migrationInventory,verifyMigrationLedger} from './r07-filtered/scripts/database/post28-migration-inventory.mjs';
const root=path.resolve('work/r07-filtered'),lab=path.resolve(process.argv[2]);
process.chdir(root);
const state=JSON.parse(fs.readFileSync(path.join(lab,'lab-state.json')));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(state.sourceSha!==sha||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()||execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()!=='feat/post28-r07-artifact-preparation')throw Error('R07_CLEAN_SOURCE_REQUIRED');
const env={...process.env,...Object.fromEntries(fs.readFileSync(path.join(lab,'lab.env'),'utf8').trim().split(/\r?\n/).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}))};
env.PRISMA_QUERY_ENGINE_LIBRARY=path.join(root,'node_modules/@prisma/engines/query_engine-windows.dll.node');
env.PRISMA_SCHEMA_ENGINE_BINARY=path.join(root,'node_modules/@prisma/engines/schema-engine-windows.exe');
const contract=JSON.parse(fs.readFileSync(state.contractFile));
const identities=await preflightTransactionProvisioning(contract,env.DATABASE_URL,env.POST28_TRANSACTION_SETUP_URL,env,sha,readDatabaseIdentity,{requireEmpty:true});
const setupEnv={...env,DATABASE_URL:env.POST28_TRANSACTION_SETUP_URL,DIRECT_URL:env.POST28_TRANSACTION_SETUP_URL};
requireDatabaseMutationGate('R07 new isolated local diagnostic database',{allowedPurposes:['migrate']},setupEnv);
const out=path.join(lab,'R07-setup');fs.mkdirSync(out);
const redact=value=>[env.DATABASE_URL,env.POST28_TRANSACTION_SETUP_URL].reduce((s,url)=>s.replaceAll(url,'[REDACTED]').replaceAll(decodeURIComponent(new URL(url).password),'[REDACTED]'),String(value??''));
const checks=[];
for(const args of [['validate'],['migrate','deploy'],['migrate','status'],['migrate','diff','--from-schema-datasource','packages/infrastructure/prisma/schema.prisma','--to-schema-datamodel','packages/infrastructure/prisma/schema.prisma','--exit-code']]){
 if(args[1]!=='diff')args.push('--schema=packages/infrastructure/prisma/schema.prisma');
 const r=spawnSync(process.execPath,['node_modules/prisma/build/index.js',...args],{env:setupEnv,encoding:'utf8',timeout:120000});
 fs.writeFileSync(path.join(out,checks.length+'.log'),redact(r.stdout)+redact(r.stderr));checks.push({args,exitCode:r.status});
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(checks,null,2));if(r.status!==0)throw Error('R07_LOCAL_SCHEMA_SETUP_FAILED');
}
const setup=new PrismaClient({datasources:{db:{url:env.POST28_TRANSACTION_SETUP_URL}}});
try{
 const rows=await setup.$queryRawUnsafe('SELECT id,migration_name,checksum,started_at::text,finished_at::text,rolled_back_at::text,applied_steps_count FROM public._prisma_migrations ORDER BY started_at,id');
 const ledger=verifyMigrationLedger(migrationInventory(root),rows);
 const tables=await setup.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'");
 for(const {tablename} of tables){if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(tablename))throw Error('R07_TABLE_INVALID');await setup.$executeRawUnsafe(`GRANT SELECT ON TABLE public."${tablename}" TO post28_app`);}
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({sourceSha:sha,identities,ledger,readOnlyApplicationTables:tables.length,applicationDdlGranted:false,applicationLedgerGranted:false,R07Accepted:false},null,2));
 console.log(JSON.stringify({sourceSha:sha,tables:tables.length,ledger,R07Accepted:false}));
}finally{await setup.$disconnect();}
