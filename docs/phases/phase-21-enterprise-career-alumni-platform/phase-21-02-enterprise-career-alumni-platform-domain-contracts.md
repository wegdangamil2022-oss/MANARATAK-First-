# MANARATAK 2.0: Phase 21 (Enterprise Career & Alumni Platform) Enterprise Domain Contracts

**Document ID:** PHASE-21-02-DOMAIN-CONTRACTS  
**Status:** Baselined & Approved  
**Phase:** 21  
**Domain:** Enterprise Career & Alumni Platform  
**Artifact:** Part B - Enterprise Domain Contracts  

---

### Navigation
[← Phase 20: Enterprise Services Platform](../phase-20-enterprise-services-platform/phase-20-01-enterprise-services-platform-architecture-specification.md) | [Phase 21: Architecture Spec (Part A)](./phase-21-01-enterprise-career-alumni-platform-architecture-specification.md) | [Phase 21: Implementation Blueprint (Part C)](./phase-21-03-enterprise-career-alumni-platform-implementation-blueprint.md) | [Phase 22: Enterprise Product Experience →](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md)

---

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.  
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.  
> **Note:** This phase establishes the Single Source of Truth for every career, alumni, and recruitment capability within MANARATAK.  

---

## Part B — Enterprise Domain Contracts

### 21.B.1 Career Core Contracts

**Architectural Commentary**  
Career Core Contracts decouple a user's professional profile from their academic student identity. These interfaces model the structured artifacts (CVs, skills, portfolios) required to present a candidate to the global employment market, ensuring that professional growth is tracked as an immutable ledger of achievements. All physical documents (resumes, CVs, portfolios, certificates) are referenced strictly using Phase 05 — Core Implementation Enterprise Asset Platform (EAP) `AssetId` handles.

```typescript
/**
 * The canonical enterprise definition of a professional identity.
 */
export interface ICareerProfile {
  profileId: string;
  studentId: string; // Link to global identity in Phase 05 — Core Implementation
  primaryIndustry: string;
  yearsOfExperience: number;
  status: ICareerStatus;
  lastUpdated: Date;
}

export interface IProfessionalProfile {
  profileId: string;
  headline: string;
  summary: string;
  availabilityStatus: string;
  willingToRelocate: boolean;
}

export interface IResume {
  resumeId: string;
  profileId: string;
  resumeName: string;
  assetId: string; // Registered via Phase 05 Enterprise Asset Platform (EAP)
  parsedData: Record<string, unknown>; // Populated via Phase 17 — Enterprise AI Platform
}

export interface ICV {
  cvId: string;
  profileId: string;
  cvName: string;
  assetId: string; // Registered via Phase 05 EAP
  parsedData: Record<string, unknown>; // Populated via Phase 17 — Enterprise AI Platform
}

export interface ISkill {
  skillId: string;
  profileId: string;
  skillName: string; // e.g., 'React', 'Financial Modeling'
  proficiencyLevel: string; // 'Beginner', 'Intermediate', 'Expert'
  isVerified: boolean; // Verified via platform assessment
}

export interface ICertification {
  certificationId: string;
  profileId: string;
  name: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialAssetId?: string; // Phase 05 EAP handle for credential document/image
}

export interface IExperience {
  experienceId: string;
  profileId: string;
  jobTitle: string;
  companyName: string;
  startDate: Date;
  endDate?: Date;
  isCurrentRole: boolean;
  description: string;
}

export interface IProject {
  projectId: string;
  profileId: string;
  projectName: string;
  description: string;
  associatedSkills: string[];
  projectUrl?: string;
  mediaAssetIds?: string[]; // Phase 05 EAP handles for project artifacts
}

export interface IPortfolio {
  portfolioId: string;
  profileId: string;
  portfolioItems: IProject[];
  customUrl?: string;
}

export interface ICareerStatus {
  state: string; // 'Actively Looking', 'Open to Offers', 'Not Looking'
  lastUpdated: Date;
}
```

---

### 21.B.2 Professional Identity Contracts

**Architectural Commentary**  
Professional Identity Contracts manage external integrations and personal branding metadata. This ensures the platform acts as a unified hub, seamlessly connecting to major professional networks (LinkedIn, GitHub) without schema pollution.

```typescript
export interface ILinkedInProfile {
  profileId: string;
  linkedInUrl: string;
  isConnected: boolean;
  lastSyncDate?: Date;
}

export interface IGitHubProfile {
  profileId: string;
  githubUsername: string;
  githubUrl: string;
  repositoriesCount: number;
}

export interface IPersonalWebsite {
  profileId: string;
  websiteUrl: string;
  portfolioType: string;
}

export interface ILanguageSkill {
  languageSkillId: string;
  profileId: string;
  languageCode: string;
  readingProficiency: string;
  writingProficiency: string;
  speakingProficiency: string;
}

export interface IProfessionalInterest {
  interestId: string;
  profileId: string;
  industries: string[];
  roles: string[];
}

export interface IEmploymentPreference {
  preferenceId: string;
  profileId: string;
  preferredLocations: string[]; // Countries/Cities
  preferredEmploymentTypes: string[]; // 'FullTime', 'Remote'
  expectedSalaryRange: IJobSalary;
}
```

---

### 21.B.3 Job Portal Contracts

**Architectural Commentary**  
Job Portal Contracts define the global marketplace for vacancies. They are designed to support massive geographic diversity, standardizing job definitions whether the role is based in Yemen, China, Saudi Arabia, UAE, Qatar, Kuwait, Oman, or fully remote.

```typescript
export interface IJob {
  jobId: string;
  employerId: string; // Handle to recruitment employer metadata in Phase 21
  title: string;
  description: string;
  status: IJobStatus;
  postedAt: Date;
  closingDate?: Date;
}

export interface IJobCategory {
  categoryId: string;
  name: string;
  industry: string;
}

export interface IJobPosting extends IJob {
  categoryId: string;
  requirements: IJobRequirement[];
  location: IJobLocation;
  salary: IJobSalary;
  employmentType: IEmploymentType;
}

export interface IJobRequirement {
  requirementId: string;
  description: string;
  isRequired: boolean;
  targetSkills: string[];
}

export interface IJobLocation {
  locationId: string;
  country: string; // e.g., 'Yemen', 'Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Oman', 'China'
  city?: string;
  isRemote: boolean;
  isInternational: boolean;
}

export interface IJobSalary {
  currencyCode: string; // ISO 4217
  minimumAmount: number;
  maximumAmount?: number;
  isNegotiable: boolean;
  visibility: string; // 'Public', 'Hidden'
}

export interface IEmploymentType {
  type: string; // 'FullTime', 'PartTime', 'Contract', 'Freelance'
}

export interface IJobStatus {
  state: string; // 'Draft', 'Published', 'Closed', 'Filled'
  updatedAt: Date;
}
```

---

### 21.B.4 Internship Contracts

**Architectural Commentary**  
Internship Contracts model short-term, academically integrated work placements. These contracts ensure compliance with university reporting requirements and structural training programs.

```typescript
export interface IInternship extends IJobPosting {
  durationMonths: number;
  academicCreditEligible: boolean;
}

export interface ISummerTraining extends IInternship {
  targetAcademicYear: string;
}

export interface IIndustrialTraining extends IInternship {
  industrySector: string;
}

export interface ICoopProgram extends IInternship {
  universityPartnerId?: string; // Link to Phase 11 — Universities & Institutions
}

export interface IStudentPlacement extends IInternship {
  academicSupervisorId?: string;
  industrySupervisorId?: string;
}
```

---

### 21.B.5 Graduate Program Contracts

**Architectural Commentary**  
Graduate Program Contracts abstract elite, multi-stage recruitment pipelines aimed at transitioning fresh graduates into enterprise leadership roles.

```typescript
export interface IGraduateProgram extends IJobPosting {
  programDurationMonths: number;
  cohortYear: number;
}

export interface IFutureLeadersProgram extends IGraduateProgram {
  leadershipTracks: string[];
}

export interface ILeadershipProgram extends IGraduateProgram {
  mentorshipIncluded: boolean;
}

export interface IRotationalProgram extends IGraduateProgram {
  rotationsCount: number;
  rotationDepartments: string[];
}

export interface IFreshGraduateProgram extends IGraduateProgram {
  maximumYearsSinceGraduation: number;
}
```

---

### 21.B.6 Employer Recruitment Metadata Contracts

**Architectural Commentary**  
In compliance with ADR-027, Employer Contracts define recruitment-specific employer metadata, job publishers, internship hosts, and recruiter handles within Phase 21. They do NOT represent a cross-domain organization master, company master, or general B2B contract registry.

```typescript
export interface IEmployer {
  employerId: string;
  companyName: string;
  registrationNumber: string;
  isVerified: boolean;
}

export interface IEmployerProfile {
  employerId: string;
  description: string;
  websiteUrl: string;
  logoAssetId?: string; // Phase 05 EAP handle
  companySize: string;
}

export interface IEmployerDirectory {
  directoryId: string;
  employers: IEmployer[];
}

export interface IEmployerBranch {
  branchId: string;
  employerId: string;
  country: string;
  city: string;
  isHeadquarters: boolean;
}

export interface IEmployerContact {
  contactId: string;
  employerId: string;
  contactName: string;
  contactEmail: string;
  role: string; // e.g., 'HR Manager', 'Technical Recruiter'
}

export interface IEmployerIndustry {
  employerId: string;
  primaryIndustry: string;
  secondaryIndustries: string[];
}
```

---

### 21.B.7 Recruiter Workspace Contracts

**Architectural Commentary**  
Recruiter Workspace Contracts structure the capabilities available to recruiters and corporate hiring representatives. These interfaces manage the lifecycle of an employer's recruitment effort, from drafting vacancies to reviewing candidates. The workspace is scoped strictly to job publishing, internship hosting, recruiter access, interview feedback, and recruitment workflow management. It MUST NOT manage B2B contracts, employer business operations, corporate organizations, or cross-domain partner relationships.

```typescript
export interface IRecruiterWorkspace {
  workspaceId: string;
  employerId: string;
  activeRecruiterUserIds: string[]; // User IDs of recruiters (Phase 05 Identity handles)
}

export interface IEmployerRecruitment {
  recruitmentId: string;
  employerId: string;
  activeCampaigns: string[];
}

export interface IEmployerVacancy extends IJobPosting {
  assignedRecruiterId: string;
  internalNotes: string;
}

export interface ICandidateReview {
  reviewId: string;
  applicationId: string;
  reviewerId: string;
  rating: number; // 1-5 scale
  comments: string;
}

export interface IInterviewInvitation {
  invitationId: string;
  applicationId: string;
  proposedDates: Date[];
  message: string;
}

export interface IJobOffer {
  offerId: string;
  applicationId: string;
  salaryOffered: IJobSalary;
  startDate: Date;
  status: string; // 'Extended', 'Accepted', 'Declined'
}
```

---

### 21.B.8 Application Contracts

**Architectural Commentary**  
Application Contracts govern the connection between a candidate (Career Profile) and a specific Job Posting. They enforce state machine logic ensuring applications progress deterministically through recruitment states. Job applications are strictly hiring workflows and are distinct from university academic admissions.

```typescript
export interface IJobApplication {
  applicationId: string;
  jobId: string;
  profileId: string;
  submittedResumeAssetId: string; // Phase 05 EAP handle
  status: IApplicationStatus;
  appliedAt: Date;
}

export interface IApplicationStatus {
  state: string; // 'Submitted', 'UnderReview', 'Shortlisted', 'Interviewing', 'Offered', 'Rejected'
  updatedAt: Date;
}

export interface IApplicationStatusChange {
  fromStatus: string;
  toStatus: string;
  changedAt: Date;
  changedBy: string;
}

export interface IApplicationHistory {
  historyId: string;
  applicationId: string;
  statusChanges: IApplicationStatusChange[];
}

export interface IShortlist {
  shortlistId: string;
  jobId: string;
  applicationIds: string[];
  createdById: string;
}

export interface ICandidateEvaluation {
  evaluationId: string;
  applicationId: string;
  overallScore: number;
  cultureFitScore: number;
  technicalScore: number;
}
```

---

### 21.B.9 Interview Contracts

**Architectural Commentary**  
Interview Contracts abstract the scheduling, execution, and feedback loops of the assessment phase, natively supporting technical, HR, and mock interviews.

```typescript
export interface IInterview {
  interviewId: string;
  applicationId: string;
  interviewType: string; // 'HR', 'Technical', 'Final'
  format: string; // 'InPerson', 'VideoCall', 'Phone'
  status: string; // 'Scheduled', 'Completed', 'Cancelled'
}

export interface IInterviewSchedule {
  scheduleId: string;
  interviewId: string;
  startTime: Date;
  endTime: Date;
  meetingLink?: string;
}

export interface IMockInterview extends IInterview {
  careerAdvisorId: string;
  targetRole: string;
}

export interface ITechnicalAssessment extends IInterview {
  assessmentPlatformUrl: string;
  durationMinutes: number;
  score?: number;
}

export interface IHRAssessment extends IInterview {
  hrRepresentativeId: string;
}

export interface IInterviewFeedback {
  feedbackId: string;
  interviewId: string;
  reviewerId: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string; // 'Hire', 'Reject', 'NextRound'
}
```

---

### 21.B.10 Career Roadmap Contracts

**Architectural Commentary**  
Career Roadmap Contracts provide structured, longitudinal planning for users. AI skill gap scoring and course recommendations are computed via Phase 17 — Enterprise AI Platform and stored as advisory guidance.

```typescript
export interface ICareerRoadmap {
  roadmapId: string;
  profileId: string;
  targetRole: string;
  currentStage: string;
}

export interface ICareerStage {
  stageId: string;
  roadmapId: string;
  title: string; // e.g., 'Junior Developer', 'Mid-Level Developer'
  order: number;
}

export interface ICareerMilestone {
  milestoneId: string;
  stageId: string;
  description: string;
  isAchieved: boolean;
}

export interface ICareerGoal {
  goalId: string;
  roadmapId: string;
  goalType: string; // 'LearnSkill', 'GetCertification', 'LandJob'
  targetDate: Date;
}

export interface ICareerDevelopmentPlan {
  planId: string;
  roadmapId: string;
  recommendedCourses: string[]; // Academic/Skill references
  recommendedCertifications: string[];
}
```

---

### 21.B.11 Skill & Advisory Intelligence Contracts

**Architectural Commentary**  
These contracts model advisory signals for candidate capabilities and market demands. All AI calculations (matching scores, resume reviews, skill gaps) are executed by Phase 17 — Enterprise AI Platform.

```typescript
export interface ISkillGapAnalysis {
  analysisId: string;
  profileId: string;
  targetJobId: string;
  matchedSkills: string[];
  missingSkills: string[];
  aiMatchScore?: number; // Generated by Phase 17 — Enterprise AI Platform
}

export interface IMarketSkillDemand {
  industry: string;
  trendingSkills: Record<string, number>; // Skill Name -> Demand Score
  analyzedAt: Date;
}
```

---

### 21.B.12 Alumni Contracts

**Architectural Commentary**  
Alumni Contracts manage post-graduate networking, mentorship, and lifelong engagement with the MANARATAK ecosystem.

```typescript
export interface IAlumniProfile {
  alumniId: string;
  studentId: string; // Core identity link in Phase 15 — Enterprise Student Platform
  graduationYear: number;
  almaMaterId: string; // Link to Phase 11 — Universities & Institutions
}

export interface IAlumniNetwork {
  networkId: string;
  universityId: string;
  membersCount: number;
}

export interface IMentorship {
  mentorshipId: string;
  mentorId: string; // Alumni ID
  menteeId: string; // Student ID
  status: string; // 'Active', 'Completed'
}

export interface ICareerEvent {
  eventId: string;
  title: string;
  eventType: string; // 'JobFair', 'Webinar', 'Networking'
  scheduledDate: Date;
}
```

---

### 21.B.13 Career Import Contracts

**Architectural Commentary**  
Career Import Contracts define domain schemas, deduplication keys, and administrative import state machine states for batch ingestion across all 9 importable career datasets. Phase 06 — Import Foundation Platform handles file parsing and row-level queue streaming, while Phase 21 enforces the domain schemas below.

```typescript
export type CareerAdminImportState =
  | 'Imported'
  | 'Incomplete'
  | 'Complete'
  | 'NeedsReview'
  | 'ReadyToPublish'
  | 'Published'
  | 'Rejected'
  | 'Archived';

/**
 * Dataset 1: Job Listings Import Record
 */
export interface IJobImportRecord {
  importRecordId: string;
  importBatchId: string;
  jobTitle: string;
  canonicalJobTitle: string;
  employerReferenceId: string;
  employmentType: string;
  jobCategory: string;
  jobDescription: string;
  country: string;
  city?: string;
  salaryRange?: string;
  applicationDeadline: Date;
  recruiterContactId: string;
  requiredSkills?: string[];
  importState: CareerAdminImportState;
  deduplicationKey: string; // canonicalJobTitle + employerReferenceId + countryOrCity + employmentType
  mappedAssetIds?: string[]; // Phase 05 EAP handles
  validationErrors?: string[];
}

/**
 * Dataset 2: Internship Listings Import Record
 */
export interface IInternshipImportRecord {
  importRecordId: string;
  importBatchId: string;
  title: string;
  canonicalTitle: string;
  employerReferenceId: string;
  internshipType: string; // 'SummerTraining', 'IndustrialTraining', 'Coop'
  durationMonths: number;
  country: string;
  city?: string;
  applicationDeadline: Date;
  importState: CareerAdminImportState;
  deduplicationKey: string;
  validationErrors?: string[];
}

/**
 * Dataset 3: Graduate Program Import Record
 */
export interface IGraduateProgramImportRecord {
  importRecordId: string;
  importBatchId: string;
  programName: string;
  canonicalProgramName: string;
  employerReferenceId: string;
  cohortYear: number;
  programDurationMonths: number;
  country: string;
  applicationDeadline: Date;
  importState: CareerAdminImportState;
  deduplicationKey: string;
  validationErrors?: string[];
}

/**
 * Dataset 4: Recruitment Employers & Recruiters Import Record
 */
export interface IRecruitmentEmployerImportRecord {
  importRecordId: string;
  importBatchId: string;
  companyName: string;
  registrationNumber?: string;
  industry: string;
  country: string;
  city?: string;
  websiteUrl?: string;
  recruiterName: string;
  recruiterEmail: string;
  importState: CareerAdminImportState;
  deduplicationKey: string; // companyName + registrationNumber/country
  logoAssetId?: string; // Phase 05 EAP handle
  validationErrors?: string[];
}

/**
 * Dataset 5: Alumni Record Import Record
 */
export interface IAlumniImportRecord {
  importRecordId: string;
  importBatchId: string;
  studentReferenceId: string;
  graduationYear: number;
  degreeName: string;
  institutionReferenceId: string; // Phase 11 link
  currentJobTitle?: string;
  currentEmployerName?: string;
  importState: CareerAdminImportState;
  deduplicationKey: string; // studentReferenceId + institutionReferenceId + graduationYear
  validationErrors?: string[];
}

/**
 * Dataset 6: Professional Skill Taxonomy Import Record
 */
export interface ISkillImportRecord {
  importRecordId: string;
  importBatchId: string;
  skillName: string;
  canonicalSkillName: string;
  category: string;
  parentSkillId?: string;
  importState: CareerAdminImportState;
  deduplicationKey: string; // canonicalSkillName + category
  validationErrors?: string[];
}

/**
 * Dataset 7: Career Event Import Record
 */
export interface ICareerEventImportRecord {
  importRecordId: string;
  importBatchId: string;
  eventTitle: string;
  eventType: string; // 'JobFair', 'Webinar', 'Networking'
  scheduledDate: Date;
  locationOrUrl: string;
  organizerEmployerId?: string;
  importState: CareerAdminImportState;
  deduplicationKey: string; // eventTitle + scheduledDate
  validationErrors?: string[];
}

/**
 * Dataset 8: Mentorship Opportunity Import Record
 */
export interface IMentorshipImportRecord {
  importRecordId: string;
  importBatchId: string;
  mentorAlumniId: string;
  topicClassification: string;
  maxMentees: number;
  importState: CareerAdminImportState;
  deduplicationKey: string; // mentorAlumniId + topicClassification
  validationErrors?: string[];
}

/**
 * Dataset 9: External Job Board Reference Import Record
 */
export interface IExternalJobBoardImportRecord {
  importRecordId: string;
  importBatchId: string;
  externalPlatformName: string;
  externalJobId: string;
  externalUrl: string;
  mappedJobId?: string;
  importState: CareerAdminImportState;
  deduplicationKey: string; // externalPlatformName + externalJobId
  validationErrors?: string[];
}

export interface ICareerImportBatch {
  batchId: string;
  datasetType: string; // e.g. 'JobListings', 'Internships', 'Alumni'
  importSource: string;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  batchStatus: string;
  startedAt: Date;
  completedAt?: Date;
}
```

---

### 21.B.14 Repository Contracts

**Architectural Commentary**  
Repository Contracts secure the persistence layer, ensuring that complex profile and job query models are abstracted from underlying database engines.

```typescript
export interface ICareerProfileRepository {
  getById(profileId: string): Promise<ICareerProfile>;
  getByStudentId(studentId: string): Promise<ICareerProfile>;
  save(profile: ICareerProfile): Promise<void>;
}

export interface IJobRepository {
  getById(jobId: string): Promise<IJobPosting>;
  searchJobs(criteria: Record<string, unknown>): Promise<IJobPosting[]>;
  save(job: IJobPosting): Promise<void>;
}

export interface IEmployerRepository {
  getById(employerId: string): Promise<IEmployerProfile>;
  save(employer: IEmployerProfile): Promise<void>;
}

export interface IApplicationRepository {
  getById(applicationId: string): Promise<IJobApplication>;
  getByProfileId(profileId: string): Promise<IJobApplication[]>;
  getByJobId(jobId: string): Promise<IJobApplication[]>;
  save(application: IJobApplication): Promise<void>;
}

export interface IInterviewRepository {
  getByApplicationId(applicationId: string): Promise<IInterview[]>;
  save(interview: IInterview): Promise<void>;
}

export interface IAlumniRepository {
  getByStudentId(studentId: string): Promise<IAlumniProfile>;
  save(alumni: IAlumniProfile): Promise<void>;
}

export interface ICareerImportRepository {
  getBatchById(batchId: string): Promise<ICareerImportBatch>;
  saveImportRecord(record: unknown): Promise<void>;
}
```

---

### 21.B.15 Service Contracts (Application Services)

**Architectural Commentary**  
Application Service Contracts orchestrate multi-aggregate workflows, enforcing transactions and dispatching events when applications are submitted or jobs are published.

```typescript
export interface ICareerProfileService {
  updateProfile(profileId: string, updates: Record<string, unknown>): Promise<ICareerProfile>;
  generateSkillGapAnalysis(profileId: string, targetJobId: string): Promise<ISkillGapAnalysis>;
}

export interface IJobPortalService {
  publishJob(jobId: string): Promise<void>;
  closeJob(jobId: string): Promise<void>;
}

export interface IEmployerService {
  registerRecruitmentEmployer(data: Record<string, unknown>): Promise<IEmployer>;
  verifyEmployer(employerId: string): Promise<void>;
}

export interface IApplicationService {
  submitApplication(profileId: string, jobId: string, resumeAssetId: string): Promise<IJobApplication>;
  updateApplicationStatus(applicationId: string, newStatus: string): Promise<void>;
}

export interface IInterviewService {
  scheduleInterview(data: IInterviewSchedule): Promise<IInterview>;
  submitFeedback(feedback: IInterviewFeedback): Promise<void>;
}

export interface ICareerImportService {
  processImportBatch(batchId: string): Promise<ICareerImportBatch>;
  validateAndStageRecord(datasetType: string, recordData: Record<string, unknown>): Promise<CareerAdminImportState>;
}
```

---

### 21.B.16 Event Contracts

**Architectural Commentary**  
Event Contracts declare the immutable facts broadcast to the enterprise message bus, allowing Phase 23, Phase 24, and external systems to react without tight coupling.

```typescript
export interface ProfileCreatedEvent {
  profileId: string;
  studentId: string;
  timestamp: Date;
}

export interface ProfileUpdatedEvent {
  profileId: string;
  timestamp: Date;
}

export interface JobPostedEvent {
  jobId: string;
  employerId: string;
  location: string;
  timestamp: Date;
}

export interface JobClosedEvent {
  jobId: string;
  timestamp: Date;
}

export interface ApplicationSubmittedEvent {
  applicationId: string;
  jobId: string;
  profileId: string;
  timestamp: Date;
}

export interface ApplicationStatusChangedEvent {
  applicationId: string;
  newStatus: string;
  timestamp: Date;
}

export interface InterviewScheduledEvent {
  interviewId: string;
  applicationId: string;
  timestamp: Date;
}

export interface JobOfferExtendedEvent {
  offerId: string;
  applicationId: string;
  timestamp: Date;
}

export interface MentorshipStartedEvent {
  mentorshipId: string;
  mentorId: string;
  menteeId: string;
  timestamp: Date;
}

export interface CareerImportBatchCompletedEvent {
  batchId: string;
  datasetType: string;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  timestamp: Date;
}
```

---

### 21.B.17 Consumer Contracts

**Architectural Commentary**  
Phase 21 is a master provider for professional capabilities and integrates heavily with other MANARATAK platforms using official Roadmap v6.0 phase designations:

- **Phase 15 — Enterprise Student Platform:** Exposes `ICareerProfileService` and `IJobPortalService` within student workspace UI to enable CV management and job applications.
- **Phase 12 — Enterprise Scholarship Platform:** Subscribes to `JobOfferExtendedEvent` to track post-scholarship employment success rates.
- **Phase 11 — Universities & Institutions:** Integrates with `IInternship` and `IStudentPlacement` to manage academic credit for industrial training.
- **Phase 20 — Enterprise Services Platform:** Executes paid professional services (CV formatting, 1-on-1 career coaching) requested by candidates.
- **Phase 19 — Enterprise Finance & Payments Platform:** Processes employer recruitment invoicing, payment movements, and fees for job postings.
- **Phase 17 — Enterprise AI Platform:** Executes AI resume reviews, AI interview coaching, skill gap scoring, and match recommendations.
- **Phase 05 — Core Implementation:** Stores and manages all physical document assets (`AssetId` / `AssetReference`) via EAP and handles core authentication tokens.
- **Phase 06 — Import Foundation Platform:** Owns stream parsing, batching, and row iteration mechanics for Phase 21 import pipelines.
- **Phase 23 — Enterprise Administration Portal:** Consumes placement rate and skill demand read-models for executive oversight.
- **Phase 24 — Enterprise Public Platform:** Consumes public job search and alumni network read-models for presentation.

---

### 21.B.18 Ownership & Governance Rules

- **Absolute Authority:** The Enterprise Career & Alumni Platform exclusively owns Career Profiles, Portfolios, Job Postings, Internships, Recruitment Employer Metadata, Recruitment Applications, and Alumni Networks.
- **ADR-027 Domain Isolation:** Phase 21 explicitly does NOT own a central B2B Organization Master, Identity Authentication (Phase 05), Academic Transcripts (Phase 11 / Phase 15), Paid Service Delivery Execution (Phase 20), AI Models (Phase 17), or Payments (Phase 19).
- **Immutable Milestones:** A user's graduation status is owned by Phase 11 / Phase 15; Phase 21 reads and displays it as a verified credential handle.

---

### 21.B.19 Validation Rules

**Architectural Commentary**  
Validation Contracts isolate critical boundary checks prior to committing career operations.

```typescript
export interface IProfileValidation {
  validateRequiredFields(profile: ICareerProfile): boolean;
}

export interface IJobValidation {
  validateSalaryRange(salary: IJobSalary): boolean;
}

export interface IApplicationValidation {
  validateEligibility(profileId: string, jobId: string): Promise<boolean>;
}

export interface IEmployerValidation {
  validateCorporateEmail(email: string): boolean;
}

export interface IInterviewValidation {
  validateSchedulerAvailability(schedule: IInterviewSchedule): boolean;
}
```

---

### 21.B.20 Architecture Constraints

- **No Redundant Users:** `IEmployer` and `ICareerProfile` handles must link back to Phase 05 — Core Implementation identity tokens.
- **No Direct Storage:** All uploaded resumes, certificates, and portfolio files MUST be stored as Phase 05 EAP `AssetId` handles.
- **State Machine Rigidity:** Job Applications MUST NEVER bypass required workflow steps (e.g., jumping from `Submitted` to `Offered` without passing through `Interviewing` or `UnderReview`).

---

### 21.B.21 Final Contracts Review

- **Contract Validation:** Validated. Comprehensive definitions exist for Career Profiles, Jobs, Applications, Recruitment Employer metadata, Recruiter Workspaces, and Alumni tracking.
- **ADR-027 Validation:** Validated. B2B recruitment handles are strictly bounded.
- **Asset Validation:** Validated. Phase 05 EAP `AssetId` handles replace all raw file URIs.
- **AI Validation:** Validated. AI interactions are delegated to Phase 17 — Enterprise AI Platform.
- **Import Validation:** Validated. All 9 career import dataset schemas and state machine states are fully specified.
- **Readiness Review:** The domain contracts are fully resolved, capable of modeling global hiring and internship workflows.

---

### Navigation
[← Phase 20: Enterprise Services Platform](../phase-20-enterprise-services-platform/phase-20-01-enterprise-services-platform-architecture-specification.md) | [Phase 21: Architecture Spec (Part A)](./phase-21-01-enterprise-career-alumni-platform-architecture-specification.md) | [Phase 21: Implementation Blueprint (Part C)](./phase-21-03-enterprise-career-alumni-platform-implementation-blueprint.md) | [Phase 22: Enterprise Product Experience →](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md)

---

**Status:** APPROVED FOR BASELINE SPECIFICATION  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  
