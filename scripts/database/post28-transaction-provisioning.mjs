import {validateTargetDeclaration,inspectLiveTarget} from './post28-isolation.mjs';
// Provisioning is a separate, declared principal on the DB-T database. Runtime
// DB-T remains APPLICATION and is never allowed to run DDL or write the ledger.
export async function preflightTransactionProvisioning(contract,appUrl,setupUrl,env,sha,readIdentity,{requireEmpty=false}={}){
 const app=validateTargetDeclaration(contract,'DB-T',appUrl,env,sha);
 if(Object.keys(contract.targets).length!==1||contract.provisioning?.label!=='DB-T'||contract.provisioning.role!=='post28_tx_migrator'||contract.provisioning.roleKind!=='MIGRATION')throw new Error('POST28_TRANSACTION_PROVISIONING_DECLARATION_REQUIRED');
 let url;try{url=new URL(setupUrl);}catch{throw new Error('POST28_TRANSACTION_SETUP_URL_INVALID');}
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='127.0.0.1'||Number(url.port||5432)!==app.port||decodeURIComponent(url.pathname.slice(1))!==app.database||decodeURIComponent(url.username)!==contract.provisioning.role||!url.password||url.hash||[...url.searchParams].some(([key,value])=>key!=='schema'||value!=='public'))throw new Error('POST28_TRANSACTION_SETUP_TARGET_MISMATCH');
 const expected={...app,role:contract.provisioning.role,roleKind:'MIGRATION'};
 const runtimeLive=await readIdentity(appUrl,app);const runtime=inspectLiveTarget(app,runtimeLive,{requireEmpty});
 const setupLive=await readIdentity(setupUrl,expected);const setup=inspectLiveTarget(expected,setupLive,{requireEmpty});
 if(setupLive.schemaCreate!==true)throw new Error('POST28_TRANSACTION_SETUP_DDL_REQUIRED');
 return {runtime,setup};
}
// Optional, explicit synthetic certificate owner workflow scope on a new DB-T only.
export const CERTIFICATE_FIXTURE_APPLICATION_TABLES=Object.freeze(['CertificateIssuer','CertificateTemplate','CertificateTemplateVersion','CertificateIssuanceInbox','CertificateLedgerEntry']);
export const COURSE_FIXTURE_APPLICATION_TABLES=Object.freeze(['CourseImportAnalysis','CourseFieldProvenance']);
export const LEARNING_PATH_FIXTURE_APPLICATION_TABLES=Object.freeze(['LearningPath','LearningPathVersion','LearningPathCourse','LearningPathEnrollment']);
export const R08_OUTBOX_FIXTURE_APPLICATION_TABLES=Object.freeze(['StudentWorkspaceEventInbox']);
export const R08_SESSION_FIXTURE_APPLICATION_TABLES=Object.freeze(['CredentialRecord']);
export const R08_PROVIDER_FIXTURE_APPLICATION_TABLES=Object.freeze(['FinancePaymentAttemptRecord']);
export const R09_LEARNER_APPLICATION_TABLES=Object.freeze(['CourseLessonProgress']);
// Only the explicit R09 synthetic workflow lab may author CMS revisions and
// complete a real lesson. This adds no DDL, ledger or production capability.
export const R09_WORKFLOW_APPLICATION_TABLES=Object.freeze([
 'CmsCategory','CmsLocalizedContent','CmsContentTag','CmsContentAttachment',
 'CmsWorkflowReview','CmsContentRevision','CmsEditorialLedger','CmsRedirect','CmsScheduledJob',
 'CourseModule','CourseLesson','CourseLessonProgress',
 ...CERTIFICATE_FIXTURE_APPLICATION_TABLES,
]);
export const TRANSACTION_APPLICATION_TABLES=Object.freeze([
 'ImportRateBudget', // Synthetic distributed source acquisition reservation tests.
 'CertificateVerificationLog', // Actual verification analytics transaction test.
 'Certificate', // Explicit revoked synthetic read-isolation fixture; no template/issuer approval grants.
 'ImportBatch','ImportRecord','ImportScreeningReceipt',
 'UniversityImportChangeSet','UniversityImportChange',
 'UniversityProgramStudyProfile','UniversityProgramStudyLanguage',
 'BackgroundJobRecord','BackgroundJobExecutionRecord','BackgroundJobDeadLetterRecord','TransactionalOutboxRecord',
 'CmsContentNode','CmsPublishedContent','AssetRecord','StudentWorkspace','StudentApplicationTracker','StudentApplicationDocumentBinding',
 'FinanceInvoiceRecord','FinancePaymentRecord','FinanceCommandRecord',
 'AuditRecord','StudentTimelineEntry','StudentPrivacyConsentDecision','StudentSavedCollection','StudentSavedItem','StudentSearchHistory','StudentRecentlyViewed','StudentPersonalStatistics',
 'FinancialAccountRecord','FinancialTransactionRecord','FinancialLedgerEntryRecord','ReferenceCurrency',
 'FinanceApprovalRecord','FinanceApprovalDecisionRecord','FinanceAdjustmentCaseRecord',
 'ScholarshipUniversityLink','ScholarshipSponsorContext','ScholarshipDegreeTarget','ScholarshipMajorTarget','ScholarshipEligibilityItem',
 'IdentityRecord','UserRecord','AccountRecord','RoleRecord','RoleAssignmentRecord','SessionRecord','ApiIdempotencyRecord','FinanceExchangeRateRecord',
 'ReferenceCountry','AdministrativeRegion','ReferenceCity',
 'ScholarshipRequiredDocument','Course','CourseVersion','CourseEnrollment','CourseCompletion',
 'ReferenceLanguage','ExternalCourseProvider','ExternalCourseProviderDomain','CourseSourceIdentity','CourseSourceUrlHistory',
 'FinanceRefundRecord','FinanceWalletRecord','FinanceTransferRecord',
 'FinanceDocumentRecord','FinanceInstallmentPlanRecord','FinanceWalletHoldRecord',
 'UniversityCampus','UniversityOrganizationUnit','UniversityProgramCampus','UniversityProgramAdmissionRequirement',
 'InternationalTest','InternationalTestVariant','InternationalTestVersion','InternationalTestVersionScoreScale',
 'Scholarship','ScholarshipVersion','ScholarshipApplicationCycle',
 'University','UniversityAcademicProgram','DegreeLevel','Major','MajorLevelProfile','MajorVersion',
 'AcademicTaxonomyNode','CourseTaxonomyResolution','CourseAcademicTaxonomyLink','CourseMajorProjection'
]);
