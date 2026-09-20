import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url); const ts=require('typescript'); const root=path.resolve(import.meta.dirname,'../..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
function load(rel,map={}){const js=ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};vm.runInThisContext(`(function(require,exports,module){${js}\n})`,{filename:rel})((id)=>id in map?map[id]:(()=>{throw new Error('UNEXPECTED_REQUIRE:'+id)})(),m.exports,m);return m.exports;}
const dispatcherModule=load('packages/application/src/event-foundation/use-cases/TransactionalOutboxDispatcher.ts',{'@manaratak/domain':{}});

test('MNT-AUD-0068 dispatcher treats stale final CAS as lease loss, not success/failure',async()=>{
 const lease={workerId:'w1',leaseToken:'t1',claimUntil:new Date('2026-09-07T00:05:00Z')}; const entry={id:'e1',eventType:'X',domain:'D',payload:{},metadata:{},createdAt:new Date(),availableAt:new Date(),state:'PROCESSING',attempts:0,lease};
 const store={claimPendingBatch:async()=>[entry],renewLease:async()=>true,markProcessed:async()=>false,markFailed:async()=>false};
 const delivery={deliver:async()=>{}}; const now=()=>new Date('2026-09-07T00:00:00Z'); const d=new dispatcherModule.TransactionalOutboxDispatcher(store,delivery,now);
 const result=await d.dispatchBatch({workerId:'w1',batchSize:1,claimDurationMs:30000,maxAttempts:3,baseBackoffMs:1000,maxBackoffMs:10000});
 assert.deepEqual(result,{claimed:1,processed:0,failed:0,exhausted:0,leaseLost:1});
});

test('MNT-AUD-0068 Prisma source uses SKIP LOCKED, claim tokens, heartbeat and ownership CAS',()=>{
 const source=read('packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts');
 assert.match(source,/FOR UPDATE SKIP LOCKED/); assert.match(source,/claimToken/); assert.match(source,/renewLease/);
 assert.match(source,/claimedBy: ownership\.workerId/); assert.match(source,/claimToken: ownership\.leaseToken/); assert.match(source,/claimUntil: \{ gt:/);
 const schema=read('packages/infrastructure/prisma/schema.prisma'); assert.match(schema,/model TransactionalOutboxRecord[\s\S]*claimToken\s+String\?/);
});
