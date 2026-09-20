import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url); const ts=require('typescript'); const root=path.resolve(import.meta.dirname,'../..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
function load(rel,map={}){const js=ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};vm.runInThisContext(`(function(require,exports,module){${js}\n})`,{filename:rel})((id)=>id in map?map[id]:(()=>{throw new Error('UNEXPECTED_REQUIRE:'+id)})(),m.exports,m);return m.exports;}
const cron=load('packages/application/src/background-jobs/services/CronScheduleCalculator.ts');
const registryModule=load('packages/application/src/background-jobs/workers/BackgroundJobHandlerRegistry.ts',{'./DurableBackgroundJobContracts':{}});
const workerModule=load('packages/application/src/background-jobs/workers/DurableBackgroundWorker.ts',{'./BackgroundJobHandlerRegistry':registryModule,'./DurableBackgroundJobContracts':{},'../services/CronScheduleCalculator':cron});

test('MNT-AUD-0007 cron scheduler calculates deterministic UTC occurrences',()=>{
 assert.equal(cron.nextCronOccurrence('*/15 * * * *',new Date('2026-09-06T20:01:30Z')).toISOString(),'2026-09-06T20:15:00.000Z');
 assert.throws(()=>cron.validateCronExpression('bad cron'),/BACKGROUND_JOB_CRON_INVALID/);
});

test('MNT-AUD-0007 worker owns terminal transitions and uses job reference as handler idempotency key',async()=>{
 const calls=[]; const claim={jobReference:'job-1',jobType:'test.handler',payload:{a:1},priority:0,attempt:1,maxAttempts:3,backoffType:'fixed',timeoutMs:1000,workerId:'worker-1',leaseToken:'lease-1',leaseUntil:new Date(Date.now()+10000)};
 const queue={capabilityStatus:'PRODUCTION_CAPABLE',persistenceClassification:'DURABLE',claimDue:async()=>[claim],heartbeat:async()=>true,complete:async(x)=>{calls.push(['complete',x]);return true;},fail:async(x)=>{calls.push(['fail',x]);return {applied:true,exhausted:false};},getOperationalSnapshot:async()=>({})};
 const handler={jobType:'test.handler',handle:async(_payload,ctx)=>calls.push(['handler',ctx.idempotencyKey])};
 const state=new workerModule.BackgroundWorkerRuntimeState(); const registry=new registryModule.BackgroundJobHandlerRegistry([handler]); const worker=new workerModule.DurableBackgroundWorker(queue,registry,state);
 await worker.runOnce({workerId:'worker-1',batchSize:1,leaseDurationMs:5000,heartbeatIntervalMs:1000});
 assert.equal(calls[0][0],'handler'); assert.equal(calls[0][1],'job-1'); assert.equal(calls[1][0],'complete'); assert.equal(state.snapshot().completedTotal,1);
});

test('MNT-AUD-0007 stale worker completion is rejected without a false success',async()=>{
 const claim={jobReference:'job-stale',jobType:'test.handler',payload:{},priority:0,attempt:1,maxAttempts:3,backoffType:'fixed',timeoutMs:1000,workerId:'worker-1',leaseToken:'old-token',leaseUntil:new Date(Date.now()+10000)};
 const queue={capabilityStatus:'PRODUCTION_CAPABLE',persistenceClassification:'DURABLE',claimDue:async()=>[claim],heartbeat:async()=>true,complete:async()=>false,fail:async()=>({applied:false,exhausted:false}),getOperationalSnapshot:async()=>({})};
 const registry=new registryModule.BackgroundJobHandlerRegistry([{jobType:'test.handler',handle:async()=>{}}]); const state=new workerModule.BackgroundWorkerRuntimeState(); const worker=new workerModule.DurableBackgroundWorker(queue,registry,state);
 await worker.runOnce({workerId:'worker-1',batchSize:1,leaseDurationMs:5000,heartbeatIntervalMs:1000});
 assert.equal(state.snapshot().leaseLostTotal,1); assert.equal(state.snapshot().completedTotal,0);
});
