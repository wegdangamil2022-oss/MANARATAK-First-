import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {randomUUID,randomBytes} from 'node:crypto';
import {execFileSync,spawnSync,spawn} from 'node:child_process';
const fail=code=>{throw new Error(code);};
/** New database only, on an explicitly identified local disposable memory server. Never relabel an old target. */
export async function createNewTransactionTarget(parentFile){
 const root=fs.realpathSync(process.cwd()),sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(process.env.POST28_LOCAL_LAB_PROFILE!=='transactions'||process.env.POST28_LOCAL_LAB_STORAGE!=='tmpfs')fail('POST28_PARENT_TRANSACTION_MEMORY_ONLY');
 if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())fail('POST28_CLEAN_SOURCE_REQUIRED');
 const file=fs.realpathSync(parentFile);if(file===root||file.startsWith(root+path.sep))fail('POST28_PARENT_OUTSIDE_CHECKOUT_REQUIRED');
 const parent=JSON.parse(fs.readFileSync(file,'utf8'));
 if(parent.kind!=='POST28_LOCAL_LAB'||parent.profile!=='transactions'||parent.storage!=='tmpfs'||parent.scope!=='LOCAL_DEVELOPMENT_REHEARSAL'||!/^[0-9a-f]{64}$/.test(parent.containerId??'')||!/^post28-net-[0-9a-f]{8}$/.test(parent.network??'')||!/^[-0-9a-f]{36}$/.test(parent.runId??''))fail('POST28_PARENT_MEMORY_LAB_REQUIRED');
 const dockerEnv={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
 const docker=(args,input)=>{const r=spawnSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnv,input,encoding:'utf8',maxBuffer:4*1024*1024});if(r.status!==0)fail('POST28_PARENT_DOCKER_FAILED');return r.stdout.trim();};
 const [live]=JSON.parse(docker(['inspect',parent.containerId]));const labels=live.Config.Labels??{};
 const image='postgres@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d';
 const [network]=JSON.parse(docker(['network','inspect',parent.network]));
 if(!live.State.Running||live.Config.Image!==image||labels['codex.post28.run']!==parent.runId||labels['codex.post28.scope']!=='DISPOSABLE'||!network.Internal||!live.NetworkSettings.Networks[parent.network]||!live.Mounts.some(m=>m.Type==='tmpfs'&&m.Destination==='/var/lib/postgresql/data'))fail('POST28_PARENT_LIVE_IDENTITY_MISMATCH');
 const previousEnv=Object.fromEntries(fs.readFileSync(path.join(path.dirname(file),'lab.env'),'utf8').trim().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
 const previousUrl=new URL(previousEnv.DATABASE_URL),previousSetup=new URL(previousEnv.POST28_TRANSACTION_SETUP_URL);
 if(previousUrl.username!=='post28_app'||previousSetup.username!=='post28_tx_migrator'||previousUrl.hostname!=='127.0.0.1'||previousSetup.hostname!=='127.0.0.1')fail('POST28_PARENT_LIMITED_ROLES_REQUIRED');
 const base=fs.realpathSync(process.env.POST28_LAB_ROOT??'/tmp/post28-labs');if(base===root||base.startsWith(root+path.sep))fail('POST28_LAB_SECRETS_OUTSIDE_CHECKOUT_REQUIRED');
 const directory=fs.mkdtempSync(path.join(base,'lab-'));fs.chmodSync(directory,0o700);
 const runId=randomUUID(),nonce=randomBytes(32).toString('hex'),database='manaratak_post28_tx_'+runId.replaceAll('-','')+'_test';
 let port=15432;for(;port<=15532;port++){const free=await new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});if(free)break;}if(port>15532)fail('POST28_LOCAL_PORT_UNAVAILABLE');
 const sql=(db,input)=>docker(['exec','-i',parent.containerId,'psql','-X','-v','ON_ERROR_STOP=1','-U','post28_bootstrap','-d',db,'-At'],input);
 // The random name is new. CREATE DATABASE fails on collision; no DROP/ALTER of any prior database or role.
 sql('postgres',`CREATE DATABASE ${database} OWNER post28_bootstrap TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8';\nREVOKE ALL ON DATABASE ${database} FROM PUBLIC;\nGRANT CONNECT ON DATABASE ${database} TO post28_app,post28_tx_migrator;\nCOMMENT ON DATABASE ${database} IS 'POST28_DISPOSABLE:${runId}:DB-T:${nonce}';`);
 sql(database,'CREATE EXTENSION pg_trgm; REVOKE ALL ON SCHEMA public FROM PUBLIC; ALTER SCHEMA public OWNER TO post28_tx_migrator; GRANT USAGE,CREATE ON SCHEMA public TO post28_tx_migrator; GRANT USAGE ON SCHEMA public TO post28_app; GRANT EXECUTE ON FUNCTION pg_control_system() TO post28_tx_migrator,post28_app;');
 const identity=JSON.parse(sql(database,"SELECT json_build_object('serverIdentity',(SELECT system_identifier::text FROM pg_control_system()),'databaseOid',(SELECT oid::text FROM pg_database WHERE datname=current_database()));"));
 const contract={version:1,kind:'POST28_LOCAL_DATABASE_TARGETS',sourceSha:sha,runId,postgresMajor:16,targets:{'DB-T':{host:'127.0.0.1',port,database,role:'post28_app',roleKind:'APPLICATION',nonce,...identity}},provisioning:{label:'DB-T',role:'post28_tx_migrator',roleKind:'MIGRATION'}};
 const contractFile=path.join(directory,'targets.json');fs.writeFileSync(contractFile,JSON.stringify(contract,null,2)+'\n',{mode:0o600});
 const configFile=path.join(directory,'forwarder.json');fs.writeFileSync(configFile,JSON.stringify({version:1,containerId:parent.containerId,runId:parent.runId,network:parent.network,port,expiresAt:Date.now()+3*3600000})+'\n',{mode:0o600});
 const log=fs.openSync(path.join(directory,'forwarder.log'),'a',0o600),child=spawn(process.execPath,['scripts/database/post28-local-forwarder.mjs',configFile],{cwd:root,detached:true,stdio:['ignore',log,log]});child.unref();fs.closeSync(log);
 previousUrl.port=String(port);previousSetup.port=String(port);previousUrl.pathname='/'+database;previousSetup.pathname='/'+database;
 const env={...previousEnv,POST28_TARGET_CONTRACT_FILE:contractFile,DATABASE_URL:previousUrl.href,DIRECT_URL:previousUrl.href,POST28_TRANSACTION_SETUP_URL:previousSetup.href,DATABASE_MUTATION_PURPOSE:'migrate',DATABASE_MUTATION_TARGET:`127.0.0.1:${port}/${database}`};
 const envFile=path.join(directory,'lab.env');fs.writeFileSync(envFile,Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});
 const state={kind:'POST28_LOCAL_LAB',profile:'transactions',sourceSha:sha,runId,scope:'LOCAL_DEVELOPMENT_REHEARSAL',storage:'tmpfs',image,containerId:parent.containerId,containerName:parent.containerName,network:parent.network,containerRunId:parent.runId,physicalServerReused:true,newDatabaseCreated:true,priorDatabaseOrContractModified:false,database,volume:null,directory,contractFile,envFile,port,forwarderPid:child.pid,createdAt:new Date().toISOString(),status:'TARGET_CREATED'};
 fs.writeFileSync(path.join(directory,'lab-state.json'),JSON.stringify(state,null,2)+'\n');
 await new Promise(resolve=>setTimeout(resolve,500));
 const preflight=spawnSync(process.execPath,['scripts/database/post28-preflight.mjs','--require-empty'],{env:{...process.env,...env},encoding:'utf8'});
 fs.writeFileSync(path.join(directory,'target-preflight.log'),preflight.stdout+preflight.stderr,{mode:0o600});if(preflight.status!==0)fail('POST28_INITIAL_TARGET_PREFLIGHT_FAILED');
 state.status='EMPTY_TARGETS_VERIFIED';fs.writeFileSync(path.join(directory,'lab-state.json'),JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({...state,authenticatedUrlsPrinted:false}));
}
