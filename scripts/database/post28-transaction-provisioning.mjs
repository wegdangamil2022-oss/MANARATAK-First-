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
export const TRANSACTION_APPLICATION_TABLES=Object.freeze([
 'BackgroundJobRecord','BackgroundJobExecutionRecord','BackgroundJobDeadLetterRecord','TransactionalOutboxRecord',
 'CmsContentNode','CmsPublishedContent','AssetRecord','StudentWorkspace','StudentApplicationTracker','StudentApplicationDocumentBinding',
 'FinanceInvoiceRecord','FinancePaymentRecord','FinanceCommandRecord',
 'AuditRecord','StudentTimelineEntry','StudentPrivacyConsentDecision','StudentSavedCollection','StudentSavedItem','StudentSearchHistory','StudentRecentlyViewed','StudentPersonalStatistics',
 'FinancialAccountRecord','FinancialTransactionRecord','FinancialLedgerEntryRecord','ReferenceCurrency',
 'FinanceApprovalRecord','FinanceApprovalDecisionRecord','FinanceAdjustmentCaseRecord',
 'ScholarshipUniversityLink','ScholarshipSponsorContext','ScholarshipDegreeTarget','ScholarshipMajorTarget',
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
