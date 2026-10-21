import assert from 'node:assert/strict';
import {digest} from './post28-migration-inventory.mjs';
export const SELECTED_PREDECESSOR='23897bdaa66d966eef15c85f44288589ecbcdf2b';
export const HISTORICAL_STAGE='f80e3b0ab9aa29f0ea5312af3d6aa7ab461be7b7';
export function fixtureId(key){const h=digest('POST28_R05_SYNTHETIC:'+key);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}
export function historicalFixtureManifest(owners){
 const rows=[];const id=fixtureId;const at='2025-01-01T00:00:00.000Z',until='2035-01-01T00:00:00.000Z';
 const add=(model,key,data,scenario=key)=>{if(!owners[model])throw new Error('POST28_FIXTURE_OWNER_REQUIRED');const values={id:id(key),...data};rows.push({model,owner:owners[model],scenario,id:values.id,data:values});};
 const canonical=key=>({publicId:'POST28-R05-'+key,slug:'post28-r05-'+key,canonicalName:'Synthetic '+key,canonicalDedupKey:'post28-r05-'+key,displayName:'Synthetic '+key,status:'DRAFT',completenessStatus:'INCOMPLETE'});
 add('ApiSearchRequestRecord','search-null',{actorReferenceId:null,reference:'post28-r05-legacy',scope:'PUBLIC_CATALOG',query:'synthetic legacy query',filters:[],logicalOperator:'AND',page:1,limit:20,state:'COMPLETED',totalCount:0,executionTimeMs:1,createdAt:at});
 add('ApiSearchRequestRecord','search-owned',{actorReferenceId:id('student'),reference:'post28-r05-owned',scope:'PUBLIC_CATALOG',query:'synthetic owned query',filters:[],logicalOperator:'AND',page:1,limit:20,state:'COMPLETED',totalCount:0,executionTimeMs:1,createdAt:at});
 add('StudentWorkspace','workspace',{studentReferenceId:id('student'),status:'ACTIVE',privacyPreferences:{documentReview:false},createdAt:at});
 add('Scholarship','scholarship',canonical('scholarship'));
 add('ScholarshipVersion','scholarship-version',{scholarshipId:id('scholarship'),versionNumber:1,status:'PUBLISHED',snapshot:{synthetic:true,source:'R05',originalVersion:1},publishedAt:at});
 add('StudentApplicationTracker','tracker',{studentReferenceId:id('student'),scholarshipId:id('scholarship'),cycleReferenceId:'LEGACY',ownerSnapshot:{source:'post28-r05',version:1}});
 for(const key of ['linked-asset','unlinked-asset'])add('AssetRecord',key,{reference:'post28-r05-'+key,ownerId:id('student'),ownerType:'STUDENT',lifecycleState:'ACTIVE',securityClassification:'PRIVATE',retentionCategory:'STUDENT_DOCUMENT',metadata:{synthetic:true,source:'R05',originalId:id(key)},createdAt:at});
 for(const scenario of ['missing-consent','whitespace-consent','revoked-consent','future-consent','valid-consent','orphan-document']){
  const future=scenario==='future-consent';const granted=scenario==='valid-consent'||future;
  add('StudentApplicationDocumentBinding',scenario,{trackerId:id('tracker'),requirementId:id('requirement-'+scenario),assetId:id(scenario==='orphan-document'?'missing-asset':'linked-asset'),ownerVersionId:id('scholarship-version'),requirementSnapshot:{synthetic:true,scenario,legacySource:'post28-r05'},consentGrantedAt:at,retentionUntil:until,
   reviewConsentGrantedAt:granted?(future?'2030-01-01T00:00:00.000Z':at):null,reviewConsentUntil:granted?until:null,
   attestation:{consent:scenario==='whitespace-consent'?'   ':scenario==='revoked-consent'?'REVOKED':granted?'GRANTED':'MISSING',synthetic:true}});
 }
 add('StudentPrivacyConsentDecision','revoked-decision',{studentReferenceId:id('student'),workspaceVersion:1,actorId:id('student'),actorType:'STUDENT',purpose:'DOCUMENT_REVIEW',source:'POST28_SYNTHETIC',beforePreferences:{documentReview:true},afterPreferences:{documentReview:false},changedFields:['documentReview'],decidedAt:at});
 const amount='900719925474099312345';
 for(const key of ['cash-account','wallet-account'])add('FinancialAccountRecord',key,{publicId:'POST28-R05-'+key,ownerReferenceId:id(key==='cash-account'?'synthetic-treasury':'student'),type:key==='cash-account'?'ASSET':'LIABILITY',currencyCode:'USD',scale:2});
 add('FinancialTransactionRecord','transaction',{publicId:'POST28-R05-TXN',correlationId:id('correlation'),businessReferenceType:'SYNTHETIC_UPGRADE',businessReferenceId:id('invoice'),idempotencyKeyHash:digest('post28-r05-transaction'),currencyCode:'USD',scale:2,createdBy:'post28-r05-fixture',createdAt:at});
 for(const [key,direction,sequence] of [['cash-account','DEBIT',1],['wallet-account','CREDIT',2]])add('FinancialLedgerEntryRecord','entry-'+key,{transactionId:id('transaction'),accountId:id(key),direction,amountMinorUnits:amount,currencyCode:'USD',scale:2,sequence,createdAt:at});
 add('FinanceWalletRecord','wallet',{publicId:'POST28-R05-WALLET',ownerReferenceId:id('student'),accountId:id('wallet-account'),currencyCode:'USD',scale:2,status:'ACTIVE'});
 add('FinanceWalletHoldRecord','hold',{publicId:'POST28-R05-HOLD',walletId:id('wallet'),amountMinorUnits:'10000',currencyCode:'USD',scale:2,status:'ACTIVE',businessReferenceId:id('invoice'),idempotencyKeyHash:digest('post28-r05-hold'),createdAt:at});
 add('FinanceInvoiceRecord','invoice',{publicId:'POST28-R05-INVOICE',invoiceNumber:'POST28-R05-0001',correlationId:id('correlation'),originDomain:'POST28_SYNTHETIC',originReferenceId:id('student'),studentReferenceId:id('student'),status:'PARTIALLY_PAID',currencyCode:'USD',scale:2,totalMinorUnits:amount,dueMinorUnits:(BigInt(amount)-10000n).toString(),lineItems:[{description:'synthetic',amountMinorUnits:amount}],createdAt:at});
 add('FinancePaymentRecord','payment',{publicId:'POST28-R05-PAYMENT',invoiceId:id('invoice'),idempotencyKeyHash:digest('post28-r05-payment'),currencyCode:'USD',scale:2,amountMinorUnits:'10000',status:'CAPTURED',paymentMethod:'MANUAL',capturedAt:at});
 add('FinanceRefundRecord','refund',{publicId:'POST28-R05-REFUND',paymentId:id('payment'),amountMinorUnits:'100',currencyCode:'USD',scale:2,reason:'Synthetic historical evidence only',status:'PENDING',makerId:'post28-r05-fixture'});
 add('FinanceCommandRecord','receipt',{actorId:'post28-r05-fixture',operation:'SYNTHETIC_RECEIPT',targetId:id('invoice'),fingerprint:digest('post28-r05-receipt'),response:{synthetic:true,invoiceId:id('invoice'),originalAmountMinorUnits:amount},createdAt:at});
 add('CmsContentNode','cms', {publicId:'POST28-R05-cms',slug:'post28-r05-cms',status:'DRAFT',contentType:'ARTICLE',title:'Synthetic old publication',authorId:'post28-r05-author',ownerId:'post28-r05-owner',lastModifiedBy:'post28-r05-editor'});
 add('CmsLocalizedContent','cms-ar',{contentId:id('cms'),locale:'ar',localizedSlug:'post28-r05-cms-ar',state:'PUBLISHED',version:2,title:'نص تجريبي تاريخي',body:'دليل صناعي لا يتضمن بيانات مستخدم',lastModifiedBy:'post28-r05-translator',publishedAt:at});
 add('CmsContentRevision','cms-revision',{localizedContentId:id('cms-ar'),versionNumber:1,reason:'Synthetic prior version',payload:{locale:'ar',body:'نص صناعي سابق',source:'R05'},capturedBy:'post28-r05-editor',capturedAt:at});
 add('CmsPublishedContent','cms-publication',{contentId:id('cms'),publicId:'POST28-R05-CMS',siteIdentifier:'MANARATAK',locale:'ar',slug:'post28-r05-cms-ar',canonicalUrl:'https://post28.invalid/ar/synthetic',contentType:'ARTICLE',title:'نشر صناعي سابق',body:'دليل تاريخي صناعي ثابت',attachmentAssetIds:[],tags:[],seoMetadata:{synthetic:true},versionNumber:1,publishedAt:at});
 add('OwnerTranslationTransferReceipt','translation-receipt',{ownerDomain:'UNIVERSITY',targetId:id('university'),handoffId:id('translation-handoff'),approvalId:id('translation-approval'),actorId:'post28-r05-translator',reviewerId:'post28-r05-reviewer',digest:digest('post28-r05-translation'),outcome:'APPLIED',createdAt:at});
 add('DegreeLevel','degree',{canonicalCode:'POST28_SYNTHETIC',nameEn:'Synthetic degree',nameAr:'درجة صناعية'});
 add('University','university',canonical('university'));
 add('UniversityTranslation','university-translation',{universityId:id('university'),locale:'ar',displayName:'جامعة صناعية تاريخية',reviewStatus:'NEEDS_REVIEW',metadata:{synthetic:true,originalVersion:1}});
 add('UniversityAcademicProgram','program',{universityId:id('university'),sourceProgramName:'Synthetic historical program',normalizedName:'synthetic historical program',degreeLevelId:id('degree'),majorMappingState:'UNRESOLVED'});
 add('ScholarshipDegreeTarget','degree-target',{scholarshipId:id('scholarship'),targetKey:'post28-r05-degree',degreeLevelId:id('degree'),resolutionStatus:'RESOLVED'});
 add('ScholarshipDegreeTarget','legacy-unresolved-target',{scholarshipId:id('scholarship'),targetKey:'post28-r05-legacy-label',degreeLevelId:null,sourceLabel:'Unknown legacy degree label',resolutionStatus:'PENDING'});
 add('Major','major',canonical('major'));
 add('Course','course',{...canonical('course'),accessType:'FREE',originType:'INTERNAL',directCourseUrl:'https://post28.invalid/course/synthetic'});
 add('CourseVersion','course-version',{courseId:id('course'),versionNumber:1,reason:'Synthetic historical evidence',snapshot:{synthetic:true,originalVersion:1},createdBy:'post28-r05-fixture'});
 add('CourseMajorProjection','projection',{projectionKey:'post28-r05-projection',courseId:id('course'),majorId:id('major'),sourceType:'MANUAL',relationshipType:'RELATED',projectionState:'PROPOSED'});
 add('StudentLearningProjection','learning-projection',{studentReferenceId:id('student'),enrollmentId:id('legacy-enrollment'),courseId:id('course'),courseSlug:'post28-r05-course',courseName:'Synthetic course',status:'ACTIVE',progressPercentage:20,enrolledAt:at,sourceEventId:id('legacy-event')});
 add('InternationalTest','test',canonical('test'));
 add('InternationalTestVersion','test-version',{testId:id('test'),versionNumber:1,status:'PUBLISHED',publishedAt:at,approvedBy:'post28-r05-reviewer',rawContentBlocks:{synthetic:true}});
 add('InternationalTestPublicationSnapshot','test-publication',{id:id('test-version'),testId:id('test'),candidateHash:digest('post28-r05-test-v1'),payload:{synthetic:true,versionId:id('test-version'),testId:id('test')},reviewerId:'post28-r05-reviewer',publishedAt:at});
 add('CmsBlockSchema','cms-block',{key:'post28-r05-block',version:1,nameAr:'صناعي',nameEn:'Synthetic',fieldSchema:[],localizedFields:[],assetFields:[],status:'ACTIVE',createdBy:'post28-r05-fixture'});
 return {version:1,kind:'POST28_R05_SYNTHETIC_HISTORICAL_MANIFEST',stageSourceSha:HISTORICAL_STAGE,selectedPredecessorSha:SELECTED_PREDECESSOR,rows,
  orphan:{bindingId:id('orphan-document'),missingAssetId:id('missing-asset'),owner:'student/assets',disposition:'BLOCK_UPGRADE_UNTIL_OWNER_REVIEW',sourceEvidence:{synthetic:true,creationStage:108,action:'INTENTIONAL_OMITTED_ASSET',bindingRetained:true}},
  claims:{realPersons:false,productionData:false,domainApproval:false,DECApproval:false,fullR05Acceptance:false}};
}
export async function seedHistoricalFixtures(client,manifest){
 return client.$transaction(async tx=>{
  await tx.$executeRawUnsafe("SET LOCAL lock_timeout='3s'");await tx.$executeRawUnsafe("SET LOCAL statement_timeout='10s'");
  const [state]=await tx.$queryRawUnsafe(`SELECT current_setting('session_replication_role') AS replication,(SELECT count(*)::integer FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations,EXISTS(SELECT 1 FROM pg_constraint WHERE conname='StudentApplicationDocumentBinding_assetId_fkey') AS boundary`);
  assert.equal(state.replication,'origin');assert.equal(state.migrations,108);assert.equal(state.boundary,false);
  for(const row of manifest.rows){const delegate=row.model[0].toLowerCase()+row.model.slice(1);await tx[delegate].create({data:row.data});}
  const [orphans]=await tx.$queryRawUnsafe(`SELECT count(*)::integer AS count FROM public."StudentApplicationDocumentBinding" b LEFT JOIN public."AssetRecord" a ON a.id=b."assetId" WHERE a.id IS NULL`);
  assert.equal(orphans.count,1);
  return {rowsCreated:manifest.rows.length,modelsPopulated:new Set(manifest.rows.map(r=>r.model)).size,historicalStageMigrations:108,orphanCount:orphans.count,triggersBypassed:false,manifestSha256:digest(JSON.stringify(manifest))};
 },{timeout:60000});
}
