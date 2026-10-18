import {randomUUID as fresh} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {PrismaClient} from '@prisma/client';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {runWorker} from './fixtures/post28-import-worker-runtime.mjs';
import {PrismaImportScreeningReceiptStore,screeningReceiptIdentity} from '../../packages/infrastructure/src/import-foundation/PrismaImportScreeningReceiptStore.ts';
let db;
async function fixture(){
 const batch=fresh(),record=fresh(),job=fresh();
 const envelope={handoffId:'handoff:'+record,ownerDomain:'GENERIC',artifact:{sourceId:'POST28_SYNTHETIC'},normalizedPayload:{id:record},provenance:{sourceSystem:'POST28_SYNTHETIC',sourceRowNumber:1,contentHash:'a'.repeat(64)},validation:{state:'VALID',issues:[]},execution:{executionId:batch,dryRun:false,attempt:1,idempotencyKey:record}};
 await db.importBatch.create({data:{id:batch,sourceSystem:'POST28_SYNTHETIC',dataType:'GENERIC',batchStatus:'QUEUED',totalRecords:1,records:{create:{id:record,status:'COMPLETE',sourceDedupKey:record,rawPayload:{_phase6HandoffEnvelope:envelope}}}}});
 await db.backgroundJobRecord.create({data:{id:job,reference:job,jobType:'imports.queue.sweep',parameters:{maxJobs:1},status:'SCHEDULED',availableAt:new Date(),maxAttempts:3,timeoutSeconds:30}});
 return {batch,record,job,envelope};
}
async function crash(mode){
 const child=spawn(process.execPath,['--import','tsx','tests/database/fixtures/post28-import-worker-child.mjs',mode],{env:{...process.env},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
 let output='';child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});
 const exited=once(child,'exit');
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('CHILD_BARRIER_TIMEOUT')),12000);child.on('message',message=>{if(message.point===mode){clearTimeout(timer);resolve();}});child.once('exit',()=>{clearTimeout(timer);reject(Error('CHILD_EXITED_BEFORE_BARRIER:'+output.slice(0,1200)));});child.once('error',reject);});
 }finally{child.kill('SIGKILL');await exited;}
 expect(child.exitCode!==null||child.signalCode!==null).toBe(true);
}
async function expire(c){const past=new Date(Date.now()-1000);await db.backgroundJobRecord.update({where:{reference:c.job},data:{leaseUntil:past}});await db.importBatch.update({where:{id:c.batch},data:{claimUntil:past}});}
async function facts(c){return {batch:await db.importBatch.findUnique({where:{id:c.batch}}),record:await db.importRecord.findUnique({where:{id:c.record}}),job:await db.backgroundJobRecord.findUnique({where:{reference:c.job}}),receipt:await new PrismaImportScreeningReceiptStore(db).find(c.envelope),executions:await db.backgroundJobExecutionRecord.findMany({where:{jobReference:c.job},orderBy:{attempt:'asc'}})};}
describe('CD035 actual durable worker process crash and screening receipts',()=>{
 beforeAll(async()=>{if(process.env.POST28_DATABASE_SUITE!=='import-worker-crash'||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');});
 afterAll(async()=>{await db?.$disconnect();});
 it('runs the real worker handler import protocol receipt and checkpoint exactly once',async()=>{const c=await fixture();let screens=0;await runWorker(db,'NORMAL',point=>{if(point==='SCREENED')screens++;});let f=await facts(c);expect(screens).toBe(1);expect(f.batch.batchStatus).toBe('COMPLETED');expect(f.job.status).toBe('COMPLETED');expect(f.record.rawPayload._phase6HandoffState).toBe('DISPATCHED');expect(f.receipt.result.canonicalWrites).toBe(false);await runWorker(db,'NORMAL',()=>{screens++;});expect(screens).toBe(1);expect((await facts(c)).executions).toHaveLength(1);});
 for(const mode of ['AFTER_RECEIPT','AFTER_ACK'])it('recovers a killed child '+mode+' without screening again or duplicate receipt',async()=>{const c=await fixture();await crash(mode);const interrupted=await facts(c);expect(interrupted.job.status).toBe('STARTED');expect(interrupted.receipt).not.toBeNull();await expire(c);let screens=0;await runWorker(db,'NORMAL',point=>{if(point==='SCREENED')screens++;});const f=await facts(c);expect(screens).toBe(0);expect(f.batch.batchStatus).toBe('COMPLETED');expect(f.job.status).toBe('COMPLETED');expect(f.record.rawPayload._phase6HandoffState).toBe('DISPATCHED');expect(f.executions).toHaveLength(2);expect(f.executions[0].outcome).toBe('LEASE_EXPIRED');expect(f.executions[1].outcome).toBe('SUCCEEDED');expect(await db.importScreeningReceipt.count({where:{handoffKey:screeningReceiptIdentity(c.envelope).handoffKey}})).toBe(1);});
 it('keeps an uncertain killed pre-receipt dispatch in manual review instead of automatically replaying',async()=>{const c=await fixture();await crash('BEFORE_RECEIPT');expect((await facts(c)).receipt).toBeNull();await expire(c);let screens=0;await runWorker(db,'NORMAL',point=>{if(point==='SCREENED')screens++;});const f=await facts(c);expect(screens).toBe(0);expect(f.receipt).toBeNull();expect(f.record.status).toBe('NEEDS_REVIEW');expect(f.record.rawPayload._phase6HandoffState).toBe('MANUAL_RECONCILIATION_REQUIRED');expect(f.batch.failedRecords).toBe(1);});
 it('refuses changed content for the same durable receipt identity without overwriting evidence',async()=>{const c=await fixture();await runWorker(db);const before=await facts(c);await expect(new PrismaImportScreeningReceiptStore(db).accept({...c.envelope,normalizedPayload:{id:'ATTACK'}},async()=>({accepted:true}))).rejects.toThrow('IMPORT_RECEIPT_CONTENT_CONFLICT');expect((await facts(c)).receipt).toEqual(before.receipt);});
});
