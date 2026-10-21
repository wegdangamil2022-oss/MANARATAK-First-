import fs from 'node:fs';import path from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';
import {PrismaClient} from './r07-filtered/node_modules/@prisma/client/default.js';
import {preflightTransactionProvisioning} from './r07-filtered/scripts/database/post28-transaction-provisioning.mjs';
import {readDatabaseIdentity} from './r07-filtered/scripts/database/post28-preflight.mjs';
const root=path.resolve('work/r07-filtered'),lab=path.resolve(process.argv[2]);process.chdir(root);
const state=JSON.parse(fs.readFileSync(path.join(lab,'lab-state.json'))),sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(sha!==state.sourceSha||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('CLEAN_EXACT_SOURCE_REQUIRED');
const env={...process.env,...Object.fromEntries(fs.readFileSync(path.join(lab,'lab.env'),'utf8').trim().split(/\r?\n/).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)];}))};
env.DATABASE_MUTATION_PURPOSE='maintenance';
await preflightTransactionProvisioning(JSON.parse(fs.readFileSync(state.contractFile)),env.DATABASE_URL,env.POST28_TRANSACTION_SETUP_URL,env,sha,readDatabaseIdentity);
const setup=new PrismaClient({datasources:{db:{url:env.POST28_TRANSACTION_SETUP_URL}}});
try{await setup.$executeRawUnsafe('GRANT INSERT,UPDATE,DELETE ON TABLE public."Course",public."CourseSourceIdentity",public."CourseSourceUrlHistory",public."ExternalCourseProvider" TO post28_app');}finally{await setup.$disconnect();}
const names=['rejects conflicting equal-time results from independent writers','treats an exact equal-time replay as a read-only result','accepts a genuinely newer verdict after denying an equal-time conflict'];
for(let i=0;i<names.length;i++){
 const r=spawnSync(process.execPath,['scripts/database/run-post28-suite.mjs','course-link-concurrency','--case-exact','CD019 actual link result serialization and freshness > '+names[i]],{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 let output=(r.stdout??'')+(r.stderr??'');for(const key of ['DATABASE_URL','DIRECT_URL','POST28_TRANSACTION_SETUP_URL'])output=output.replaceAll(env[key],'[REDACTED_POSTGRES_URL]').replaceAll(decodeURIComponent(new URL(env[key]).password),'[REDACTED]');
 fs.writeFileSync(path.join(lab,`equal-time-${i}.log`),output,{flag:'wx'});console.log(output);if(r.status!==0)throw Error('TARGETED_LINK_CHECK_FAILED');
}
