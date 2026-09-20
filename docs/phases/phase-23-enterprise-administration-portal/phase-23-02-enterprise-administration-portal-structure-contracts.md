# MANARATAK 2.0: Phase 23 (Enterprise Administration Portal) Structure Contracts

**Document ID:** PHASE-23-02-STRUCT-CONTRACTS  
**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING  
**Phase:** 23  
**Domain:** Enterprise Administration Portal  
**Artifact:** Part B - Administration Structure Contracts  

---

> **W7 source-rebaseline notice (2026-09-07):** This specification is source-rebaselined under `MNT-AUD-0045` against the remediated owner APIs, Admin/Public composition, source tests and cross-phase traceability. This status is not runtime or production certification; external DB/provider/deployment/browser evidence remains `RUNTIME_EVIDENCE_PENDING`. See `docs/remediation/P23_P24_REBASELINE_TRACEABILITY.md`.

### Navigation
[← Phase 22: Enterprise Product Experience](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md) | [Phase 23: Architecture Spec (Part A)](./phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 23: Workflows & Operational Experience (Part C)](./phase-23-03-enterprise-administration-portal-workflows-operational-experience.md) | [Phase 24: Enterprise Public Platform →](../phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md)

---

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.  
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.  
> **Note:** The contracts declared in Part B represent administration-structure contracts and admin view contracts, NOT domain ownership or persistence contracts. Admin modules are management surfaces over domain-owned APIs and read-models, not separate domain modules or database registries.  

---

## Part B - Administration Structure Contracts

### 23.B.1 Administration View Contracts

**Architectural Commentary**  
The Administration Portal is structurally composed of unified administrative management views. These interfaces provide operational review and control surfaces over underlying domain platforms across the fixed 24-phase roadmap.

```typescript
/**
 * Core contract defining an administrative management view surface.
 * Admin views present domain read-models and dispatch administrative commands.
 */
export interface IAdministrationView {
  viewId: string;
  viewName: string;
  targetDomainPhase: string;
  isExtensibleWithinRoadmap: boolean; // true
}

export interface IDashboardAdminView extends IAdministrationView {}
export interface IScholarshipsAdminView extends IAdministrationView {}
export interface IUniversitiesAdminView extends IAdministrationView {}
export interface ICoursesAdminView extends IAdministrationView {
  courseAdminDashboard: ICourseAdminDashboard;
}

export interface ICourseAdminDashboard {
  viewCourses(): Promise<any>;
  filterCourses(criteria: any): Promise<any>;
  getCourseEditorState(courseId: string): Promise<ICourseAdminEditorState>;
}

export interface ICourseAdminEditorState {
  courseId: string;
  metadata: any;
  curriculum: ICurriculumBuilderState;
  assessments: IAssessmentAdminDraft[];
}

export interface ICourseMetadataAdminCommand {
  courseId: string;
  title: string;
  originType: 'NativeManaratakCourse' | 'ExternalLinkedCourse' | 'PaidCourse' | 'RelatedPaidService';
  isFreeCourse: boolean;
  language: string;
  courseLevel: string;
  studyDuration: string;
  categories: string[];
  instructorMetadata: any;
  visibility: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  adminId: string;
}

export interface ICurriculumBuilderState {
  courseId: string;
  modules: IModuleAdminDraft[];
}

export interface IModuleAdminDraft {
  moduleId: string;
  title: string;
  orderIndex: number;
  lessons: ILessonAdminDraft[];
}

export interface ILessonAdminDraft {
  lessonId: string;
  title: string;
  orderIndex: number;
  lessonType: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'ASSIGNMENT' | 'EXTERNAL_LINK' | 'MIXED_MEDIA';
  isRequired: boolean;
  estimatedDurationMinutes: number;
  learningAssets: ILearningAssetAdminReference[];
}

export interface ILearningAssetAdminReference {
  assetId: string; // ADR-024 EAP asset handle
  assetType: 'THUMBNAIL' | 'COVER' | 'VIDEO' | 'IMAGE' | 'PDF' | 'SUBTITLE' | 'AUDIO' | 'SCORM' | 'DOWNLOADABLE' | 'PREVIEW';
}

export interface IAssessmentAdminDraft {
  assessmentId: string;
  type: 'QUIZ' | 'EXAM' | 'ASSIGNMENT';
  title: string;
  passingScore: number;
  attemptLimit: number;
  timerMinutes?: number;
  questions: IQuestionAdminDraft[];
}

export interface IQuestionBankAdminDraft {
  bankId: string;
  title: string;
  questions: IQuestionAdminDraft[];
}

export interface IQuestionAdminDraft {
  questionId: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'MATCHING' | 'ORDERING' | 'FILE_UPLOAD';
  text: string;
  difficulty: string;
  options?: any[];
  correctAnswer?: any;
  feedback?: string;
  isAutoGraded: boolean;
  requiresManualReview: boolean;
}

export interface ICoursePublicationReviewRecord {
  courseId: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy: string;
  reviewDate: Date;
  comments: string;
}

export interface IPaidCourseAdminConfiguration {
  courseId: string;
  isPaid: boolean;
  priceReferenceId: string; // Resolves to Phase 19 pricing
  isPaymentReady: boolean;
}

export interface IExternalCourseReviewRecord {
  courseId: string;
  importStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isFreeStudyVerified: boolean;
  isDirectUrlVerified: boolean;
  trustReviewFlag: boolean;
  reviewedBy: string;
}

export interface ICourseAdminAuditTrailEntry {
  auditId: string;
  courseId: string;
  action: string;
  changedBy: string;
  timestamp: Date;
  previousState: any;
  newState: any;
}
export interface ICountriesAdminView extends IAdministrationView {}
export interface IMajorsAdminView extends IAdministrationView {}

/**
 * Admin view for Phase 21 recruitment employers.
 * Scoped strictly to Phase 21 recruitment employer metadata.
 * Does NOT create a standalone Organizations/Employers module, registry, or platform.
 */
export interface IRecruitmentEmployersAdminView extends IAdministrationView {}

export interface IArticlesAdminView extends IAdministrationView {}
export interface IEducationalServicesAdminView extends IAdministrationView {}
export interface IEducationalToolsAdminView extends IAdministrationView {
  toolRegistryOverview: IToolAdminControlPanel;
}

export interface IToolAdminControlPanel {
  viewRegistry(): Promise<any>;
  filterTools(criteria: any): Promise<any>;
  getToolDetail(toolId: string): Promise<any>;
}

export interface IToolVisibilityAdminCommand {
  toolId: string;
  visibility: 'ACTIVE' | 'COMING_SOON' | 'UNDER_DEVELOPMENT' | 'HIDDEN_ADMIN_ONLY' | 'DISABLED' | 'RETIRED';
  isPublicAvailable: boolean;
  isAuthenticatedAvailable: boolean;
  isAnonymousExecutionAllowed: boolean;
  reason: string;
  adminId: string;
}

export interface IToolLifecycleAdminCommand {
  toolId: string;
  enable: boolean;
  maintenanceMode: boolean;
  reason: string;
  adminId: string;
}

export interface IToolPriorityAdminCommand {
  toolId: string;
  priority: 'P1_CORE_LAUNCH' | 'P2_EXPANSION' | 'P3_LATER';
  adminId: string;
}

export interface IToolModerationReviewRecord {
  toolId: string;
  moderationStatus: 'APPROVED' | 'FLAGGED' | 'REJECTED' | 'PENDING';
  safetyReviewPassed: boolean;
  reviewedBy: string;
  reviewDate: Date;
}

export interface IToolDependencyHealthProjection {
  toolId: string;
  dataDependencies: Array<{
    platformPhase: string;
    status: 'HEALTHY' | 'UNREACHABLE' | 'DEGRADED';
  }>;
  aiDependencyHealth?: 'HEALTHY' | 'UNREACHABLE' | 'THROTTLED';
}

export interface IAdminToolAuditTrailEntry {
  auditId: string;
  toolId: string;
  action: string;
  changedBy: string;
  timestamp: Date;
  previousState: any;
  newState: any;
}

/**
 * AI Governance & Admin View.
 * Consumes Phase 17 - Enterprise AI Platform APIs for monitoring model performance and prompt configs.
 */
export interface IAIGovernanceAdminView extends IAdministrationView {}

export interface IStudentsAdminView extends IAdministrationView {}
export interface ICertificatesAdminView extends IAdministrationView {}
export interface IUsersAdminView extends IAdministrationView {}
export interface IImportReviewAdminView extends IAdministrationView {}

/**
 * Generic Import Control Plane Admin Surface.
 * Serves as a unified control-plane for data ingestion across all supported platform domains.
 * Does NOT own CSV/JSON parsing (Phase 06) or domain schemas (Domain Phases).
 */
export interface IImportControlPlaneAdminView extends IAdministrationView {
  supportedDomains: string[]; // ['scholarships', 'universities', 'majors', 'courses', 'international-tests', 'services', 'cms']
  supportedInputMethods: ('file' | 'paste' | 'url' | 'connector' | 'demo')[];
  hasSourceConnectorsSection: boolean; // true
  hasImportOperationsCenter: boolean; // true
  hasScheduledImportsPreview: boolean; // true
  allowsAutoPublish: boolean; // false
  allowsUncontrolledWebCrawling: boolean; // false
}

export interface IAdminImportDomainCard {
  domainKey: string;
  domainName: string;
  targetWorkspacePath: string; // e.g. '/admin/scholarships'
  supportedInputMethods: string[];
  importedCount: number;
  incompleteCount: number;
  transferredCount: number;
  failedCount: number;
  lastBatchStatus: string;
  startImportRoutePath: string; // e.g. '/admin/imports/scholarships'
}

export interface IAdminDomainImportCenter {
  domainKey: string; // 'scholarships' | 'universities' | 'majors' | 'courses' | 'international-tests' | 'services' | 'cms'
  domainName: string;
  workspacePath: string;
  providers: IAdminImportProviderCard[];
  wizardActive: boolean;
  wizardState?: IAdminImportWizardState;
}

export interface IAdminImportProviderCard {
  providerId: string;
  providerName: string;
  sourceType: 'official_gov' | 'official_univ' | 'official_foundation' | 'trusted_platform' | 'aggregator' | 'manual_source';
  trustScore: number; // 0-100
  officialUrl: string;
  lastCheckedTime: string;
  importedCount: number;
  failedCount: number;
  incompleteCount: number;
  transferredCount: number;
  status: 'active' | 'needs_setup' | 'disabled';
}

export interface IAdminImportWizardState {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  selectedDomainKey: string;
  selectedProvider: IAdminImportProviderCard;
  inputMethod: 'file' | 'paste' | 'url' | 'connector' | 'demo';
  officialUrlInput?: string;
  pastedPayload?: string;
  recordLimitChoice: '10' | '50' | '100' | 'custom';
  customRecordLimit?: number;
  instructionNotes: IAdminImportInstructionNote;
  executionSummary?: IAdminImportExecutionSummary;
}

export interface IAdminImportInstructionNote {
  focusPostgrad: boolean;
  ignoreExpired: boolean;
  requireOfficialUrl: boolean;
  missingDeadlineReview: boolean;
  importBilingual: boolean;
  customEngineNote?: string;
}

export interface IAdminImportExecutionSummary {
  batchId: string;
  totalProcessed: number;
  transferredCount: number;
  incompleteCount: number;
  failedCount: number;
  targetWorkspacePath: string;
  autoPublished: false; // strictly false
}

export interface IAdminImportSourceConnectorView {
  connectorId: string;
  name: string;
  domainKey: string;
  officialUrl: string;
  sourceType: 'official_gov' | 'official_univ' | 'official_foundation' | 'trusted_platform' | 'manual_source';
  trustScore: number; // 0-100
  status: 'active' | 'needs_config' | 'disabled';
  lastCheckTimestamp: string;
}

export interface IAdminImportOperationSummary {
  batchId: string;
  targetDomain: string;
  sourceSystem: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'RUNNING' | 'QUEUED';
  startTime: string;
  importedCount: number;
  failedCount: number;
  transferredCount: number;
}

export interface IAdminImportMethodOption {
  methodKey: 'file' | 'paste' | 'url' | 'connector' | 'demo';
  labelKey: string;
  requiresOfficialUrlInput?: boolean;
  stagedUrlNoticeRequired?: boolean; // true for 'url' method
}

export interface IAdminSourceTrustScore {
  score: number; // 0-100
  trustLevel: 'official' | 'trusted' | 'verification_needed' | 'low_trust';
  warnInImportModal: boolean; // true if score < 80
}

export interface IAdminScheduledImportPreview {
  isPreviewOnly: boolean; // true
  plannedFrequencies: string[]; // ['daily', 'weekly', 'monthly']
  hasGlobalStartStop: boolean; // false
}

/**
 * Review Queue Overview Admin Surface.
 * Serves strictly as an aggregate pending-work control-plane dashboard.
 * Does NOT own domain review logic, nor does it perform editing, publishing, importing, or deletion.
 * Routing from Review Queue items directs administrators to their respective domain admin workspaces.
 */
export interface IReviewQueueAdminView extends IAdministrationView {
  isAggregateOverviewOnly: boolean; // true
  allowsDirectDomainEditing: boolean; // false
  allowsDirectPublishing: boolean; // false
  allowsDirectDeletion: boolean; // false
  routesToDomainWorkspace: boolean; // true
}

/**
 * Translation Review & Admin Workflow View.
 * Provides editorial review for translations; execution is delegated to Phase 17 AI / CMS workflows.
 */
export interface ITranslationReviewAdminView extends IAdministrationView {}

/**
 * Publication Review & Admin Control Surface.
 * Issues publication status commands; final public page composition and rendering belong to Phase 24.
 */
export interface IPublicationReviewAdminSurface extends IAdministrationView {}

/**
 * Notification Admin View.
 * Displays operational alert logs; event dispatching relies on core platform event bus.
 */
export interface INotificationAdminView extends IAdministrationView {}

/**
 * Operational Read-Model Dashboard.
 * Presents operational telemetry; analytics computation relies on domain telemetry services.
 */
export interface IOperationalReadModelDashboard extends IAdministrationView {}

export interface ISettingsAdminView extends IAdministrationView {}
```

---

### 23.B.2 Navigation Structure Contracts

**Architectural Commentary**  
Enterprise administration requires immediate access and zero navigational ambiguity. The portal utilizes a unified vertical sidebar, enforcing consistency, simplicity, and operational efficiency across all administrative views.

```typescript
/**
 * Canonical enterprise definition of the administration navigation architecture.
 */
export interface INavigationStructure {
  navigationType: string; // "Unified Vertical Sidebar"
  hasMultiplePanels: boolean; // false
  hasIndependentSubsystems: boolean; // false
  designPrinciples: string[]; // ["Simplicity", "Consistency", "Operational Efficiency"]
}
```

---

### 23.B.3 Module Integration Workflow Contracts

**Architectural Commentary**  
Administrative views are interconnected through structured operational pipelines. Data flows through defined review and moderation stages before public availability.

```typescript
/**
 * Structural contract for cross-phase administrative workflows.
 */
export interface IAdminIntegrationWorkflow {
  workflowId: string;
  stages: string[];
  operatesInIsolation: boolean; // false
}

export const StandardContentWorkflow: IAdminIntegrationWorkflow = {
  workflowId: 'WF-CONTENT-INTEGRATION',
  stages: [
    'Import Ingestion (Phase 06)',
    'Triage & Review (Phase 23)',
    'Metadata Editing (Phase 23)',
    'Translation Review (Phase 23/17)',
    'Publication Approval (Phase 23)',
    'Public Composition (Phase 24)',
  ],
  operatesInIsolation: false,
};
```

---

### 23.B.4 Administration Search Philosophy Contracts

**Architectural Commentary**  
The portal intentionally omits a un-scoped global search bar in favor of domain-filtered administrative search and structured review queues. Management focuses strictly on organized domain views and operational workflows.

```typescript
export interface IAdminSearchPhilosophy {
  hasGlobalAdminSearch: boolean; // false
  managementFocus: string; // "Domain-Scoped Admin Views and Review Queues"
}
```

---

### 23.B.5 Tasks & Operational Review Center Contracts

**Architectural Commentary**  
This centralized operational review hub aggregates pending moderation items, validation warnings, and system alerts into actionable administrative task lists.

```typescript
/**
 * Architectural contract for operational task aggregation.
 */
export interface ITasksAndReviewCenter {
  centerId: string;
  role: string; // "Operational Monitoring & Review Hub"
  monitoredCategories: string[];
}

export const MonitoredSystemEvents: string[] = [
  'Newly Imported Records (Pending Triage)',
  'Untranslated Content Items',
  'Translations Awaiting Review',
  'Content Pending Publication Approval',
  'Scheduled Publication Actions',
  'Expired Scholarship Offerings',
  'Missing Required Metadata',
  'Validation & Quality Warnings',
  'System Health & Operational Alerts',
];
```

---

### 23.B.6 Public Platform Visibility & Command Surface Contracts

**Architectural Commentary**  
Phase 23 is the administrative client for owner-domain publication/availability commands and Phase 16 CMS composition commands. It does not persist an independent public-visibility truth. Phase 24 owns rendering/composition only and consumes the published owner/CMS read models.

```typescript
export interface IPublicPlatformCommandSurface {
  canIssueOwnerPublishCommand: boolean; // true, through owner APIs
  canIssueOwnerUnpublishCommand: boolean; // true, through owner APIs
  canEditCmsNavigationAndBlocks: boolean; // true, through Phase 16 APIs
  ownsIndependentVisibilityStore: boolean; // false
  ownsPublicPageRendering: boolean; // false (Phase 24)
}
```

---

### 23.B.7 Roadmap Scalability & Scope Governance Contracts

**Architectural Commentary**  
The Administration Portal is designed as a modular surface strictly for approved roadmap-scoped entities within the fixed 24-phase roadmap.

```typescript
export interface IRoadmapScalabilityGovernance {
  supportsRoadmapExpansion: boolean; // true
  allowsUnapprovedPhases: boolean; // false (Restricted to 24-phase roadmap)
  supportedIntegrations: string[];
}

export const SupportedIntegrations: string[] = [
  'AI Governance Views (Phase 17)',
  'Roadmap Domain Entities (Phases 07-13, 16, 18, 20, 21)',
  'CMS Editorial Workflows (Phase 16)',
  'Service Fulfillment Monitoring (Phase 20)',
  'Career & Alumni Metadata Views (Phase 21)',
];
```

---

### 23.B.8 Scholarship Admin Conceptual Contracts

**Architectural Commentary**  
These TypeScript structural contracts define the Scholarship Admin Workspace, vertical list rows, unified detail views, action bars, fetch missing fields enrichment requests, import/merge history, and quality status governance.

```typescript
export interface IAdminScholarshipListRow {
  id: string;
  displayName: string;
  originalName?: string;
  sponsorName: string;
  degreeLevel: string;
  fundingCoverage: string;
  studyCountry: string;
  applicationDeadline?: string;
  completenessStatus: 'complete' | 'incomplete';
  status: 'IMPORTED' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  verificationStatus: string;
  translationStatus: string;
}

export interface IAdminScholarshipDetailView {
  scholarshipId: string;
  displayName: string;
  originalName: string;
  sponsorName: string;
  studyCountry: string;
  degreeLevel: string;
  fundingCoverage: string;
  applicationDeadline: string;
  applicationLink: string;
  officialSourceUrl: string;
  eligibilityCriteria: string;
  requiredDocuments: string;
  eligibleMajorsOrFields: string[];
  coverageDetails: string;
  studyLanguage: string;
  qualityStatus: IAdminScholarshipQualityStatus;
  importMergeHistory: IAdminScholarshipImportMergeHistory[];
  auditHistory: any[];
}

export interface IAdminScholarshipActionBar {
  availableActions: ('EDIT' | 'APPROVE' | 'READY_TO_PUBLISH' | 'PUBLISH' | 'UNPUBLISH' | 'REJECT' | 'ARCHIVE' | 'DELETE')[];
  requiresConfirmation: boolean;
  publicLinkAvailableOnlyWhenPublished: boolean;
}

export interface IAdminScholarshipMissingFieldFetchRequest {
  scholarshipId: string;
  officialSourceUrl: string;
  missingFieldsOnly: boolean;
}

export interface IAdminScholarshipMissingFieldSuggestion {
  sourceUrl: string;
  suggestedFields: Record<string, any>;
  noticeArabic: string;
  overwriteReviewedFields: false; // strictly false
}

export interface IAdminScholarshipImportMergeHistory {
  batchId: string;
  timestamp: string;
  duplicateStatus: 'new' | 'duplicate_skipped' | 'existing_enriched';
  fieldsMerged: string[];
  reviewedFieldsProtected: boolean;
}

export interface IAdminScholarshipQualityStatus {
  completeness: 'complete' | 'incomplete';
  verificationStatus: string;
  translationStatus: string;
  trustScore: number;
}
```

---

### 23.B.9 University Admin Conceptual Contracts

**Architectural Commentary**  
These TypeScript structural contracts define the University Admin Workspace, vertical list rows, unified detail views, action bars, fetch missing fields enrichment requests, import/merge history, and quality status governance.

```typescript
export interface IAdminUniversityListRow {
  id: string;
  displayName: string;
  country: string;
  universityType: 'Public' | 'Private';
  ranking?: number;
  status: 'IMPORTED' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
}

export interface IAdminUniversityDetailView {
  universityId: string;
  displayName: string;
  originalName: string;
  country: string;
  city: string;
  universityType: 'Public' | 'Private';
  ranking?: number;
  officialWebsite: string;
  logoUrl?: string;
  description: string;
  accreditations: string;
  faculties: string;
  academicPrograms: string[];
  admissionRequirements: string;
  tuitionReferences: string;
  campuses: string[];
  qualityStatus: IAdminUniversityQualityStatus;
  importMergeHistory: IAdminUniversityImportMergeHistory[];
  auditHistory: any[];
}

export interface IAdminUniversityActionBar {
  availableActions: ('EDIT' | 'APPROVE' | 'READY_TO_PUBLISH' | 'PUBLISH' | 'UNPUBLISH' | 'REJECT' | 'ARCHIVE' | 'DELETE')[];
  requiresConfirmation: boolean;
  publicLinkAvailableOnlyWhenPublished: boolean;
}

export interface IAdminUniversityMissingFieldFetchRequest {
  universityId: string;
  officialWebsiteUrl: string;
  missingFieldsOnly: boolean;
}

export interface IAdminUniversityMissingFieldSuggestion {
  sourceUrl: string;
  suggestedFields: Record<string, any>;
  noticeArabic: string;
  overwriteReviewedFields: false; // strictly false
}

export interface IAdminUniversityImportMergeHistory {
  batchId: string;
  timestamp: string;
  duplicateStatus: 'new' | 'duplicate_skipped' | 'existing_enriched';
  fieldsMerged: string[];
  reviewedFieldsProtected: boolean;
}

export interface IAdminUniversityQualityStatus {
  completeness: 'complete' | 'incomplete';
  verificationStatus: string;
  translationStatus: string;
  trustScore: number;
}
```

---

### 23.B.10 Administration Design Principles Contracts

**Architectural Commentary**  
These enterprise principles govern the structural implementation of all administrative views.

```typescript
export interface IAdministrationDesignPrinciples {
  principles: string[];
}

export const CoreDesignPrinciples: string[] = [
  'Single Administration Portal Interface',
  'Unified Navigation Sidebar',
  'Modular Admin Views',
  'Cross-Phase Workflow Handoffs',
  'Operational Simplicity',
  'Centralized Security Governance',
  'High Maintainability',
  'Fixed 24-Phase Roadmap Compliance',
];
```

---

### 23.B.9 Ownership & Governance Rules

- **Admin Surface Ownership:** Phase 23 exclusively owns administration screens, moderation queues, review dashboards, approval forms, task views, and admin command dispatching.
- **Review Queue Overview Boundary:**
  - The Review Queue (`/admin/review-queue`) is defined strictly as an aggregate pending-work control-plane dashboard ("نظرة عامة على قائمة المراجعة").
  - It does NOT own domain review logic, nor does it edit, publish, import, or delete domain records directly.
  - All direct editing, publishing, batch approval, and deletion operations are disabled or removed from the Review Queue overview page.
  - Domain admin workspaces (`/admin/scholarships`, `/admin/universities`, `/admin/majors`, `/admin/courses`, `/admin/international-tests`, `/admin/services`, `/admin/cms`) remain the sole source of truth for detailed record review and lifecycle state changes.
  - Phase 23 composes pending-work read models, cross-domain metrics, reason breakdowns, and navigation routes to domain workspaces.
- **Domain Logic Non-Ownership:** Phase 23 does NOT own domain business schemas, persistence models, state machines, or domain validation rules. Those are owned by their respective domain platforms:
  - **Phase 05:** Owns IAM, audit logging, RBAC/ABAC policies, and break-glass controls.
  - **Phase 06:** Owns import mechanics and raw feed extraction.
  - **Phase 08:** Owns academic taxonomy, degree levels, and classification hierarchies.
  - **Phase 10:** Owns major domain data, naming normalization, deduplication, and major lifecycle.
  - **Phase 11:** Owns university records and institution validation.
  - **Phase 12:** Owns scholarship definitions, eligibility rules, and scholarship domain state machines.
  - **Phase 13:** Owns course catalog data and course lifecycle state machines.
  - **Phase 16:** Owns CMS editorial content lifecycle.
  - **Phase 17:** Owns AI execution and translation processing.
  - **Phase 19:** Owns finance, payments, and transaction records.
  - **Phase 20:** Owns service fulfillment workflows.
  - **Phase 21:** Owns career/alumni records and recruitment employer metadata.
  - **Phase 24:** Owns public page composition, rendering, SEO, and visitor routing.
- **Majors Admin Review Operations:**
  - Phase 23 owns admin review UI and moderation queues for academic majors and specializations (`/admin/majors` and `/admin/majors/:id`).
  - **Explicit Admin Actions**: Include reviewing imported major records, viewing classification issues, correcting structured metadata, fetching missing fields from trusted taxonomy sources (CIP/ISCED), requesting AI student-friendly description drafts, verifying offering universities and linked scholarships, approving/rejecting records, publishing/unpublishing, and archiving.
  - **Lifecycle Consumption Rule**: Phase 23 consumes domain-owned major lifecycle states (`IMPORTED`, `READY_TO_REVIEW`, `READY_TO_PUBLISH`, `PUBLISHED`, `ARCHIVED`) defined by Phase 10 rather than inventing a separate major state machine.
  - **Tollgate Rule**: Imported raw taxonomy records are never published automatically. They require explicit administrative review in Phase 23 before triggering public visibility.

```typescript
export interface IAdminMajorListItem {
  id: string;
  displayName: string;
  degreeLevel?: string;
  collegeOrField?: string;
  cipCode?: string;
  iscedCode?: string;
  jobDemandLevel?: string;
  status: 'IMPORTED' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  completenessStatus?: 'complete' | 'incomplete';
  translationStatus?: 'complete' | 'needs_translation';
  updatedAt?: string;
}

export interface IAdminMajorDetail extends IAdminMajorListItem {
  nameAr?: string;
  nameEn?: string;
  originalName?: string;
  sourceClassification?: string;
  description?: string;
  acquiredSkills?: string[];
  typicalCourses?: string[];
  careerPaths?: string[];
  relatedJobs?: string[];
  relatedMajors?: string[];
  universitiesOfferingCount?: number;
  linkedScholarshipsCount?: number;
  duplicateStatus?: 'new' | 'duplicate_skipped' | 'existing_enriched';
  missingFieldsList?: string[];
  auditHistory?: Array<{ id: string; action: string; actor: string; timestamp: string }>;
}

export interface IAdminMajorActionCommand {
  majorId: string;
  action: 'APPROVE' | 'MARK_READY' | 'PUBLISH' | 'UNPUBLISH' | 'REJECT' | 'ARCHIVE' | 'FETCH_MISSING_FIELDS' | 'GENERATE_AI_DESCRIPTION';
  payload?: any;
  adminId: string;
}
```

---

### 23.B.10 International Tests Admin Conceptual Contracts

**Architectural Commentary**  
These TypeScript structural contracts define the International Tests Admin Workspace, vertical list rows, unified detail views, action bars, fetch missing fields enrichment requests, import/merge history, and quality status governance.

```typescript
export interface IAdminInternationalTestListRow {
  id: string;
  displayName: string;
  nameAr?: string;
  nameEn?: string;
  provider: string;
  minScoreRange?: string;
  validityDuration?: string;
  approxFee?: string;
  centersCount?: number;
  countriesCount?: number;
  status: 'IMPORTED' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  verificationStatus: 'verified' | 'needs_verification';
  completenessStatus: 'complete' | 'incomplete';
}

export interface IAdminInternationalTestDetailView {
  id: string;
  displayName: string;
  nameAr?: string;
  nameEn?: string;
  originalName?: string;
  category: 'Language' | 'Admission' | 'Professional' | 'Aptitude';
  provider: string;
  officialRegistrationUrl?: string;
  officialSourceUrl?: string;
  availableCountriesCount: number;
  testCentersCount: number;
  approxFee?: string;
  validityDuration?: string;
  scoreScale?: string;
  minScoreRange?: string;
  acceptedForScholarshipsCount: number;
  acceptedForUniversitiesCount: number;
  registrationRequirements?: string;
  cancellationReschedulingNotes?: string;
  preparationLinks?: Array<{ title: string; url: string }>;
  sampleMaterialsAssetRefs?: Array<{ name: string; eapAssetId: string; size: string }>;
  sourceReferences?: string[];
  missingFields?: string[];
  status: 'IMPORTED' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  verificationStatus: 'verified' | 'needs_verification';
  duplicateStatus?: 'new' | 'duplicate_skipped' | 'existing_enriched';
  normalizedName?: string;
  fieldsAddedFromOtherSources?: string[];
  conflictingFields?: string[];
  importMergeHistory?: IAdminInternationalTestImportMergeHistory[];
  qualityStatus?: IAdminInternationalTestQualityStatus;
  auditHistory?: Array<{ id: string; action: string; actor: string; timestamp: string }>;
}

export interface IAdminInternationalTestActionBar {
  availableActions: ('EDIT' | 'APPROVE' | 'READY_TO_PUBLISH' | 'PUBLISH' | 'UNPUBLISH' | 'REJECT' | 'ARCHIVE' | 'FETCH_MISSING_FIELDS' | 'LINK_TO_ADMISSIONS')[];
  requiresConfirmation: boolean;
  publicLinkAvailableOnlyWhenPublished: boolean;
}

export interface IAdminInternationalTestMissingFieldFetchRequest {
  testId: string;
  officialSourceUrl: string;
  missingFieldsOnly: boolean;
}

export interface IAdminInternationalTestMissingFieldSuggestion {
  testId: string;
  sourceUrlChecked: string;
  suggestedFields: {
    officialRegistrationUrl?: string;
    approxFee?: string;
    testCentersCount?: number;
    availableCountriesCount?: number;
    validityDuration?: string;
    scoreScale?: string;
    registrationRequirements?: string;
    preparationLinks?: string[];
  };
  missingFieldsList: string[];
  status: 'Preview / Requires Integration';
}

export interface IAdminInternationalTestImportMergeHistory {
  importBatchId: string;
  importedAt: string;
  sourceSystem: string;
  fieldsMerged: string[];
  duplicateAction: 'new' | 'duplicate_skipped' | 'existing_enriched';
}

export interface IAdminInternationalTestQualityStatus {
  isNameNormalized: boolean;
  isProviderVerified: boolean;
  hasOfficialRegistrationUrl: boolean;
  hasScoreScaleDefined: boolean;
  hasSampleMaterialsAttached: boolean;
}
```

---

### 23.B.11 Native Courses Admin Conceptual Contracts

**Architectural Commentary**  
These TypeScript structural contracts define the Courses Admin Section Cards, Native Course Vertical List Rows, Native Course Detail View, Authoring Wizard State, Module Drafts, Lesson Drafts, Assessment Drafts, Question Bank, Certificate Settings, and Publishing Checklist.

```typescript
export interface IAdminCoursesSectionCard {
  id: 'native' | 'imported' | 'paid';
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  route: string;
  badge: string;
  btnText: string;
}

export interface IAdminNativeCourseListRow {
  id: string;
  titleAr: string;
  titleEn?: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: 'Arabic' | 'English' | 'Bilingual';
  priceType: 'Free' | 'Paid' | 'Draft Pricing';
  approxPrice?: string;
  instructor: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  certificateEnabled: boolean;
  missingContent: boolean;
  modulesCount: number;
  lessonsCount: number;
  updatedAt: string;
}

export interface IAdminNativeCourseDetailView {
  id: string;
  titleAr: string;
  titleEn?: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: 'Arabic' | 'English' | 'Bilingual';
  priceType: 'Free' | 'Paid' | 'Draft Pricing';
  approxPrice?: string;
  instructor: string;
  coverImageAssetRef: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  certificateEnabled: boolean;
  certificateConfig?: IAdminCourseCertificateConfigurationView;
  modules: IAdminCourseModuleDraft[];
  assessments: IAdminCourseAssessmentDraft;
  mediaAssets: Array<{ id: string; name: string; type: string; eapAssetId: string; size: string }>;
  auditHistory: Array<{ id: string; action: string; actor: string; timestamp: string }>;
}

export interface IAdminNativeCourseAuthoringWizardState {
  titleAr: string;
  titleEn?: string;
  description: string;
  category: string;
  level: string;
  language: string;
  instructor: string;
  coverImageAssetRef: string;
  priceType: string;
  approxPrice?: string;
  modules: IAdminCourseModuleDraft[];
  mediaAssets: Array<{ id: string; name: string; type: string; eapAssetId: string; size: string }>;
  assessments: IAdminCourseAssessmentDraft;
  certificateConfig: IAdminCourseCertificateConfigurationView;
  status: string;
}

export interface IAdminCourseModuleDraft {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: IAdminCourseLessonDraft[];
}

export interface IAdminCourseLessonDraft {
  id: string;
  title: string;
  durationMins: number;
  type: 'video' | 'text' | 'file' | 'link' | 'quiz';
  eapRef?: string;
}

export interface IAdminCourseAssessmentDraft {
  hasModuleQuizzes: boolean;
  hasFinalExam: boolean;
  passingScorePercent: number;
  attemptLimit: number;
  questionBank: IAdminCourseQuestionBankDraft[];
}

export interface IAdminCourseQuestionBankDraft {
  id: string;
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  choices: string[];
  correctAnswer: string;
}

export interface IAdminCourseCertificateConfigurationView {
  certificateEnabled: boolean;
  templateRef: string;
  passingRequirements: string;
}

export interface IAdminNativeCoursePublishingChecklist {
  hasBasics: boolean;
  hasModules: boolean;
  hasLessons: boolean;
  hasMediaAttached: boolean;
  hasAssessments: boolean;
  hasCertificateConfigured: boolean;
  isPublishReady: boolean;
}

export interface IAdminImportedCourseRecordView {
  id: string;
  titleAr: string;
  titleEn?: string;
  originalTitle?: string;
  provider: string; // Coursera, edX, Cisco, Microsoft, AWS, etc.
  directUrl: string;
  officialSourceUrl: string;
  language: string;
  level: string;
  duration?: string;
  externalPriceType: string; // Free / Paid ($49/mo) / Audit
  certificateAvailable: boolean;
  status: 'DRAFT' | 'AWAITING_REVIEW' | 'MISSING_DATA' | 'BROKEN_LINK' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
  category: string;
  linkedSkills: string[];
  linkedMajors: string[];
  sourceVerified: boolean;
  linkHealth: 'HEALTHY' | 'NEEDS_VERIFICATION' | 'BROKEN';
  missingFieldsCount: number;
}

export interface IAdminPaidCourseRecordView {
  id: string;
  titleAr: string;
  titleEn?: string;
  origin: 'NATIVE_MANARATAK' | 'PARTNER_APPROVED' | 'EXTERNAL_APPROVED';
  linkedNativeCourseId?: string;
  priceAmount: number;
  currency: string;
  vatIncluded: boolean;
  vatRate?: string;
  paymentStatus: 'CONFIGURED' | 'PRICING_INCOMPLETE' | 'PAYMENT_NOT_CONFIGURED';
  phase19HandoffReady: boolean;
  accessType: 'LIFETIME' | 'SUBSCRIPTION' | 'TIME_LIMITED_1YR';
  refundPolicyDays: number;
  certificateEnabled: boolean;
  status: 'DRAFT_PRICING' | 'AWAITING_FINANCE_REVIEW' | 'READY_TO_SELL' | 'PUBLISHED' | 'ARCHIVED';
  enrollmentsCount: number;
  needsFinanceReview: boolean;
}
```

---

### 23.B.11 Services Administration Contracts

```typescript
export interface IAdminStudentServiceItem {
  id: string;
  titleAr: string;
  titleEn?: string;
  section: 'STUDENT_SERVICE';
  category: 'STUDY_CONSULTATION' | 'UNIVERSITY_SELECTION' | 'APPLICATION_FILE_PREP' | 'SOP_REVIEW' | 'MOTIVATION_LETTER_REVIEW' | 'ACADEMIC_CV_OPTIMIZATION' | 'SCHOLARSHIP_APPLICATION';
  categoryLabelAr: string;
  shortDescription: string;
  includedScope: string[];
  excludedScope: string[];
  priceType: 'FREE' | 'PAID_FIXED' | 'PAID_TIERED';
  priceAmount?: number;
  currency?: string;
  priceFormatted: string;
  packages: { id: string; title: string; price: string }[];
  slaDeliveryTime: string;
  assignedTeam: string;
  responsibleRole: string;
  studentRequirements: string[];
  eapTemplates: { id: string; title: string; key: string }[];
  faqs: { question: string; answer: string }[];
  cancellationPolicy: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  activeRequestsCount: number;
  missingPrice: boolean;
  missingTemplates: boolean;
  createdAt: string;
  updatedAt: string;
  auditTrail: { date: string; action: string; operator: string }[];
}

export interface IAdminGeneralServiceItem {
  id: string;
  titleAr: string;
  titleEn?: string;
  section: 'GENERAL_SERVICE';
  category: 'DOCUMENT_TRANSLATION' | 'DEGREE_ATTESTATION' | 'VISA_TRAVEL_SUPPORT' | 'OFFICIAL_FORM_PREP' | 'GENERAL_OPERATIONAL_ASSISTANCE';
  categoryLabelAr: string;
  shortDescription: string;
  includedScope: string[];
  excludedScope: string[];
  priceType: 'FREE' | 'PAID_FIXED' | 'PAID_TIERED';
  priceAmount?: number;
  currency?: string;
  priceFormatted: string;
  packages: { id: string; title: string; price: string }[];
  slaDeliveryTime: string;
  assignedTeam: string;
  responsibleRole: string;
  studentRequirements: string[];
  eapTemplates: { id: string; title: string; key: string }[];
  faqs: { question: string; answer: string }[];
  cancellationPolicy: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  activeRequestsCount: number;
  missingPrice: boolean;
  missingTemplates: boolean;
  createdAt: string;
  updatedAt: string;
  auditTrail: { date: string; action: string; operator: string }[];
}
```

---

### 23.B.12 CMS Administration Contracts

```typescript
export interface IAdminCmsSectionCard {
  id: 'articles' | 'faqs' | 'pages' | 'categories' | 'translations' | 'review';
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  path: string;
  badgeColor: string;
  stats: {
    total: number;
    drafts: number;
    underReview: number;
    published: number;
    needsTranslation: number;
    lastUpdated: string;
  };
}

export interface IAdminCmsContentListRow {
  id: string;
  titleAr: string;
  titleEn?: string;
  contentType: 'ARTICLE' | 'STUDY_GUIDE' | 'NEWS' | 'CHECKLIST' | 'FAQ' | 'STATIC_PAGE';
  contentTypeLabelAr: string;
  categoryAr: string;
  language: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  updatedAt: string;
  author: string;
}

export interface IAdminCmsContentDetailView {
  id: string;
  titleAr: string;
  titleEn?: string;
  slug: string;
  contentType: 'ARTICLE' | 'STUDY_GUIDE' | 'NEWS' | 'CHECKLIST' | 'FAQ' | 'STATIC_PAGE';
  contentTypeLabelAr: string;
  categoryAr: string;
  tags: string[];
  language: string;
  excerptAr?: string;
  excerptEn?: string;
  richBodyAr: string;
  seoMetadata: IAdminCmsSeoMetadata;
  featuredImageAssetKey?: string;
  author: string;
  reviewer?: string;
  translationStatus: IAdminCmsTranslationStatus;
  linkedPublicContext?: string;
  linkedDomainEntities: IAdminCmsLinkedDomainReference[];
  status: 'DRAFT' | 'IN_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  revisionHistory: IAdminCmsRevisionHistoryEntry[];
  auditTrail: Array<{ date: string; action: string; operator: string }>;
}

export interface IAdminCmsActionBar {
  availableActions: (
    | 'EDIT'
    | 'SAVE_DRAFT'
    | 'SEND_REVIEW'
    | 'APPROVE'
    | 'PUBLISH'
    | 'UNPUBLISH'
    | 'ARCHIVE'
    | 'CREATE_TRANSLATION'
    | 'PREVIEW_PUBLIC_PAGE'
    | 'SUGGEST_SEO'
    | 'SUGGEST_TRANSLATION'
  )[];
  requiresConfirmation: boolean;
  publicLinkAvailableOnlyWhenPublished: boolean;
}

export interface IAdminCmsSeoMetadata {
  seoTitleAr: string;
  seoDescriptionAr: string;
  seoKeywordsAr: string[];
  canonicalUrl?: string;
  ogImageAssetKey?: string;
}

export type IAdminCmsTranslationStatus =
  | 'MISSING'
  | 'DRAFT'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED';

export interface IAdminCmsAiDraftSuggestion {
  helperType: 'SUGGEST_TITLE' | 'SUGGEST_EXCERPT' | 'SUGGEST_SEO' | 'SUGGEST_TRANSLATION' | 'SUMMARIZE';
  suggestedValue?: string;
  noticeArabic: string;
  requiresReview: true; // strictly true, AI cannot publish directly
  status: 'Draft / Pending Review' | 'Preview / Requires AI Integration';
}

export interface IAdminCmsLinkedDomainReference {
  type: 'SCHOLARSHIP' | 'UNIVERSITY' | 'COUNTRY' | 'MAJOR' | 'COURSE' | 'SERVICE';
  name: string;
  refId: string;
  readOnlyReferenceOnly: true; // strictly true, CMS cannot edit domain records
}

export interface IAdminCmsRevisionHistoryEntry {
  version: string;
  date: string;
  editor: string;
  notes: string;
}
```

---

### 23.B.13 Student Tools Administration Contracts

```typescript
export interface IAdminStudentToolItem {
  id: string;
  toolKey: string;
  titleAr: string;
  titleEn: string;
  toolType: 'NORMAL_TOOL' | 'AI_TOOL' | 'CALCULATOR' | 'ASSISTANT' | 'COMPARISON_TOOL';
  toolTypeLabelAr: string;
  visibility: 'PUBLIC' | 'AUTHENTICATED_STUDENTS' | 'HIDDEN' | 'ADMIN_ONLY';
  visibilityLabelAr: string;
  status: 'ACTIVE' | 'COMING_SOON' | 'UNDER_DEVELOPMENT' | 'DISABLED' | 'RETIRED';
  statusLabelAr: string;
  priority: 'P1' | 'P2' | 'P3';
  aiDependency: 'REQUIRED' | 'OPTIONAL' | 'NONE';
  aiDependencyLabelAr: string;
  costRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  weeklyUsage: number;
  monthlyUsage: number;
  healthStatus: 'HEALTHY' | 'NEEDS_GOVERNANCE_REVIEW' | 'DEPENDENCY_DEGRADED';
  appearsOnUi: string;
  requiresLogin: boolean;
  updatedAt: string;
}

export interface IAdminStudentToolDetailView extends IAdminStudentToolItem {
  descriptionAr: string;
  aiGovernance?: {
    proxyRoute: string;
    modelAlias: string;
    rateLimit: string;
    tokenQuotaPerRun: string;
    safetyPolicy: string;
    lastHealthCheck: string;
    isGovernanceApproved: boolean;
  };
  dependencyHealthMatrix: {
    aiPlatformPhase17: boolean;
    scholarshipsPhase12: boolean;
    universitiesPhase11: boolean;
    majorsPhase10: boolean;
    coursesPhase13: boolean;
    studentWorkspacePhase15: boolean;
    paymentsPhase19: boolean;
    gracefulDegradationNotice: string;
  };
  auditLogs: Array<{
    id: string;
    timestamp: string;
    operator: string;
    action: string;
    details: string;
  }>;
}

export interface IAdminStudentToolActionBar {
  availableActions: (
    | 'EDIT_METADATA'
    | 'ACTIVATE'
    | 'DISABLE'
    | 'MARK_COMING_SOON'
    | 'HIDE_ADMIN_ONLY'
    | 'SHOW_PUBLICLY'
    | 'TOGGLE_REQUIRE_LOGIN'
    | 'CHANGE_PRIORITY'
    | 'TEST_TOOL'
    | 'OPEN_AI_GOVERNANCE'
    | 'OPEN_DEPENDENCY_HEALTH'
  )[];
  requiresConfirmationForSensitiveStateChanges: boolean; // true
  requiresGovernanceWarningForHighCostAi: boolean; // true
}
```

---

### 23.B.14 Certificates Administration Contracts

```typescript
export interface IAdminCertificateRegistryItem {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  studentReferenceId: string;
  studentNameAr: string;
  studentNameEn: string;
  sourceProgramOrCourse: string;
  courseId: string;
  issuedAt: string;
  status: 'ISSUED' | 'VERIFIABLE' | 'PENDING' | 'REVOKED' | 'ARCHIVED';
  statusLabelAr: string;
  templateId: string;
  templateName: string;
  digitalSignatureStatus: 'VERIFIED' | 'PENDING_SIGNATURE' | 'INVALID';
  publicVerificationUrl: string;
  eapPdfAssetHandle: string; // Phase 05 EAP Handle
  eligibilityVerificationSource: string; // Phase 13 Ledger Reference
}

export interface IAdminCertificateDetailView extends IAdminCertificateRegistryItem {
  digitalSignatureHash: string;
  adminNotes: string;
  revocationReason?: string;
  revokedAt?: string;
  revokedByOperator?: string;
  auditLogs: Array<{
    id: string;
    timestamp: string;
    operator: string;
    action: string;
    details: string;
  }>;
}

export interface IAdminPendingIssuanceRequest {
  id: string;
  studentReferenceId: string;
  studentNameAr: string;
  studentNameEn: string;
  courseOrProgramName: string;
  courseId: string;
  eligibilitySource: string; // Phase 13 Completion System
  requestedAt: string;
  status: 'PENDING_REVIEW' | 'ELIGIBILITY_VERIFIED' | 'REJECTED';
  proposedTemplateId: string;
}

export interface IAdminCertificateTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  language: 'ARABIC' | 'ENGLISH' | 'BILINGUAL';
  logoEapAssetHandle: string; // Phase 05 EAP Handle
  signatureEapAssetHandle: string; // Phase 05 EAP Handle
  accentColorHex: string;
  paperStyle: 'LUXURY_PARCHMENT' | 'MODERN_MINIMAL' | 'OFFICIAL_ACADEMIC';
  legalTextAr: string;
  legalTextEn: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  updatedAt: string;
}

export interface IAdminCertificateActionBar {
  availableActions: (
    | 'PREVIEW_CERTIFICATE'
    | 'ISSUE_CERTIFICATE'
    | 'APPROVE_ISSUANCE_REQUEST'
    | 'VERIFY_DIGITAL_SIGNATURE'
    | 'DOWNLOAD_PDF'
    | 'OPEN_PUBLIC_VERIFICATION'
    | 'REVOKE_CERTIFICATE'
    | 'ARCHIVE'
  )[];
  allowPermanentDeletion: false; // STRICTLY FORBIDDEN
  requiresReasonForRevocation: true;
}
```

---

### 23.B.15 Finance Administration Contracts

```typescript
export interface IAdminInvoiceRegistryItem {
  id: string;
  invoiceNumber: string;
  studentReferenceId: string;
  studentNameAr: string;
  studentNameEn: string;
  itemType: 'PAID_COURSE' | 'STUDENT_SERVICE' | 'EXAM_FEE' | 'CERTIFICATE_FEE';
  itemTypeLabelAr: string;
  itemNameAr: string;
  itemNameEn: string;
  amount: number;
  currency: string;
  paymentMethod: 'CREDIT_CARD' | 'MADA' | 'APPLE_PAY' | 'BANK_TRANSFER';
  paymentMethodLabelAr: string;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'VOID';
  paymentStatusLabelAr: string;
  createdAt: string;
  eapReceiptAssetHandle: string; // Phase 05 EAP Handle
}

export interface IAdminInvoiceDetailView extends IAdminInvoiceRegistryItem {
  subtotal: number;
  discount: number;
  taxVat: number;
  totalAmount: number;
  transactionReferenceId: string;
  paymentGatewayStatus: string;
  eapBankSlipAssetHandle?: string; // Phase 05 EAP Handle
  paidAt?: string;
  adminNotes: string;
  auditEvents: Array<{
    id: string;
    timestamp: string;
    operator: string;
    action: string;
    details: string;
  }>;
}

export interface IAdminRefundRequest {
  id: string;
  invoiceNumber: string;
  studentReferenceId: string;
  studentNameAr: string;
  refundAmount: number;
  currency: string;
  reasonAr: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  requestedAt: string;
}

export interface IAdminBankTransferReview {
  id: string;
  invoiceNumber: string;
  studentReferenceId: string;
  studentNameAr: string;
  amount: number;
  currency: string;
  bankReferenceNumber: string;
  eapSlipAssetHandle: string; // Phase 05 EAP Handle
  submittedAt: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'NEEDS_CLEARER_RECEIPT';
}

export interface IAdminPricingReference {
  id: string;
  itemType: 'PAID_COURSE' | 'STUDENT_SERVICE';
  sourceDomainPhase: 'Phase 13 (Paid Courses)' | 'Phase 20 (Services Catalog)';
  itemNameAr: string;
  itemNameEn: string;
  price: number;
  currency: string;
  isActive: boolean;
  lastUpdated: string;
}

export interface IAdminFinanceActionBar {
  availableActions: (
    | 'CONFIRM_PAYMENT'
    | 'REJECT_BANK_TRANSFER'
    | 'REQUEST_MORE_INFO'
    | 'ISSUE_REFUND'
    | 'MARK_AS_FAILED'
    | 'DOWNLOAD_INVOICE'
    | 'DOWNLOAD_RECEIPT'
    | 'SEND_NOTIFICATION'
  )[];
  allowPermanentDeletion: false; // STRICTLY FORBIDDEN
  requiresReasonForRefund: true;
}
```

---

### 23.B.16 Career & Alumni Administration Contracts

```typescript
export interface IAdminCareerOpportunityListRow {
  id: string;
  titleAr: string;
  titleEn: string;
  type: 'JOB' | 'INTERNSHIP' | 'GRADUATE_PROGRAM' | 'VOLUNTEERING';
  typeLabelAr: string;
  recruitmentEntityNameAr: string;
  recruitmentEntityNameEn: string;
  locationAr: string;
  isRemote: boolean;
  deadline: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';
  statusLabelAr: string;
  applicantCount: number;
  createdAt: string;
}

export interface IAdminCareerOpportunityDetailView {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  opportunityType: 'JOB' | 'INTERNSHIP' | 'GRADUATE_PROGRAM' | 'VOLUNTEERING';
  opportunityTypeLabelAr: string;
  
  recruitmentEntity: {
    id: string;
    entityNameAr: string;
    entityNameEn: string;
    entityType: string;
    countryAr: string;
    website: string;
    verificationStatus: string;
  };

  locationAr: string;
  isRemote: boolean;
  requiredSkills: string[];
  eligibilityRequirements: string[];
  applicationDeadline: string;
  applicationMode: 'INTERNAL_EAP_PORTAL' | 'EXTERNAL_DIRECT_LINK';
  externalApplicationUrl?: string;
  
  publicationStatus: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED' | 'REJECTED' | 'EXPIRED' | 'ARCHIVED';
  publicationStatusLabelAr: string;
  
  sourceUrl: string;
  sourceType: string;
  applicantCount: number;
  missingFields: string[];
  
  aiRecommendationMatchScore: number; // Read-only Phase 17 advisory
  aiAdvisoryNotes: string;

  auditTimeline: Array<{
    id: string;
    actionAr: string;
    actorName: string;
    timestamp: string;
    notes?: string;
  }>;
}

export interface IAdminCareerApplicationItem {
  id: string;
  studentReferenceId: string;
  studentNameAr: string;
  opportunityTitleAr: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED' | 'WITHDRAWN' | 'ACCEPTED';
  submittedAt: string;
  eapCvAssetHandle: string; // Phase 05 EAP Handle
  adminNotes: string;
}

export interface IAdminAlumniProfileItem {
  id: string;
  studentReferenceId: string;
  studentNameAr: string;
  graduationYear: number;
  currentRoleAr: string;
  industryAr: string;
  skillsSummary: string[];
  visibilityStatus: 'PRIVATE' | 'ALUMNI_NETWORK_ONLY' | 'PUBLIC_CONSENT';
  visibilityLabelAr: string;
  profileCompletenessPercentage: number;
}

export interface IAdminRecruitmentEntityItem {
  id: string;
  entityNameAr: string;
  entityNameEn: string;
  entityType: 'COMPANY' | 'ACADEMIC_INSTITUTION' | 'NGO' | 'GOVERNMENT';
  entityTypeLabelAr: string;
  countryAr: string;
  website: string;
  verificationStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'UNVERIFIED';
  relatedOpportunitiesCount: number;
  sourceTrustLevel: 'OFFICIAL_PARTNER' | 'VERIFIED_EMPLOYER' | 'EXTERNAL_AGGREGATOR';
}

export interface IAdminCareerActionBar {
  availableActions: (
    | 'EDIT_OPPORTUNITY'
    | 'APPROVE'
    | 'PUBLISH'
    | 'UNPUBLISH'
    | 'REJECT'
    | 'ARCHIVE'
    | 'FETCH_MISSING_FIELDS'
    | 'OPEN_APPLICANTS'
    | 'OPEN_PUBLIC_PAGE'
  )[];
  allowAutoPublishing: false; // STRICTLY FORBIDDEN
  requiresReasonForRejection: true;
}
```

---

### 23.B.17 AI Governance & AI Center Contracts

```typescript
export interface IAdminAiProvider {
  id: string;
  name: string;
  status: 'ACTIVE' | 'DISABLED' | 'DEGRADED' | 'NOT_CONFIGURED';
  priorityOrder: number;
  assignedServices: string[];
  lastHealthCheck: string;
  avgLatencyMs: number;
  failureRatePercentage: number;
  hasApiKeyConfigured: boolean; // NO raw secrets exposed!
}

export interface IAdminAiTranslationBatch {
  id: string;
  entityTypeAr: string;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  lastTranslatedAt: string;
  targetLanguages: string;
  reviewStatusAr: string;
}

export interface IAdminAiPromptItem {
  id: string;
  nameAr: string;
  nameEn: string;
  serviceName: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  lastUpdated: string;
  updatedBy: string;
  targetProviderModel: string;
  safetyClassification: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  promptText: string;
  variables: string[];
  outputFormatExpectation: string;
  safetyNotes: string;
}

export interface IAdminAiTaskItem {
  id: string;
  taskTypeAr: string;
  relatedDomain: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'NEEDS_HUMAN_REVIEW';
  providerUsed: string;
  modelUsed: string;
  startedAt: string;
  completedAt?: string;
  runtimeDurationMs?: number;
  tokenUsage?: number;
  retryCount: number;
}

export interface IAdminAiLogItem {
  operationId: string;
  toolNameAr: string;
  userType: 'GUEST' | 'STUDENT' | 'ADMIN' | 'SYSTEM';
  provider: string;
  model: string;
  safetyResult: 'PASSED' | 'BANNED_KEYWORD' | 'SENSITIVE_REDACTED' | 'FLAGGED_FOR_REVIEW';
  errorMessage?: string;
  timestamp: string;
}

export interface IAdminAiSettings {
  defaultLanguage: 'ar' | 'en';
  defaultProvider: string;
  fallbackProvider: string;
  maxRetries: number;
  maxInputTextLength: number;
  maxOutputTextLength: number;
  dailyUserRequestLimit: number;
  weeklyUserRequestLimit: number;
  safetyFilterSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  humanReviewThresholdScore: number;
  costAlertThresholdUSD: number;
}
```

---

### 23.B.18 Health & Readiness Contracts

```typescript
export interface IAdminHealthComponent {
  id: string;
  nameAr: string;
  nameEn: string;
  ownedByPhase: string;
  status: 'HEALTHY' | 'WARNING' | 'DOWN' | 'NOT_CONFIGURED';
  lastCheckedTime: string;
  latencyMs?: number;
  errorMessageSummary?: string;
  details: string;
  adminLink?: string;
}

export interface IAdminReadinessCheckItem {
  id: string;
  titleAr: string;
  titleEn: string;
  category: 'ENV' | 'DATABASE' | 'SECURITY' | 'STORAGE' | 'AI' | 'I18N' | 'GATEWAYS';
  passed: boolean;
  notesAr: string;
}

export interface IAdminSystemIncidentItem {
  id: string;
  affectedComponentAr: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  firstDetectedAt: string;
  lastUpdatedAt: string;
  errorSummaryAr: string;
  details: string;
}

export interface IAdminHealthDiagnosticReport {
  timestamp: string;
  environment: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  components: IAdminHealthComponent[];
  readinessChecklist: IAdminReadinessCheckItem[];
  incidents: IAdminSystemIncidentItem[];
}
```

---

### 23.B.19 Admin Settings & Access Control Contracts

```typescript
export interface IAdminUserItem {
  id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  roleId: string;
  roleNameAr: string;
  permissionLevel: 'SUPER_ADMIN' | 'DOMAIN_ADMIN' | 'OPERATIONS' | 'AUDITOR';
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  mfaStatus: 'ENABLED' | 'REQUIRED' | 'DISABLED';
  lastLogin: string;
  ipDeviceSummary: string;
  isRootSuperAdmin?: boolean;
}

export interface IRolePermissionItem {
  id: string;
  roleNameAr: string;
  roleNameEn: string;
  descriptionAr: string;
  userCount: number;
  permissionScope: string;
  lastUpdated: string;
  permissionsByModule: Record<string, string[]>;
}

export interface ISecurityPolicySetting {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  valueDisplay: string;
  status: 'ENABLED' | 'STRICT' | 'SIMULATED' | 'DISABLED';
}

export interface IFeatureFlagItem {
  id: string;
  moduleNameAr: string;
  moduleNameEn: string;
  category: 'STUDENT_TOOLS' | 'ADMIN_MODULES' | 'FINANCE' | 'AI_FEATURES';
  visibilityState: 'ACTIVE' | 'COMING_SOON' | 'HIDDEN_ADMIN_ONLY' | 'DISABLED' | 'RETIRED';
  lastModifiedBy: string;
}

export interface ISystemAuditLogItem {
  id: string;
  adminUser: string;
  actionAr: string;
  moduleAffected: string;
  targetRecord: string;
  timestamp: string;
  ipDeviceSummary: string;
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  details: string;
}
```

---

### 23.B.20 Validation Rules

```typescript
export interface IAdministrationValidation {
  validateSinglePortalArchitecture(): boolean;
  validateUnifiedSidebarConsistency(): boolean;
  validateDomainBoundaryDelegation(): boolean;
}
```

---

### 23.B.11 Architecture Constraints

- **No Fragmented Portals:** The system MUST NOT create separate administration panels or disconnected domain backends.
- **No Domain Persistence in Phase 23:** Phase 23 MUST NOT define domain database tables or ORM schemas.
- **No Unapproved Expansion:** Phase 23 MUST NOT introduce modules or entities outside the fixed 24-phase roadmap.

---

### 23.B.12 Final Contracts Review

- **Contract Validation:** Validated. Structure contracts define administrative view interfaces and governance bounds.
- **Ownership Validation:** Validated. Phase 23 owns admin surfaces and command dispatching while delegating domain logic to domain platforms and public rendering to Phase 24.
- **Readiness Review:** Approved for baseline.

---

### Navigation
[← Phase 22: Enterprise Product Experience](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md) | [Phase 23: Architecture Spec (Part A)](./phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 23: Workflows & Operational Experience (Part C)](./phase-23-03-enterprise-administration-portal-workflows-operational-experience.md) | [Phase 24: Enterprise Public Platform →](../phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md)

---

**Status:** APPROVED FOR BASELINE / DOCUMENTATION READY  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  
