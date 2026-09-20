> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 13 Learning Platform Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B - Enterprise Domain Contracts

### 13.B.1 Foundation Contracts

**Architectural Commentary**
The foundation contracts establish the core identity, metadata, and lifecycle of an educational course. These interfaces ensure that every course-whether native or imported-adheres to a strict, uniform enterprise definition before it can be published.

```typescript
/**
 * Governs the absolute, immutable identity of a Course offering across the enterprise.
 */
export interface ICourseIdentity {
  /**
   * The globally unique enterprise identifier for the course.
   */
  publicId: string;

  /**
   * The canonical, official name of the course.
   */
  canonicalTitle: string;
}

export type CoursePublishingState = 'Draft' | 'InReview' | 'Published' | 'Deprecated' | 'Archived';

/**
 * Defines the state machine transitions for a course's lifecycle.
 */
export interface ICourseLifecycle extends Enterprise.Architecture.Shared.Contracts
  .ILifecycle<CoursePublishingState> {}

/**
 * Provides architectural versioning capabilities, allowing course content to evolve non-destructively.
 */
export interface ICourseVersion {
  /**
   * The integer sequence indicating the structural version.
   */
  versionNumber: number;

  /**
   * Indicates if this specific version is actively serving new enrollments.
   */
  isActiveVersion: boolean;
}
```

### 13.B.2 Learning Content Contracts

**Architectural Commentary**
The learning content contracts define the structural hierarchy of a course (Modules and Lessons) and govern the secure attachment of physical learning materials (videos, documents) to these structural nodes.

```typescript
/**
 * Defines a logical grouping of lessons within a course hierarchy.
 */
export interface IModuleStructure {
  moduleId: string;
  courseId: string;
  title: string;
  sequenceOrder: number;

  /**
   * Ensures structural integrity by linking lessons to their parent module.
   */
  lessons: ILessonDefinition[];
}

/**
 * Defines the atomic instructional unit where pedagogical delivery occurs.
 */
export interface ILessonDefinition {
  lessonId: string;
  title: string;
  sequenceOrder: number;
  isRequired: boolean;
}

/**
 * Governs the digital assets attached to a lesson.
 */
export interface ILearningMaterial {
  materialId: string;
  assetType: string; // Video, PDF, SCORM, etc.
  assetId: string; // ADR-024 EAP asset handle
  requiresSecureStreaming: boolean;
}

/**
 * Tracks specific versions of physical media files to support non-destructive updates.
 */
export interface IMediaVersion {
  versionId: string;
  materialId: string;
  fileHash: string;
}

/**
 * Governs subtitle tracks associated with learning materials, tying language to file paths.
 */
export interface ISubtitleTrack {
  trackId: string;
  languageCode: string;
  subtitleFilePath: string;
}

/**
 * Represents visual thumbnail metadata associated with learning materials.
 */
export interface IThumbnailReference {
  thumbnailId: string;
  materialId: string;
  imageAssetId: string; // ADR-024 EAP asset handle
}

/**
 * Defines SCORM-specific metadata to support legacy e-learning package formats.
 */
export interface IScormMetadata {
  materialId: string;
  packageIdentifier: string;
  manifestVersion: string;
}
```

### 13.B.3 Enrollment Contracts

**Architectural Commentary**
These contracts define the transactional boundaries of student access. They manage capacity, enforce waiting lists, and define the policies that govern whether a learner is eligible to consume course materials.

```typescript
/**
 * Represents the formal business contract granting a student access to a course.
 */
export interface IEnrollmentIdentity {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  enrolledAtUtc: string;
  enrollmentState: string; // Pending, Active, Suspended, Completed, Cancelled
}

/**
 * Enforces business rules regarding capacity and admission.
 */
export interface IEnrollmentPolicy {
  isCapacityLimited: boolean;
  maximumSeats: number;
  requiresApproval: boolean;
}

/**
 * Manages high-concurrency queuing for over-capacity courses.
 */
export interface IWaitlistManagement {
  isWaitlistEnabled: boolean;
  currentQueueDepth: number;
}

/**
 * Represents an individual learner's position within a course's waitlist queue.
 */
export interface IWaitlistEntry {
  entryId: string;
  studentId: string;
  courseId: string;
  queuePosition: number;
  joinedAtUtc: string;
}
```

### 13.B.4 Progress Tracking Contracts

**Architectural Commentary**
The progress tracking contracts provide the immutable history of learner engagement. They are designed for high-throughput, asynchronous updates, isolating tracking telemetry from the structural course definition.

```typescript
/**
 * Aggregates a learner's progression through an active enrollment.
 */
export interface ILearnerProgress {
  enrollmentId: string;
  completionPercentage: number;
  lastActivityUtc: string;
  isCourseCompleted: boolean;
}

/**
 * Tracks the continuous learning session state for cross-device continuity.
 */
export interface IResumePosition {
  lastAccessedLessonId: string;
  lastAccessedMaterialId: string;
  positionBookmark: string; // e.g., video timestamp '00:15:30'
}
```

### 13.B.5 Assessment Contracts

**Architectural Commentary**
Assessment contracts govern the academic evaluation mechanisms. They define the structure of exams, enforce strict attempt limits, and record immutable grading outcomes to guarantee academic integrity.

```typescript
/**
 * Defines the structure and rules of an academic evaluation.
 */
export interface IAssessmentDefinition {
  assessmentId: string;
  assessmentType: string; // Quiz, Midterm, Final, Assignment
  passingScoreThreshold: number;
  maximumAttemptsAllowed: number;
  enforcedTimeLimit: TimeSpan?;
}

/**
 * Tracks a single execution of an assessment by a learner.
 */
export interface IAssessmentAttempt {
  attemptId: string;
  enrollmentId: string;
  assessmentId: string;
  startedAtUtc: string;
  submittedAtUtc: string | null;
  attemptState: string; // InProgress, Submitted, Graded
}

/**
 * Records the immutable final outcome of a graded attempt.
 */
export interface IGradingResult {
  attemptId: string;
  finalScore: number;
  isPassed: boolean;
  gradedBy: string; // System or InstructorId
}
```

### 13.B.6 Question Bank Contracts

**Architectural Commentary**
The Question Bank contracts decouple the authoring of evaluation items from the assessment execution. They define reusable question repositories and randomization strategies to prevent academic misconduct.

```typescript
/**
 * Represents a reusable evaluation item within the enterprise repository.
 */
export interface IQuestionIdentity {
  questionId: string;
  questionType: string; // MultipleChoice, Essay, TrueFalse
  difficultyWeight: number;
}

/**
 * Defines a collection of questions from which an assessment can draw items.
 */
export interface IQuestionPool {
  poolId: string;
  categoryId: string;
  questionIds: string[];
}
```

### 13.B.8 Learning Path Contracts

**Architectural Commentary**
Learning Path contracts define macro-educational journeys. They orchestrate multiple independent courses into a cohesive curriculum, enforcing prerequisite gateways and milestone achievements.

```typescript
/**
 * Defines a strategic, multi-course educational journey.
 */
export interface ILearningPathIdentity {
  pathId: string;
  title: string;
  requiredCourseIds: string[];
}

/**
 * Enforces access control based on prior academic completions.
 */
export interface IPrerequisiteRule {
  targetCourseId: string;
  requiredCompletionCourseIds: string[];
}

/**
 * Represents a critical checkpoint within a learning path that must be achieved.
 */
export interface IMilestone {
  milestoneId: string;
  description: string;
  passingCondition: string;
}

/**
 * Defines a final, manually reviewed project required to complete the learning path.
 * (Note: This ties into the shared Workflow concept for manual review processes).
 */
export interface ICapstoneProject {
  projectId: string;
  title: string;
  requiresManualReview: boolean;
}

/**
 * Defines the logical requirement to complete a section (e.g., ALL vs ANY logic).
 */
export interface ICompletionRequirement {
  requirementId: string;
  logicType: string; // e.g., "ALL", "ANY_TWO"
}

/**
 * Distinguishes between strict sequential progression and flexible learning paths.
 */
export interface ILearningPathProgression {
  pathId: string;
  isStrictlyOrdered: boolean;
}
```

### 13.B.9 Review Contracts

**Architectural Commentary**
Review contracts decouple learner feedback from the transactional core. They manage the collection, aggregation, and moderation of course ratings to drive continuous quality improvement.

```typescript
/**
 * Represents learner feedback submitted upon course completion.
 */
export interface ICourseReview {
  reviewId: string;
  courseId: string;
  studentId: string;
  ratingValue: number; // e.g., 1 to 5
  feedbackText: string;
  submittedAtUtc: string;
  moderationState: string; // Pending, Approved, Flagged, Removed
}

/**
 * Represents a formal report of abuse or policy violation concerning a specific review.
 */
export interface IAbuseReport {
  reportId: string;
  reviewId: string;
  reporterId: string;
  reason: string;
  reportedAtUtc: string;
}
```

### 13.B.10 AI Learning Contracts

**Architectural Commentary**
These contracts define the enterprise integration points between the Learning Platform and the Enterprise AI Platform. They provide strict, read-only structures through which the AI Domain delivers personalized recommendations, skill gap analyses, and adaptive learning insights without mutating the transactional state of the core pedagogical entities.

```typescript
/**
 * Represents an AI-generated suggestion for a specific learner's next best educational action.
 */
export interface ILearningRecommendation {
  recommendationId: string;
  studentId: string;
  recommendedEntityId: string; // CourseId or PathId
  entityType: string; // Course, LearningPath
  confidenceScore: number;
  justificationContext: string;
}

/**
 * Defines a specialized recommendation for individual courses based on historical telemetry.
 */
export interface ICourseRecommendation extends ILearningRecommendation {
  matchingSkillTags: string[];
}

/**
 * Provides AI-driven analytical observations regarding a learner's behavior or performance trends.
 */
export interface ILearningInsight {
  insightId: string;
  studentId: string;
  insightCategory: string; // e.g., "AtRiskOfDroppingOut", "HighPerformer"
  insightDescription: string;
  generatedAtUtc: string;
}

/**
 * Represents an AI calculation of the delta between a learner's current competencies and target requirements.
 */
export interface ISkillGapAnalysis {
  analysisId: string;
  studentId: string;
  targetCareerRole: string;
  missingSkillIds: string[];
  recommendedCourseIdsToBridgeGap: string[];
}

/**
 * Defines a learner's optimal pedagogical consumption patterns as deduced by AI.
 */
export interface IAdaptiveLearningProfile {
  studentId: string;
  preferredContentType: string; // Video, Text, Interactive
  optimalPacing: string; // Accelerated, Standard, SpacedRepetition
}
```

### 13.B.11 Analytics Contracts

**Architectural Commentary**
Analytics contracts define the projection of raw operational telemetry into aggregated enterprise business intelligence. These contracts support the generation of executive dashboards, KPI monitoring, and compliance reporting by exposing read-only statistical aggregations decoupled from the transactional datastores.

```typescript
/**
 * Provides high-level aggregated statistics for the overall Learning Platform.
 */
export interface ILearningAnalytics {
  totalActiveLearners: number;
  platformWideCompletionRate: number;
}

/**
 * Defines aggregated performance and consumption metrics for a specific course.
 */
export interface ICourseAnalytics {
  courseId: string;
  totalEnrollments: number;
  activeEnrollments: number;
  averageCompletionPercentage: number;
  averageRating: number;
}

/**
 * Analyzes the success and failure rates across educational offerings.
 */
export interface ICompletionAnalytics {
  entityId: string; // CourseId or PathId
  totalCompletions: number;
  dropouts: number;
  averageTimeSpentToCompletion: number; // In hours
}

/**
 * Tracks learner interaction depth and frequency to gauge content stickiness.
 */
export interface IEngagementAnalytics {
  courseId: string;
  averageSessionDurationMinutes: number;
  totalVideoMinutesWatched: number;
  assessmentParticipationRate: number;
}

/**
 * Aggregates pedagogical impact and quality metrics attributed to a specific instructor.
 */
export interface IInstructorAnalytics {
  instructorId: string;
  totalStudentsTaught: number;
  totalActiveCourses: number;
  aggregateInstructorRating: number;
}

/**
 * Represents a compiled, dashboard-ready view of relevant learning metrics for an administrative persona.
 */
export interface ILearningDashboard {
  dashboardId: string;
  targetAudience: string; // Administrator, Instructor, Organization
  dataRefreshedAtUtc: string;
  platformMetrics: ILearningAnalytics;
  topPerformingCourses: ICourseAnalytics[];
}
```

### 13.B.12 Integration & Event Contracts

**Architectural Commentary**
These contracts define the standard immutable domain events emitted by the Learning Platform. They follow the enterprise pattern of capturing significant state changes and decoupling core transactional operations from downstream analytical and search consumers. Note: Identifiers are typed as string in this domain to support human-readable public slugs; internal persistence may map these to string primary keys separately.

```typescript
/**
 * Base interface for all enterprise domain events within the Learning Platform.
 */

/**
 * Emitted when a new course is drafted in the system.
 */
export interface ICourseCreated extends IEnterpriseDomainEvent {
  courseId: string;
  createdBy: string;
}

/**
 * Emitted when a course's metadata or structure is updated.
 */
export interface ICourseUpdated extends IEnterpriseDomainEvent {
  courseId: string;
}

/**
 * Emitted when a course is made publicly available for enrollment.
 */
export interface ICoursePublished extends IEnterpriseDomainEvent {
  courseId: string;
}

/**
 * Emitted when a course is permanently archived and closed.
 */
export interface ICourseArchived extends IEnterpriseDomainEvent {
  courseId: string;
}

/**
 * Emitted when a learner successfully completes a lesson.
 */
export interface ILessonCompleted extends IEnterpriseDomainEvent {
  studentId: string;
  lessonId: string;
  courseId: string;
}

/**
 * Emitted when a learner successfully completes an entire module.
 */
export interface IModuleCompleted extends IEnterpriseDomainEvent {
  studentId: string;
  moduleId: string;
  courseId: string;
}

/**
 * Emitted when a learner successfully fulfills all course structural requirements.
 */
export interface ICourseCompleted extends IEnterpriseDomainEvent {
  studentId: string;
  courseId: string;
}

/**
 * Emitted when a student successfully establishes an enrollment contract.
 */
export interface IStudentEnrolled extends IEnterpriseDomainEvent {
  studentId: string;
  courseId: string;
  enrollmentId: string;
}

/**
 * Emitted when an enrollment contract is terminated.
 */
export interface IEnrollmentCancelled extends IEnterpriseDomainEvent {
  studentId: string;
  courseId: string;
  enrollmentId: string;
}

/**
 * Emitted when a student is promoted from a waitlist to an active enrollment status.
 */
export interface IWaitlistPromoted extends IEnterpriseDomainEvent {
  studentId: string;
  courseId: string;
}

/**
 * Emitted when a learner begins an assessment attempt.
 */
export interface IAssessmentStarted extends IEnterpriseDomainEvent {
  studentId: string;
  assessmentId: string;
  attemptId: string;
}

/**
 * Emitted when a learner finalizes and submits their assessment answers.
 */
export interface IAssessmentSubmitted extends IEnterpriseDomainEvent {
  studentId: string;
  assessmentId: string;
  attemptId: string;
}

/**
 * Emitted when a learner achieves a passing score on an assessment.
 */
export interface IAssessmentPassed extends IEnterpriseDomainEvent {
  studentId: string;
  assessmentId: string;
  attemptId: string;
}

/**
 * Emitted when a learner fails to achieve a passing score on an assessment.
 */
export interface IAssessmentFailed extends IEnterpriseDomainEvent {
  studentId: string;
  assessmentId: string;
  attemptId: string;
}

/**

    /**

    /**
     * Emitted when a learner completes all requirements within a learning path.
     */
export interface ILearningPathCompleted extends IEnterpriseDomainEvent {
  studentId: string;
  pathId: string;
}

/**
 * Emitted when a student submits a review for a completed course.
 */
export interface IReviewSubmitted extends IEnterpriseDomainEvent {
  reviewId: string;
  courseId: string;
}

/**
 * Emitted when a review undergoes formal moderation state changes.
 */
export interface IReviewModerated extends IEnterpriseDomainEvent {
  reviewId: string;
  moderationState: string;
}
```

### 13.B.13 Localization & Translation Contracts

**Architectural Commentary**
These contracts define how courses and content are adapted for multiple languages. To prevent duplicating complex translation state machines, this domain delegates core translation mechanisms to the shared Localization Foundation in Phase 5, storing only the necessary pointers to identify localized variants within the Learning Platform.

```typescript
/**
 * Identifies the base language in which the educational content was originally authored.
 */
export interface IOriginalLanguage {
  courseId: string;
  languageCode: string;
}

/**
 * Links a specific language translation to a content version.
 */
export interface ILocalizedVersion {
  versionId: string;
  targetLanguageCode: string;
  localizationStatus: string; // Pending, InTranslation, UnderReview, Published
}

/**
 * Defines a fallback language configuration for when a specific localized asset is missing.
 */
export interface IFallbackLanguage {
  courseId: string;
  primaryLanguageCode: string;
  fallbackLanguageCode: string;
}
```

### 13.B.14 Course Origin & Import Contracts

**Architectural Commentary**
Course Origin contracts distinguish between natively authored curriculum, externally linked free global courses, paid courses, and related paid services. They enforce the architectural rule that no external provider logic leaks into the Learning Platform; imported courses rely purely on standard references mapped via the Universal Import Framework (Phase 6). Phase 13 owns paid and free course records, while Phase 20 owns non-course services only.

```typescript
export type CourseOriginType =
  | 'ExternalLinkedCourse'
  | 'NativeManaratakCourse'
  | 'PaidCourse'
  | 'RelatedPaidService';

export type CourseDeliveryMode =
  | 'ExternalRedirect'
  | 'InternalLmsEngine'
  | 'HybridTrustedIntegration'
  | 'PaidServicePortal';

/**
 * Provides explicit metadata differentiating between internal, imported, paid courses, and related paid service origins.
 */
export interface ICourseOriginMetadata {
  courseId: string;
  originType: CourseOriginType;
  deliveryMode: CourseDeliveryMode;
  isImported: boolean;

  /**
   * Resolved via Canonical Mapping in Phase 06 (Universal Import Framework).
   * Identifies the external provider system if the course is imported or linked.
   */
  originProviderId: string;
}

/**
 * Minimum required and optional fields for importing free external/global courses into Phase 13.
 */
export interface IGlobalCourseImportPayload {
  // Required Minimum Fields
  courseName: string;
  isFreeCourse: boolean;
  isFreeCertificate: boolean;
  directCourseUrl: string;

  // Optional Fields
  courseContent?: string;
  learningLanguage?: string;
  studyDuration?: string; // e.g. "4 weeks", "12 hours"
  courseLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  providerName?: string;
  providerSummary?: string;
  providerType?: 'University' | 'Platform' | 'Institution' | 'Other';
  shortDescription?: string;
  certificateType?: 'Free Certificate' | 'Paid Certificate' | 'Verified Certificate' | 'None';
  category?: string;
  skills?: string[];
  lastVerifiedAt?: string; // ISO UTC
  sourceTrustLevel?: 'High' | 'Medium' | 'Low' | 'Unverified';
  officialSourceUrl?: string;
  localizedNames?: Record<string, {
    courseName?: string;
    courseContent?: string;
    shortDescription?: string;
  }>;
}

/**
 * Global courses landing page grouping data model.
 */
export interface IGlobalCourseLandingData {
  manaratakCoursesCount: number;
  globalFreeCoursesCount: number;
  paidCoursesCount: number;
  relatedPaidServicesCount: number;
  featuredCategories: string[];
}

/**
 * Global platform / course provider listing item.
 */
export interface IPlatformProviderListing {
  providerId: string;
  providerName: string;
  providerSummary: string;
  providerLogoAssetId?: string; // ADR-024 EAP asset handle
  providerLogoReference?: string;
  providerType: 'University' | 'Platform' | 'Institution' | 'Other';
  numberOfCourses: number;
  availableLanguages: string[]; // Represented languages in provider's courses
  freeCourseCount: number; // Count of courses with isFreeCourse = true
  freeCertificateCourseCount: number; // Count of courses with isFreeCertificate = true
  sourceTrustLevel: 'High' | 'Medium' | 'Low' | 'Unverified';
  lastVerifiedAt: string; // ISO UTC format
}

/**
 * Provider detail page course list item (Course-Card DTO supplied by Phase 13).
 */
export interface IProviderDetailListing {
  courseId: string; // Canonical course UUID
  providerName: string; // Associated provider/university name
  courseName: string; // Course canonical title
  shortDescription: string; // Brief summarized overview
  learningLanguage: string; // Primary language of instruction
  studyDuration: string; // Estimated completion duration
  courseLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  isFreeCourse: boolean; // Completely free to study/audit
  isFreeCertificate: boolean; // Completion certificate is free
  certificateType: 'Free Certificate' | 'Paid Certificate' | 'Verified Certificate' | 'None';
  directCourseUrl: string; // Outbound deep-link; must resolve directly to course page
  lastVerifiedAt: string; // ISO UTC format
}

/**
 * Complete structured read payload for course detail pages (consumed by Phase 24).
 */
export interface ICourseDetailPayload {
  courseId: string;
  courseName: string;
  courseContent?: string; // Detailed curriculum description/syllabus
  shortDescription?: string; // Concise summary description
  originType: CourseOriginType;
  deliveryMode: CourseDeliveryMode;
  courseLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  learningLanguage?: string;
  studyDuration?: string;
  providerName?: string;
  providerSummary?: string; // Brief description of the provider
  providerType?: 'University' | 'Platform' | 'Institution' | 'Other';
  directCourseUrl?: string; // Present for ExternalLinkedCourse (deep link)
  certificateType?: 'Free Certificate' | 'Paid Certificate' | 'Verified Certificate' | 'None';
  isFreeCourse: boolean;
  isFreeCertificate: boolean;
  isCertificateEligible: boolean; // Signals potential Phase 14 certification for native courses
  skills?: string[]; // Target skills or learning outcomes
  lastVerifiedAt?: string; // ISO UTC format
  sourceTrustLevel?: 'High' | 'Medium' | 'Low' | 'Unverified';
  officialSourceUrl?: string;
  localizedNames?: Record<string, {
    courseName?: string;
    courseContent?: string;
    shortDescription?: string;
  }>;
  modulesSummary?: Array<{ moduleId: string; title: string; lessonCount: number }>;
}

/**
 * Captures third-party link and origin details for external courses.
 */
export interface IExternalCourseReference {
  courseId: string;
  externalCourseUrl: string;
  originProviderName: string;
  originProviderId: string;
  sourceTrustLevel: string; // High, Medium, Low, Unverified
  lastVerifiedTimestamp: string;
  hasTrustedCompletionIntegration: boolean;
}

/**
 * Governs media assets belonging to native MANARATAK courses, strictly referencing EAP handles.
 */
export interface INativeCourseAsset {
  assetId: string; // ADR-024 Enterprise Asset Platform handle
  assetReference: string;
  assetType: string; // Video, PDF, Image, Subtitle, Audio, SCORM
  isSecureStreamingRequired: boolean;
}

/**
 * Defines the completion and certificate eligibility policy based on course origin and assessment requirements.
 */
export interface ICourseCompletionPolicy {
  courseId: string;
  originType: CourseOriginType;
  requiresAssessmentPassing: boolean;
  minimumProgressPercentage: number;
  isCertificateEligible: boolean;
  completionSignalType: string; // 'InternalEventEmitted' | 'ExternalProviderWebhook' | 'None'
}

/**
 * Signal sent to indicate whether a course completion qualifies for downstream Phase 14 certificate issuance.
 */
export interface ICourseCertificateEligibilitySignal {
  courseId: string;
  studentId: string;
  originType: CourseOriginType;
  isEligibleForCertificate: boolean;
  reasonCode: string; // 'NativeCourseCompleted' | 'ExternalCourseNotEligible' | 'MissingAssessment'
}

/**
 * Registry payload defining cross-phase data ownership boundaries for detail pages.
 */
export interface ICrossPhasePageOwnershipRegistry {
  pageType: 'CountryPage' | 'UniversityDetailPage' | 'ScholarshipDetailPage' | 'CourseDetailPage';
  canonicalDataOwnerPhase: string;
  editorialContentOwnerPhase: 'Phase 16';
  adminUIOwnerPhase: 'Phase 23';
  publicCompositionOwnerPhase: 'Phase 24';
}

/**
 * Defines the strict boundary ownership rules for course and provider imports.
 */
export interface ICourseImportMatchMergeOwnership {
  // Pure marker representing domain-specific policy ownership.
}
```

#### 13.B.14.2 Import Match/Merge Ownership Contracts

To support incoming data from the Phase 06 Import Foundation without violating domain boundaries, this domain explicitly defines and owns the following lifecycle integration responsibilities:

- **Deterministic Match Key**: This domain defines and owns the courses and providers deterministic match keys (such as composite keys of course name, provider name, and direct URL) used to identify reference record overlaps.
- **Completeness Policy**: This domain defines and owns all validation rules and criteria determining when a course or provider record is complete and eligible for operational activation.
- **Merge/Overwrite Policy**: This domain defines and owns the merge policies (such as source-authority hierarchies and mutable/immutable syllabus or metadata components) that govern how incoming course updates merge with existing records.
- **Final Approval/Publish**: This domain owns final approval, manual course/provider catalog review, and active publication lifecycle state transitions.
- **Phase 06 Role**: The Phase 06 Import Foundation is restricted to delivering raw extraction proposals, course/provider field diffs, and associated evidence and confidence metrics. It is strictly prohibited from writing directly to course/learning tables.

### 13.B.15 Instructor & Provider Contracts

**Architectural Commentary**
These contracts define the academic authorities responsible for delivering the educational content. To maintain decoupling, they act purely as read-only references and value objects isolated from any central HR or CRM systems; their actual authoritative lifecycle is managed by Phase 11 (Universities & Institutions) or Phase 6 (Import Framework).

```typescript
/**
 * Represents an individual subject matter expert or educator.
 */
export interface IInstructorIdentity {
  /**
   * Resolved via Phase 11 (Universities & Institutions) or managed as an external reference.
   */
  instructorId: string;
  displayName: string;
  bioSummary: string;
}

/**
 * Represents an institutional or corporate provider of educational content.
 */
export interface ICourseProviderIdentity {
  /**
   * Resolved via Phase 11 (Universities & Institutions) or Phase 6 (Import Framework).
   */
  providerId: string;
  providerName: string;
}
```

---

### Navigation

- **Previous**: [Phase 13.A - Enterprise Architecture Specification](phase-13-01-architecture-specification.md)
- **Next**: [Phase 13.C - Implementation Guide](phase-13-03-implementation-guide.md)
