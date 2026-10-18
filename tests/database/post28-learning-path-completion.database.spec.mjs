import {randomUUID as fresh} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {LearningPathUseCases} from '../../packages/application/src/courses/use-cases/LearningPathUseCases.ts';
import {CourseProgressUseCases} from '../../packages/application/src/courses/use-cases/CourseProgressUseCases.ts';
import {PrismaLearningPathRepository} from '../../packages/infrastructure/src/courses/PrismaLearningPathRepository.ts';
import {PrismaCourseRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRepository.ts';
import {PrismaCourseCurriculumRepository} from '../../packages/infrastructure/src/courses/PrismaCourseCurriculumRepository.ts';
import {PrismaCourseProgressRepository} from '../../packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts';
import {CertificateUseCases} from '../../packages/application/src/certificates/use-cases/CertificateUseCases.ts';
import {CertificateCompletionEventConsumer} from '../../packages/application/src/certificates/use-cases/CertificateCompletionEventConsumer.ts';
import {PrismaCertificateRepository} from '../../packages/infrastructure/src/certificates/PrismaCertificateRepository.ts';
import {AtomicDomainMutationCoordinator} from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts';
import {AtomicAuditedOutboxMutationExecutor} from '../../packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts';
import {PrismaAtomicPersistenceUnitOfWork} from '../../packages/infrastructure/src/event-foundation/PrismaAtomicPersistenceUnitOfWork.ts';
import {PrismaTransactionalOutboxStore} from '../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts';
import {PrismaAuditRecordRepository} from '../../packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts';
let db,paths,progress,courses,consumer;
const atomic=client=>new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(client),new PrismaAuditRecordRepository(client),new PrismaTransactionalOutboxStore(client)));
async function fixture(certificateEligible=false){
 const key=fresh(),student=fresh();
 // Synthetic published native Course prerequisite; actual learning-path author transitions below.
 const c=await courses.create({publicId:key,slug:key,canonicalName:key,canonicalDedupKey:key,displayName:'Synthetic path course',accessType:'FREE_STUDY_AND_CERTIFICATE',originType:'NATIVE_MANARATAK_COURSE',directCourseUrl:'https://example.invalid/'+key,status:'PUBLISHED',completenessStatus:'COMPLETE',certificateAvailable:true});
 const p=await paths.create({title:'Synthetic path '+key,certificateEligible,courses:[{courseId:c.id,position:1,required:true,prerequisiteCourseIds:[]}]});await paths.markReadyToPublish(p.id);await paths.publish(p.id);const enrollment=await paths.enroll(p.id,student);
 return {course:c.id,path:p.id,student,enrollment};
}
async function finish(c){await progress.enroll(c.course,c.student);await db.courseEnrollment.update({where:{courseId_studentReferenceId:{courseId:c.course,studentReferenceId:c.student}},data:{progressPercentage:100}});await progress.completeCourse(c.course,c.student);}
async function event(c){return db.transactionalOutboxRecord.findFirst({where:{aggregateId:c.enrollment.id,eventType:'LearningPathCompleted'}});}
describe('CD028 real LearningPath completion policy and durable event',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='learning-path-completion'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');
  courses=new PrismaCourseRepository(db);const repo=new PrismaLearningPathRepository(db),courseProgress=new PrismaCourseProgressRepository(db);paths=new LearningPathUseCases(repo,courses,courseProgress,atomic(db));progress=new CourseProgressUseCases(courses,new PrismaCourseCurriculumRepository(db),courseProgress,undefined,undefined,atomic(db));consumer=new CertificateCompletionEventConsumer(new CertificateUseCases(new PrismaCertificateRepository(db),courses,undefined,{},repo));
 });
 afterAll(async()=>{await db?.$disconnect();});
 it('completes a real authored path but preserves its current non-credential event policy',async()=>{
  const c=await fixture();await finish(c);const result=await paths.refreshProgress(c.path,c.student);expect(result.status).toBe('COMPLETED');expect(result.progressPercentage).toBe(100);const e=await event(c);expect(e).not.toBeNull();expect(e.payload).toMatchObject({learningPathId:c.path,learningPathVersion:c.enrollment.learningPathVersion,studentReferenceId:c.student,eligibleForCertificate:false});expect(await db.auditRecord.count({where:{targetId:c.enrollment.id,action:'LEARNING_PATH_COMPLETED'}})).toBe(1);
  expect(await consumer.consume(e)).toBeNull();expect(await consumer.consume(e)).toBeNull();expect(await db.certificate.count({where:{sourceEventId:e.id}})).toBe(0);expect(await db.certificateIssuanceInbox.count({where:{eventId:e.id}})).toBe(0);
 });
 it('does not create a completion event or certificate while required Course completion is absent',async()=>{const c=await fixture();const result=await paths.refreshProgress(c.path,c.student);expect(result.status).toBe('ACTIVE');expect(result.progressPercentage).toBe(0);expect(await event(c)).toBeNull();expect(await db.certificate.count({where:{studentReferenceId:c.student}})).toBe(0);});
 it('emits eligible completion only for an explicitly opted-in published version and still requires a governed issuer',async()=>{const c=await fixture(true);expect((await paths.get(c.path)).certificateEligible).toBe(true);await finish(c);await paths.refreshProgress(c.path,c.student);const e=await event(c);expect(e.payload.eligibleForCertificate).toBe(true);await expect(consumer.consume(e)).rejects.toThrow('ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED');expect(await db.certificate.count({where:{sourceEventId:e.id}})).toBe(0);});
 for(const policy of [{enabled:true},{schemaVersion:2,enabled:true}])it(`treats unrecognized eligibility policy ${JSON.stringify(policy)} as non-credential historical data`,async()=>{const c=await fixture();const v=await db.learningPathVersion.findUnique({where:{learningPathId_versionNumber:{learningPathId:c.path,versionNumber:c.enrollment.learningPathVersion}}});await db.learningPathVersion.update({where:{id:v.id},data:{snapshot:{...v.snapshot,certificateEligibility:policy}}});await finish(c);await paths.refreshProgress(c.path,c.student);const e=await event(c);expect(e.payload.eligibleForCertificate).toBe(false);expect(await consumer.consume(e)).toBeNull();});
 it('completes against the enrolled immutable version after the current owner points to a new version',async()=>{const c=await fixture();await finish(c);await db.learningPathVersion.create({data:{learningPathId:c.path,versionNumber:c.enrollment.learningPathVersion+1,status:'DRAFT',snapshot:{title:'Synthetic later draft',courses:[]}}});await db.learningPath.update({where:{id:c.path},data:{version:c.enrollment.learningPathVersion+1,status:'DRAFT'}});const result=await paths.refreshProgress(c.path,c.student);expect(result.status).toBe('COMPLETED');expect(result.learningPathVersion).toBe(c.enrollment.learningPathVersion);const e=await event(c);expect(e.payload.learningPathVersion).toBe(c.enrollment.learningPathVersion);expect(e.payload.eligibleForCertificate).toBe(false);expect(await consumer.consume(e)).toBeNull();});
});
