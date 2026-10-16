import {randomUUID} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
const prefix='post28-r06-'+randomUUID();
const fresh=()=>prefix+'-'+randomUUID();
const gate=()=>{let release;const wait=new Promise(resolve=>{release=resolve;});return {wait,release};};
const options={timeout:12000,maxWait:3000};
let db,other;
function invoice(id){return {id,publicId:id,invoiceNumber:id,correlationId:id,originDomain:'POST28_TEST',originReferenceId:prefix,status:'ISSUED',currencyCode:'USD',scale:2,totalMinorUnits:'900719925474099312345',dueMinorUnits:'900719925474099312345',lineItems:[]};}
function receipt(id,target){return {id,actorId:prefix,operation:'POST28_SQL_ATOMICITY',targetId:target,fingerprint:'a'.repeat(64),response:{synthetic:true,target}};}
function outbox(id,target){return {id,eventType:'POST28_SQL_ATOMICITY',domain:'POST28_TEST',payload:{target},metadata:{synthetic:true},state:'PENDING',attempts:0,availableAt:new Date()};}
async function documentContext(){
 const asset=fresh(),student=fresh(),tracker=fresh();
 await db.assetRecord.create({data:{id:asset,reference:asset,ownerId:student,ownerType:'STUDENT',lifecycleState:'ACTIVE',securityClassification:'INTERNAL',retentionCategory:'PERMANENT',metadata:{synthetic:true,originalFilename:'test.pdf',mimeType:'application/pdf',fileExtension:'pdf',byteSize:64}}});
 await db.studentWorkspace.create({data:{id:student,studentReferenceId:student,status:'ACTIVE'}});
 await db.studentApplicationTracker.create({data:{id:tracker,studentReferenceId:student,scholarshipId:fresh()}});
 return {asset,tracker,binding:{id:fresh(),trackerId:tracker,requirementId:fresh(),assetId:asset,ownerVersionId:fresh(),requirementSnapshot:{synthetic:true},consentGrantedAt:new Date(),retentionUntil:new Date('2040-01-01')}};
}
async function observeBlocked(waiter,holder){
 const deadline=Date.now()+4000;
 while(Date.now()<deadline){
  const [row]=await db.$queryRaw`SELECT ${holder}::integer = ANY(pg_blocking_pids(${waiter}::integer)) AS blocked`;
  if(row.blocked)return;
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 throw new Error('POST28_REQUIRED_DATABASE_BLOCKING_NOT_OBSERVED');
}
describe('Post28 scoped R06 real PostgreSQL transaction foundation',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='core-transactions'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true')throw new Error('POST28_DB_T_RUNNER_REQUIRED');
  if(process.env.POST28_TRANSACTION_SETUP_URL)throw new Error('POST28_RUNTIME_SETUP_CREDENTIAL_FORBIDDEN');
  db=new PrismaClient({log:[],errorFormat:'minimal'});other=new PrismaClient({log:[],errorFormat:'minimal'});await Promise.all([db.$connect(),other.$connect()]);
 });
 afterAll(async()=>{await Promise.all([db?.$disconnect(),other?.$disconnect()]);});
 it('uses two real backend sessions and the limited application role',async()=>{
  const [[a],[b]]=await Promise.all([db.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`,other.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`]);
  expect(a.pid).not.toBe(b.pid);expect(a.role).toBe('post28_app');expect(b.role).toBe('post28_app');
  const [r]=await db.$queryRaw`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,has_schema_privilege(current_user,'public','CREATE') AS ddl FROM pg_roles WHERE rolname=current_user`;
  expect(Object.values(r).every(v=>v===false)).toBe(true);
 });
 it('rejects application DDL and migration-ledger writes without changing either',async()=>{
  await expect(db.$transaction(async tx=>{await tx.$executeRawUnsafe('CREATE TABLE public.post28_forbidden_runtime_ddl (id text)');throw new Error('POST28_DDL_UNEXPECTEDLY_ALLOWED');})).rejects.toThrow(/permission denied/i);
  await expect(db.$executeRawUnsafe('UPDATE public._prisma_migrations SET checksum=checksum WHERE false')).rejects.toThrow(/permission denied/i);
 });
 it('rolls invoice receipt and outbox back together after an injected precommit failure',async()=>{
  const id=fresh();await expect(db.$transaction(async tx=>{
   await tx.financeInvoiceRecord.create({data:invoice(id)});await tx.financeCommandRecord.create({data:receipt(id,id)});await tx.transactionalOutboxRecord.create({data:outbox(id,id)});throw new Error('POST28_INJECTED_PRECOMMIT_FAILURE');
  })).rejects.toThrow('POST28_INJECTED_PRECOMMIT_FAILURE');
  expect(await db.financeInvoiceRecord.count({where:{id}})).toBe(0);expect(await db.financeCommandRecord.count({where:{id}})).toBe(0);expect(await db.transactionalOutboxRecord.count({where:{id}})).toBe(0);
 });
 it('commits all three records, preserves exact units, and rejects duplicate receipt identity',async()=>{
  const id=fresh();await db.$transaction(async tx=>{
   await tx.financeInvoiceRecord.create({data:invoice(id)});await tx.financeCommandRecord.create({data:receipt(id,id)});await tx.transactionalOutboxRecord.create({data:outbox(id,id)});
  });
  expect((await db.financeInvoiceRecord.findUnique({where:{id}})).totalMinorUnits).toBe('900719925474099312345');
  await expect(db.financeCommandRecord.create({data:receipt(id,id)})).rejects.toMatchObject({code:'P2002'});
  expect(await db.financeInvoiceRecord.count({where:{id}})).toBe(1);expect(await db.financeCommandRecord.count({where:{id}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{id}})).toBe(1);
 });
 it('enforces positive payment units on real PostgreSQL',async()=>{
  const id=fresh();await db.financeInvoiceRecord.create({data:invoice(id)});
  await expect(db.financePaymentRecord.create({data:{id:fresh(),publicId:fresh(),invoiceId:id,idempotencyKeyHash:fresh(),currencyCode:'USD',scale:2,amountMinorUnits:'-1',status:'PENDING',paymentMethod:'MANUAL'}})).rejects.toThrow(/FinancePayment_positive_units/);
  expect(await db.financePaymentRecord.count({where:{invoiceId:id}})).toBe(0);
 });
 it('enforces the invoice foreign key without leaving a payment row',async()=>{
  const id=fresh();await expect(db.financePaymentRecord.create({data:{id,publicId:id,invoiceId:fresh(),idempotencyKeyHash:id,currencyCode:'USD',scale:2,amountMinorUnits:'1',status:'PENDING',paymentMethod:'MANUAL'}})).rejects.toMatchObject({code:'P2003'});
  expect(await db.financePaymentRecord.count({where:{id}})).toBe(0);
 });
 it('document owner first blocks asset deletion then rejects it after owner commit',async()=>{
  const c=await documentContext(),ready=gate(),commit=gate(),waiter=gate();
  const owner=db.$transaction(async tx=>{const [r]=await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;await tx.studentApplicationDocumentBinding.create({data:c.binding});ready.release(r.pid);await commit.wait;},options);
  let deletion;try{
   const holder=await Promise.race([ready.wait,owner.then(()=>{throw new Error('POST28_OWNER_BARRIER_MISSING');})]);
   deletion=other.$transaction(async tx=>{const [r]=await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;waiter.release(r.pid);await tx.assetRecord.delete({where:{id:c.asset}});},options).then(()=>null,e=>e);
   const waiting=await Promise.race([waiter.wait,deletion.then(error=>{throw error??new Error('POST28_LOCK_WAITER_MISSING');})]);expect(waiting).not.toBe(holder);await observeBlocked(waiting,holder);
  }finally{commit.release();}
  await owner;expect(String(await deletion)).toContain('ASSET_REFERENCE_IN_USE');
  expect(await db.studentApplicationDocumentBinding.count({where:{id:c.binding.id}})).toBe(1);expect(await db.assetRecord.count({where:{id:c.asset}})).toBe(1);
 });
 it('asset lifecycle first blocks the document writer and rejects its binding after commit',async()=>{
  const c=await documentContext(),ready=gate(),commit=gate(),waiter=gate();
  const lifecycle=db.$transaction(async tx=>{const [r]=await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;await tx.assetRecord.update({where:{id:c.asset},data:{lifecycleState:'DELETED'}});ready.release(r.pid);await commit.wait;},options);
  let binding;try{
   const holder=await Promise.race([ready.wait,lifecycle.then(()=>{throw new Error('POST28_LIFECYCLE_BARRIER_MISSING');})]);
   binding=other.$transaction(async tx=>{const [r]=await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;waiter.release(r.pid);await tx.studentApplicationDocumentBinding.create({data:c.binding});},options).then(()=>null,e=>e);
   const waiting=await Promise.race([waiter.wait,binding.then(error=>{throw error??new Error('POST28_LOCK_WAITER_MISSING');})]);expect(waiting).not.toBe(holder);await observeBlocked(waiting,holder);
  }finally{commit.release();}
  await lifecycle;expect(String(await binding)).toContain('ASSET_REFERENCE_NOT_ACTIVE');
  expect(await db.studentApplicationDocumentBinding.count({where:{id:c.binding.id}})).toBe(0);expect((await db.assetRecord.findUnique({where:{id:c.asset}})).lifecycleState).toBe('DELETED');
 });
});
