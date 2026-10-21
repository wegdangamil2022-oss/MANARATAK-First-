import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const [lab,stage]=process.argv.slice(2);
const scripts={initialize:['scripts/database/initialize-post28-upgrade.mjs','23897bdaa66d966eef15c85f44288589ecbcdf2b','--historical-known-source'],backup:['scripts/database/verify-post28-upgrade-backup.mjs','backup'],verify:['scripts/database/verify-post28-upgrade-backup.mjs','verify'],audit:['scripts/database/audit-post28-upgrade.mjs']};
if(!lab||!scripts[stage])throw new Error('LOCAL_STAGE_ARGUMENTS_REQUIRED');
const state=JSON.parse(fs.readFileSync(path.join(lab,'lab-state.json'),'utf8'));
if(state.kind!=='POST28_NATIVE_LOCAL_LAB'||state.scope!=='DISPOSABLE'||state.status!=='EMPTY_TARGETS_VERIFIED')throw new Error('LOCAL_STAGE_NATIVE_LAB_REQUIRED');
const env={...process.env,...Object.fromEntries(fs.readFileSync(path.join(lab,'lab.env'),'utf8').trim().split(/\r?\n/).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)];}))};
env.DATABASE_MUTATION_PURPOSE=stage==='initialize'?'migrate':'maintenance';
const cwd=path.resolve('work/r07-filtered');
env.PRISMA_QUERY_ENGINE_LIBRARY=path.join(cwd,'node_modules/@prisma/engines/query_engine-windows.dll.node');
env.PRISMA_SCHEMA_ENGINE_BINARY=path.join(cwd,'node_modules/@prisma/engines/schema-engine-windows.exe');
const result=spawnSync(process.execPath,scripts[stage],{cwd,env,windowsHide:true,timeout:600000,maxBuffer:32*1024*1024,encoding:'utf8'});
let output=(result.stdout??'')+(result.stderr??'');
for(const key of ['DATABASE_URL','DIRECT_URL','UPGRADE_DATABASE_URL','UPGRADE_VERIFY_DATABASE_URL']){const url=env[key];if(url){output=output.replaceAll(url,'[REDACTED_POSTGRES_URL]').replaceAll(decodeURIComponent(new URL(url).password),'[REDACTED]');}}
output=output.replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]');
fs.writeFileSync(path.join(lab,`stage-${stage}.log`),output,{flag:'wx'});
console.log(output);console.log(JSON.stringify({stage,exitCode:result.status,signal:result.signal,error:result.error?.code??null}));process.exitCode=result.status??1;
