import fs from 'node:fs';
import path from 'node:path';
import {randomUUID as fresh,randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import express from 'express';
import request from 'supertest';
import {chromium} from 'playwright';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {AuthorizationEvaluatorService,AssetId,AssetRecord,AssetReference,AssetOwnerReference,AssetStorageLocator,AssetMetadata,AssetChecksum,AssetSanitizationMetadata,AssetRetentionMetadata,AssetRetentionCategory,AssetSecurityClassification,AssetLifecycleState,AssetStorageZone} from '@manaratak/domain';
import {AdminCmsUseCases,PublicCmsUseCases} from '../../packages/application/src/cms/use-cases/CmsUseCases.ts';
import {PrismaCmsRepository} from '../../packages/infrastructure/src/cms/PrismaCmsRepository.ts';
import {CmsAdminRouter} from '../../apps/api/src/presentation/api/router/CmsAdminRouter.ts';
import {CmsPublicRouter} from '../../apps/api/src/presentation/api/router/CmsPublicRouter.ts';
import {StudentWorkspaceRouter} from '../../apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts';
import {CertificatePublicRouter} from '../../apps/api/src/presentation/api/router/CertificatePublicRouter.ts';
import {SecurityMiddlewareFactory} from '../../apps/api/src/presentation/security/SecurityMiddlewareFactory.ts';
import {SecurityService} from '../../packages/infrastructure/src/security/SecurityService.ts';
import {JwtTokenProvider,generateEphemeralJwtKeySet} from '../../packages/infrastructure/src/auth/JwtTokenProvider.ts';
import {PrismaSessionManager} from '../../packages/infrastructure/src/auth/PrismaSessionManager.ts';
import {IdentityPrincipalAccessValidator} from '../../packages/application/src/auth/IdentityPrincipalAccessValidator.ts';
import {PrismaIdentityRepository} from '../../packages/infrastructure/src/identity/PrismaIdentityRepository.ts';
import {PrismaRoleAssignmentRepository} from '../../packages/infrastructure/src/authorization/PrismaRoleAssignmentRepository.ts';
import {PrismaRoleRepository} from '../../packages/infrastructure/src/authorization/PrismaRoleRepository.ts';
import {PrismaPolicyRepository} from '../../packages/infrastructure/src/authorization/PrismaPolicyRepository.ts';
import {DefaultPolicyEvaluator} from '../../packages/infrastructure/src/authorization/DefaultPolicyEvaluator.ts';
import {PrismaApiIdempotencyStore} from '../../packages/infrastructure/src/api-foundation/PrismaApiIdempotencyStore.ts';
import {PrismaAssetRecordRepository} from '../../packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts';
import {AssetReferencePolicy} from '../../packages/application/src/asset-platform/AssetReferencePolicy.ts';
import {StudentApplicationTrackerUseCases} from '../../packages/application/src/students/use-cases/StudentApplicationTrackerUseCases.ts';
import {PrismaStudentApplicationTrackerRepository} from '../../packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts';
import {ScholarshipStudentApplicationTrackerGateway} from '../../packages/infrastructure/src/students/ScholarshipStudentApplicationTrackerGateway.ts';
import {PrismaScholarshipRepository} from '../../packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts';
import {CertificateUseCases} from '../../packages/application/src/certificates/use-cases/CertificateUseCases.ts';
import {CertificateReadModelService} from '../../packages/application/src/certificates/use-cases/CertificateReadModelService.ts';
import {CertificateCompletionEventConsumer} from '../../packages/application/src/certificates/use-cases/CertificateCompletionEventConsumer.ts';
import {PrismaCertificateRepository} from '../../packages/infrastructure/src/certificates/PrismaCertificateRepository.ts';
import {PrismaCourseRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRepository.ts';
import {PrismaCourseCurriculumRepository} from '../../packages/infrastructure/src/courses/PrismaCourseCurriculumRepository.ts';
import {PrismaCourseProgressRepository} from '../../packages/infrastructure/src/courses/PrismaCourseProgressRepository.ts';
import {CourseProgressUseCases} from '../../packages/application/src/courses/use-cases/CourseProgressUseCases.ts';
import {AtomicDomainMutationCoordinator} from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts';
import {AtomicAuditedOutboxMutationExecutor} from '../../packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts';
import {PrismaAtomicPersistenceUnitOfWork} from '../../packages/infrastructure/src/event-foundation/PrismaAtomicPersistenceUnitOfWork.ts';
import {PrismaTransactionalOutboxStore} from '../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts';
import {PrismaAuditRecordRepository} from '../../packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts';
import {FinancePlatformUseCases} from '../../packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts';
import {FinanceStudentUseCases} from '../../packages/application/src/finance-platform/use-cases/FinanceStudentUseCases.ts';
import {PrismaFinanceRepository} from '../../packages/infrastructure/src/finance-platform/PrismaFinanceRepository.ts';
import {PrismaFinanceCurrencyReferenceGateway,FinancePaymentGatewayRegistry,FinanceBankTransferGatewayRegistry} from '../../packages/infrastructure/src/finance-platform/FinanceSafetyGateways.ts';

let db,other,app,server,browser,origin,tokens,sessions,security,assets,certificates,secondCertificates,finance,students;
const signingKeyReference='lab-hmac://r09-synthetic',signingSecret=randomBytes(32).toString('hex');
const wire=value=>JSON.parse(JSON.stringify(value));
const ctx=(actorId,patch={})=>({actorId,reason:'R09 isolated synthetic owner command',correlationId:fresh(),idempotencyKey:fresh(),...patch});
const proof={kind:'POST28_R09_SHARED_WORKFLOW_INTEGRATION',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),syntheticOnly:true,productionAcceptance:false,externalProvidersEnabled:false,fullR09Acceptance:false,observations:[]};
const money=amount=>({amountMinorUnits:amount,currencyCode:'USD',scale:2});

async function principal(role,permissions=[]){
  const id=fresh(),sessionId=fresh();
  await db.roleRecord.upsert({where:{id:role},create:{id:role,name:role,description:'R09 synthetic capability',permissions,policyIds:[]},update:{}});
  await db.identityRecord.create({data:{id,type:'Human',status:'ACTIVE',createdBy:'R09_SYNTHETIC',user:{create:{displayName:role,primaryEmail:id+'@example.invalid',isEmailVerified:true}},account:{create:{accessState:'Active'}},roleAssignments:{create:{id:fresh(),roleId:role}}}});
  if(role==='student')await db.studentWorkspace.create({data:{studentReferenceId:id,status:'ACTIVE'}});
  const auth=await tokens.generateTokens({userId:id,sessionId});await sessions.createSession(id,auth.refreshToken,sessionId);
  return{id,token:auth.accessToken,refresh:auth.refreshToken};
}
function call(p,method,url,body,key=fresh()){
  let req=request(app)[method](url).set('Authorization','Bearer '+p.token);
  if(!['get','head'].includes(method))req=req.set('Cookie','manaratak_refresh='+p.refresh).set('X-CSRF-Token',security.generateCsrfToken(p.refresh)).set('Idempotency-Key',key);
  return body===undefined?req:req.send(body);
}
async function historicalAsset(ownerId,ownerType,classification=AssetSecurityClassification.INTERNAL){
  // Inert materialized historical trust fixture, not a fresh scanner or sanitizer claim.
  const id=fresh(),bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGZkAAAAASUVORK5CYII=','base64'),checksum=createHash('sha256').update(bytes).digest('hex');
  const quarantine=new AssetStorageLocator(AssetStorageZone.QUARANTINE,'r09-synthetic','uploads/'+id+'.png');
  await assets.save(new AssetRecord({id:new AssetId(id),reference:new AssetReference('r09-'+id),owner:new AssetOwnerReference(ownerId,ownerType),locator:new AssetStorageLocator(AssetStorageZone.CLEAN,'r09-synthetic','clean/'+id+'.png'),metadata:new AssetMetadata('synthetic.png','image/png','png',bytes.length),retention:new AssetRetentionMetadata(AssetRetentionCategory.TEMPORARY,new Date(Date.now()+180*86400000)),classification,state:AssetLifecycleState.ACTIVE,checksum:new AssetChecksum('sha256',checksum),sanitization:new AssetSanitizationMetadata(true,new Date(),'Synthetic historical trust fixture only'),malwareScan:{status:'PASSED',scannedAt:new Date().toISOString(),locator:quarantine.value},uploadVerification:{locator:quarantine.value,byteSize:bytes.length,verifiedMimeType:'image/png',checksumSha256:checksum,verifiedAt:new Date().toISOString(),signatureVerified:true}}));
  return id;
}
function certificateFacade(client){return new CertificateUseCases(new PrismaCertificateRepository(client),new PrismaCourseRepository(client),new PrismaAssetRecordRepository(client),{signingSecret,signingKeyReference,productionLike:false,publicVerificationBaseUrl:'http://localhost:5173'},undefined,undefined,new PrismaCourseCurriculumRepository(client));}
async function activateSyntheticAuthority(){
  const maker='R09_SYNTHETIC_AUTHORITY_MAKER',checker='R09_SYNTHETIC_AUTHORITY_CHECKER';
  const logo=await historicalAsset(fresh(),'CertificateIssuer');
  let issuer=await certificates.createIssuer({code:'MANARATAK',name:'Synthetic local R09 issuer',issuerType:'MANARATAK',issuerLogoAssetId:logo,signingKeyReference},ctx(maker));
  const evidence=await historicalAsset(issuer.id,'CertificateIssuer');
  issuer=await certificates.approveIssuer(issuer.id,evidence,'R09:SYNTHETIC:AUTHORITY',ctx(checker,{expectedIssuerUpdatedAt:issuer.updatedAt.toISOString()}));
  let template=await certificates.createTemplate({code:'MNR-SIGNATURE',name:'MANARATAK Signature Certificate',nameAr:'قالب صناعي',nameEn:'Synthetic template',templateVersion:'1.0.0',issuerId:issuer.id,language:'BILINGUAL',layout:'LANDSCAPE',accentColor:'#142B5F',secondaryColor:'#D6A43B',titleAr:'شهادة صناعية',titleEn:'Synthetic certificate',bodyAr:'اختبار صناعي معزول',bodyEn:'Isolated synthetic test',logoAssetId:logo,validityPolicy:'EXPIRING',validityDurationDays:180,requiresRevalidation:false},ctx(maker));
  for(const [status,actor]of [['PENDING_APPROVAL',maker],['APPROVED',checker],['ACTIVE',checker]])template=await certificates.transitionTemplate(template.id,status,ctx(actor,{expectedTemplateVersionId:template.currentVersionId,expectedTemplateStatus:template.status}));
}
async function invoice(owner){
  const draft=await finance.createDraftInvoice({originDomain:'R09_SYNTHETIC',originReferenceId:fresh(),studentReferenceId:owner,payerReferenceId:owner,lineItems:[{description:'R09 private invoice',quantity:1,unitPrice:money('100')}]},ctx(owner));
  return finance.issueInvoice(draft.id,ctx(owner,{expectedVersion:draft.version}));
}
async function financialFacts(id){const holds=await db.financeWalletHoldRecord.findMany({where:{businessReferenceId:id},orderBy:{id:'asc'}});return wire({invoice:await db.financeInvoiceRecord.findUnique({where:{id}}),holds,payments:await db.financePaymentRecord.findMany({where:{invoiceId:id},orderBy:{id:'asc'}}),postings:await db.financialTransactionRecord.findMany({where:{businessReferenceId:{in:[id,...holds.map(h=>h.id)]}},include:{entries:true},orderBy:{id:'asc'}}),commands:await db.financeCommandRecord.count(),outbox:await db.transactionalOutboxRecord.count()});}

describe('R09 shared synthetic CMS learner certificate privacy and money workflows',()=>{
  beforeAll(async()=>{
    if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='r09-integrated-workflows'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
    db=new PrismaClient({log:[],errorFormat:'minimal'});other=new PrismaClient({log:[],errorFormat:'minimal'});await Promise.all([db.$connect(),other.$connect()]);
    const [role]=await db.$queryRaw`SELECT current_user AS role,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
    expect(role).toEqual({role:'post28_app',rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolbypassrls:false});
    const [privileges]=await db.$queryRaw`SELECT has_schema_privilege(current_user,'public','CREATE') AS ddl,has_table_privilege(current_user,'public._prisma_migrations','SELECT') AS ledger`;
    expect(privileges).toEqual({ddl:false,ledger:false});proof.role={...role,...privileges};
    tokens=new JwtTokenProvider(generateEphemeralJwtKeySet('r09-shared'));sessions=new PrismaSessionManager(db);security=new SecurityService(undefined,{signingSecret:randomBytes(32).toString('hex')});assets=new PrismaAssetRecordRepository(db);
    const principalAccessValidator=new IdentityPrincipalAccessValidator(new PrismaIdentityRepository(db)),assignments=new PrismaRoleAssignmentRepository(db);
    const evaluator=new AuthorizationEvaluatorService(new PrismaRoleRepository(db),new PrismaPolicyRepository(db),assignments,new DefaultPolicyEvaluator());
    certificates=certificateFacade(db);secondCertificates=certificateFacade(other);
    finance=new FinancePlatformUseCases(new PrismaFinanceRepository(db),{currencyReference:new PrismaFinanceCurrencyReferenceGateway(db),paymentGateways:new FinancePaymentGatewayRegistry([]),bankTransferGateways:new FinanceBankTransferGatewayRegistry([]),fxRateProvider:{providerKey:'R09_DISABLED',isConfigured:()=>false,fetchRate:async()=>{throw Error('R09_EXTERNAL_PROVIDER_FORBIDDEN');}},transferFeePolicy:{policyReference:'R09_UNUSED',basisPoints:0}});
    await db.referenceCurrency.upsert({where:{isoCode:'USD'},create:{id:fresh(),isoCode:'USD',name:'Synthetic USD',minorUnit:2},update:{}});
    students=[await principal('student'),await principal('student')];
    const cms=new PrismaCmsRepository(db),readModel=new CertificateReadModelService(new PrismaCertificateRepository(db),certificates);
    app=express();app.use(express.json());app.use(SecurityMiddlewareFactory.createCsrfGuard(security,{exemptBearerAuth:false}));
    app.get('/r09-origin',(_req,res)=>res.type('html').send('<!doctype html><title>R09 isolated browser</title>'));
    // Real session-bound authentication and DB-backed capabilities. MFA and deployment
    // acceptance are deliberately not represented by this internal workflow boundary.
    app.use('/admin/cms',SecurityMiddlewareFactory.createAdminGuard({mode:'strict',tokenProvider:tokens,sessionManager:sessions,principalAccessValidator}),CmsAdminRouter.create({adminCmsUseCases:new AdminCmsUseCases(cms),authEvaluatorService:evaluator}));
    app.use('/cms',CmsPublicRouter.create({publicCmsUseCases:new PublicCmsUseCases(cms)}));
    app.use('/certificates',CertificatePublicRouter.create({certificateReadModelService:readModel}));
    app.use('/student',StudentWorkspaceRouter.create({certificateReadModelService:readModel,studentApplicationTrackerUseCases:new StudentApplicationTrackerUseCases(new PrismaStudentApplicationTrackerRepository(db),new ScholarshipStudentApplicationTrackerGateway(new PrismaScholarshipRepository(db)),new AssetReferencePolicy(assets)),financeStudentUseCases:new FinanceStudentUseCases(new PrismaFinanceRepository(db)),financePlatformUseCases:finance,assetRecordRepository:assets,tokenProvider:tokens,sessionManager:sessions,principalAccessValidator,roleAssignmentRepository:assignments,apiIdempotencyStore:new PrismaApiIdempotencyStore(db)}));
    server=await new Promise(resolve=>{const listening=app.listen(0,'127.0.0.1',()=>resolve(listening));});origin='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{headless:true});
    proof.browserVersion=browser.version();proof.boundary='ACTUAL_SOURCE_ROUTERS_REAL_JWT_DB_CAPABILITIES_NOT_BUILT_ADMIN_UI_OR_MFA';
  });
  afterAll(async()=>{
    await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());await Promise.all([db?.$disconnect(),other?.$disconnect()]);
    if(process.env.POST28_TARGET_CONTRACT_FILE)fs.writeFileSync(path.join(path.dirname(process.env.POST28_TARGET_CONTRACT_FILE),'r09-workflow-observations-'+fresh()+'.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
  });

  it('authors reviews publishes and withdraws current CMS snapshots using three actual capabilities',async()=>{
    const author=await principal('r09-author',['admin:cms:author','admin:cms:view']),reviewer=await principal('r09-reviewer',['admin:cms:review','admin:cms:view']),publisher=await principal('r09-publisher',['admin:cms:publish','admin:cms:view']);
    const categorySlug='r09-'+fresh(),slug='r09-'+fresh();
    const category=await call(author,'post','/admin/cms/categories',{slug:categorySlug,nameAr:'تصنيف صناعي',nameEn:'Synthetic category'});expect(category.status,category.text).toBe(201);
    const created=await call(author,'post','/admin/cms/content',{slug,contentType:'ARTICLE',title:'R09 private draft',categoryId:category.body.id});expect(created.status,created.text).toBe(201);const id=created.body.id;
    const bodies={};
    for(const locale of ['ar','en']){
      const draft=await call(author,'put','/admin/cms/content/'+id+'/localized',{locale,localizedSlug:slug+'-'+locale,title:'R09 '+locale+' published owner',summary:'Synthetic current owner summary',body:'<p>R09 '+locale+' public body</p>',seoMetadata:{title:'R09 '+locale,description:'Synthetic current owner metadata'}});expect(draft.status,draft.text).toBe(200);
      const firstPublic=await request(app).get('/cms/content/'+slug+'-'+locale).query({locale});expect(firstPublic.status).toBe(404);
      const submitted=await call(author,'post','/admin/cms/content/'+id+'/submit-review',{locale,expectedVersion:draft.body.version});expect(submitted.status,submitted.text).toBe(200);
      const forbidden=await call(author,'post','/admin/cms/content/'+id+'/approve',{locale,expectedVersion:submitted.body.version});expect(forbidden.status).toBe(403);
      const premature=await call(publisher,'post','/admin/cms/content/'+id+'/publish',{locale,expectedVersion:submitted.body.version});expect([409,422]).toContain(premature.status);
      const approved=await call(reviewer,'post','/admin/cms/content/'+id+'/approve',{locale,expectedVersion:submitted.body.version});expect(approved.status,approved.text).toBe(200);
      const reviewerPublish=await call(reviewer,'post','/admin/cms/content/'+id+'/publish',{locale,expectedVersion:approved.body.version});expect(reviewerPublish.status).toBe(403);
      const published=await call(publisher,'post','/admin/cms/content/'+id+'/publish',{locale,expectedVersion:approved.body.version});expect(published.status,published.text).toBe(200);bodies[locale]=published.body;
      const publicRead=await request(app).get('/cms/content/'+slug+'-'+locale).query({locale});expect(publicRead.status,publicRead.text).toBe(200);expect(publicRead.text).toContain('R09 '+locale+' public body');
    }
    const page=await browser.newPage();await page.goto(origin+'/cms/pages/http-resolve?path='+encodeURIComponent('/ar/articles/'+slug+'-ar'));await page.getByRole('heading',{name:'R09 ar published owner',exact:true}).waitFor();
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toContain('/ar/articles/'+slug+'-ar');
    const afterPublish=await db.cmsPublishedContent.findMany({where:{contentId:id}});expect(afterPublish).toHaveLength(2);
    // Editing a translation must not replace the last published immutable body.
    const edited=await call(author,'put','/admin/cms/content/'+id+'/localized',{locale:'ar',localizedSlug:slug+'-ar',title:'R09 unreviewed replacement',summary:'Draft only summary',body:'<p>R09 private replacement body</p>',seoMetadata:{title:'R09 draft',description:'Synthetic draft metadata'},expectedVersion:bodies.ar.version});expect(edited.status,edited.text).toBe(200);
    const stillPublished=await request(app).get('/cms/content/'+slug+'-ar').query({locale:'ar'});expect(stillPublished.status).toBe(200);expect(stillPublished.text).not.toContain('private replacement');expect(stillPublished.text).toContain('R09 ar public body');
    for(const locale of ['ar','en']){
      const current=await db.cmsLocalizedContent.findUniqueOrThrow({where:{contentId_locale:{contentId:id,locale}}});
      const archived=await call(publisher,'post','/admin/cms/content/'+id+'/archive',{locale,expectedVersion:current.version});expect(archived.status,archived.text).toBe(200);
      const hidden=await request(app).get('/cms/content/'+slug+'-'+locale).query({locale});expect(hidden.status).toBe(404);expect(hidden.text).not.toContain('public body');
    }
    await page.goto(origin+'/r09-origin');await page.goBack();await page.reload();expect(await page.getByRole('heading',{name:'R09 ar published owner',exact:true}).count()).toBe(0);expect(await page.locator('body').innerText()).not.toContain('R09 ar public body');
    expect((await request(app).get('/cms/content').query({locale:'ar',q:slug})).body.data).toEqual([]);
    const reviews=await db.cmsWorkflowReview.findMany({where:{localizedContent:{contentId:id}}});expect(reviews.filter(r=>r.status==='APPROVED').map(r=>r.reviewedBy)).toEqual(expect.arrayContaining([reviewer.id]));
    await page.close();proof.observations.push({case:'CMS_AUTHOR_REVIEW_PUBLISH_WITHDRAW',actorIds:[author.id,reviewer.id,publisher.id],distinctActors:true,publicLocales:['ar','en'],browserLocale:'ar',draftNeverReplacesPublished:true,withdrawnOnHistoryAndReload:true,fullAdminUiOrMfaAcceptance:false});
  });

  it('completes an actual lesson and issues one signed certificate across two consumers then verifies and revokes it',async()=>{
    await activateSyntheticAuthority();
    const student=students[0],courses=new PrismaCourseRepository(db),course=await courses.create({publicId:fresh(),slug:'r09-'+fresh(),canonicalName:fresh(),canonicalDedupKey:fresh(),displayName:'R09 completion source',accessType:'FREE_STUDY_AND_CERTIFICATE',originType:'NATIVE_MANARATAK_COURSE',directCourseUrl:'https://example.invalid/r09',status:'PUBLISHED',completenessStatus:'COMPLETE',certificateAvailable:true});
    const module=await db.courseModule.create({data:{courseId:course.id,title:'R09 actual module',position:1,status:'PUBLISHED'}}),lesson=await db.courseLesson.create({data:{courseId:course.id,moduleId:module.id,title:'R09 actual lesson',position:1,status:'PUBLISHED',lessonType:'ARTICLE',contentText:'Synthetic actual lesson'}});
    await courses.updateStatus(course.id,'PUBLISHED');
    expect(await db.courseVersion.count({where:{courseId:course.id}})).toBe(2);
    const progress=new CourseProgressUseCases(courses,new PrismaCourseCurriculumRepository(db),new PrismaCourseProgressRepository(db),undefined,undefined,new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(db),new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db))));
    await progress.enroll(course.id,student.id);expect((await db.courseEnrollment.findUniqueOrThrow({where:{courseId_studentReferenceId:{courseId:course.id,studentReferenceId:student.id}}})).progressPercentage).toBe(0);
    await progress.markLessonProgress({courseId:course.id,studentReferenceId:student.id,lessonId:lesson.id,progressPercentage:100,status:'COMPLETED'});await progress.completeCourse(course.id,student.id);
    const event=await db.transactionalOutboxRecord.findFirstOrThrow({where:{aggregateId:course.id+':'+student.id,eventType:'CourseCompleted'}});
    const consume=facade=>new CertificateCompletionEventConsumer(facade).consume(event);
    const [first,second]=await Promise.all([consume(certificates),consume(secondCertificates)]);expect(first.id).toBe(second.id);expect((await consume(certificates)).id).toBe(first.id);
    expect(await db.certificate.count({where:{sourceEventId:event.id}})).toBe(1);expect(await db.certificateIssuanceInbox.count({where:{eventId:event.id}})).toBe(1);expect(await db.certificateLedgerEntry.count({where:{certificateId:first.id,action:'ISSUED'}})).toBe(1);expect(await db.transactionalOutboxRecord.count({where:{aggregateId:first.id,eventType:'CertificateIssued'}})).toBe(1);
    const own=await call(student,'get','/student/certificates'),foreign=await call(students[1],'get','/student/certificates');expect(own.status).toBe(200);expect(own.body.data.map(r=>r.certificateId)).toContain(first.id);expect(foreign.status).toBe(200);expect(JSON.stringify(foreign.body)).not.toContain(first.id);
    const unchanged=await db.certificate.findUniqueOrThrow({where:{id:first.id}});
    for(const kind of ['pdf','preview']){const denied=await call(students[1],'post','/student/certificates/'+first.id+'/artifacts/'+kind+'/delivery-grant',{});expect(denied.status,denied.text).toBe(404);expect(denied.text).not.toContain(student.id);}
    expect(await db.certificate.findUniqueOrThrow({where:{id:first.id}})).toEqual(unchanged);
    const valid=await request(app).get('/certificates/verify/'+first.verificationCode);expect(valid.status).toBe(200);expect(valid.body).toMatchObject({isValid:true,integrityVerified:true});expect(valid.text).not.toContain(student.id);
    await certificates.revoke(first.id,'Synthetic R09 revocation','R09_SYNTHETIC_AUTHORITY_CHECKER');await certificates.revoke(first.id,'Repeated synthetic R09 revocation','R09_SYNTHETIC_AUTHORITY_CHECKER');
    const revoked=await request(app).get('/certificates/verify/'+first.verificationCode);expect(revoked.body).toMatchObject({isValid:false,integrityVerified:true,status:'REVOKED'});expect(await db.certificateLedgerEntry.count({where:{certificateId:first.id,action:'REVOKED'}})).toBe(1);
    proof.observations.push({case:'ACTUAL_LESSON_TO_ONE_SIGNED_CERTIFICATE',courseId:course.id,eventId:event.id,certificateId:first.id,consumers:2,replays:1,validThenRevoked:true,foreignArtifactsDenied:true,artifactRendererExercised:false});
  });

  it('keeps original student document bindings consent and private invoices unchanged on foreign access and mutation',async()=>{
    const [a,b]=students,scholarship=fresh(),version=fresh(),cycle=fresh(),requirement=fresh(),tracker=fresh(),asset=await historicalAsset(b.id,'STUDENT',AssetSecurityClassification.CONFIDENTIAL);
    await db.scholarship.create({data:{id:scholarship,publicId:fresh(),slug:'r09-'+fresh(),canonicalName:fresh(),canonicalDedupKey:fresh(),displayName:'R09 synthetic document owner',status:'PUBLISHED',completenessStatus:'COMPLETE',publicationStatus:'PUBLISHED',verificationStatus:'VERIFIED'}});
    await db.scholarshipVersion.create({data:{id:version,scholarshipId:scholarship,versionNumber:1,status:'PUBLISHED',snapshot:{},publishedAt:new Date()}});await db.scholarshipApplicationCycle.create({data:{id:cycle,scholarshipId:scholarship,versionId:version,cycleKey:cycle,status:'PUBLISHED',opensAt:new Date(Date.now()-60000),closesAt:new Date(Date.now()+3600000)}});
    await db.scholarshipRequiredDocument.create({data:{id:requirement,scholarshipId:scholarship,documentKey:requirement,displayName:'R09 private required document',resolutionStatus:'RESOLVED'}});await db.studentApplicationTracker.create({data:{id:tracker,studentReferenceId:b.id,scholarshipId:scholarship,cycleReferenceId:cycle}});
    const binding=await db.studentApplicationDocumentBinding.create({data:{trackerId:tracker,assetId:asset,requirementId:requirement,ownerVersionId:version,requirementSnapshot:{displayName:'R09 private requirement'},consentGrantedAt:new Date(),reviewConsentGrantedAt:new Date(),reviewConsentUntil:new Date(Date.now()+1800000),retentionUntil:new Date(Date.now()+3600000)}});
    const own=await call(b,'get','/student/application-trackers/'+tracker+'/documents');expect(own.status,own.text).toBe(200);
    const before=wire({binding,asset:await db.assetRecord.findUniqueOrThrow({where:{id:asset}}),tracker:await db.studentApplicationTracker.findUniqueOrThrow({where:{id:tracker}}),outbox:await db.transactionalOutboxRecord.count(),audit:await db.auditRecord.count()});
    for(const [method,url,body]of [['get','/student/application-trackers/'+tracker+'/documents',undefined],['post','/student/application-trackers/'+tracker+'/documents',{requirementId:requirement,assetId:asset,expectedVersion:1,consent:true}],['delete','/student/application-trackers/'+tracker+'/documents/'+requirement,{expectedVersion:1}],['post','/student/assets/'+asset+'/delivery-grant',{}]]){
      const denied=await call(a,method,url,body);expect(denied.status,denied.text).toBe(404);for(const secret of [asset,b.id,scholarship])expect(denied.text).not.toContain(secret);
    }
    expect(wire({binding:await db.studentApplicationDocumentBinding.findUniqueOrThrow({where:{id:binding.id}}),asset:await db.assetRecord.findUniqueOrThrow({where:{id:asset}}),tracker:await db.studentApplicationTracker.findUniqueOrThrow({where:{id:tracker}}),outbox:await db.transactionalOutboxRecord.count(),audit:await db.auditRecord.count()})).toEqual(before);
    const ownInvoice=await invoice(a.id),foreignInvoice=await invoice(b.id),facts=await financialFacts(foreignInvoice.id);
    const ownList=await call(a,'get','/student/'+a.id+'/finance/invoices?studentReferenceId='+b.id);expect(ownList.status).toBe(200);expect(ownList.body.data.map(row=>row.id)).toContain(ownInvoice.id);expect(ownList.text).not.toContain(foreignInvoice.id);
    for(const suffix of ['', '/payments']){const denied=await call(a,'get','/student/'+a.id+'/finance/invoices/'+foreignInvoice.id+suffix);expect(denied.status,denied.text).toBe(404);expect(denied.text).not.toContain(b.id);}
    for(const command of ['wallet-payment','payment-attempts']){const denied=await call(a,'post','/student/'+a.id+'/finance/invoices/'+foreignInvoice.id+'/'+command,{});expect(denied.status,denied.text).toBe(404);}
    expect(await financialFacts(foreignInvoice.id)).toEqual(facts);
    proof.observations.push({case:'PRIVATE_DOCUMENT_AND_FINANCE_OWNERSHIP',bindingId:binding.id,originalConsentAndBindingPreserved:true,foreignReadWriteAndAssetDenied:true,financialFactsUnchanged:true});
  });

  it('pays a real synthetic invoice once across concurrent HTTP replays with one balanced ledger effect',async()=>{
    const owner=students[0],inv=await invoice(owner.id),account=await finance.createFinancialAccount({ownerReferenceId:owner.id,type:'LIABILITY',currencyCode:'USD',scale:2},ctx(owner.id)),mirror=await finance.createFinancialAccount({ownerReferenceId:fresh(),type:'ASSET',currencyCode:'USD',scale:2},ctx(owner.id)),wallet=await finance.createWallet({ownerReferenceId:owner.id,accountId:account.id,currencyCode:'USD',scale:2},ctx(owner.id));
    // Explicit balanced synthetic opening balance, never a claimed bank deposit.
    const opening=fresh();await db.financialTransactionRecord.create({data:{id:opening,publicId:fresh(),correlationId:fresh(),businessReferenceType:'R09_SYNTHETIC_OPENING_BALANCE',businessReferenceId:owner.id,idempotencyKeyHash:fresh(),currencyCode:'USD',scale:2,createdBy:'R09_SYNTHETIC_FIXTURE',entries:{create:[{accountId:account.id,direction:'CREDIT',amountMinorUnits:'100',currencyCode:'USD',scale:2,sequence:1},{accountId:mirror.id,direction:'DEBIT',amountMinorUnits:'100',currencyCode:'USD',scale:2,sequence:2}]}}});
    const key=fresh(),url='/student/'+owner.id+'/finance/invoices/'+inv.id+'/wallet-payment',body={walletId:wallet.id,consent:true,expectedVersion:inv.version,amount:money('100')};
    const replies=await Promise.all([call(owner,'post',url,body,key),call(owner,'post',url,body,key)]);expect(replies.filter(r=>r.status===200).length).toBeGreaterThan(0);expect(replies.every(r=>[200,409].includes(r.status)),JSON.stringify(replies.map(r=>({status:r.status,body:r.body})))).toBe(true);
    const facts=await financialFacts(inv.id),replay=await call(owner,'post',url,body,key);expect(replay.status,replay.text).toBe(200);expect(await financialFacts(inv.id)).toEqual(facts);expect(facts.invoice.status).toBe('PAID');expect(facts.invoice.dueMinorUnits).toBe('0');expect(facts.holds).toHaveLength(1);expect(facts.holds[0].status).toBe('CAPTURED');expect(facts.payments).toHaveLength(0);
    expect(facts.postings.map(p=>p.businessReferenceType).sort()).toEqual(['INVOICE','WALLET_HOLD_CAPTURE']);
    const captures=facts.postings.filter(p=>p.businessReferenceType==='WALLET_HOLD_CAPTURE');expect(captures).toHaveLength(1);
    const entries=captures.flatMap(p=>p.entries),sum=direction=>entries.filter(e=>e.direction===direction).reduce((n,e)=>n+BigInt(e.amountMinorUnits),0n);expect(sum('DEBIT')).toBe(100n);expect(sum('CREDIT')).toBe(100n);
    const denied=await call(students[1],'post','/student/'+students[1].id+'/finance/invoices/'+inv.id+'/wallet-payment',body,fresh());expect(denied.status).toBe(404);expect(await financialFacts(inv.id)).toEqual(facts);
    proof.observations.push({case:'SYNTHETIC_WALLET_PAYMENT_EXACTLY_ONE_EFFECT',invoiceId:inv.id,concurrentRequests:2,replayVerified:true,capturedHolds:1,providerPaymentRows:0,balancedDebit:'100',balancedCredit:'100',externalProvider:false});
  });
});
