import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {StudentWorkspaceUseCases} from '../../packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts';
import {PrismaStudentWorkspaceRepository} from '../../packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts';
import {StudentPrivateResultProtector} from '../../packages/infrastructure/src/students/StudentPrivateResultProtector.ts';
import {FinancePlatformUseCases} from '../../packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts';
import {PrismaFinanceRepository} from '../../packages/infrastructure/src/finance-platform/PrismaFinanceRepository.ts';
import {PrismaFinanceCurrencyReferenceGateway,FinancePaymentGatewayRegistry,FinanceBankTransferGatewayRegistry} from '../../packages/infrastructure/src/finance-platform/FinanceSafetyGateways.ts';
const fresh=()=> 'post28-owner-'+randomUUID();
const preferences=(enabled=false)=>({retainSearchHistory:enabled,allowPersonalization:false,allowProductAnalytics:enabled,publicProfileEnabled:false});
let db,other,students,otherStudents,studentRepo,protector,finance;
// The real PostgreSQL transaction remains in place. Inject a PostgreSQL error
// at the final outbox boundary after the owner's actual writes and audit.
function withOutboxFailure(client){
 return new Proxy(client,{get(target,key){
  if(key==='$transaction')return (work,options)=>target.$transaction(tx=>work(new Proxy(tx,{get(inner,property){
   if(property==='transactionalOutboxRecord')return new Proxy(inner.transactionalOutboxRecord,{get(model,operation){
    if(operation==='create')return async()=>{await inner.$executeRawUnsafe('SELECT 1/0');throw new Error('POST28_FAILURE_INJECTION_NOT_TRIGGERED');};
    const value=Reflect.get(model,operation);return typeof value==='function'?value.bind(model):value;
   }});
   const value=Reflect.get(inner,property);return typeof value==='function'?value.bind(inner):value;
  }})),options);
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
 }});
}
async function workspace(){const id=fresh();await db.studentWorkspace.create({data:{id,studentReferenceId:id,status:'ACTIVE',privacyPreferences:preferences()}});return id;}
const consent=(id,expectedVersion,enabled)=>({studentReferenceId:id,actorId:id,actorType:'USER',purpose:'POST28_SYNTHETIC_PRIVACY_TEST',expectedVersion,privacyPreferences:preferences(enabled)});
function financeFacade(client){return new FinancePlatformUseCases(new PrismaFinanceRepository(client),{
 currencyReference:new PrismaFinanceCurrencyReferenceGateway(client),paymentGateways:new FinancePaymentGatewayRegistry([]),bankTransferGateways:new FinanceBankTransferGatewayRegistry([]),
 fxRateProvider:{providerKey:'POST28_DISABLED',isConfigured:()=>false,fetchRate:async()=>{throw new Error('POST28_EXTERNAL_FX_FORBIDDEN');}},transferFeePolicy:{policyReference:'POST28_UNUSED_FIXTURE_POLICY',basisPoints:0}
});}
const identity=(key=fresh())=>({actorId:'post28-finance-actor',correlationId:fresh(),idempotencyKey:key,reason:'Post28 isolated synthetic owner workflow'});
const usd=units=>({amountMinorUnits:units,currencyCode:'USD',scale:2});
const lines=(units='1250',quantity=3)=>[{description:'Synthetic service',quantity,unitPrice:usd(units)}];
const draftInput=(units='1250')=>({originDomain:'POST28_TEST',originReferenceId:fresh(),lineItems:lines(units)});
async function draft(units='1250'){const input=draftInput(units),ctx=identity();return {input,ctx,row:await finance.createDraftInvoice(input,ctx)};}
const commandId=ctx=>createHash('sha256').update(ctx.actorId+':'+ctx.idempotencyKey).digest('hex');
async function issueFacts(id){
 const transactions=await db.financialTransactionRecord.findMany({where:{businessReferenceType:'INVOICE',businessReferenceId:id},include:{entries:true}});
 return {transactions:transactions.length,entries:transactions.flatMap(t=>t.entries),audits:await db.auditRecord.count({where:{targetId:id,action:'FINANCE_INVOICE_ISSUED'}}),outbox:await db.transactionalOutboxRecord.count({where:{aggregateId:id,eventType:'FINANCE_INVOICE_ISSUED'}})};
}

async function approval(){
 const maker=identity(),caseId='CASE:'+randomUUID();
 // Seed an owner-local OPEN case as a historical fixture. This does not approve
 // a source document or execute a manual ledger adjustment.
 await db.financeAdjustmentCaseRecord.create({data:{publicId:caseId,reasonCode:'RECONCILIATION_CORRECTION',supportingDocumentId:fresh(),makerId:maker.actorId}});
 const row=await finance.createApproval({actionType:'MANUAL_LEDGER_POST',targetReferenceId:caseId,requiredApprovals:2,commandPayload:{synthetic:true,caseId},amount:usd('1000')},maker);
 return {row,maker};
}
describe('Post28 R06 real student and finance owner workflows',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='owner-workflows'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw new Error('POST28_OWNER_WORKFLOW_DB_T_REQUIRED');
  db=new PrismaClient({log:[],errorFormat:'minimal'});other=new PrismaClient({log:[],errorFormat:'minimal'});await Promise.all([db.$connect(),other.$connect()]);
  const [[a],[b]]=await Promise.all([db.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`,other.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`]);expect(a.pid).not.toBe(b.pid);expect(a.role).toBe('post28_app');expect(b.role).toBe('post28_app');
  protector=new StudentPrivateResultProtector('POST28_TEST_KEY',{POST28_TEST_KEY:randomBytes(32).toString('hex')});
  studentRepo=new PrismaStudentWorkspaceRepository(db,undefined,protector);students=new StudentWorkspaceUseCases(studentRepo);otherStudents=new StudentWorkspaceUseCases(new PrismaStudentWorkspaceRepository(other,undefined,protector));
  const currency=await db.referenceCurrency.findUnique({where:{isoCode:'USD'}});
  if(currency){expect(currency.minorUnit).toBe(2);expect(currency.isActive).toBe(true);}else await db.referenceCurrency.create({data:{id:fresh(),isoCode:'USD',name:'Synthetic USD test fixture',minorUnit:2,metadata:{synthetic:true}}});
  finance=financeFacade(db);
 });
 afterAll(async()=>{await Promise.all([db?.$disconnect(),other?.$disconnect()]);});
 it('rejects another student as consent actor and whitespace purpose without any write',async()=>{
  const id=await workspace();await expect(students.updatePrivacyConsent({...consent(id,1,true),actorId:fresh()})).rejects.toThrow('STUDENT_PRIVACY_CONSENT_ACTOR_MISMATCH');
  await expect(students.updatePrivacyConsent({...consent(id,1,true),purpose:'   '})).rejects.toThrow('STUDENT_PRIVACY_CONSENT_PURPOSE_REQUIRED');
  expect((await db.studentWorkspace.findUnique({where:{id}})).version).toBe(1);expect(await db.studentPrivacyConsentDecision.count({where:{studentReferenceId:id}})).toBe(0);expect(await db.auditRecord.count({where:{targetId:id}})).toBe(0);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:id}})).toBe(0);
 });
 it('commits canonical privacy state decision audit and outbox together through the real use case',async()=>{
  const id=await workspace(),result=await students.updatePrivacyConsent(consent(id,1,true));
  expect(result.workspaceVersion).toBe(2);expect(result.afterPreferences).toEqual(preferences(true));
  expect((await db.studentWorkspace.findUnique({where:{id}})).privacyPreferences).toEqual(preferences(true));expect(await db.studentPrivacyConsentDecision.count({where:{studentReferenceId:id}})).toBe(1);
  expect(await db.auditRecord.count({where:{targetId:id,action:'StudentPrivacyConsentDecided',actorId:id}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:id,eventType:'StudentPrivacyConsentDecided'}})).toBe(1);
 });
 it('stops subsequent history and analytics writes immediately after canonical consent withdrawal',async()=>{
  const id=await workspace();await students.updatePrivacyConsent(consent(id,1,true));await students.recordSearch(id,'synthetic before withdrawal');
  expect(await db.studentSearchHistory.count({where:{studentReferenceId:id}})).toBe(1);
  await students.updatePrivacyConsent(consent(id,2,false));await students.recordSearch(id,'synthetic forbidden after withdrawal');
  expect(await db.studentSearchHistory.count({where:{studentReferenceId:id}})).toBe(1);expect(await studentRepo.recordRecentlyViewed({studentReferenceId:id,entityType:'COURSE',entityId:fresh()})).toBeNull();
  expect(await db.studentRecentlyViewed.count({where:{studentReferenceId:id}})).toBe(0);expect(await db.studentPrivacyConsentDecision.count({where:{studentReferenceId:id}})).toBe(2);
 });
 it('allows one concurrent privacy CAS writer and rolls the stale writer back without duplicate evidence',async()=>{
  const id=await workspace();const results=await Promise.allSettled([students.updatePrivacyConsent(consent(id,1,true)),otherStudents.updatePrivacyConsent(consent(id,1,false))]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(String(results.find(r=>r.status==='rejected').reason)).toContain('STUDENT_WORKSPACE_VERSION_CONFLICT');
  expect((await db.studentWorkspace.findUnique({where:{id}})).version).toBe(2);expect(await db.studentPrivacyConsentDecision.count({where:{studentReferenceId:id}})).toBe(1);expect(await db.auditRecord.count({where:{targetId:id}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:id}})).toBe(1);
 });
 it('rolls privacy decision workspace version and audit back after a real PostgreSQL precommit error',async()=>{
  const id=await workspace(),failing=new StudentWorkspaceUseCases(new PrismaStudentWorkspaceRepository(withOutboxFailure(db)));
  await expect(failing.updatePrivacyConsent(consent(id,1,true))).rejects.toThrow(/division by zero/);
  const row=await db.studentWorkspace.findUnique({where:{id}});expect(row.version).toBe(1);expect(row.privacyPreferences).toEqual(preferences());
  expect(await db.studentPrivacyConsentDecision.count({where:{studentReferenceId:id}})).toBe(0);expect(await db.auditRecord.count({where:{targetId:id}})).toBe(0);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:id}})).toBe(0);
 });
 it('encrypts a private result and refuses another student even with its exact saved reference',async()=>{
  const a=await workspace(),b=await workspace(),result={syntheticSecret:fresh()},saved=await studentRepo.savePrivateToolResult({studentReferenceId:a,executionId:fresh(),toolKey:'POST28_SYNTHETIC',result});
  expect(await students.readPrivateToolResult(a,saved.savedReference)).toEqual(result);await expect(students.readPrivateToolResult(b,saved.savedReference)).rejects.toThrow('STUDENT_PRIVATE_RESULT_NOT_FOUND');
  const row=await db.studentSavedItem.findUnique({where:{id:saved.savedReference}});expect(JSON.stringify(row.privateResultEnvelope)).not.toContain(result.syntheticSecret);expect(row.studentReferenceId).toBe(a);
 });
 it('rejects expired and suspended-owner private result reads against current PostgreSQL state',async()=>{
  const id=await workspace(),saved=await studentRepo.savePrivateToolResult({studentReferenceId:id,executionId:fresh(),toolKey:'POST28_SYNTHETIC',result:{synthetic:true}});
  await db.studentSavedItem.update({where:{id:saved.savedReference},data:{privateResultExpiresAt:new Date('2020-01-01')}});
  await expect(students.readPrivateToolResult(id,saved.savedReference)).rejects.toThrow('STUDENT_PRIVATE_RESULT_EXPIRED');
  expect((await db.studentSavedItem.findUnique({where:{id:saved.savedReference}})).privateResultEnvelope).toBeNull();
  await db.studentWorkspace.update({where:{id},data:{status:'SUSPENDED'}});await expect(students.readPrivateToolResult(id,saved.savedReference)).rejects.toThrow('STUDENT_WORKSPACE_SUSPENDED');
 });
 it('rejects cross-student collection updates and deletes without changing the owners record',async()=>{
  const a=await workspace(),b=await workspace(),id=fresh();await db.studentSavedCollection.create({data:{id,studentReferenceId:a,name:'Synthetic private collection',type:'PERSONAL'}});
  await expect(students.updateCollection(b,id,{name:'forbidden'})).rejects.toThrow('STUDENT_COLLECTION_NOT_FOUND');await expect(students.deleteCollection(b,id)).rejects.toThrow('STUDENT_COLLECTION_NOT_FOUND');
  expect((await db.studentSavedCollection.findUnique({where:{id}})).name).toBe('Synthetic private collection');expect(await db.auditRecord.count({where:{targetId:b}})).toBe(0);
  expect((await students.updateCollection(a,id,{name:'owner updated'})).name).toBe('owner updated');
 });
 it('creates an application-calculated draft with real canonical currency audit and outbox',async()=>{
  const {row}=await draft();expect(row.status).toBe('DRAFT');expect(row.totalAmount).toEqual(usd('3750'));
  expect(await db.auditRecord.count({where:{targetId:row.id,action:'FINANCE_INVOICE_DRAFT_CREATED'}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:row.id,eventType:'FINANCE_INVOICE_DRAFT_CREATED'}})).toBe(1);expect((await issueFacts(row.id)).transactions).toBe(0);
 });
 it('replays identical invoice creation and rejects reuse with a changed request',async()=>{
  const {input,ctx,row}=await draft();expect((await finance.createDraftInvoice(input,ctx)).id).toBe(row.id);
  await expect(finance.createDraftInvoice({...input,lineItems:lines('9999')},ctx)).rejects.toThrow('Invoice idempotency key was reused with a different request');
  expect(await db.financeInvoiceRecord.count({where:{originReferenceId:input.originReferenceId}})).toBe(1);expect(await db.auditRecord.count({where:{targetId:row.id}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:row.id}})).toBe(1);
 });
 it('replays a draft edit through its durable command receipt and rejects changed replay payload',async()=>{
  const {row}=await draft(),ctx={...identity(),expectedVersion:1};const updated=await finance.updateDraftInvoice(row.id,lines('2000'),ctx);
  expect(updated.version).toBe(2);expect(updated.totalAmount).toEqual(usd('6000'));expect((await finance.updateDraftInvoice(row.id,lines('2000'),ctx)).id).toBe(row.id);
  await expect(finance.updateDraftInvoice(row.id,lines('2001'),ctx)).rejects.toThrow('FINANCE_IDEMPOTENCY_CONFLICT');
  expect(await db.financeCommandRecord.count({where:{id:commandId(ctx)}})).toBe(1);expect(await db.auditRecord.count({where:{targetId:row.id,action:'FINANCE_INVOICE_DRAFT_UPDATED'}})).toBe(1);expect((await db.financeInvoiceRecord.findUnique({where:{id:row.id}})).version).toBe(2);
 });
 it('issues and replays an invoice once with exact balanced ledger and one durable receipt',async()=>{
  const {row}=await draft('900719925474099312345'),ctx={...identity(),expectedVersion:1};const issued=await finance.issueInvoice(row.id,ctx);expect(issued.status).toBe('ISSUED');expect((await finance.issueInvoice(row.id,ctx)).id).toBe(row.id);
  const facts=await issueFacts(row.id);expect(facts.transactions).toBe(1);expect(facts.entries).toHaveLength(2);expect(facts.audits).toBe(1);expect(facts.outbox).toBe(1);
  let net=0n;for(const e of facts.entries){expect(e.amountMinorUnits).toBe('2702159776422297937035');net+=(e.direction==='DEBIT'?1n:-1n)*BigInt(e.amountMinorUnits);}expect(net).toBe(0n);expect(await db.financeCommandRecord.count({where:{id:commandId(ctx)}})).toBe(1);
 });
 it('serializes competing invoice issuance requests without double posting',async()=>{
  const {row}=await draft(),ctx={...identity(),expectedVersion:1};const results=await Promise.allSettled([finance.issueInvoice(row.id,ctx),financeFacade(other).issueInvoice(row.id,ctx)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(2);expect((await db.financeInvoiceRecord.findUnique({where:{id:row.id}})).version).toBe(2);
  const facts=await issueFacts(row.id);expect(facts.transactions).toBe(1);expect(facts.entries).toHaveLength(2);expect(facts.audits).toBe(1);expect(facts.outbox).toBe(1);expect(await db.financeCommandRecord.count({where:{id:commandId(ctx)}})).toBe(1);
 });
 it('rolls invoice issuance ledger and audit back after a real PostgreSQL failure before outbox commit',async()=>{
  const {row}=await draft(),ctx={...identity(),expectedVersion:1};await expect(financeFacade(withOutboxFailure(db)).issueInvoice(row.id,ctx)).rejects.toThrow(/division by zero/);
  const persisted=await db.financeInvoiceRecord.findUnique({where:{id:row.id}});expect(persisted.status).toBe('DRAFT');expect(persisted.version).toBe(1);
  const facts=await issueFacts(row.id);expect(facts.transactions).toBe(0);expect(facts.entries).toHaveLength(0);expect(facts.audits).toBe(0);expect(facts.outbox).toBe(0);expect(await db.financeCommandRecord.count({where:{id:commandId(ctx)}})).toBe(0);
 });
 it('rejects maker self-approval and checker identity substitution without a decision or version change',async()=>{
  const {row,maker}=await approval();
  await expect(finance.decideApproval(row.id,'APPROVE',maker.actorId,undefined,{...maker,idempotencyKey:fresh(),expectedVersion:1})).rejects.toThrow('Maker cannot approve their own financial action');
  const checker=fresh();await expect(finance.decideApproval(row.id,'APPROVE',checker,undefined,{...identity(),actorId:fresh(),expectedVersion:1})).rejects.toThrow('FINANCE_CHECKER_IDENTITY_MISMATCH');
  expect(await db.financeApprovalDecisionRecord.count({where:{approvalId:row.id}})).toBe(0);expect((await db.financeApprovalRecord.findUnique({where:{id:row.id}})).version).toBe(1);
 });
 it('requires two distinct checkers and replays an old checker command without adding evidence',async()=>{
  const {row}=await approval(),a={...identity(),actorId:fresh(),expectedVersion:1},b={...identity(),actorId:fresh(),expectedVersion:2};
  expect((await finance.decideApproval(row.id,'APPROVE',a.actorId,undefined,a)).status).toBe('PENDING');
  expect((await finance.decideApproval(row.id,'APPROVE',b.actorId,undefined,b)).status).toBe('APPROVED');
  expect((await finance.decideApproval(row.id,'APPROVE',a.actorId,undefined,a)).id).toBe(row.id);
  const persisted=await db.financeApprovalRecord.findUnique({where:{id:row.id}});expect(persisted.status).toBe('APPROVED');expect(persisted.version).toBe(3);expect(persisted.consumedAt).toBeNull();
  expect(await db.financeApprovalDecisionRecord.count({where:{approvalId:row.id}})).toBe(2);expect(await db.auditRecord.count({where:{targetId:row.id,action:'FINANCE_APPROVAL_APPROVED'}})).toBe(2);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:row.id,eventType:'FINANCE_APPROVAL_APPROVED'}})).toBe(2);
 });
 it('deduplicates concurrent retries by the same financial checker on independent connections',async()=>{
  const {row}=await approval(),ctx={...identity(),actorId:fresh(),expectedVersion:1};
  const results=await Promise.allSettled([finance.decideApproval(row.id,'APPROVE',ctx.actorId,undefined,ctx),financeFacade(other).decideApproval(row.id,'APPROVE',ctx.actorId,undefined,ctx)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(2);const persisted=await db.financeApprovalRecord.findUnique({where:{id:row.id}});expect(persisted.version).toBe(2);expect(persisted.status).toBe('PENDING');
  expect(await db.financeApprovalDecisionRecord.count({where:{approvalId:row.id}})).toBe(1);expect(await db.financeCommandRecord.count({where:{id:commandId(ctx)}})).toBe(1);expect(await db.auditRecord.count({where:{targetId:row.id,action:'FINANCE_APPROVAL_APPROVED'}})).toBe(1);
 });
 it('rejects a stale competing checker version without a partial decision or false quorum',async()=>{
  const {row}=await approval(),a={...identity(),actorId:fresh(),expectedVersion:1},b={...identity(),actorId:fresh(),expectedVersion:1};
  const results=await Promise.allSettled([finance.decideApproval(row.id,'APPROVE',a.actorId,undefined,a),financeFacade(other).decideApproval(row.id,'APPROVE',b.actorId,undefined,b)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(String(results.find(r=>r.status==='rejected').reason)).toContain('FINANCE_VERSION_CONFLICT');
  const persisted=await db.financeApprovalRecord.findUnique({where:{id:row.id}});expect(persisted.version).toBe(2);expect(persisted.status).toBe('PENDING');expect(await db.financeApprovalDecisionRecord.count({where:{approvalId:row.id}})).toBe(1);
 });
 it('rolls a checker decision version receipt and audit back after PostgreSQL precommit failure',async()=>{
  const {row}=await approval(),ctx={...identity(),actorId:fresh(),expectedVersion:1};
  await expect(financeFacade(withOutboxFailure(db)).decideApproval(row.id,'APPROVE',ctx.actorId,undefined,ctx)).rejects.toThrow(/division by zero/);
  const persisted=await db.financeApprovalRecord.findUnique({where:{id:row.id}});expect(persisted.version).toBe(1);expect(persisted.status).toBe('PENDING');expect(await db.financeApprovalDecisionRecord.count({where:{approvalId:row.id}})).toBe(0);
  expect(await db.financeCommandRecord.count({where:{id:commandId(ctx)}})).toBe(0);expect(await db.auditRecord.count({where:{targetId:row.id,action:'FINANCE_APPROVAL_APPROVED'}})).toBe(0);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:row.id,eventType:'FINANCE_APPROVAL_APPROVED'}})).toBe(0);
 });

});
