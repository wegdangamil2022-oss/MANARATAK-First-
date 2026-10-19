import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';

assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');assert.equal(process.versions.node.split('.')[0],'22');
const run=randomUUID(),namespace=`post28:r08:${run}:`,name='post28-r08-'+run,root=fs.realpathSync(process.cwd());
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'post28-r08-'));fs.chmodSync(directory,0o700);
// Redis ACL #<hash> requires SHA-256. This is a fresh 256-bit machine secret
// for one disposable container, never a stored human password.
const password=randomBytes(32).toString('hex'),passwordHash=createHash('sha256').update(password).digest('hex');
const configFile=path.join(directory,'redis.conf');
fs.writeFileSync(configFile,`bind 0.0.0.0\nport 6379\nprotected-mode yes\nsave ""\nappendonly no\nuser default off\nuser post28 on #${passwordHash} ~${namespace}* +ping +get +set +eval +incr +pexpire +pttl +quit +hello +client|setinfo +client|setname\n`,{mode:0o444,flag:'wx'});
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
let containerId,receipt={sourceSha,runId:run,productionAcceptance:false,fullR08Acceptance:false,localEphemeralOnly:true};
function owned(){const [info]=JSON.parse(docker(['inspect',containerId]));assert.equal(info.Id,containerId);assert.equal(info.Config.Labels['com.manaratak.r08.run'],run);return info;}
try{
  docker(['pull','redis:7-alpine']);const [image]=JSON.parse(docker(['image','inspect','redis:7-alpine']));assert.equal(image.Os,'linux');assert.equal(image.Architecture,'amd64');const digest=image.RepoDigests.find(d=>/^redis@sha256:[a-f0-9]{64}$/.test(d));assert.ok(digest);
  containerId=docker(['run','-d','--name',name,'--label','com.manaratak.r08.run='+run,'--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user','redis','--tmpfs','/data:rw,noexec,nosuid,size=16m','-p','127.0.0.1::6379','-v',configFile+':/usr/local/etc/redis/redis.conf:ro',digest,'redis-server','/usr/local/etc/redis/redis.conf']);
  const info=owned(),bindings=info.NetworkSettings.Ports['6379/tcp'];assert.equal(bindings.length,1);assert.equal(bindings[0].HostIp,'127.0.0.1');
  const port=Number(bindings[0].HostPort);assert.ok(port>0&&port<65536);receipt.redisImageDigest=digest;
  const child=spawn(process.execPath,['--import','tsx','tests/runtime/fixtures/post28-r08-redis-probe.mjs'],{stdio:['pipe','pipe','pipe','ipc']});child.stdout.resume();child.stderr.resume();
  let result,timer;const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code));});
  child.on('message',message=>{if(message.point==='STOP_REDIS'){try{owned();docker(['stop','-t','2',containerId]);child.send('REDIS_STOPPED');}catch{child.kill('SIGKILL');}}if(message.point==='RESULT')result=message.result;if(message.point==='ERROR')receipt.probeError=message.message;});
  child.stdin.end(JSON.stringify({url:`redis://post28:${password}@127.0.0.1:${port}`,namespace,sourceSha}));
  try{const code=await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('R08_REDIS_PROBE_TIMEOUT')),45000);})]);assert.equal(code,0);assert.ok(result);receipt={...receipt,result,passed:true};}finally{clearTimeout(timer);if(child.exitCode===null)child.kill('SIGKILL');await done;}
}catch(error){receipt.passed=false;process.exitCode=1;receipt.failure=String(error?.message??'R08_REDIS_LAB_FAILED').replaceAll(password,'[REDACTED]').replaceAll(passwordHash,'[REDACTED]').replace(/rediss?:\/\/[^\s'"<>]+/g,'[REDACTED_REDIS_URL]').slice(0,1600);console.error(receipt.failure);}
finally{
  if(containerId){try{owned();docker(['rm','-f',containerId]);receipt.ownedContainerRemoved=true;}catch{receipt.ownedContainerRemoved=false;process.exitCode=1;}}
  assert.ok(fs.realpathSync(directory).startsWith(fs.realpathSync(os.tmpdir())+path.sep));assert.ok(!directory.startsWith(root+path.sep));
  fs.rmSync(directory,{recursive:true,force:true});
  const output=path.join(os.tmpdir(),'post28-r08-redis-result.json');fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({receipt:output,passed:receipt.passed,ownedContainerRemoved:receipt.ownedContainerRemoved}));
}
