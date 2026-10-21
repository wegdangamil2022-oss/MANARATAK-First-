import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import {spawn} from 'node:child_process';
import {verifyReleaseManifest} from './r07-filtered/scripts/release/lib/ReleaseContracts.mjs';
import {verifyRuntimeLayer} from './r07-filtered/scripts/release/lib/RuntimeLayerPolicy.mjs';
import {readDatabaseIdentity} from './r07-filtered/scripts/database/post28-preflight.mjs';
import {preflightTargets} from './r07-filtered/scripts/database/post28-isolation.mjs';
const run=path.resolve(process.argv[2]),lab=path.resolve(process.argv[3]),cwd=path.join(run,'api-boot-root');
const manifest=JSON.parse(fs.readFileSync(path.join(run,'artifacts/release-manifest.json'))),sha=manifest.sourceSha;
verifyReleaseManifest(path.join(run,'artifacts'),sha);verifyRuntimeLayer(cwd,manifest,JSON.parse(fs.readFileSync(path.join(cwd,'runtime-layer.json'))));
const state=JSON.parse(fs.readFileSync(path.join(lab,'lab-state.json')));if(state.sourceSha!==sha)throw Error('SOURCE_MISMATCH');
const env=Object.fromEntries(fs.readFileSync(path.join(lab,'lab.env'),'utf8').trim().split(/\r?\n/).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)];}));
const contract=JSON.parse(fs.readFileSync(state.contractFile));
const identity=await preflightTargets(contract,[{label:'DB-T',url:env.DATABASE_URL}],env,sha,readDatabaseIdentity);
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const runtimeEnv={SystemRoot:process.env.SystemRoot,PATH:path.dirname(process.execPath),NODE_ENV:'test',PORT:String(port),DATABASE_URL:env.DATABASE_URL,DIRECT_URL:env.DATABASE_URL,DATABASE_REQUIRED:'true',RELEASE_SOURCE_SHA:sha,HEALTH_DEPLOYMENT_REVISION:sha,CORS_ORIGIN:'https://127.0.0.1',BACKGROUND_WORKER_ENABLED:'false',STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED:'false',OWNER_DOMAIN_OUTBOX_WORKER_ENABLED:'false',CERTIFICATE_COMPLETION_WORKER_ENABLED:'false'};
const child=spawn(process.execPath,['apps/api/dist/server.cjs'],{cwd,env:runtimeEnv,windowsHide:true,stdio:['ignore','pipe','pipe']});
let log='',exit=null;child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);const ended=new Promise(resolve=>child.once('exit',(code,signal)=>{exit={code,signal};resolve();}));
const observations=[];let error=null;
try{
 for(let i=0;i<50&&!exit;i++){
  try{const r=await fetch(`http://127.0.0.1:${port}/api/v1/monitoring/health/readiness`,{signal:AbortSignal.timeout(1000),redirect:'manual'});const body=await r.json();observations.push({status:r.status,sha:r.headers.get('x-manaratak-source-sha'),body});if(r.status===200)break;}catch{}
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 const last=observations.at(-1);if(!last||last.status!==200||last.sha!==sha||last.body.protocolVersion!==2||last.body.status!=='UP'||last.body.code!=='AVAILABLE'||Math.abs(Date.now()-Date.parse(last.body.timestamp))>60000)error='LOCAL_READINESS_NOT_PROVED';
}finally{
 if(!exit){child.kill('SIGTERM');await ended;}
 const safeLog=log.replaceAll(env.DATABASE_URL,'[REDACTED]').replaceAll(decodeURIComponent(new URL(env.DATABASE_URL).password),'[REDACTED]').replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]');
 fs.writeFileSync(path.join(run,'local-api-boot.log'),safeLog);
 const result={sourceSha:sha,identity,observations,exit,readinessVerified:error===null,error,transport:'HTTP_LOOPBACK_ONLY',tlsVerified:false,stageAccepted:false,productionContact:false};
 fs.writeFileSync(path.join(run,'local-api-boot.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));console.log(safeLog.slice(-2400));
}
if(error)process.exitCode=1;
