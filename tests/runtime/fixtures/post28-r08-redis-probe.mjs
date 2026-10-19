import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {RedisClientFactory} from '../../../packages/infrastructure/src/redis/RedisClientFactory.ts';
import {RedisRateLimiter} from '../../../packages/infrastructure/src/security/RedisRateLimiter.ts';
import {WorkerHealthObservation} from '../../../apps/api/src/infrastructure/runtime/WorkerHealthObservation.ts';
import {freshWorkerEvidence} from '../../../apps/api/src/presentation/monitoring/RuntimeHealthPolicy.ts';

let input='';for await(const chunk of process.stdin)input+=chunk;
const config=JSON.parse(input),url=new URL(config.url);
assert.equal(process.platform,'linux');assert.equal(url.protocol,'redis:');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.username,'post28');
assert.match(config.namespace,/^post28:r08:[a-f0-9-]+:$/);assert.match(config.sourceSha,/^[a-f0-9]{40}$/);
const client=RedisClientFactory.createClient({REDIS_URL:config.url,REDIS_NAMESPACE:config.namespace});
let timeout;
try{
  await Promise.race([client.isReady?Promise.resolve():once(client,'ready'),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('R08_REDIS_CONNECT_TIMEOUT')),8000);})]);clearTimeout(timeout);
  if(process.argv[2]==='counter'){
    const limiter=new RedisRateLimiter(client,client.buildKey('rate-limit',''));
    const results=[];for(let n=0;n<12;n++)results.push(await limiter.consume('synthetic-client',10,60000));
    console.log(JSON.stringify({allowed:results.filter(r=>r.allowed).length,total:results.length}));
  }else{
    assert.ok(process.send);
    async function counter(){
      const child=spawn(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'counter'],{stdio:['pipe','pipe','pipe']});let text='';child.stdout.on('data',b=>text+=b);child.stderr.resume();child.stdin.end(JSON.stringify(config));
      const [code]=await once(child,'exit');assert.equal(code,0);return JSON.parse(text);
    }
    const counters=await Promise.all([counter(),counter()]);assert.equal(counters.reduce((n,r)=>n+r.allowed,0),10);assert.equal(counters.reduce((n,r)=>n+r.total,0),24);
    await assert.rejects(client.sendCommand(['ACL','WHOAMI']),/NOPERM/);
    const scope={environment:'test',apiOrigin:'https://api.example.invalid',revision:config.sourceSha,namespace:config.namespace+'a:'};
    const a=new WorkerHealthObservation(client,scope),b=new WorkerHealthObservation(client,{...scope,namespace:config.namespace+'b:'}),otherRevision=new WorkerHealthObservation(client,{...scope,revision:'different'});
    await a.publish('background-jobs',{state:'IDLE',lastPollAt:new Date().toISOString()});assert.equal((await a.read('background-jobs')).state,'IDLE');assert.equal((await b.read('background-jobs')).state,'NOT_STARTED');assert.equal((await otherRevision.read('background-jobs')).state,'NOT_STARTED');
    const now=Date.now();await a.publish('stale',{state:'RUNNING',lastSuccessAt:new Date(now-16000).toISOString()});assert.equal(freshWorkerEvidence(await a.read('stale'),15000,now),false);
    const stopped=once(process,'message');process.send({point:'STOP_REDIS'});const [message]=await stopped;assert.equal(message,'REDIS_STOPPED');
    const outage=Promise.race([a.read('background-jobs'),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('R08_OUTAGE_DID_NOT_SETTLE')),8000);})]);
    await assert.rejects(outage,error=>error.message!=='R08_OUTAGE_DID_NOT_SETTLE');
    clearTimeout(timeout);
    process.send({point:'RESULT',result:{sourceSha:config.sourceSha,independentCounterProcesses:2,requests:24,allowed:10,namespaceIsolation:true,revisionIsolation:true,staleRejected:true,restrictedAcl:true,redisOutageRejected:true,fullApiSessionsVerified:false}});
  }
}catch(error){
  const message=String(error?.message??'R08_REDIS_PROBE_FAILED').replaceAll(url.password,'[REDACTED]').replace(/rediss?:\/\/[^\s'"<>]+/g,'[REDACTED_REDIS_URL]').slice(0,1600);
  process.send?.({point:'ERROR',message});console.error(message);process.exitCode=1;
}
finally{clearTimeout(timeout);if(client.isOpen)client.destroy();process.disconnect?.();}
