import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,createHash,createHmac} from 'node:crypto';
import {RedisClientFactory} from '../../../packages/infrastructure/src/redis/RedisClientFactory.ts';
import {RedisRateLimiter} from '../../../packages/infrastructure/src/security/RedisRateLimiter.ts';
import {WorkerHealthObservation} from '../../../apps/api/src/infrastructure/runtime/WorkerHealthObservation.ts';
import {freshWorkerEvidence} from '../../../apps/api/src/presentation/monitoring/RuntimeHealthPolicy.ts';
import {FinanceProviderWebhookVerifier,RedisFinanceWebhookReplayStore} from '../../../packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts';

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
  }else if(process.argv[2]==='webhook'){
    const verifier=new FinanceProviderWebhookVerifier(config.webhookSecret,new RedisFinanceWebhookReplayStore(client));
    try{await verifier.verify({...config.webhook,rawBody:Buffer.from(config.webhook.rawBody)});console.log(JSON.stringify({accepted:1,replayed:0}));}
    catch(error){assert.match(error.message,/^FINANCE_WEBHOOK_REPLAY_DETECTED$/);console.log(JSON.stringify({accepted:0,replayed:1}));}
  }else{
    assert.ok(process.send);
    async function probe(mode,input=config){
      const child=spawn(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),mode],{stdio:['pipe','pipe','pipe']});let text='';child.stdout.on('data',b=>text+=b);child.stderr.resume();child.stdin.end(JSON.stringify(input));
      const [code]=await once(child,'exit');assert.equal(code,0);return JSON.parse(text);
    }
    const counters=await Promise.all([probe('counter'),probe('counter')]);assert.equal(counters.reduce((n,r)=>n+r.allowed,0),10);assert.equal(counters.reduce((n,r)=>n+r.total,0),24);
    const webhookSecret=randomBytes(32).toString('hex'),rawBody='{"event":"synthetic-capture-signal"}';
    const sign=(timestamp=new Date().toISOString(),nonce=randomUUID())=>({providerKey:'POST28_SYNTHETIC',rawBody,timestamp,nonce,signature:createHmac('sha256',webhookSecret).update([timestamp,nonce,createHash('sha256').update(rawBody).digest('hex')].join('\n')).digest('hex')});
    const webhook=sign(),input={...config,webhookSecret,webhook};
    const webhookResults=await Promise.all([probe('webhook',input),probe('webhook',input)]);
    assert.equal(webhookResults.reduce((n,r)=>n+r.accepted,0),1);assert.equal(webhookResults.reduce((n,r)=>n+r.replayed,0),1);
    const verifier=new FinanceProviderWebhookVerifier(webhookSecret,new RedisFinanceWebhookReplayStore(client)),fresh=sign();
    await assert.rejects(verifier.verify({...fresh,rawBody:Buffer.from(rawBody+' ')}),/FINANCE_WEBHOOK_SIGNATURE_INVALID/);
    await verifier.verify({...fresh,rawBody:Buffer.from(rawBody)}); // Invalid signatures must not consume the nonce.
    await assert.rejects(verifier.verify({...sign(new Date(Date.now()-600000).toISOString()),rawBody:Buffer.from(rawBody)}),/FINANCE_WEBHOOK_TIMESTAMP_INVALID/);
    await assert.rejects(client.sendCommand(['ACL','WHOAMI']),/NOPERM/);
    const scope={environment:'test',apiOrigin:'https://api.example.invalid',revision:config.sourceSha,namespace:config.namespace+'a:'};
    const a=new WorkerHealthObservation(client,scope),b=new WorkerHealthObservation(client,{...scope,namespace:config.namespace+'b:'}),otherRevision=new WorkerHealthObservation(client,{...scope,revision:'different'});
    await a.publish('background-jobs',{state:'IDLE',lastPollAt:new Date().toISOString()});assert.equal((await a.read('background-jobs')).state,'IDLE');assert.equal((await b.read('background-jobs')).state,'NOT_STARTED');assert.equal((await otherRevision.read('background-jobs')).state,'NOT_STARTED');
    const healthKey=scope.namespace+'health:workers:v2:'+createHash('sha256').update(JSON.stringify({environment:scope.environment,apiOrigin:scope.apiOrigin,revision:scope.revision})).digest('hex')+':background-jobs';
    const healthTtl=await client.pTTL(healthKey);assert(healthTtl>0&&healthTtl<=3600000);
    await a.publish('background-jobs',{state:'DEGRADED',lastFailureAt:new Date().toISOString()});assert.equal((await a.read('background-jobs')).state,'DEGRADED');assert.equal(freshWorkerEvidence(await a.read('background-jobs'),15000),false);
    await a.publish('background-jobs',{state:'STOPPED',lastStoppedAt:new Date().toISOString()});assert.equal((await a.read('background-jobs')).state,'STOPPED');assert.equal(freshWorkerEvidence(await a.read('background-jobs'),15000),false);
    const now=Date.now();await a.publish('stale',{state:'RUNNING',lastSuccessAt:new Date(now-16000).toISOString()});assert.equal(freshWorkerEvidence(await a.read('stale'),15000,now),false);
    const stopped=once(process,'message');process.send({point:'STOP_REDIS'});const [message]=await stopped;assert.equal(message,'REDIS_STOPPED');
    const outage=Promise.race([a.read('background-jobs'),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('R08_OUTAGE_DID_NOT_SETTLE')),8000);})]);
    await assert.rejects(outage,error=>error.message!=='R08_OUTAGE_DID_NOT_SETTLE');
    clearTimeout(timeout);
    await assert.rejects(verifier.verify({...sign(),rawBody:Buffer.from(rawBody)}));
    process.send({point:'RESULT',result:{sourceSha:config.sourceSha,independentCounterProcesses:2,requests:24,allowed:10,namespaceIsolation:true,revisionIsolation:true,staleRejected:true,failedWorkerObserved:true,stoppedWorkerObserved:true,healthTtlBounded:true,restrictedAcl:true,redisOutageRejected:true,signedWebhook:{independentProcesses:2,accepted:1,replayed:1,tamperedRejected:true,invalidDoesNotConsumeNonce:true,staleRejected:true,outageRejected:true,financialMutationClaimed:false},fullApiSessionsVerified:false}});
  }
}catch(error){
  const message=String(error?.message??'R08_REDIS_PROBE_FAILED').replaceAll(url.password,'[REDACTED]').replace(/rediss?:\/\/[^\s'"<>]+/g,'[REDACTED_REDIS_URL]').slice(0,1600);
  process.send?.({point:'ERROR',message});console.error(message);process.exitCode=1;
}
finally{clearTimeout(timeout);if(client.isOpen)client.destroy();process.disconnect?.();}
