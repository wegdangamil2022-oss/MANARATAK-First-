import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync,spawnSync} from 'node:child_process';
assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');assert.equal(process.versions.node.split('.')[0],'22');
assert(process.argv.length===3||(process.argv.length===4&&process.argv[3]==='--certificate-worker'),'ISOLATED_WORKER_ARGUMENT_INVALID');
const certificateWorker=process.argv[3]==='--certificate-worker';
const suite=certificateWorker?'certificate-runtime':'r08-provider-outcomes';
const prefix=certificateWorker?'Post28 actual synthetic certificate owner issuance and verification workflow > ':'R08 signed loopback provider with persisted financial outcomes > ';
const root=fs.realpathSync(process.cwd()),output=path.resolve(process.argv[2]);assert(!output.startsWith(root+path.sep)&&output!==root);fs.mkdirSync(output,{mode:0o700});
const proof=path.join(output,'proof');fs.mkdirSync(proof,{mode:0o700});
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');
const base={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'test',POST28_LOCAL_LAB_CREATE:'YES',POST28_LOCAL_LAB_PROFILE:'transactions',POST28_LOCAL_LAB_STORAGE:'tmpfs',POST28_LAB_ROOT:path.join(output,'private-labs')};
const secrets=[],report={sourceSha,kind:'POST28_R08_PROVIDER_FAULTS',syntheticOnly:true,productionAcceptance:false,formalR08Acceptance:false,selectedCases:[],cleanup:{existingDatabasesTouched:false}};let state,env={};
if(certificateWorker)report.kind='POST28_STAGING_CERTIFICATE_WORKER_REAL_DOMAIN';
const redact=value=>secrets.reduce((s,key)=>s.replaceAll(key,'[REDACTED]'),String(value)).replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]');
const run=(args,name,extra={})=>{const result=spawnSync(process.execPath,args,{env:{...base,...extra},encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024});fs.writeFileSync(path.join(proof,name+'.log'),redact((result.stdout??'')+(result.stderr??'')),{flag:'wx'});if(result.status!==0)throw Error('R08_PROVIDER_STAGE_FAILED:'+name);return result.stdout.trim();};
const dockerEnv={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
const docker=args=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnv,encoding:'utf8',timeout:45000}).trim();
try{
 try{state=JSON.parse(run(['scripts/database/create-post28-lab.mjs'],'create'));}
 finally{if(!state&&fs.existsSync(base.POST28_LAB_ROOT)){const dirs=fs.readdirSync(base.POST28_LAB_ROOT);if(dirs.length===1){const file=path.join(base.POST28_LAB_ROOT,dirs[0],'lab-state.json');if(fs.existsSync(file))state=JSON.parse(fs.readFileSync(file));}}}
 assert.equal(state.sourceSha,sourceSha);assert.equal(state.storage,'tmpfs');
 env=Object.fromEntries(fs.readFileSync(state.envFile,'utf8').trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
 for(const key of ['DATABASE_URL','POST28_TRANSACTION_SETUP_URL'])secrets.push(env[key],decodeURIComponent(new URL(env[key]).password));
 run(['scripts/database/initialize-post28-transactions.mjs',certificateWorker?'--certificate-fixtures':'--r08-provider-fixtures'],'initialize',env);
 fs.copyFileSync(path.join(state.directory,'R06-setup/result.json'),path.join(proof,'setup.json'));
 const cases=certificateWorker?['replays a real certificate worker delivery after a lost acknowledgement without duplicating issuance']:['recovers a lost refund response with one consumed approval and one balanced refund posting','keeps a real authorization timeout pending without redispatch or a paid invoice','recovers through the real financial background worker and replays its failed acknowledgement with one capture and posting'];
 for(const [index,name] of cases.entries()){
  run(['scripts/database/run-post28-suite.mjs',suite,'--case-exact',prefix+name],'case-'+index,{...env,DATABASE_MUTATION_PURPOSE:'maintenance'});
  report.selectedCases.push(name);
 }
 const suites=path.join(state.directory,'R06-suites');for(const [index,directory] of fs.readdirSync(suites).sort().entries())for(const name of ['discovery.json','selection.json','vitest.json','summary.json'])fs.copyFileSync(path.join(suites,directory,name),path.join(proof,'suite-'+index+'-'+name));
 report.passed=true;
}catch(error){report.passed=false;report.failure=redact(error.message);process.exitCode=1;}
finally{
 const clean=work=>{try{work();}catch(error){report.cleanup.errors??=[];report.cleanup.errors.push(redact(error.message));report.passed=false;process.exitCode=1;}};
 if(state){
  if(state.forwarderPid)clean(()=>{const cmd=fs.readFileSync('/proc/'+state.forwarderPid+'/cmdline','utf8');assert(cmd.includes('post28-local-forwarder.mjs')&&cmd.includes(path.join(state.directory,'forwarder.json')));process.kill(state.forwarderPid,'SIGTERM');});
  clean(()=>{const [owned]=JSON.parse(docker(['inspect',state.containerId]));assert.equal(owned.Config.Labels['codex.post28.run'],state.runId);assert.equal(owned.Config.Labels['codex.post28.scope'],'DISPOSABLE');docker(['stop','--time','10',state.containerId]);docker(['rm',state.containerId]);report.cleanup.databaseRemoved=true;});
  clean(()=>{const [owned]=JSON.parse(docker(['network','inspect',state.network]));assert.equal(owned.Labels['codex.post28.run'],state.runId);assert.equal(owned.Internal,true);docker(['network','rm',state.network]);report.cleanup.networkRemoved=true;});
 }
 fs.writeFileSync(path.join(proof,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
