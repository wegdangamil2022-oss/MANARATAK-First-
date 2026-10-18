import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID as fresh} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {ImportSourceDefinition} from '../../packages/domain/src/index.ts';
import {AcquireImportSourceUseCase} from '../../packages/application/src/import-foundation/use-cases/AcquireImportSourceUseCase.ts';
import {SourceConnectorRegistry} from '../../packages/application/src/import-foundation/services/SourceConnectorRegistry.ts';
import {StaticHtmlSourceConnector} from '../../packages/infrastructure/src/import-foundation/connectors/StaticHtmlSourceConnector.ts';
import {NodeSafeSourceHttpTransport} from '../../packages/infrastructure/src/import-foundation/network/NodeSafeSourceHttpTransport.ts';
import {LocalImportRawSnapshotStore} from '../../packages/infrastructure/src/import-foundation/LocalImportRawSnapshotStore.ts';
import {CourseImportCoordinator} from '../../packages/application/src/courses/use-cases/CourseImportCoordinator.ts';
import {PrismaCourseImportTransferGateway} from '../../packages/infrastructure/src/courses/PrismaCourseImportTransferGateway.ts';
import {PrismaCourseImportAnalysisRepository} from '../../packages/infrastructure/src/courses/PrismaCourseImportAnalysisRepository.ts';
import {PrismaCourseRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRepository.ts';
import {PrismaCourseRelationshipRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts';
import {PrismaImportedCourseOperationsRepository} from '../../packages/infrastructure/src/courses/PrismaImportedCourseOperationsRepository.ts';
import {PrismaExternalCourseProviderRepository} from '../../packages/infrastructure/src/courses/PrismaExternalCourseProviderRepository.ts';
import {SafeImportedCourseLinkChecker} from '../../packages/infrastructure/src/courses/SafeImportedCourseLinkChecker.ts';
import {AtomicDomainMutationCoordinator} from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts';
import {AtomicAuditedOutboxMutationExecutor} from '../../packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts';
import {PrismaAtomicPersistenceUnitOfWork} from '../../packages/infrastructure/src/event-foundation/PrismaAtomicPersistenceUnitOfWork.ts';
import {PrismaAuditRecordRepository} from '../../packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts';
import {PrismaTransactionalOutboxStore} from '../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts';
import {CoursePublicationService} from '../../packages/application/src/courses/services/CoursePublicationService.ts';
import {AdminCourseUseCases} from '../../packages/application/src/courses/use-cases/AdminCourseUseCases.ts';
import {ImportedCourseAdminUseCases} from '../../packages/application/src/courses/use-cases/ImportedCourseAdminUseCases.ts';
import {PublicCourseUseCases} from '../../packages/application/src/courses/use-cases/PublicCourseUseCases.ts';
import {CourseRelationshipQueryService} from '../../packages/application/src/courses/services/CourseRelationshipQueryService.ts';
import {CoursePublicRouter} from '../../apps/api/src/presentation/api/router/CoursePublicRouter.ts';
let db,app,courses,relations,analysisRepo,transfer,admin,imported,raw,certificate,store,language;
const actor='POST28_SYNTHETIC_SOURCE_REVIEWER',url='https://cs50.harvard.edu/x/';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const context=()=>({actorId:actor,correlationId:fresh(),source:'post28-real-source-local-only'});
async function fixture(){
 const key=fresh(),provider=await db.externalCourseProvider.create({data:{publicId:key,slug:key,canonicalName:key,normalizedCanonicalName:key,displayName:'CS50 official page — isolated test provider',status:'APPROVED',sourceTrustLevel:'OFFICIAL',importStrategy:'FILE',officialWebsite:url,directCoursePathPatterns:['^/x/'],allowedDomains:{create:{domain:'cs50.harvard.edu',normalizedDomain:'cs50.harvard.edu'}}}});
 // Provider approval and review actor are synthetic local fixtures, never claimed as production approvals.
 const {identity}=await analysisRepo.ensureSourceIdentity({providerId:provider.id,sourceNativeKey:'cs50x:2026',languageVersionKey:'english',identityStrategy:'EXPLICIT_NATIVE_ID',originalTitle:'CS50x 2026',normalizedOriginalTitle:'cs50x 2026',currentUrl:url});
 await analysisRepo.recordInitialUrl({courseSourceIdentityId:identity.id,url,normalizedUrl:url});
 const batch=await db.importBatch.create({data:{sourceSystem:'CS50_PUBLIC_MANUAL_REVIEW_LOCAL_TEST',dataType:'COURSES',batchStatus:'COMPLETED'}}),record=await db.importRecord.create({data:{batchId:batch.id,status:'COMPLETE',rawPayload:{manualSourceReview:true,rawArtifactId:raw.snapshot.artifactId,certificateArtifactId:certificate.snapshot.artifactId},sourceRowNumber:1}});
 // Explicit manual semantic review of the acquired official pages. No automatic HTML-to-course parser is asserted.
 const analysis=await db.courseImportAnalysis.create({data:{importRecordId:record.id,resolvedProviderId:provider.id,sourceNativeKey:'cs50x:2026',normalizedPayload:{semanticRow:{sourceOrder:1,providerLabel:provider.displayName,courseName:'CS50x 2026',directCourseUrl:url,studyFreeRaw:'Yes',freeCertificateRaw:'Yes',certificateTypeRaw:'CS50 Certificate (completion conditions apply; distinct from verified edX)',languageRaw:'English',studyLevelRaw:'Beginner',courseDurationRaw:'11 weeks',shortCourseTopicsRaw:'Computer Science'},identity:{providerId:provider.id,providerPublicId:provider.publicId,sourceNativeKey:'cs50x:2026',identityStrategy:'EXPLICIT_NATIVE_ID',languageVersionKey:'english',normalizedTitle:'cs50x 2026',normalizedUrl:url},provenance:{artifactSha256:raw.snapshot.contentHash,worksheetRowNumber:1}},eligibilityState:'PENDING_WP_IC_05',completenessState:'STAGED_COMPLETE',matchState:'NOT_DUPLICATE',changeState:'NEW',requiresReview:true,relationshipProposals:{sourceIdentityId:identity.id}}});
 return {provider,identity,batch,record,analysis};
}
const command=c=>({recordId:c.record.id,actorId:actor,approval:{expectedAnalysisId:c.analysis.id,approvedFields:[],reason:'Manual semantic review of actual official CS50 pages in isolated lab'}});
async function staged(){const c=await fixture(),result=await transfer.transfer(command(c));return {...c,...result};}
async function reviewed(c){
 await relations.reviewLanguageResolution({courseId:c.courseId,languageReferenceId:language.id,actorId:actor});
 const key=fresh(),node=await db.academicTaxonomyNode.create({data:{deterministicKey:key,nodeType:'DISCIPLINE',canonicalCode:key,canonicalName:'Computer Science',status:'ACTIVE'}}),link=await relations.createManualTaxonomyLink({courseId:c.courseId,taxonomyNodeId:node.id,relationshipType:'RELATED',actorId:actor});
 await relations.reviewTaxonomyLink({courseId:c.courseId,linkId:link.id,decision:'APPROVED',actorId:actor});
 const verified=await imported.checkLink(c.courseId);expect(['VERIFIED_DIRECT','REDIRECTED_VALID']).toContain(verified.state);expect(verified.responseCode).toBe(200);
 await admin.markReadyToReview(c.courseId);await imported.markReady(c.courseId);return c;
}
async function published(){const c=await reviewed(await staged());await imported.publish(c.courseId,context());return {...c,course:await courses.findById(c.courseId)};}
const detail=c=>request(app).get('/courses/'+c.course.slug);
describe('Post28 actual public raw course source through controlled manual review and publication',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='real-course-source'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
  const lab=path.dirname(process.env.POST28_TARGET_CONTRACT_FILE);store=new LocalImportRawSnapshotStore(path.join(lab,'public-source-raw'));
  const acquire=new AcquireImportSourceUseCase(new SourceConnectorRegistry([new StaticHtmlSourceConnector(new NodeSafeSourceHttpTransport())]),store);
  const source=new ImportSourceDefinition({sourceId:'POST28_CS50_PUBLIC',displayName:'CS50 official public manual review',baseUrl:url,category:'STATIC_HTML',accessClassification:'PUBLIC_ALLOWED',status:'ACTIVE',connectorId:'static-html',connectorVersion:'2.0.0',metadata:{allowedUrlScope:{allowedOrigins:['https://cs50.harvard.edu'],allowedPathPrefixes:['/x/']}}});
  raw=await acquire.execute(source,{maxResponseBytes:256*1024,timeoutMs:15000,maxRedirects:2});certificate=await acquire.execute(source,{targetUrl:url+'certificate/',maxResponseBytes:256*1024,timeoutMs:15000,maxRedirects:2});
  fs.writeFileSync(path.join(lab,'real-course-source-network.json'),JSON.stringify({manualSemanticReview:true,automatedHtmlParser:false,localSnapshotClassification:store.persistenceClassification,requests:[raw,certificate].map(r=>({artifactId:r.snapshot.artifactId,sha256:r.snapshot.contentHash,byteSize:r.snapshot.byteSize,statusCode:r.acquisition.statusCode,requestedUrl:r.acquisition.requestedUrl,finalUrl:r.acquisition.finalUrl,fetchedAt:r.acquisition.fetchedAt,attempts:r.attempts}))},null,2)+'\n',{flag:'wx'});
  db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');courses=new PrismaCourseRepository(db);relations=new PrismaCourseRelationshipRepository(db);analysisRepo=new PrismaCourseImportAnalysisRepository(db);
  const atomic=new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(db),new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db))),operations=new PrismaImportedCourseOperationsRepository(db),publication=new CoursePublicationService(courses,operations,atomic,relations);
  transfer=new CourseImportCoordinator(new PrismaCourseImportTransferGateway(db),courses,atomic);admin=new AdminCourseUseCases(courses,publication);imported=new ImportedCourseAdminUseCases(operations,new PrismaExternalCourseProviderRepository(db),admin,new SafeImportedCourseLinkChecker());language=await db.referenceLanguage.upsert({where:{isoCode:'en'},create:{isoCode:'en',name:'English',direction:'LTR'},update:{}});
  app=express();app.use('/courses',CoursePublicRouter.create({publicCourseUseCases:new PublicCourseUseCases(courses),courseRelationshipQueryService:new CourseRelationshipQueryService(relations)}));
 },60000);
 afterAll(async()=>{await db?.$disconnect();});
 it('materializes actual GET bytes with digest readback and separate certificate terms evidence',async()=>{for(const item of [raw,certificate]){expect(item.acquisition.statusCode).toBe(200);const bytes=await store.read(item.snapshot.artifactId);expect(bytes.byteLength).toBe(item.snapshot.byteSize);expect(digest(bytes)).toBe(item.snapshot.contentHash);}expect(Buffer.from(raw.acquisition.rawBytes).toString()).toContain('eleven');expect(Buffer.from(certificate.acquisition.rawBytes).toString()).toMatch(/free/i);});
 it('blocks unapproved source review and keeps imported owner hidden until publication',async()=>{const c=await fixture();await expect(transfer.transfer({recordId:c.record.id,actorId:actor})).rejects.toThrow('COURSE_IMPORT_REVIEW_APPROVAL_REQUIRED');expect(await db.course.count({where:{externalProviderId:c.provider.id}})).toBe(0);const r=await transfer.transfer(command(c)),course=await courses.findById(r.courseId);expect(course.status).toBe('IMPORTED');expect((await request(app).get('/courses/'+course.slug)).status).toBe(404);expect((await db.courseFieldProvenance.findMany({where:{courseId:r.courseId}})).every(p=>p.sourceArtifactHash===raw.snapshot.contentHash)).toBe(true);});
 it('requires canonical language and source topic review before real HEAD check and explicit publication',async()=>{const c=await staged();await expect(admin.markReadyToPublish(c.courseId)).rejects.toThrow('COURSE_REVIEW_REQUIRED');await admin.markReadyToReview(c.courseId);await expect(admin.markReadyToPublish(c.courseId)).rejects.toThrow('CANONICAL_LANGUAGE_REQUIRED');await reviewed(c);await imported.publish(c.courseId,context());const course=await courses.findById(c.courseId),r=await request(app).get('/courses/'+course.slug);expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.body.isStudyFree).toBe(true);expect(r.body.isFreeCertificate).toBe(true);expect(r.body.certificateType).toContain('distinct from verified edX');expect(await db.auditRecord.count({where:{targetId:c.courseId,action:'COURSE_PUBLISHED'}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:c.courseId,eventType:'CoursePublished'}})).toBe(1);});
 it('withdraws published language-filtered page count and detail immediately when canonical language is deactivated',async()=>{const c=await published();expect((await detail(c)).status).toBe(200);const query=()=>request(app).get('/courses').query({learningLanguageReferenceId:language.id,platformName:c.provider.displayName,limit:100});const before=await query();expect(before.status).toBe(200);expect(before.body.data.some(x=>x.slug===c.course.slug)).toBe(true);await db.referenceLanguage.update({where:{id:language.id},data:{isActive:false,lifecycleState:'INACTIVE'}});try{expect((await detail(c)).status).toBe(404);const r=await query();expect(r.status).toBe(200);expect(r.body.total).toBe(0);expect(r.body.data).toEqual([]);}finally{await db.referenceLanguage.update({where:{id:language.id},data:{isActive:true,lifecycleState:'ACTIVE'}});}});
 it('withdraws published owner after provider approval is removed and restores only the still-valid graph',async()=>{const c=await published();expect((await detail(c)).status).toBe(200);await db.externalCourseProvider.update({where:{id:c.provider.id},data:{status:'SUSPENDED'}});expect((await detail(c)).status).toBe(404);await expect(imported.verifySource(c.courseId)).rejects.toThrow('PROVIDER_NOT_APPROVED');await db.externalCourseProvider.update({where:{id:c.provider.id},data:{status:'APPROVED'}});expect((await detail(c)).status).toBe(200);});
 it('preserves published canonical owner and transfer receipt on replay without reissuing audit events',async()=>{const c=await published(),record=await db.importRecord.findUnique({where:{id:c.record.id}}),before=await db.course.findUnique({where:{id:c.courseId}});const r=await transfer.transfer(command(c));expect(r.courseId).toBe(c.courseId);expect(await db.importRecord.findUnique({where:{id:c.record.id}})).toEqual(record);expect(await db.course.findUnique({where:{id:c.courseId}})).toEqual(before);expect(await db.auditRecord.count({where:{targetId:c.record.id,action:'COURSE_IMPORT_TRANSFERRED'}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:c.record.id,eventType:'COURSE_IMPORT_TRANSFERRED'}})).toBe(1);expect((await detail(c)).status).toBe(200);});
 it('fails closed for unregistered fetch-missing adapter instead of arbitrary crawling',async()=>{const c=await staged(),before=await db.course.findUnique({where:{id:c.courseId}});await expect(imported.fetchMissing(c.courseId)).rejects.toThrow('COURSE_FETCH_MISSING_PROVIDER_POLICY_FILE_ONLY');expect(await db.course.findUnique({where:{id:c.courseId}})).toEqual(before);});
});
