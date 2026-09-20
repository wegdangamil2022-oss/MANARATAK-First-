import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url); const ts=require('typescript'); const root=path.resolve(import.meta.dirname,'../..'); const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
function load(rel,map={}){const js=ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};vm.runInThisContext(`(function(require,exports,module){${js}\n})`,{filename:rel})((id)=>id==='node:crypto'?require('node:crypto'):(id in map?map[id]:(()=>{throw new Error('UNEXPECTED_REQUIRE:'+id)})()),m.exports,m);return m.exports;}
const domain=load('packages/domain/src/retention/index.ts');

test('MNT-AUD-0081 policy distinguishes legal hold, audit archive, import purge and permanent asset keep',()=>{
 const now=new Date('2026-09-07T00:00:00Z'), old=new Date('2026-09-01T00:00:00Z');
 assert.equal(domain.decideRetention({owner:domain.RetentionOwner.IMPORT,recordId:'i',expiresAt:old},now).disposition,'PURGE');
 assert.equal(domain.decideRetention({owner:domain.RetentionOwner.AUDIT,recordId:'a',expiresAt:old},now).disposition,'ARCHIVE');
 const held=domain.decideRetention({owner:domain.RetentionOwner.IMPORT,recordId:'h',expiresAt:old,legalHoldUntil:new Date('2026-10-01T00:00:00Z')},now); assert.equal(held.disposition,'KEEP'); assert.equal(held.reason,'LEGAL_HOLD_ACTIVE');
 const perm=domain.decideRetention({owner:domain.RetentionOwner.ASSET,recordId:'p',expiresAt:old,retentionCategory:'PERMANENT'},now); assert.equal(perm.disposition,'KEEP');
});

test('MNT-AUD-0081 failed attempts remain retryable while applied decisions are terminal',async()=>{
 const {RetentionSweepUseCase}=load('packages/application/src/retention/RetentionSweepUseCase.ts',{'@manaratak/domain':domain});
 const candidate={owner:domain.RetentionOwner.IMPORT,recordId:'i',expiresAt:new Date('2026-09-01T00:00:00Z')}; let tries=0; const rows=[];
 const gateway={owner:domain.RetentionOwner.IMPORT,listDue:async()=>[candidate],applyDecision:async()=>{tries++; if(tries===1)throw new Error('temporary'); return 'APPLIED';}};
 const decisions={hasTerminalDecision:async(key)=>rows.some(x=>x.decisionKey===key&&['APPLIED','SKIPPED'].includes(x.result)),append:async(x)=>rows.push(x)};
 const uc=new RetentionSweepUseCase([gateway],decisions); const now=new Date('2026-09-07T00:00:00Z');
 const first=await uc.execute({now}); assert.equal(first.failed,1); assert.equal(tries,1);
 const second=await uc.execute({now}); assert.equal(second.applied,1); assert.equal(tries,2);
 const third=await uc.execute({now}); assert.equal(third.skipped,1); assert.equal(tries,2);
 assert.deepEqual(rows.map(x=>x.result),['FAILED','APPLIED']);
});

test('MNT-AUD-0081 import owner uses a lease then purges raw payload without deleting provenance row',async()=>{
 const {PrismaImportRetentionGateway}=load('packages/infrastructure/src/retention/PrismaImportRetentionGateway.ts',{'@manaratak/application':{},'@manaratak/domain':domain,'@prisma/client':{}});
 const updates=[]; const prisma={importRecord:{updateMany:async(args)=>{updates.push(args); return {count:1};}}}; const g=new PrismaImportRetentionGateway(prisma);
 const c={owner:domain.RetentionOwner.IMPORT,recordId:'r',expiresAt:new Date('2026-09-01T00:00:00Z')}; const d=domain.decideRetention(c,new Date('2026-09-07T00:00:00Z'));
 assert.equal(await g.applyDecision(c,d),'APPLIED'); assert.equal(updates.length,2); assert.ok(updates[0].data.retentionClaimToken); assert.equal(updates[1].data.retentionState,'RAW_PURGED'); assert.equal(updates[1].data.rawPayload.retentionPurged,true);
 assert.equal('delete' in updates[1],false);
});

test('MNT-AUD-0081 asset expiry goes through soft-delete and usage-safe purge and releases lease on failure',async()=>{
 const {PrismaAssetRetentionGateway}=load('packages/infrastructure/src/retention/PrismaAssetRetentionGateway.ts',{'@manaratak/application':{},'@manaratak/domain':domain,'@prisma/client':{}});
 const updates=[]; const prisma={assetRecord:{updateMany:async(args)=>{updates.push(args); return {count:1};}}}; const calls=[];
 const lifecycle={softDeleteAsset:async()=>calls.push('soft-delete'),purgeAsset:async()=>{calls.push('purge');throw new Error('IN_USE');},archiveAsset:async()=>calls.push('archive')};
 const g=new PrismaAssetRetentionGateway(prisma,lifecycle); const c={owner:domain.RetentionOwner.ASSET,recordId:'asset',expiresAt:new Date('2026-09-01T00:00:00Z'),retentionCategory:'TEMPORARY',lifecycleState:'ACTIVE'}; const d=domain.decideRetention(c,new Date('2026-09-07T00:00:00Z'));
 await assert.rejects(g.applyDecision(c,d),/IN_USE/); assert.deepEqual(calls,['soft-delete','purge']); assert.equal(updates.length,2); assert.equal(updates[1].data.retentionClaimToken,null);
});
