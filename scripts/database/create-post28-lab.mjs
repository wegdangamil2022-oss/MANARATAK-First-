#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {localLabProfile} from './post28-lab-profile.mjs';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFileSync,spawnSync,spawn} from 'node:child_process';

// Creates new labelled resources only. It cannot select an existing service/volume.
const IMAGE='postgres@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d';
let directory;
const secrets=[];
const dockerEnvironment={...process.env};
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnvironment[key];
const redact=text=>secrets.reduce((value,secret)=>value.replaceAll(secret,'[REDACTED]'),String(text));
const run=(args,input)=>{
  const result=spawnSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnvironment,input,encoding:'utf8',maxBuffer:4*1024*1024});
  if(directory)fs.appendFileSync(path.join(directory,'bootstrap.log'),redact(result.stdout??'')+redact(result.stderr??''));
  if(result.status!==0)throw new Error('POST28_DOCKER_OPERATION_FAILED');
  return result.stdout.trim();
};
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
try {
  if(process.env.POST28_LOCAL_LAB_CREATE!=='YES' || !['test','development'].includes(process.env.NODE_ENV) ||
      Number(process.versions.node.split('.')[0])!==22)throw new Error('POST28_LOCAL_LAB_CREATION_NOT_AUTHORIZED');
  const profile=localLabProfile(process.env.POST28_LOCAL_LAB_PROFILE??'greenfield');
  const root=fs.realpathSync(execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim());
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
  const base=path.resolve(process.env.POST28_LAB_ROOT??'/workspace/scratch/post28/labs');fs.mkdirSync(base,{recursive:true,mode:0o700});
  const realBase=fs.realpathSync(base);
  if(realBase===root || realBase.startsWith(root+path.sep))throw new Error('POST28_LAB_SECRETS_OUTSIDE_CHECKOUT_REQUIRED');
  directory=fs.mkdtempSync(path.join(realBase,'lab-'));fs.chmodSync(directory,0o700);
  const id=randomUUID(),suffix=id.slice(0,8),name='post28-pg16-'+suffix,network='post28-net-'+suffix,volume='post28-data-'+suffix;
  const passwords=Object.fromEntries(['bootstrap',...profile.roles,'app'].map(key=>[key,randomBytes(24).toString('hex')]));
  secrets.push(...Object.values(passwords));
  const containerEnv=path.join(directory,'container.env');
  fs.writeFileSync(containerEnv,`POSTGRES_USER=post28_bootstrap\nPOSTGRES_PASSWORD=${passwords.bootstrap}\nPOSTGRES_DB=postgres\nPOSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 --auth-local=trust --encoding=UTF8 --locale=C.UTF-8\nTZ=UTC\n`,{mode:0o600});
  let port=15432;
  for(;;port++) {
    const available=await new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});
    if(available)break;if(port>15532)throw new Error('POST28_LOCAL_PORT_UNAVAILABLE');
  }
  run(['network','create','--internal','--label','codex.post28.run='+id,network]);
  run(['volume','create','--label','codex.post28.run='+id,volume]);
  const containerId=run(['run','-d','--name',name,'--label','codex.post28.run='+id,'--label','codex.post28.scope=DISPOSABLE',
    '--network',network,'--memory','2g','--cpus','2','--pids-limit','256',
    '--env-file',containerEnv,'--mount',`type=volume,source=${volume},target=/var/lib/postgresql/data`,IMAGE,
    '-c','timezone=UTC','-c','max_connections=40']);
  if(!/^[0-9a-f]{64}$/.test(containerId))throw new Error('POST28_CONTAINER_ID_INVALID');
  const state={kind:'POST28_LOCAL_LAB',profile:profile.name,runId:id,sourceSha:sha,scope:'LOCAL_DEVELOPMENT_REHEARSAL',image:IMAGE,
    containerId,containerName:name,network,volume,port,directory,status:'BOOTSTRAPPING',createdAt:new Date().toISOString()};
  fs.writeFileSync(path.join(directory,'lab-state.json'),JSON.stringify(state,null,2)+'\n');
  let ready=false;
  for(let i=0;i<120;i++) {
    const probe=spawnSync('docker',['--host=unix:///var/run/docker.sock','exec',containerId,'pg_isready','-h','127.0.0.1','-U','post28_bootstrap','-d','postgres'],{env:dockerEnvironment,encoding:'utf8'});
    if(probe.status===0){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!ready)throw new Error('POST28_POSTGRES_STARTUP_TIMEOUT');
  // Internal Docker networks do not reliably publish ports. Keep their egress
  // isolation and forward only loopback to this exact labelled container.
  const forwarderConfig=path.join(directory,'forwarder.json');
  fs.writeFileSync(forwarderConfig,JSON.stringify({version:1,containerId,runId:id,network,port,
    expiresAt:Date.now()+3*3600000})+'\n',{mode:0o600});
  const forwarderLog=fs.openSync(path.join(directory,'forwarder.log'),'a',0o600);
  const forwarder=spawn(process.execPath,['scripts/database/post28-local-forwarder.mjs',forwarderConfig],
    {cwd:root,detached:true,stdio:['ignore',forwarderLog,forwarderLog]});
  forwarder.unref();fs.closeSync(forwarderLog);state.forwarderPid=forwarder.pid;
  fs.writeFileSync(path.join(directory,'lab-state.json'),JSON.stringify(state,null,2)+'\n');
  let loopbackReady=false;
  for(let attempt=0;attempt<40;attempt++) {
    loopbackReady=await new Promise(resolve=>{const socket=net.createConnection({host:'127.0.0.1',port});
      socket.setTimeout(250);socket.once('connect',()=>{socket.destroy();resolve(true);});
      socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});});
    if(loopbackReady)break;await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!loopbackReady)throw new Error('POST28_LOCAL_FORWARDER_NOT_READY');
  const sql=(database,input)=>run(['exec','-i',containerId,'psql','-X','-v','ON_ERROR_STOP=1','-U','post28_bootstrap','-d',database,'-At'],input);
  sql('postgres',Object.entries(passwords).filter(([key])=>key!=='bootstrap').map(([key,password])=>
    `CREATE ROLE post28_${key} LOGIN PASSWORD ${quote(password)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`).join('\n'));
  const targets={};
  for(const {label,kind,role,roleKind} of profile.targets) {
    const database=`manaratak_post28_${kind}_test`,nonce=randomBytes(32).toString('hex');
    sql('postgres',`CREATE DATABASE ${database} OWNER post28_bootstrap TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8';\nREVOKE ALL ON DATABASE ${database} FROM PUBLIC;\nGRANT CONNECT ON DATABASE ${database} TO post28_${role};\nCOMMENT ON DATABASE ${database} IS ${quote(`POST28_DISPOSABLE:${id}:${label}:${nonce}`)};`);
    sql(database,`CREATE EXTENSION IF NOT EXISTS pg_trgm;\nREVOKE ALL ON SCHEMA public FROM PUBLIC;\nALTER SCHEMA public OWNER TO post28_${role};\nGRANT USAGE,CREATE ON SCHEMA public TO post28_${role};\nGRANT EXECUTE ON FUNCTION pg_control_system() TO post28_${role};`);
    // DB-G is migration proof, not an application fixture database. Blanket
    // default DML grants would also let the app rewrite _prisma_migrations.
    // Later DB-T/E grants need an explicit reviewed application-table list.
    if(label===profile.primary)sql(database,`GRANT CONNECT ON DATABASE ${database} TO post28_app;\nGRANT USAGE ON SCHEMA public TO post28_app;\nGRANT EXECUTE ON FUNCTION pg_control_system() TO post28_app;`);
    const identity=JSON.parse(sql(database,"SELECT json_build_object('serverIdentity',(SELECT system_identifier::text FROM pg_control_system()),'databaseOid',(SELECT oid::text FROM pg_database WHERE datname=current_database()));"));
    targets[label]={host:'127.0.0.1',port,database,role:'post28_'+role,roleKind,nonce,...identity};
  }
  const contract={version:1,kind:'POST28_LOCAL_DATABASE_TARGETS',sourceSha:sha,runId:id,postgresMajor:16,targets};
  const contractFile=path.join(directory,'targets.json');fs.writeFileSync(contractFile,JSON.stringify(contract,null,2)+'\n');
  const connection=(label,password)=>{const url=new URL(`postgresql://${targets[label].role}@127.0.0.1:${port}/${targets[label].database}`);url.password=password;url.searchParams.set('schema','public');return url.href;};
  const g=connection(profile.primary,passwords[profile.targets[0].role]),s=connection(profile.secondary,passwords[profile.targets[1].role]);secrets.push(g,s);
  const labEnv={NODE_ENV:'test',POST28_ISOLATED_EXECUTION:'YES',DATABASE_TARGET_CLASS:'DISPOSABLE',POST28_TARGET_CONTRACT_FILE:contractFile,
    ...(profile.name==='greenfield'?{GREENFIELD_DATABASE_URL:g,GREENFIELD_SHADOW_DATABASE_URL:s}:{UPGRADE_DATABASE_URL:g,UPGRADE_VERIFY_DATABASE_URL:s,POST28_TARGET_LABEL:'DB-U'}),DATABASE_URL:g,DIRECT_URL:g,
    GREENFIELD_DATABASE_IS_DISPOSABLE:'true',GREENFIELD_SHADOW_DATABASE_IS_DISPOSABLE:'true',
    GREENFIELD_VERIFY_OUTPUT_DIR:path.join(directory,'R04-greenfield'),POST28_APP_PASSWORD:passwords.app,
    DATABASE_PROVISIONING_GATE:'APPROVED',ALLOW_DATABASE_MUTATIONS:'YES',DATABASE_MUTATION_ENVIRONMENT:'test',DATABASE_MUTATION_PURPOSE:'migrate',
    DATABASE_MUTATION_TARGET:`127.0.0.1:${port}/${targets[profile.primary].database}`,ALLOW_PRODUCTION_DATABASE_MUTATIONS:'NO'};
  const envFile=path.join(directory,'lab.env');fs.writeFileSync(envFile,Object.entries(labEnv).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600});
  const result=spawnSync(process.execPath,['scripts/database/post28-preflight.mjs',profile.name==='upgrade'?'--upgrade-pair':'--pair','--require-empty'],{env:{...process.env,...labEnv},encoding:'utf8'});
  fs.writeFileSync(path.join(directory,'target-preflight.log'),redact(result.stdout)+redact(result.stderr));
  if(result.status!==0)throw new Error('POST28_INITIAL_TARGET_PREFLIGHT_FAILED');
  state.status='EMPTY_TARGETS_VERIFIED';state.contractFile=contractFile;state.envFile=envFile;
  fs.writeFileSync(path.join(directory,'lab-state.json'),JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({...state,authenticatedUrlsPrinted:false}));
} catch(error) {
  console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_LAB_CREATION_FAILED');
  if(directory)console.error('POST28_LAB_DIAGNOSTICS='+directory);
  process.exitCode=1;
}
