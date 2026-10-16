import {randomUUID} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {PrismaStudentApplicationTrackerRepository} from '../../packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts';
import {StudentDocumentReviewUseCases} from '../../packages/application/src/students/use-cases/StudentDocumentReviewUseCases.ts';
const fresh=()=> 'post28-doc-'+randomUUID();
let db,other,repo,otherRepo;
async function fixture(overrides={}){
 const student=fresh(),tracker=fresh(),asset=fresh(),id=fresh(),requirementId=fresh(),ownerVersionId=fresh(),cycleId=fresh();
 await db.studentWorkspace.create({data:{id:student,studentReferenceId:student,status:'ACTIVE'}});
 await db.studentApplicationTracker.create({data:{id:tracker,studentReferenceId:student,scholarshipId:fresh(),cycleReferenceId:cycleId}});
 // Synthetic persisted fixture for consent tests only; not a delivery certification.
 await db.assetRecord.create({data:{id:asset,reference:asset,ownerId:student,ownerType:'STUDENT',lifecycleState:'ACTIVE',securityClassification:'INTERNAL',retentionCategory:'PERMANENT',metadata:{synthetic:true}}});
 await db.studentApplicationDocumentBinding.create({data:{id,trackerId:tracker,assetId:asset,requirementId,ownerVersionId,requirementSnapshot:{displayName:'Synthetic document'},consentGrantedAt:new Date(),reviewConsentGrantedAt:new Date(Date.now()-1000),reviewConsentUntil:new Date(Date.now()+3600000),retentionUntil:new Date(Date.now()+7200000),...overrides}});
 return {student,tracker,asset,id,requirementId,ownerVersionId,cycleId};
}
// Explicit owner/asset/delivery port fixtures: the review application and Prisma
// repository/transactions/audit/outbox are real; cloud delivery is not tested.
function useCases(c,onMint=async()=>{}){
 const scholarships={resolve:async()=>{const t=await db.studentApplicationTracker.findUnique({where:{id:c.tracker}});return {available:true,id:t.scholarshipId,cycleId:c.cycleId,ownerVersionId:c.ownerVersionId,requirements:[{id:c.requirementId}]};}};
 const assets={assertUsable:async()=>({checksum:{hash:'a'.repeat(64)},metadata:{mimeType:'application/pdf'},retention:{expiresAt:null}})};
 const lifecycle={requestDeliveryGrant:vi.fn(async()=>{await onMint();return {url:'https://storage.invalid/synthetic',headers:{},expiresAt:new Date(Date.now()+30000).toISOString()};})};
 return {app:new StudentDocumentReviewUseCases(repo,scholarships,assets,lifecycle),lifecycle};
}
async function countAudit(c){return db.auditRecord.count({where:{targetId:c.id,category:'STUDENT_DOCUMENT_REVIEW'}});}
describe('Post28 document consent with real PostgreSQL owner persistence',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='document-consent'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw new Error('POST28_DB_T_RUNNER_REQUIRED');
  db=new PrismaClient({log:[],errorFormat:'minimal'});other=new PrismaClient({log:[],errorFormat:'minimal'});
  await Promise.all([db.$connect(),other.$connect()]);repo=new PrismaStudentApplicationTrackerRepository(db);otherRepo=new PrismaStudentApplicationTrackerRepository(other);
  const [[a],[b]]=await Promise.all([db.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`,other.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`]);expect(a.pid).not.toBe(b.pid);expect(a.role).toBe('post28_app');expect(b.role).toBe('post28_app');
 });
 afterAll(async()=>{await Promise.all([db?.$disconnect(),other?.$disconnect()]);});
 it('records one consented access through the real repository',async()=>{const c=await fixture();await repo.recordDocumentReviewAccess(c.id,1,'reviewer');expect(await countAudit(c)).toBe(1);});
 it('rejects empty and whitespace reviewer with no access audit',async()=>{const c=await fixture();for(const actor of ['','   '])await expect(repo.recordDocumentReviewAccess(c.id,1,actor)).rejects.toThrow('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');expect(await countAudit(c)).toBe(0);});
 it('rejects future consent in access and excludes it from pending queue',async()=>{const c=await fixture({reviewConsentGrantedAt:new Date(Date.now()+1800000)});await expect(repo.recordDocumentReviewAccess(c.id,1,'reviewer')).rejects.toThrow('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');expect((await repo.listPendingDocumentReviews()).items.some(x=>x.id===c.id)).toBe(false);expect(await countAudit(c)).toBe(0);});
 it('excludes expired documents from pending queue and refuses access',async()=>{const c=await fixture({expiresAt:new Date(Date.now()-1000)});await expect(repo.recordDocumentReviewAccess(c.id,1,'reviewer')).rejects.toThrow('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');expect((await repo.listPendingDocumentReviews()).items.some(x=>x.id===c.id)).toBe(false);});
 it('withdraws consent with version timeline audit and outbox atomically and stops later access',async()=>{
  const c=await fixture();await repo.setDocumentReviewConsent(c.student,c.tracker,c.requirementId,1,false);
  const b=await db.studentApplicationDocumentBinding.findUnique({where:{id:c.id}});expect(b.reviewConsentGrantedAt).toBeNull();expect(b.reviewConsentUntil).toBeNull();expect((await db.studentApplicationTracker.findUnique({where:{id:c.tracker}})).version).toBe(2);
  expect(await db.auditRecord.count({where:{targetId:c.tracker,action:'StudentDocumentReviewWithdrawn'}})).toBe(1);expect(await db.studentTimelineEntry.count({where:{sourceReferenceId:c.tracker,eventType:'StudentDocumentReviewWithdrawn'}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:c.tracker}})).toBe(1);
  await expect(repo.recordDocumentReviewAccess(c.id,2,'reviewer')).rejects.toThrow('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');expect(await countAudit(c)).toBe(0);
 });
 it('refuses another student withdrawal without changing consent or tracker version',async()=>{const c=await fixture();await expect(repo.setDocumentReviewConsent(fresh(),c.tracker,c.requirementId,1,false)).rejects.toThrow('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');expect((await db.studentApplicationTracker.findUnique({where:{id:c.tracker}})).version).toBe(1);expect((await db.studentApplicationDocumentBinding.findUnique({where:{id:c.id}})).reviewConsentUntil).not.toBeNull();});
 it('allows one of two concurrent consent CAS writers without duplicate events',async()=>{
  const c=await fixture();const results=await Promise.allSettled([repo.setDocumentReviewConsent(c.student,c.tracker,c.requirementId,1,false),otherRepo.setDocumentReviewConsent(c.student,c.tracker,c.requirementId,1,true)]);
  expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(String(results.find(x=>x.status==='rejected').reason)).toContain('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');expect((await db.studentApplicationTracker.findUnique({where:{id:c.tracker}})).version).toBe(2);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:c.tracker}})).toBe(1);
 });
 it('returns a delivery fixture only while current consent remains valid',async()=>{const c=await fixture(),{app,lifecycle}=useCases(c);const result=await app.open(c.id,'reviewer');expect(result.id).toBe(c.id);expect(lifecycle.requestDeliveryGrant).toHaveBeenCalledOnce();expect(await countAudit(c)).toBe(1);});
 it('refuses returning an in-flight grant after another connection withdraws consent',async()=>{
  const c=await fixture(),{app,lifecycle}=useCases(c,()=>otherRepo.setDocumentReviewConsent(c.student,c.tracker,c.requirementId,1,false));
  await expect(app.open(c.id,'reviewer')).rejects.toThrow('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');expect(lifecycle.requestDeliveryGrant).toHaveBeenCalledOnce();expect(await countAudit(c)).toBe(1);expect((await db.studentApplicationDocumentBinding.findUnique({where:{id:c.id}})).reviewConsentUntil).toBeNull();
 });
 it('rejects a later application request before minting after withdrawal',async()=>{
  const c=await fixture();await repo.setDocumentReviewConsent(c.student,c.tracker,c.requirementId,1,false);const {app,lifecycle}=useCases(c);await expect(app.open(c.id,'reviewer')).rejects.toThrow('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');expect(lifecycle.requestDeliveryGrant).not.toHaveBeenCalled();expect(await countAudit(c)).toBe(0);
 });
});
