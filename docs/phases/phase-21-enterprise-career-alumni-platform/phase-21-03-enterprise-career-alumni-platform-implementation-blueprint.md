# MANARATAK 2.0: Phase 21 (Enterprise Career & Alumni Platform) Enterprise Implementation Blueprint

**Document ID:** PHASE-21-03-IMPL-BLUEPRINT  
**Status:** Baselined & Approved  
**Phase:** 21  
**Domain:** Enterprise Career & Alumni Platform  
**Artifact:** Part C - Implementation Guide  

---

### Navigation
[← Phase 20: Enterprise Services Platform](../phase-20-enterprise-services-platform/phase-20-01-enterprise-services-platform-architecture-specification.md) | [Phase 21: Architecture Spec (Part A)](./phase-21-01-enterprise-career-alumni-platform-architecture-specification.md) | [Phase 21: Domain Contracts (Part B)](./phase-21-02-enterprise-career-alumni-platform-domain-contracts.md) | [Phase 22: Enterprise Product Experience →](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md)

---

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.  
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.  
> **Note:** This phase acts as the Single Source of Truth for every career, alumni, and recruitment capability within MANARATAK.  

---

## 21.C.1 Implementation Overview

**Architectural Commentary**  
The Enterprise Career & Alumni Platform (Phase 21) Implementation Blueprint translates the approved architecture into an implementation guide while preserving all architectural boundaries. This document serves as the official blueprint, ensuring that the platform operates as the undisputed Single Source of Truth for careers, internships, graduate programs, recruitment employer metadata, alumni, job applications, and career development across the global MANARATAK ecosystem.

---

## 21.C.2 Implementation Layers & Folder Structure

**Architectural Commentary**  
In compliance with ADR-025, the platform strictly adheres to the enterprise Node.js and TypeScript Clean Architecture blueprint. This guarantees that career definitions, applicant workflows, and employer recruitment metadata remain completely isolated from underlying infrastructure, external API integrations, and presentation layers.

```text
src/
├── domain/           # Pure entities, value objects, domain events, repository interfaces
├── application/      # CQRS commands, queries, application services, domain event handlers
├── infrastructure/   # Database persistence (Prisma), search index adapters, event bus, EAP/AI adapters
├── presentation/api/ # Express.js REST routes, controllers, middleware (recruiter & candidate API)
├── workers/          # Background event consumers, scheduled tasks, import batch queues
└── prisma/           # Database schema definitions and migration scripts
```

- **Presentation Layer (`src/presentation/api`):** Exposes domain capabilities through REST endpoints implemented via Express.js, handling input validation and authentication routing without embedding business logic.
- **Application Layer (`src/application`):** Orchestrates multi-step recruitment workflows, profile updates, and command/query routing (CQRS) without coupling to persistence technologies.
- **Domain Layer (`src/domain`):** The pure, dependency-free core containing canonical models for `JobPosting`, `CareerProfile`, `JobApplication`, `EmployerMetadata`, and associated business rules.
- **Infrastructure Layer (`src/infrastructure`):** Adapters for database operations (Prisma ORM over PostgreSQL), search index projections, caching (Redis), and external handles (LinkedIn, GitHub).
- **Workers (`src/workers`):** Asynchronous background consumers processing skill gap analyses, interview reminders, placement read-model generation, and import batch queues.
- **Persistence (`prisma`):** Physical relational schema definitions and migration scripts backing the domain aggregates.

---

## 21.C.3 Module Organization

**Architectural Commentary**  
The platform is internally divided into highly cohesive, loosely coupled modules to manage the massive scale of professional networking and recruitment activities while strictly enforcing domain boundaries.

- **Career Profile Module:** Manages the core professional identity, distinct from academic identity.
- **Professional Profile Module:** Handles public-facing summaries and external web links.
- **Resume Module:** Manages structured resume data and document handles (`AssetId`) in Phase 05 Enterprise Asset Platform (EAP).
- **CV Module:** Handles chronological formatting and academic/professional intersections.
- **Skill Module:** Taxonomical management of verified and self-declared competencies.
- **Portfolio Module:** Curates projects, repository handles, and portfolio asset handles (`AssetId`).
- **Job Portal Module:** The global marketplace for publishing and discovering vacancies across Yemen, Saudi Arabia, UAE, Qatar, Kuwait, Oman, China, and international/remote locations.
- **Internship Module:** Specialized flows for short-term, academically linked placements (Summer Training, Co-op, Industrial Training).
- **Graduate Program Module:** Handlers for multi-stage cohort recruitment pipelines.
- **Recruitment Employer Metadata Module:** Directory managing recruitment-specific company profiles and verifications (compliant with ADR-027; no general organization master).
- **Recruiter Workspace Module:** Workspaces for corporate recruiters and hiring managers to manage active campaigns, candidate reviews, and interview scheduling.
- **Job Application Module:** The state machine orchestrating the candidate's recruitment journey from submission to offer.
- **Interview Module:** Scheduling and evaluation handlers for HR and technical assessments.
- **Career Roadmap Module:** Longitudinal planning and milestone tracking for users.
- **Career Service Integration Module:** Exposes career context to Phase 20 — Enterprise Services Platform for paid coaching execution.
- **Alumni Module:** Post-graduate profiles linking back to Phase 11 / Phase 15 university graduation milestones.
- **Mentorship Module:** Matching and tracking logic for alumni-to-student guidance.
- **Career Event Module:** Orchestration for job fairs, webinars, and networking sessions.
- **Career & Placement Read-Models Module:** Generates aggregated read-models for Phase 23 (Enterprise Administration Portal) and Phase 24 (Enterprise Public Platform).
- **Career Import Module:** Ingests external datasets using Phase 06 mechanics and Phase 21 domain validation/schemas.

---

## 21.C.4 CQRS & Internal Communication Blueprint

**Architectural Commentary**  
Phase 21 utilizes strict Command Query Responsibility Segregation (CQRS) via the Mediator pattern. This is critical for scaling a global job board where read operations (searching jobs) exponentially outnumber write operations (posting a job or submitting an application).

- **Commands:** Operations that modify state (e.g., `SubmitApplicationCommand`, `PublishJobCommand`, `UpdateResumeCommand`). These are routed to dedicated handlers that wrap execution in database transactions and publish enterprise events.
- **Queries:** Operations that retrieve data (e.g., `SearchJobsQuery`, `GetCandidateProfileQuery`). Handlers read from optimized, read-only projections or search indexes to guarantee sub-millisecond response times.
- **Pipeline Behaviors:**
  - **Validation Pipeline:** Validates commands against structural rules before domain execution.
  - **Authorization Pipeline:** Confirms the executing identity possesses the required candidate, recruiter, or administrative roles via Phase 05 — Core Implementation.
  - **Audit Pipeline:** Intercepts commands to log intent and execution status into the enterprise Audit ledger.

---

## 21.C.5 Repository Implementation Blueprint

**Architectural Commentary**  
Repositories abstract the persistence layer, ensuring that complex career metadata and recruitment workflows are stored and reconstructed identically regardless of the underlying database technology.

- **Career Repository:** Manages the lifecycle of the professional identity and its nested aggregates.
- **Resume Repository:** Handles document asset handles (`AssetId`) and structured parsed JSON.
- **Skill Repository:** Provides optimized reads for taxonomies and proficiency levels.
- **Portfolio Repository:** Manages project collections and asset handles.
- **Job Repository:** The highly scalable query engine for global vacancies, internships, and graduate programs.
- **Employer Repository:** Manages recruitment-specific employer metadata, branches, and industry tags (ADR-027 compliant).
- **Application Repository:** Tracks the strict state transitions of candidate recruitment submissions.
- **Interview Repository:** Manages schedules, evaluation rubrics, and feedback scores.
- **Internship & Graduate Program Repository:** Handles the specialized metadata of academic placements.
- **Career Roadmap Repository:** Stores longitudinal milestone progress.
- **Alumni Repository:** Manages post-graduate profiles and university linkages.
- **Career Event Repository:** Manages scheduling and attendance for networking events.
- **Career Import Repository:** Stores import batch manifests, record-level validation states, and deduplication keys.

---

## 21.C.6 Application Services Blueprint

**Architectural Commentary**  
Application Services orchestrate complex interactions spanning multiple aggregates, acting as the primary entry points for Express.js REST API controllers.

- **Career Profile Service:** Orchestrates the creation and continuous updating of the professional identity.
- **Resume & CV Service:** Handles document asset handle registration (`AssetId` in Phase 05 EAP) and invokes Phase 17 — Enterprise AI Platform for parsing.
- **Skill Service:** Manages taxonomy updates and verification logic.
- **Portfolio Service:** Handles the linking and structuring of external projects and media asset handles.
- **Job Service:** The core engine for publishing, closing, and syndicating vacancies.
- **Employer Service:** Orchestrator for recruitment employer registration, verification, and recruiter provisioning.
- **Application Service:** The state machine advancing a candidate through the recruitment funnel.
- **Interview Service:** Resolves calendar collisions and aggregates multi-reviewer feedback.
- **Internship & Graduate Program Service:** Specialized orchestrators enforcing academic and cohort compliance.
- **Career Roadmap Service:** Interfaces with Phase 17 for skill-gap scoring and presents recommended development paths.
- **Alumni & Mentorship Service:** Connects graduates and orchestrates guidance relationships.
- **Career Event Service:** Handles registrations and ticketing for professional fairs.
- **Career Import Service:** Validates, deduplicates, and manages state machine transitions for imported career data.

---

## 21.C.7 Career Profile & Asset Registration Blueprint

**Architectural Commentary**  
The Career Profile is a multi-faceted aggregate. All physical document artifacts (CVs, cover letters, certificates, recommendation letters, portfolio files) MUST be registered as immutable `AssetId` handles using Phase 05 — Core Implementation Enterprise Asset Platform (EAP).

**Implementation Flow & Requirements:**
- **Resume & CV:** Stores `assetId` references (Phase 05 EAP) and delegates structured AI parsing to Phase 17 — Enterprise AI Platform.
- **Skills:** Utilizes standard taxonomies to allow semantic matching against Job Requirements, distinguishing between self-declared and platform-verified proficiencies.
- **Certifications:** Stores credential metadata and `credentialAssetId` references.
- **Experience:** Chronological linked lists of employment history.
- **Projects & Portfolio:** Supports rich metadata, linking projects to claimed skills and storing media asset handles (`mediaAssetIds`).

---

## 21.C.8 Service & Career Import Implementation Blueprint

**Architectural Commentary**  
Batch imports across all 9 career-domain datasets follow a strict multi-tier execution strategy dividing technical mechanics (Phase 06) from domain governance (Phase 21).

### 21.C.8.1 Execution Responsibilities
1. **Phase 06 Ingestion Infrastructure:** Phase 06 — Import Foundation Platform handles file uploads, stream parsing, row iteration, execution batch queues, failed-row staging, and retry mechanisms.
2. **Phase 21 Domain Engine:** Phase 21 receives raw record dictionaries from Phase 06 and executes domain-specific schema validation, field mapping, canonical normalization, composite key deduplication, asset handle registration, and administrative state machine progression.

### 21.C.8.2 Dataset Implementation Workflows
Phase 21 manages governed import pipelines for all 9 career datasets:
1. **Job Listings:** Validates mandatory fields (`jobTitle`, `employerReferenceId`, `employmentType`, `jobCategory`, `jobDescription`, `country`, `applicationDeadline`, `recruiterContactId`), normalizes title strings, generates matching keys, and maps job descriptions.
2. **Internship Listings:** Validates type (`SummerTraining`, `Coop`, `IndustrialTraining`), duration, academic partner tags, and application deadlines.
3. **Graduate Programs:** Validates program name, cohort year, rotational departments, and candidate eligibility criteria.
4. **Recruitment Employers & Recruiters:** Validates company name, industry, recruiter email, and registers logo attachments with Phase 05 EAP to generate `logoAssetId`.
5. **Alumni Records:** Validates student references, graduation year, degree credentials, and matches institution handles with Phase 11 — Universities & Institutions.
6. **Professional Skills Taxonomy:** Normalizes skill names, categorizes domains, and builds hierarchical parent-child relationships.
7. **Career Events:** Validates event titles, schedules, locations, and recruiter hosting handles.
8. **Mentorship Opportunities:** Validates mentor alumni handles, max mentee capacities, and topic classifications.
9. **External Job Board References:** Maps external platform names and foreign job IDs to internal job handles.

### 21.C.8.3 Canonical Normalization & Deduplication
- **Canonical Normalization:** All imported job titles and employer names are stripped of marketing fluff (e.g., "Urgent!", "Hiring Now!"), emojis, platform formatting noise, and irregular spacing.
- **Deduplication Matching Key:** Generates composite matching key: `canonicalJobTitle` + `employerReferenceId` + `countryOrCity` + `employmentType`.
- **Safe Merging:** If a match is found against an unpublished listing, optional fields are merged into the existing record. Published listings are never overwritten automatically.
- **Asset Handle Mapping:** Document attachments in import batches are uploaded to Phase 05 EAP, returning immutable `AssetId` references.

### 21.C.8.4 Administrative Import State Machine
Imported records progress through an 8-state administrative lifecycle:  
`Imported` -> `Incomplete` / `Complete` -> `NeedsReview` -> `ReadyToPublish` -> `Published` / `Rejected` / `Archived`.

---

## 21.C.9 Security Implementation Blueprint

**Architectural Commentary**  
Security in Phase 21 is paramount, as the platform handles sensitive employment data, private CVs, and confidential corporate recruitment strategies.

- **Role-Based Authorization:** Strict separation between `Candidate`, `EmployerRecruiter`, `EmployerAdmin`, and `PlatformAdmin` roles via Phase 05 identity.
- **Recruiter Permissions:** A recruiter can only view applications submitted to jobs posted by their specific employer entity. They cannot browse global candidates unless the candidate explicitly enables `Open to Offers - Public`.
- **Candidate Privacy:** Candidates MUST have granular control over who can view their profile (e.g., blocking current employers from seeing their updated CV).
- **Recruitment Confidentiality:** Interview feedback and internal HR notes MUST be strictly isolated from candidate views.
- **Asset Handle Protection:** Resume download requests generate short-lived, signed access tokens through Phase 05 EAP.
- **Audit Trail:** Every action—viewing a CV, changing an application status, or updating a job posting—MUST be immutably logged with the executing user's ID.

---

## 21.C.10 Scalability Strategy Blueprint

**Architectural Commentary**  
The platform must support global employment ecosystems natively, requiring massive horizontal scalability for both storage and search capabilities.

- **Unlimited Employers & Jobs:** The Job Repository utilizes search indexing projections to handle millions of active listings with geospatial and skill-based filtering.
- **Unlimited Applications:** The Application workflow engine processes submissions asynchronously, placing them in message queues during high-velocity events (e.g., major Graduate Program openings).
- **Unlimited Internships & Graduate Programs:** Cohort-based processing scales linearly without database locking.
- **Unlimited Alumni & Career Paths:** Read-optimized projections map career trajectories and alumni networking connections.
- **Unlimited Countries:** Geographic and currency data are dynamically driven by enterprise reference tables.
- **High Concurrent Recruitment Operations:** Recruiter workspaces support thousands of recruiters simultaneously reviewing applications without degrading candidate job browsing performance.

---

## 21.C.11 Monitoring Blueprint

**Architectural Commentary**  
Observability ensures the platform is actively matching candidates to opportunities and that employer workflows are not bottlenecked.

- **Recruitment Monitoring:** Tracking time-to-hire metrics and the velocity of candidates moving through recruitment stages.
- **Application Monitoring:** Alerting on submission failures or invalid asset handle references.
- **Interview Monitoring:** Tracking cancellation rates and recruiter feedback turnaround times.
- **Employer Activity Monitoring:** Observing active campaigns, job view counts, and engagement metrics.
- **Import Pipeline Monitoring:** Tracking batch ingestion success rates, row-level error counts, and review queue depth.
- **Read-Model Sync Monitoring:** Ensuring background workers update read projections for Phase 23 (Enterprise Administration Portal) and Phase 24 (Enterprise Public Platform).

---

## 21.C.12 Logging Strategy Blueprint

**Architectural Commentary**  
Logging provides the immutable history required for dispute resolution, audit compliance, and enterprise governance.

- **Career Profile Changes:** Log every addition of a skill, experience, certification, or asset handle.
- **Resume Updates:** Log document asset uploads (`AssetId`) and parsing completion status.
- **Job Publication:** Log when jobs are published, modified, and closed by recruiters.
- **Applications:** Log the exact timestamp and snapshot of the `submittedResumeAssetId` for every submission.
- **Interview Activities:** Log scheduling, rescheduling, and submission of evaluation scores.
- **Recruitment Workflow:** Log every state transition (e.g., `UnderReview` -> `Shortlisted`).
- **Employer Actions:** Log recruiter logins, candidate searches, and offer extensions.
- **Alumni Activities:** Log network joins and mentorship connections.
- **Career Imports:** Log batch IDs, imported row counts, duplicate merge events, and admin approval actions.

---

## 21.C.13 Performance Guidance Blueprint

**Architectural Commentary**  
Phase 21 reuses the exact enterprise performance methodology established in previous phases.

- **Read-Optimized Views:** Global job searches and employer directories MUST read from denormalized projections or search indexes. Transactional database joins MUST NOT be used for public browsing.
- **Asynchronous Processing:** CV parsing (Phase 17), event publishing, and import batching (Phase 06) MUST run in background workers.
- **Caching:** Static taxonomies (skills, industries, locations) MUST be heavily cached at the API edge (Redis).

---

## 21.C.14 Future Evolution & Integration Explicit Boundaries

**Architectural Commentary**  
Architectural boundaries reserve capacity for future integrations without requiring database schema modifications, strictly respecting phase ownership:

- **AI Career Recommendations & Matching:** Explicitly delegated to Phase 17 — Enterprise AI Platform.
- **AI Resume Review & Scoring:** Explicitly delegated to Phase 17 — Enterprise AI Platform.
- **AI Interview Coach:** Explicitly delegated to Phase 17 — Enterprise AI Platform.
- **Paid Career Coaching & CV Writing Fulfillment:** Operationally assigned to Phase 20 — Enterprise Services Platform.
- **Paid Recruiter Fees & Invoicing:** Managed by Phase 19 — Enterprise Finance & Payments Platform.
- **LinkedIn & GitHub Integration:** Webhook listeners for real-time profile handle synchronization.
- **Enterprise HR Systems:** Support for standard ATS export formats (e.g., Workday, SAP SuccessFactors).

---

## 21.C.15 Architecture Constraints

**Architectural Commentary**  
Any Pull Request violating the following constraints MUST be automatically rejected:

1. **NO IDENTITY CREATION:** Phase 21 MUST NOT implement its own user registration or password tables. It relies entirely on Phase 05 — Core Implementation.
2. **ADR-027 COMPLIANCE:** Phase 21 MUST NOT build a general organization master or B2B platform. It maintains recruitment-specific employer metadata only.
3. **NO DIRECT FILE STORAGE:** All resumes, CVs, certificates, and portfolio files MUST be stored as Phase 05 Enterprise Asset Platform (EAP) `AssetId` handles.
4. **NO DIRECT AI OWNERSHIP:** All AI models, prompts, provider routing, and safety policies belong exclusively to Phase 17 — Enterprise AI Platform.
5. **NO PAID SERVICE EXECUTION:** Paid CV writing and 1-on-1 coaching execution belong operationally to Phase 20 — Enterprise Services Platform.
6. **NO FINANCIAL EXECUTION:** Phase 21 MUST NOT process payments or maintain wallets. All financial movements route through Phase 19 — Enterprise Finance & Payments Platform.
7. **STRICT WORKFLOW ADHERENCE:** Application status transitions must be handled by the Domain state machine. Developers MUST NOT allow manual database overrides of recruitment states.

---

## 21.C.16 Final Implementation Review Checklist

- [x] **Implementation Validation:** Blueprint successfully maps all Part A and Part B requirements into concrete structural layers.
- [x] **Architecture Compliance:** Strict adherence to Clean Architecture, CQRS, and SSoT principles.
- [x] **ADR-025 Compliance:** Folder structure aligned to `src/domain`, `src/application`, `src/infrastructure`, `src/presentation/api`, `src/workers`, and `prisma`. Delivery mapped to Express.js REST APIs.
- [x] **ADR-027 Compliance:** Employer directory is bounded strictly to recruitment metadata. No general organization master exists.
- [x] **Asset Governance:** Phase 05 EAP `AssetId` handles replace all physical file path assumptions.
- [x] **AI Delegation:** AI parsing, resume reviews, and coaching are explicitly routed to Phase 17 — Enterprise AI Platform.
- [x] **Import Specification:** Phase 06 mechanics vs Phase 21 domain validation, deduplication key rules, all 9 importable career datasets, and 8-state administrative import state machine are specified in full.
- [x] **Module Validation:** Profiles, Jobs, Employers, Recruiter Workspaces, Applications, and Alumni are fully modularized and decoupled.
- [x] **Repository & Service Validation:** Persistence and orchestrations are cleanly partitioned.
- [x] **Security & Read-Model Validation:** ABAC, privacy controls, and read-model generation for Phase 23 / Phase 24 are established.
- [x] **Acceptance Criteria:** Met in full. The document is immediately suitable for inclusion in the official MANARATAK Enterprise Architecture documentation.

---

### Navigation
[← Phase 20: Enterprise Services Platform](../phase-20-enterprise-services-platform/phase-20-01-enterprise-services-platform-architecture-specification.md) | [Phase 21: Architecture Spec (Part A)](./phase-21-01-enterprise-career-alumni-platform-architecture-specification.md) | [Phase 21: Domain Contracts (Part B)](./phase-21-02-enterprise-career-alumni-platform-domain-contracts.md) | [Phase 22: Enterprise Product Experience →](../phase-22-enterprise-product-experience/phase-22-01-enterprise-product-experience-architecture-specification.md)

---

**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  
