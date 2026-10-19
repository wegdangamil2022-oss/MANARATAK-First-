import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

for(const mode of ['OWNER','STUDENT'])test(`R08 ${mode} actual process drains one active call and starts no later claims`,{timeout:20000},async()=>{
  const child=spawn(process.execPath,['--import','tsx','tests/runtime/fixtures/post28-r08-drain-child.mjs',mode],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
  const messages=new Map(),waiters=new Map();let stderr='',exited=false;
  child.stdout.resume();child.stderr.on('data',b=>stderr+=b);
  child.on('message',message=>{messages.set(message.point,message);waiters.get(message.point)?.(message);});
  let exitResolve;const done=new Promise(resolve=>{exitResolve=resolve;});
  child.on('exit',(code,signal)=>{exited=true;exitResolve({code,signal});});child.on('error',error=>exitResolve({error}));
  async function wait(point){
    if(messages.has(point))return messages.get(point);
    let timer;try{return await Promise.race([new Promise(resolve=>waiters.set(point,resolve)),done.then(()=>{throw Error('CHILD_EXIT_BEFORE_'+point+':'+stderr.slice(-1000));}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CHILD_TIMEOUT:'+point)),10000);})]);}finally{clearTimeout(timer);waiters.delete(point);}
  }
  try{
    await wait('ACTIVE');
    const signal=process.platform==='linux'?'SIGTERM':'IPC_STOP';
    if(signal==='SIGTERM')child.kill('SIGTERM');else child.send('STOP');
    await wait('DRAIN_STARTED');await delay(80);
    assert.equal(messages.has('STOPPED'),false,'stop must wait for the existing call');assert.equal(exited,false);
    child.send('RELEASE');const result=await wait('STOPPED');
    assert.deepEqual(result.calls,['active']);assert.equal(result.snapshot.state,'STOPPED');assert.equal(result.fresh,false);assert.ok(result.durationMs<15000);
    assert.deepEqual(await done,{code:0,signal:null});
    console.log(JSON.stringify({mode,signal,platform:process.platform,durationMs:result.durationMs,newClaimsAfterStop:0,workerState:result.snapshot.state,readinessEvidenceFresh:result.fresh}));
  }finally{if(!exited){child.kill('SIGKILL');await done;}}
});

test('R08 actual shutdown body exits at its real fifteen-second deadline with a hung monitoring adapter',{timeout:25000},async()=>{
  const child=spawn(process.execPath,['tests/runtime/fixtures/post28-r08-deadline-child.mjs'],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
  child.stdout.resume();let stderr='',exited=false,readyResolve,flushResolve;
  child.stderr.on('data',b=>stderr+=b);
  const ready=new Promise(resolve=>{readyResolve=resolve;}),flushing=new Promise(resolve=>{flushResolve=resolve;});
  child.on('message',m=>{if(m.point==='READY')readyResolve();if(m.point==='FLUSHING')flushResolve(m);});
  const done=new Promise((resolve,reject)=>{child.once('exit',(code,signal)=>{exited=true;resolve({code,signal});});child.once('error',reject);});
  let timer;
  try{
    await Promise.race([ready,done.then(()=>{throw Error('CHILD_EXIT_BEFORE_READY:'+stderr);}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('R08_START_TIMEOUT')),5000);})]);clearTimeout(timer);
    const started=performance.now(),signal=process.platform==='linux'?'SIGTERM':'IPC_STOP';
    if(signal==='SIGTERM')child.kill('SIGTERM');else child.send('STOP');
    const flush=await flushing;assert.deepEqual(flush.steps,['readiness-down','polling-stop']);
    const exit=await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('R08_DEADLINE_NOT_ENFORCED')),19000);})]);
    const elapsed=performance.now()-started;
    assert.deepEqual(exit,{code:1,signal:null});assert.ok(elapsed>=14500&&elapsed<19000,`elapsed=${elapsed}`);
    console.log(JSON.stringify({case:'hung-monitoring',signal,platform:process.platform,configuredBudgetMs:15000,elapsedMs:elapsed,exitCode:exit.code,scope:'actual shutdown body with isolated HTTP and monitoring adapter, not full built API'}));
  }finally{clearTimeout(timer);if(!exited){child.kill('SIGKILL');await done;}}
});
