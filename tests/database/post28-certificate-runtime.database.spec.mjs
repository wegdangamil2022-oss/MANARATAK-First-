import fs from 'node:fs';
import path from 'node:path';
import {randomUUID as fresh,randomBytes,createHash} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {AssetId,AssetRecord,AssetReference,AssetOwnerReference,AssetStorageLocator,AssetMetadata,AssetChecksum,AssetSanitizationMetadata,AssetRetentionMetadata,AssetRetentionCategory,AssetSecurityClassification,AssetLifecycleState,AssetStorageZone} from '@manaratak/domain';
import {PrismaAssetRecordRepository} from '../../packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts';
import {CertificateUseCases} from '../../packages/application/src/certificates/use-cases/CertificateUseCases.ts';
import {CertificateReadModelService} from '../../packages/application/src/certificates/use-cases/CertificateReadModelService.ts';
import {CertificateCompletionEventConsumer} from '../../packages/application/src/certificates/use-cases/CertificateCompletionEventConsumer.ts';
import {CertificateCompletionOutboxDeliveryGateway} from '../../packages/application/src/certificates/use-cases/CertificateCompletionOutboxDeliveryGateway.ts';
import {CertificateCompletionOutboxWorker} from '../../packages/application/src/certificates/use-cases/CertificateCompletionOutboxWorker.ts';
import {TransactionalOutboxDispatcher} from '../../packages/application/src/event-foundation/use-cases/TransactionalOutboxDispatcher.ts';
import {CertificatePublicRouter} from '../../apps/api/src/presentation/api/router/CertificatePublicRouter.ts';
import {PrismaCertificateRepository} from '../../packages/infrastructure/src/certificates/PrismaCertificateRepository.ts';
import {PrismaCourseRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRepository.ts';
import {PrismaCourseCurriculumRepository} from '../../packages/infrastructure/src/courses/PrismaCourseCurriculumRepository.ts';
import {PrismaCourseProgressRepository} from '../../packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts';
import {CourseProgressUseCases} from '../../packages/application/src/courses/use-cases/CourseProgressUseCases.ts';
import {LearningPathUseCases} from '../../packages/application/src/courses/use-cases/LearningPathUseCases.ts';
import {PrismaLearningPathRepository} from '../../packages/infrastructure/src/courses/PrismaLearningPathRepository.ts';
import {AtomicDomainMutationCoordinator} from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts';
import {AtomicAuditedOutboxMutationExecutor} from '../../packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts';
import {PrismaAtomicPersistenceUnitOfWork} from '../../packages/infrastructure/src/event-foundation/PrismaAtomicPersistenceUnitOfWork.ts';
import {PrismaTransactionalOutboxStore} from '../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts';
import {PrismaAuditRecordRepository} from '../../packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts';
import {ProviderNeutralCertificateRenderingService} from '../../packages/infrastructure/src/certificates/ProviderNeutralCertificateRenderingService.ts';

let db,other,certificates,otherCertificates,repository,issuer,template,app,authorityChecks;
const keyReference='lab-hmac://post28-synthetic-certificate',secret=randomBytes(32).toString('hex');
const maker='POST28_SYNTHETIC_AUTHOR',checker='POST28_SYNTHETIC_REVIEWER';
const context=(actorId,patch={})=>({actorId,reason:'Synthetic isolated owner workflow; not project technical approval',correlationId:fresh(),...patch});
function facade(client){return new CertificateUseCases(new PrismaCertificateRepository(client),new PrismaCourseRepository(client),new PrismaAssetRecordRepository(client),{signingSecret:secret,signingKeyReference:keyReference,productionLike:false,publicVerificationBaseUrl:'http://localhost:5173'},new PrismaLearningPathRepository(client),undefined,new PrismaCourseCurriculumRepository(client));}

// Inert synthetic historical trust fixtures. Bytes are materialized and hashed;
// no fresh antivirus/sanitizer run or production issuer approval is represented.
async function asset(ownerId,ownerType){
 const id=fresh(),bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64'),hash=createHash('sha256').update(bytes).digest('hex');
 const directory=path.join(path.dirname(process.env.POST28_TARGET_CONTRACT_FILE),'certificate-synthetic-assets');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,id+'.png'),bytes,{flag:'wx'});
 const quarantine=new AssetStorageLocator(AssetStorageZone.QUARANTINE,'post28-certificates','uploads/'+id+'.png');
 await new PrismaAssetRecordRepository(db).save(new AssetRecord({id:new AssetId(id),reference:new AssetReference('post28-'+id),owner:new AssetOwnerReference(ownerId,ownerType),locator:new AssetStorageLocator(AssetStorageZone.CLEAN,'post28-certificates','clean/'+id+'.png'),metadata:new AssetMetadata('synthetic.png','image/png','png',bytes.length),retention:new AssetRetentionMetadata(AssetRetentionCategory.TEMPORARY,new Date(Date.now()+180*86400000)),classification:AssetSecurityClassification.INTERNAL,state:AssetLifecycleState.ACTIVE,checksum:new AssetChecksum('sha256',hash),sanitization:new AssetSanitizationMetadata(true,new Date(),'Synthetic historical trust fixture only'),malwareScan:{status:'PASSED',scannedAt:new Date().toISOString(),locator:quarantine.value},uploadVerification:{locator:quarantine.value,byteSize:bytes.length,verifiedMimeType:'image/png',checksumSha256:hash,verifiedAt:new Date().toISOString(),signatureVerified:true}}));
 return id;
}
async function completion(){
 const key=fresh(),student=fresh(),courses=new PrismaCourseRepository(db);
 const saved=await courses.create({publicId:key,slug:key,canonicalName:key,canonicalDedupKey:key,displayName:'Synthetic credential course',accessType:'FREE_STUDY_AND_CERTIFICATE',originType:'NATIVE_MANARATAK_COURSE',directCourseUrl:'https://course.example.invalid/'+key,status:'PUBLISHED',completenessStatus:'COMPLETE',certificateAvailable:true});
 const id=saved.id;
 const progress=new CourseProgressUseCases(courses,new PrismaCourseCurriculumRepository(db),new PrismaCourseProgressRepository(db),undefined,undefined,new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(db),new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db))));
 await progress.enroll(id,student);await db.courseEnrollment.update({where:{courseId_studentReferenceId:{courseId:id,studentReferenceId:student}},data:{progressPercentage:100}});await progress.completeCourse(id,student);
 return db.transactionalOutboxRecord.findFirstOrThrow({where:{aggregateId:id+':'+student,eventType:'CourseCompleted'}});
}
// Materialized rendered bytes with synthetic historical ACTIVE trust only.
// This fixture does not represent fresh EAP ingestion, scan or sanitization.
async function renderedPdfFixture(cert){
 const version=await repository.findTemplateVersionById(cert.templateVersionId),lab=path.dirname(process.env.POST28_TARGET_CONTRACT_FILE);
 const rendered=await new ProviderNeutralCertificateRenderingService({resolve:async(id,hash)=>{const bytes=fs.readFileSync(path.join(lab,'certificate-synthetic-assets',id+'.png'));expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);return {bytes,mimeType:'image/png'};}}).render({certificate:cert,templateVersion:version});
 const bytes=Buffer.from(rendered.artifacts.find(row=>row.kind==='PDF').bytes),id=fresh(),hash=createHash('sha256').update(bytes).digest('hex'),file=path.join(lab,'certificate-synthetic-assets',id+'.pdf');fs.writeFileSync(file,bytes,{flag:'wx'});
 const locator=new AssetStorageLocator(AssetStorageZone.CLEAN,'post28-certificates','clean/'+id+'.pdf'),quarantine=new AssetStorageLocator(AssetStorageZone.QUARANTINE,'post28-certificates','uploads/'+id+'.pdf');
 await new PrismaAssetRecordRepository(db).save(new AssetRecord({id:new AssetId(id),reference:new AssetReference('post28-render-fixture-'+id),owner:new AssetOwnerReference(cert.id,'Certificate'),locator,metadata:new AssetMetadata('synthetic-rendered.pdf','application/pdf','pdf',bytes.length),retention:new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),classification:AssetSecurityClassification.INTERNAL,state:AssetLifecycleState.ACTIVE,checksum:new AssetChecksum('sha256',hash),sanitization:new AssetSanitizationMetadata(true,new Date(),'Synthetic historical trust fixture; NOT fresh EAP processing'),malwareScan:{status:'PASSED',scannedAt:new Date().toISOString(),locator:quarantine.value},uploadVerification:{locator:quarantine.value,byteSize:bytes.length,verifiedMimeType:'application/pdf',checksumSha256:hash,verifiedAt:new Date().toISOString(),signatureVerified:true}}));
 return {id,file,hash,bytes};
}
const consume=(event,facade=certificates)=>new CertificateCompletionEventConsumer(facade).consume(event);
async function pathCompletion(){
 const completed=await completion(),{courseId,studentReferenceId}=completed.payload;
 const paths=new LearningPathUseCases(new PrismaLearningPathRepository(db),new PrismaCourseRepository(db),new PrismaCourseProgressRepository(db),new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(db),new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db))));
 const path=await paths.create({title:'Synthetic credential path '+fresh(),certificateEligible:true,courses:[{courseId,position:1,required:true,prerequisiteCourseIds:[]}]});await paths.markReadyToPublish(path.id);await paths.publish(path.id);const enrollment=await paths.enroll(path.id,studentReferenceId);await paths.refreshProgress(path.id,studentReferenceId);
 const event=await db.transactionalOutboxRecord.findFirstOrThrow({where:{aggregateId:enrollment.id,eventType:'LearningPathCompleted'}});expect(event.payload.eligibleForCertificate).toBe(true);return event;
}
async function effects(event){const rows=await db.certificate.findMany({where:{sourceEventId:event.id}});return {rows,inbox:await db.certificateIssuanceInbox.findMany({where:{eventId:event.id}}),ledgers:rows.length?await db.certificateLedgerEntry.findMany({where:{certificateId:rows[0].id}}):[],audit:rows.length?await db.auditRecord.count({where:{targetId:rows[0].id}}):0};}
const verify=cert=>request(app).get('/certificates/verify/'+cert.verificationCode);

describe('Post28 actual synthetic certificate owner issuance and verification workflow',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='certificate-runtime'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
  db=new PrismaClient({log:[],errorFormat:'minimal'});other=new PrismaClient({log:[],errorFormat:'minimal'});await Promise.all([db.$connect(),other.$connect()]);
  const [[a],[b]]=await Promise.all([db.$queryRaw`SELECT current_user AS role,pg_backend_pid() AS pid`,other.$queryRaw`SELECT current_user AS role,pg_backend_pid() AS pid`]);expect(a.role).toBe('post28_app');expect(b.role).toBe('post28_app');expect(a.pid).not.toBe(b.pid);
  repository=new PrismaCertificateRepository(db);certificates=facade(db);otherCertificates=facade(other);
  const logo=await asset(fresh(),'CertificateIssuer');
  issuer=await certificates.createIssuer({code:'MANARATAK',name:'Synthetic local MANARATAK issuer',issuerType:'MANARATAK',issuerLogoAssetId:logo,signingKeyReference:keyReference},context(maker));
  const evidence=await asset(issuer.id,'CertificateIssuer'),approval={expectedIssuerUpdatedAt:issuer.updatedAt.toISOString()};
  await expect(certificates.approveIssuer(issuer.id,evidence,'POST28:SYNTHETIC:AUTHORITY',context(maker,approval))).rejects.toThrow('MAKER_CHECKER_REQUIRED');
  issuer=await certificates.approveIssuer(issuer.id,evidence,'POST28:SYNTHETIC:AUTHORITY',context(checker,approval));
  template=await certificates.createTemplate({code:'MNR-SIGNATURE',name:'MANARATAK Signature Certificate',nameAr:'قالب صناعي للاختبار',nameEn:'Synthetic local template',templateVersion:'1.0.0',issuerId:issuer.id,language:'BILINGUAL',layout:'LANDSCAPE',accentColor:'#142B5F',secondaryColor:'#D6A43B',titleAr:'شهادة صناعية',titleEn:'Synthetic certificate',bodyAr:'اختبار محلي ببيانات صناعية',bodyEn:'Isolated synthetic test',logoAssetId:logo,validityPolicy:'EXPIRING',validityDurationDays:180,requiresRevalidation:false},context(maker));
  const transition=(status,actor)=>certificates.transitionTemplate(template.id,status,context(actor,{expectedTemplateVersionId:template.currentVersionId,expectedTemplateStatus:template.status}));
  template=await transition('PENDING_APPROVAL',maker);
  await expect(transition('APPROVED',maker)).rejects.toThrow('MAKER_CHECKER_REQUIRED');
  template=await transition('APPROVED',checker);template=await transition('ACTIVE',checker);
  authorityChecks={issuerMakerRejected:true,templateMakerRejected:true};
  app=express();app.use('/certificates',CertificatePublicRouter.create({certificateReadModelService:new CertificateReadModelService(repository,certificates)}));
 });
 afterAll(async()=>{await Promise.all([db?.$disconnect(),other?.$disconnect()]);});
 it('replays a real certificate worker delivery after a lost acknowledgement without duplicating issuance',async()=>{
  const event=await completion();
  const delivery=new CertificateCompletionOutboxDeliveryGateway(new CertificateCompletionEventConsumer(certificates));
  const keys=[];
  const firstDispatcher=new TransactionalOutboxDispatcher(new PrismaTransactionalOutboxStore(db),{
   deliver:async(entry,deliveryContext)=>{
    expect(entry.id).toBe(event.id);keys.push(deliveryContext.idempotencyKey);
    await delivery.deliver(entry,deliveryContext);
    throw Error('SYNTHETIC_ACK_LOST_AFTER_REAL_ISSUANCE');
   },
  });
  const options={batchSize:1,claimDurationMs:5000,maxAttempts:3,baseBackoffMs:1,maxBackoffMs:1};
  const failed=await new CertificateCompletionOutboxWorker(firstDispatcher,options).runOnce('synthetic-certificate-before-restart');
  expect(failed).toMatchObject({claimed:1,processed:0,failed:1});
  const before=await effects(event);
  expect(before.rows).toHaveLength(1);expect(before.inbox).toHaveLength(1);
  expect(before.ledgers.length).toBeGreaterThan(0);expect(before.audit).toBeGreaterThan(0);
  const pending=await db.transactionalOutboxRecord.findUniqueOrThrow({where:{id:event.id}});
  expect(pending.state).toBe('PENDING');expect(pending.attempts).toBe(1);
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,pending.availableAt.getTime()-Date.now()+5)));
  const recoveredDispatcher=new TransactionalOutboxDispatcher(new PrismaTransactionalOutboxStore(other),{
   deliver:async(entry,deliveryContext)=>{keys.push(deliveryContext.idempotencyKey);await new CertificateCompletionOutboxDeliveryGateway(new CertificateCompletionEventConsumer(otherCertificates)).deliver(entry,deliveryContext);},
  });
  const recoveredWorker=new CertificateCompletionOutboxWorker(recoveredDispatcher,options);
  expect(await recoveredWorker.runOnce('synthetic-certificate-after-restart')).toMatchObject({claimed:1,processed:1,failed:0});
  expect(await effects(event)).toEqual(before);expect(keys).toEqual([event.id,event.id]);
  const processed=await db.transactionalOutboxRecord.findUniqueOrThrow({where:{id:event.id}});
  expect(processed.state).toBe('PROCESSED');expect(processed.claimToken).toBeNull();
  expect(await recoveredWorker.runOnce('synthetic-certificate-empty-poll')).toMatchObject({claimed:0,processed:0});
 });
 it('activates issuer and expiring template through real synthetic maker checker commands only',async()=>{
  expect(authorityChecks).toEqual({issuerMakerRejected:true,templateMakerRejected:true});expect(issuer.status).toBe('ACTIVE');expect(issuer.metadata.trust).toMatchObject({createdBy:maker,approvedBy:checker});expect(template.currentVersion).toMatchObject({status:'ACTIVE',createdBy:maker,approvedBy:checker,validityPolicy:'EXPIRING',validityDurationDays:180});
  expect(await db.auditRecord.count({where:{targetId:issuer.id}})).toBe(2);expect(await db.auditRecord.count({where:{targetId:template.id}})).toBe(4);
 });
 it('issues exactly one signed certificate inbox ledger audit and render request from actual course completion',async()=>{
  const event=await completion(),cert=await consume(event),f=await effects(event);expect(cert.status).toBe('ACTIVE');expect(cert.expiresAt.getTime()-cert.issuedAt.getTime()).toBe(180*86400000);expect(cert.digitalSignature).toMatch(/^[a-f0-9]{64}$/);expect(f.rows).toHaveLength(1);expect(f.inbox).toHaveLength(1);expect(f.ledgers.map(x=>x.action)).toEqual(['ISSUED']);expect(f.audit).toBe(1);
  expect(await db.transactionalOutboxRecord.count({where:{aggregateId:cert.id,eventType:'CertificateIssued'}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:cert.id,eventType:'CertificateRenderRequested'}})).toBe(1);
  expect(await certificates.readiness()).toMatchObject({artifactRendererRuntimeReady:false,artifactRendererStatus:'NOT_CONFIGURED'});
 });
 it('issues a locally signed path certificate only from actual opted-in published path completion',async()=>{
  const event=await pathCompletion(),cert=await consume(event),f=await effects(event);expect(cert.certificateType).toBe('LEARNING_PATH');expect(cert.learningPathId).toBe(event.payload.learningPathId);expect(cert.learningPathCompletionId).toBe(event.id);expect(cert.digitalSignature).toMatch(/^[a-f0-9]{64}$/);expect(f.rows).toHaveLength(1);expect(f.inbox).toHaveLength(1);expect(f.ledgers.map(x=>x.action)).toEqual(['ISSUED']);expect(f.audit).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:cert.id,eventType:'CertificateRenderRequested'}})).toBe(1);const result=await verify(cert);expect(result.status,result.text).toBe(200);expect(result.text).not.toContain(event.payload.studentReferenceId);
 });
 it('renders real PDF preview and QR from the persisted signed path identity and pinned template',async()=>{
  const event=await pathCompletion(),cert=await consume(event),version=await repository.findTemplateVersionById(cert.templateVersionId);
  await certificates.assertRenderable(cert);
  const renderer=new ProviderNeutralCertificateRenderingService({resolve:async(id,hash)=>{
   const bytes=fs.readFileSync(path.join(path.dirname(process.env.POST28_TARGET_CONTRACT_FILE),'certificate-synthetic-assets',id+'.png'));
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);return {bytes,mimeType:'image/png'};
  }});
  const rendered=await renderer.render({certificate:cert,templateVersion:version});expect(rendered.artifacts.map(row=>row.kind).sort()).toEqual(['PDF','PREVIEW','QR']);
  const output=path.join(path.dirname(process.env.POST28_TARGET_CONTRACT_FILE),'certificate-rendered-output',cert.id);fs.mkdirSync(output,{recursive:true});
  for(const row of rendered.artifacts){expect(row.bytes.byteLength).toBeGreaterThan(0);fs.writeFileSync(path.join(output,row.kind.toLowerCase()+(row.kind==='PDF'?'.pdf':'.svg')),row.bytes,{flag:'wx'});}
  expect(Buffer.from(rendered.artifacts.find(row=>row.kind==='PDF').bytes).subarray(0,5).toString()).toBe('%PDF-');
  expect(Buffer.from(rendered.artifacts.find(row=>row.kind==='PREVIEW').bytes).toString()).toContain(cert.serialNumber);
  expect((await db.certificate.findUniqueOrThrow({where:{id:cert.id}})).certificatePdfAssetId).toBeNull();
 });
 it('attaches a real rendered PDF once and resolves only its actual student owner',async()=>{
  const cert=await consume(await pathCompletion()),pdf=await renderedPdfFixture(cert),input={certificatePdfAssetId:pdf.id};
  await certificates.attachRenderedArtifacts(cert.id,input,'synthetic-renderer');const attached=await repository.findById(cert.id);expect(attached.certificatePdfAssetId).toBe(pdf.id);
  expect(await certificates.deliveryArtifact(cert.id,'pdf',cert.studentReferenceId)).toBe(pdf.id);await expect(certificates.deliveryArtifact(cert.id,'pdf',fresh())).rejects.toThrow('CERTIFICATE_NOT_FOUND');
  expect(createHash('sha256').update(fs.readFileSync(pdf.file)).digest('hex')).toBe(pdf.hash);
  const before=await db.certificateLedgerEntry.count({where:{certificateId:cert.id,action:'ARTIFACTS_ATTACHED'}});await certificates.attachRenderedArtifacts(cert.id,input,'synthetic-renderer');expect(await db.certificateLedgerEntry.count({where:{certificateId:cert.id,action:'ARTIFACTS_ATTACHED'}})).toBe(before);expect(before).toBe(1);
  await certificates.revoke(cert.id,'Synthetic delivery withdrawal test',checker);await expect(certificates.deliveryArtifact(cert.id,'pdf',cert.studentReferenceId)).rejects.toThrow('CERTIFICATE_ARTIFACT_STATE_INVALID');expect((await repository.findById(cert.id)).certificatePdfAssetId).toBe(pdf.id);expect(fs.existsSync(pdf.file)).toBe(true);
 });
 it('serializes two connections attaching competing rendered PDFs without replacing the winning identity',async()=>{
  const cert=await consume(await pathCompletion()),a=await renderedPdfFixture(cert),b=await renderedPdfFixture(cert);const results=await Promise.allSettled([certificates.attachRenderedArtifacts(cert.id,{certificatePdfAssetId:a.id},maker),otherCertificates.attachRenderedArtifacts(cert.id,{certificatePdfAssetId:b.id},checker)]);
  expect(results.filter(row=>row.status==='fulfilled')).toHaveLength(1);const failure=results.find(row=>row.status==='rejected');expect(failure.reason.message).toContain('CERTIFICATE_ARTIFACT_IMMUTABLE');const stored=await repository.findById(cert.id);expect([a.id,b.id]).toContain(stored.certificatePdfAssetId);expect(await db.certificateLedgerEntry.count({where:{certificateId:cert.id,action:'ARTIFACTS_ATTACHED'}})).toBe(1);
 });
 it('rejects a foreign certificate asset and a revoked certificate attachment without changing either owner',async()=>{
  const cert=await consume(await pathCompletion()),foreign=await consume(await pathCompletion()),pdf=await renderedPdfFixture(foreign),before=await db.certificate.findUniqueOrThrow({where:{id:cert.id}});
  await expect(certificates.attachRenderedArtifacts(cert.id,{certificatePdfAssetId:pdf.id},maker)).rejects.toThrow('CERTIFICATE_ARTIFACT_OWNERSHIP_INVALID');expect(await db.certificate.findUniqueOrThrow({where:{id:cert.id}})).toEqual(before);
  const owned=await renderedPdfFixture(cert);await certificates.revoke(cert.id,'Synthetic revoked attachment test',checker);const revoked=await db.certificate.findUniqueOrThrow({where:{id:cert.id}});await expect(certificates.attachRenderedArtifacts(cert.id,{certificatePdfAssetId:owned.id},maker)).rejects.toThrow('CERTIFICATE_ARTIFACT_STATE_INVALID');expect(await db.certificate.findUniqueOrThrow({where:{id:cert.id}})).toEqual(revoked);expect(await db.certificateLedgerEntry.count({where:{certificateId:cert.id,action:'ARTIFACTS_ATTACHED'}})).toBe(0);
 });
 it('serializes two actual path consumers and replay into one certificate and immutable enrollment identity',async()=>{
  const event=await pathCompletion(),results=await Promise.all([consume(event),consume(event,otherCertificates)]);expect(results[0].id).toBe(results[1].id);expect((await consume(event)).id).toBe(results[0].id);const f=await effects(event);expect(f.rows).toHaveLength(1);expect(f.inbox).toHaveLength(1);expect(f.ledgers).toHaveLength(1);expect(f.audit).toBe(1);
 });
 it('serializes independent consumers and repeated delivery into one persisted certificate and inbox',async()=>{
  const event=await completion(),results=await Promise.all([consume(event),consume(event,otherCertificates)]);expect(results[0].id).toBe(results[1].id);expect((await consume(event)).id).toBe(results[0].id);const f=await effects(event);expect(f.rows).toHaveLength(1);expect(f.inbox).toHaveLength(1);expect(f.ledgers).toHaveLength(1);expect(f.audit).toBe(1);
 });
 it('rejects a reused event with changed completion payload without rewriting original evidence',async()=>{
  const event=await completion();await consume(event);const before=await effects(event);await expect(consume({...event,payload:{...event.payload,studentReferenceId:fresh()}})).rejects.toThrow('SOURCE_EVENT_ID_COLLISION');expect(await effects(event)).toEqual(before);
 });
 it('rolls issuance inbox ledger and audit back when PostgreSQL rejects the outbox write',async()=>{
  const event=await completion(),before=await effects(event);let injected=false;
  const failing=new Proxy(db,{get(target,key){if(key==='$transaction')return (work,options)=>target.$transaction(tx=>work(new Proxy(tx,{get(inner,property){if(property==='transactionalOutboxRecord')return new Proxy(inner.transactionalOutboxRecord,{get(model,operation){if(operation==='create')return async()=>{injected=true;await inner.$executeRawUnsafe('SELECT 1/0');};const value=Reflect.get(model,operation);return typeof value==='function'?value.bind(model):value;}});const value=Reflect.get(inner,property);return typeof value==='function'?value.bind(inner):value;}})),options);const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  await expect(consume(event,facade(failing))).rejects.toMatchObject({code:'P2010',meta:{code:'22012'}});expect(injected).toBe(true);expect(await effects(event)).toEqual(before);
 });
 it('verifies an actual local HMAC certificate through the public HTTP DTO without private identity or signature',async()=>{
  const cert=await consume(await completion()),r=await verify(cert);expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.body).toMatchObject({isValid:true,integrityVerified:true,status:'ACTIVE'});for(const secretValue of [cert.studentReferenceId,cert.digitalSignature,cert.verificationHash,keyReference])expect(JSON.stringify(r.body)).not.toContain(secretValue);
 });
 it('revokes the signed certificate once and exposes revoked public verification with integrity preserved',async()=>{
  const cert=await consume(await completion());await certificates.revoke(cert.id,'Synthetic local revocation',checker);await certificates.revoke(cert.id,'Synthetic local repeat',checker);
  const r=await verify(cert);expect(r.status).toBe(200);expect(r.body).toMatchObject({isValid:false,integrityVerified:true,status:'REVOKED'});expect(await db.certificateLedgerEntry.count({where:{certificateId:cert.id,action:'REVOKED'}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:cert.id,eventType:'CertificateRevoked'}})).toBe(1);
 });
 it('rejects authority withdrawal between application precheck and transactional issuance without partial certificate',async()=>{
  const event=await completion(),before=await effects(event),wrapped=new Proxy(repository,{get(target,key){if(key==='issue')return async data=>{await other.certificateIssuer.update({where:{id:issuer.id},data:{status:'SUSPENDED'}});return target.issue(data);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  const raced=new CertificateUseCases(wrapped,new PrismaCourseRepository(db),new PrismaAssetRecordRepository(db),{signingSecret:secret,signingKeyReference:keyReference,productionLike:false},undefined,undefined,new PrismaCourseCurriculumRepository(db));
  await expect(consume(event,raced)).rejects.toThrow('ACTIVE_ACCREDITED_CERTIFICATE_ISSUER_REQUIRED');expect(await effects(event)).toEqual(before);
 });
});
