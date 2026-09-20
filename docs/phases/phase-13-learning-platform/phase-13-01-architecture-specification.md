> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 13 Learning Platform Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

## Part A - Enterprise Architecture Specification

### 13.A.1 Vision

**Enterprise Vision**

The Learning Platform serves as the centralized educational ecosystem of the MANARATAK Enterprise Architecture. Its mission is to provide a highly scalable, extensible, and intelligent learning environment capable of delivering exceptional educational content through both natively authored internal courses and externally integrated learning resources.

The platform enables learners to seamlessly discover, enroll in, complete, and assess educational experiences through a unified, API-first architecture. This architecture natively supports enterprise scalability via cloud-native deployments, multilingual content localization, AI-powered recommendations, deep analytics, and long-term evolutionary maintainability. While offering features comparable to an industry-standard Learning Management System (LMS), the MANARATAK platform transcends traditional LMS limitations by functioning holistically as an Enterprise Educational Platform and integrated Enterprise Learning Ecosystem.

Crucially, the Learning Platform is designed as a first-class enterprise domain rather than a simple traditional course catalog or isolated LMS. It enforces strict domain boundaries, establishing a Single Source of Truth for all educational interactions while decoupling content authoring from content delivery.

**Enterprise Notes**
This centralized ecosystem establishes a Single Source of Truth for all educational assets across the organization. By treating learning as a first-class enterprise domain, the platform guarantees that content lifecycle management, enrollment states, and learner achievements are tightly governed by resilient domain boundaries and rigorous audit trails. The Learning Platform explicitly owns all course content and metadata, meaning no external system may modify published course content directly.

**Scalability & Performance Considerations**
To accommodate hyper-growth and fluctuating enterprise workloads, the architecture utilizes horizontal scaling for API surfaces and leverages asynchronous Event-Driven Architecture (EDA) for non-blocking downstream processes. Content delivery relies extensively on global Content Delivery Networks (CDNs) to offload media streaming, ensuring low-latency access for learners worldwide.

**Security Considerations**
All educational resources are shielded by a robust Role-Based Access Control (RBAC) framework. The vision strictly mandates zero-trust interactions, requiring strict token-based authorization for both native authoring interfaces and imported course API ingestion endpoints.

### 13.A.2 Objectives

The Learning Platform shall provide:

- **Enterprise Course Management**
  The platform must deliver a resilient, version-controlled repository to manage the entire lifecycle of educational assets. This objective ensures that course structures, metadata, dependencies, and historical versions remain consistent, auditable, and easily retrievable across the enterprise, preventing structural drift over time. The Learning Platform serves as the absolute Single Source of Truth (SSoT) for all educational content, maintaining strict ownership over course content, course metadata, learning materials, the publishing lifecycle, course versions, and localization state.

- **Native Course Authoring**
  To empower internal educators and content creators, Phase 13 provides comprehensive native course authoring tools. Phase 13 - Learning Platform owns native course authoring, course structures, modules, lessons, learning materials, course lifecycle, assessments, question banks, enrollment, progress, and completion events. Phase 16 - Enterprise CMS may own long-form editorial marketing copy, public article content, or supporting narrative content about courses, but it does not own course entities, course curriculum, LMS modules, lessons, assessments, quizzes, exams, or course publishing authority. Phase 24 - Enterprise Public Platform only composes public course pages. The authoring process strictly adheres to a unified workflow lifecycle (shared across the MANARATAK architecture) that transitions immutably through defined states: Draft, followed by Review, then Approval, leading to Published, and eventually Archived. Each state transition is fully governed by defined ownership and complete audit trails. Furthermore, native authoring integrates a comprehensive Translation & Localization strategy, managing the Original Language, generating Localized Versions, routing through a Translation Workflow with strict Localization Status tracking, defining a Fallback Language, enabling Translation Review, and controlling Language Publishing to guarantee Multilingual SEO compliance.

- **Imported Course Management**
  The system must seamlessly ingest, normalize, and distribute educational content sourced from external platforms. This objective enforces strict anti-corruption layers (ACLs), ensuring external data structures are safely mapped into the canonical MANARATAK domain without contaminating internal models or bypassing business rules. It is a strict architectural constraint that the Anti-Corruption Layer itself belongs to the Phase 6 Universal Import Framework; Phase 13 must only consume canonical, normalized course data. Provider-specific logic must never exist inside the Learning Platform.

- **Learning Content Management**
  The platform serves as the definitive hub for all learning materials. This objective mandates enterprise-grade file storage strategies, robust media management, SEO metadata generation, and the semantic tagging of content to optimize discoverability and structured reuse across multiple learning programs. Comprehensive Media Management is heavily enforced, orchestrating Object Storage and Media Storage solutions specifically structured for Video Management, PDF Management, Audio, and Images. Additionally, it natively supports SCORM Packages, Subtitle Management, automated Thumbnail Generation, Media Versioning, high-speed CDN Delivery, and strictly enforced Secure File Access protocols.

- **Enrollment Management**
  The platform must govern the complete student lifecycle within a course. This objective ensures transactional integrity when a learner enrolls, drops, or suspends their studies, leveraging CQRS to separate complex enrollment validation logic (Command) from high-speed roster queries (Read Models).

- **Learning Progress Tracking**
  The architecture must provide highly granular, real-time tracking of learner progression. This objective requires an event-driven mechanism capable of safely recording millions of micro-interactions (e.g., video watched, module completed) to maintain accurate completion metrics and trigger workflow lifecycle events.

- **Assessment Platform**
  The platform must deliver a secure, reliable assessment engine. This objective ensures that quizzes and formative assessments are evaluated fairly, supporting complex grading workflows, timed constraints, question randomization, and auditable score generation.

- **Examination Platform**
  The architecture must support rigorous, high-stakes examination environments. This objective requires strict session management, anti-cheating mechanisms, and fault-tolerant state persistence to recover gracefully from network interruptions or browser crashes during critical exams.

- **Assignment Platform**
  The platform must facilitate the submission, review, and grading of asynchronous assignments. This objective integrates secure file upload capabilities, workflow lifecycles for peer or instructor review, and transparent, localized feedback delivery to the learner.

- **Question Bank Management**
  The system must provide a centralized, versioned repository of assessment items. This objective ensures that questions can be securely authored, categorized, tagged by difficulty, and reused dynamically across diverse examinations and quizzes, maintaining an immutable audit history for every item.

- **AI-powered Learning Recommendations**
  The platform must leverage artificial intelligence to personalize the educational journey. This objective requires integrating the platform's read models with Enterprise AI Platform (Phase 17) to analyze learner telemetry, search history, and domain events, dynamically suggesting highly relevant courses and learning paths. A hard architectural boundary is enforced here: AI never owns educational data. AI consumes Read Models only and cannot directly modify transactional entities. Furthermore, all AI-generated recommendations remain strictly advisory unless expressly approved through standard business workflows.

- **Enterprise Analytics**
  The system must provide comprehensive data insights to stakeholders. This objective ensures that domain events are continuously projected into specialized analytics databases, enabling real-time dashboards for course engagement, dropout rates, assessment performance, and overall platform health.

- **Universal Search Integration**

### 13.A.2.1 Separation of Responsibilities from Phase 14 (Enterprise Certificates Platform)

To ensure high-availability verification, institutional trust, and long-term separation of concerns, a non-negotiable boundary is enforced between the Learning Platform (Phase 13) and the Enterprise Certificates Platform (Phase 14).

The **Learning Platform (Phase 13)** is the authoritative owner of learning progress only. It does not manage, generate, or verify credentials or certificates. Upon a student fulfilling all academic requirements, Phase 13 publishes the `CourseCompleted` and `LearningPathCompleted` domain events to the Enterprise Event Bus for downstream consumption. These events function strictly as asynchronous completion signals and carry no certificate context or authority.

The **Enterprise Certificates Platform (Phase 14)** is the exclusive owner of the entire credentialing and certification lifecycle, including:

- **Certificate Generation**: Triggered exclusively by the ingestion of completion events published by Phase 13.
- **Certificate Templates**: Defining and managing layout, styles, and branding for all certificates.
- **Certificate Numbering**: Issuing and tracking deterministic, globally unique serial identifiers.
- **Digital Signatures**: Affixing secure cryptographic signatures to guarantee document authenticity.
- **QR Codes**: Creating and embedding quick-response verification blocks.
- **Verification**: Executing hash comparison and cryptographic confirmation workflows.
- **Certificate Registry**: Serving as the absolute Single Source of Truth for certificate metadata.
- **Ledger**: Maintaining an append-only transaction registry to protect historical data integrity.
- **Revocation**: Executing and logging administrative revocations without modifying historical records.
- **Reissue**: Managing the revision and reissuance paths for corrected credentials.
- **Public Verification**: Hosting unauthenticated, high-performance public validation portals.

The Learning Platform has no knowledge of, or access to, certificate templates, numbering schemes, signature keys, or QR codes, and does not store certificate records. This isolation guarantees that course catalog modifications, curriculum deletions, or student state transitions in Phase 13 never impact the permanence or verifiability of issued historical credentials.

### 13.A.2.2 Separation of Responsibilities from Phase 15 (Enterprise Student Platform)

To maintain the sovereignty of user identity, a strict boundary is enforced between Phase 13 and Phase 15.

- **Phase 13 (Learning Platform)** owns enrollment state, course access, course progress, assessment attempts, and learning completion within the learning context.
- **Phase 15 (Enterprise Student Platform)** owns the student profile, demographic data, preferences, saved items, and the global student workspace.
- Phase 13 may reference `studentReferenceId` only through approved contracts and MUST NOT duplicate student profile data or global preferences.

### 13.A.3 Scope

This phase governs every aspect related to digital learning inside MANARATAK.

**In-Scope Elements**

- **Online Courses & Learning Programs**
  The architectural boundary encapsulates the complete definition, structuring, translation, and versioning of all digital courses and aggregated learning programs (e.g., Bootcamps, Specializations), maintaining strict audit trails of all modifications. The scope fully includes the management of multilingual translation workflows, securely linking original root language definitions to their localized counterparts.
- **Course Providers, Learning Organizations, & Instructors**
  The domain assumes responsibility for the metadata and relationships of entities providing educational content, maintaining strict isolation from the enterprise's central HR or CRM systems to preserve Bounded Context sovereignty.
- **Modules, Lessons, & Learning Materials**
  The platform governs the hierarchical breakdown of content and the associated digital assets (video, PDF, interactive components), orchestrating seamless media management, CDN distribution, and secure file storage access control.
- **Student Enrollment & Learning Progress**
  The scope includes the transactional processing of enrollments and the event-driven aggregation of progress telemetry to ensure real-time completion tracking, driving the progression workflow engine.
- **Assessments, Quizzes, Exams, & Assignments**
  The platform encompasses the full evaluation lifecycle, from question bank authoring to automated grading, workflow states for manual reviews, and final, immutable score calculations.
  The domain is strictly responsible for publishing authoritative completion events (CourseCompleted, LearningPathCompleted) to upstream platforms, operating as the undisputed system of record for learning progress and pedagogical achievements.
- **Ratings, Reviews, & Learning Analytics**
  The scope covers the ingestion of learner feedback and the projection of course performance metrics into dedicated read models for enterprise reporting, ensuring Analytics-ready architecture from day one.

**Out-of-Scope Elements**

- **Scholarship Management (Phase 12)**
  The administration of financial aid and scholarships is strictly isolated to Phase 12. The Learning Platform interacts with this domain exclusively via asynchronous Enterprise Domain Events to verify financial clearance prior to enrollment, maintaining loose coupling.
- **Enterprise Student Platform (Student Workspace) (Phase 15)**
  Canonical user identities, demographic data, and global authentication states are governed by Phase 15 (Enterprise Student Platform (Student Workspace)). The Learning Platform maintains only a localized Read Model of the student profile (e.g., `StudentReferenceId`) to preserve bounded context sovereignty and minimize cross-domain synchronous calls.
- **Universal Import Infrastructure (Phase 6)**
  The underlying transport mechanisms, scheduling, and protocol translation for external data ingestion are handled by Phase 6. Phase 13 simply consumes the normalized payloads via strict Domain APIs and Anti-Corruption Layers. Phase 13 operates with the absolute guarantee that the Anti-Corruption Layer lives upstream in Phase 6.
- **Enterprise AI Platform (Phase 17)**
  The training, hosting, and execution of Large Language Models (LLMs) or recommendation algorithms reside in Phase 17. The Learning Platform acts as an AI-ready architecture, delegating complex inference tasks to Phase 17 via synchronous enterprise APIs or asynchronous messaging, enforcing the boundary that AI algorithms are decoupled and never operate as system owners.

### 13.A.4 Responsibilities

The Learning Platform is responsible for:

- **Managing all educational courses**
  The domain acts as the definitive system of record for course taxonomies, enforcing strict version control to ensure that ongoing enrollments are not corrupted by mid-flight curriculum modifications. The Learning Platform represents the absolute authority here; no external system may bypass these boundaries to modify published course content directly.
- **Managing imported courses**
  The platform is responsible for safely adapting external course schemas into the internal canonical model, ensuring imported resources benefit from the identical search, analytics, and enrollment features as natively authored content.
- **Managing native MANARATAK courses**
  The architecture must govern the course publishing lifecycle-from draft creation to editorial review, approval, localization, and publication-ensuring high-fidelity authoring experiences for internal staff. Ownership over this lifecycle (Draft, Review, Approval, Published, Archived) rests completely with the Learning Platform.
- **Managing educational content**
  The platform holds absolute responsibility for the integrity, storage mapping, SEO metadata, and delivery optimization of all underlying instructional assets, interfacing tightly with enterprise file storage services and edge delivery networks. This encompasses end-to-end orchestration of Object Storage and Media Storage across all supported typologies (Video, Audio, PDF, SCORM, Images, Subtitles, and Thumbnails) alongside stringent Media Versioning and CDN Delivery rules.
- **Managing learning paths**
  The domain is tasked with sequencing discrete courses into logical, prerequisite-driven curriculums, enforcing business rules that govern learner progression through complex educational tracks, learning paths, and multi-stage programs.
- **Managing enrollment**
  The system must process high-concurrency enrollment requests, executing domain logic to validate capacities, prerequisites, financial clearance events, and eligibility criteria in a highly transactional, atomic manner.
- **Managing assessments**
  The architecture oversees the structural integrity of quizzes and exams, managing test variants, tracking time limits, randomizing question pools, and calculating scores with absolute mathematical precision.
- **Managing student learning progress**
  The domain accurately projects continuous streams of learner activity events into reliable progress metrics, serving as the foundation for workflow progression and AI-driven interventions.
- **Publishing courses**
  The system controls the visibility state transitions of learning resources, orchestrating the dispatch of integration events to update external search indexes and public catalogs asynchronously upon publication via the Enterprise Transactional Outbox. This includes broadcasting the canonical SEO metadata required to index the platform optimally across external search engines.
- **Providing APIs for all consumers**
  The platform must expose well-documented, versioned Enterprise APIs designed to support web portals, mobile applications, and B2B integrations seamlessly, efficiently, and securely via standard protocol definitions. The API Architecture explicitly delineates responsibilities across three distinct tiers: Internal APIs (governing highly trusted service-to-service calls over internal networks), External APIs (governing authenticated third-party B2B integration traffic), and Public APIs (serving highly cached, unauthenticated public discovery endpoints). Each tier enforces unique security perimeters and rate-limiting boundaries.

### 13.A.5 Architectural Principles

The platform shall follow:

- **Enterprise Modular Architecture (Modular Monolith)**
  The Learning Platform operates as an independent, highly cohesive module within the broader MANARATAK ecosystem. This principle ensures deployment flexibility, fault isolation, and the ability to scale educational components independently from unrelated enterprise workloads while maintaining a unified operational boundary.
- **Clean Architecture**
  The codebase is strictly organized in concentric layers. The core domain entities, business rules, and validation logic remain entirely isolated from infrastructure concerns, ORM frameworks, and external delivery mechanisms, ensuring maximum testability and long-term maintainability.
- **Domain-Driven Design (DDD)**
  The architecture models the complex educational reality using a ubiquitous language. Concepts such as `Course`, `Enrollment`, `Assessment` are treated as rich Domain Entities or Aggregate Roots, encapsulating both data and specialized business logic to prevent anemic domain models. Within this paradigm, the platform explicitly identifies the primary Aggregate Roots, each owning its strict consistency boundary:
  - **Course**: Owns the structural definition, metadata, and publishing lifecycle. It maintains consistency over its internal modules and lessons, ensuring incomplete structures cannot be published.
  - **Learning Path**: Owns the orchestration of multiple courses into a unified journey. It dictates prerequisite rules and milestone requirements independently of individual course lifecycles.
  - **Enrollment**: Owns the transactional state of a student's access. It enforces consistency across capacity limits, waitlist promotions, and prerequisite validations in high-concurrency environments.
  - **Progress**: Owns the continuous accumulation of learner telemetry. It aggregates granular events into a consistent, mathematically verifiable completion percentage without locking course entities.
  - **Assessment**: Owns a specific evaluation session. It enforces consistency over attempt counts, timer expirations, and final score calculations, guaranteeing that a submitted exam cannot be tampered with.
  - **Question Bank**: Owns the centralized repository of evaluation items. It ensures consistency across question versions and taxonomy tagging for randomized pool generation.
  - **Review**: Owns the learner feedback lifecycle. It enforces consistency across moderation states and verifies enrollment legitimacy.
- **CQRS (Command Query Responsibility Segregation)**
  The system rigorously separates operations that mutate state (Commands, such as `SubmitAssignment`) from operations that read state (Queries, such as `GetCourseCatalog`). This separation enables the extreme optimization of Read Models for high-speed delivery while maintaining strict transactional locks on the Command Models.
- **Event-Driven Architecture**
  Cross-module and cross-system communication is achieved through the publication of asynchronous events via a Transactional Outbox. This principle prevents synchronous bottlenecks, enhances fault tolerance, and allows downstream systems to react instantly to domain changes (e.g., `CourseCompletedEvent`, `EnrollmentCreatedEvent`).
- **Repository Pattern**
  Data access is abstracted through interface-driven repositories. This principle shields the application layer from database-specific SQL implementations or ORM leakage, enabling seamless unit testing and the flexibility to swap persistence technologies if enterprise requirements evolve.
- **Service Layer**
  A dedicated Application Service layer orchestrates use cases, coordinates transaction boundaries, enforces RBAC authorization, and delegates complex domain logic to the underlying DDD Aggregate Roots, keeping controllers thin and focused purely on HTTP/transport concerns. To strictly adhere to Clean Architecture and DDD, the service layer responsibilities are explicitly delineated:
  - **Domain Services**: House pure business logic that does not naturally fit within a single Aggregate Root. They operate exclusively on domain entities and value objects, remaining completely ignorant of databases or external systems.
  - **Application Services**: Act as the use-case orchestrators. They manage transaction boundaries, fetch aggregates from repositories, and execute commands on them. They MUST NOT publish events directly; event persistence is handled atomically by the Enterprise Transactional Outbox. They contain zero business logic.
  - **Infrastructure Services**: Provide the technical implementations for external integrations, such as dispatching emails, interacting with Phase 12 for scholarships, . They implement interfaces defined by the inner layers.
- **SOLID Principles**
  The entire codebase strictly adheres to SOLID object-oriented design principles, prioritizing single responsibilities, interface segregation, and dependency inversion to yield highly cohesive and loosely coupled enterprise software.
- **Single Source of Truth**
  The Learning Platform definitively owns all educational state. Data is never duplicated across the enterprise without clear designation as a read-only projection, eliminating data anomalies, synchronization conflicts, and fragmented reporting.
- **Immutable Domain Events**
  Every significant state change within the platform generates an immutable domain event. This provides an undisputed audit trail of historical actions, supporting temporal queries, event sourcing capabilities, debugging, and robust disaster recovery strategies. Critical domain events within the architecture include: `CourseCreated`, `CourseUpdated`, `CoursePublished`, `CourseArchived`, `LessonCompleted`, `ModuleCompleted`, `StudentEnrolled`, `EnrollmentCancelled`, `AssessmentStarted`, `AssessmentSubmitted`, `AssessmentPassed`, and `LearningPathCompleted`. Architecturally, these events decouple the core transactional domains from ancillary concerns such as notification dispatching, search index updates, and analytics generation. The Enterprise Event Catalog defines the representative events:
  - **CourseCreated / CourseUpdated**: Published by the _Course Domain_. Consumed by the _Learning Platform_ for internal auditing. Purpose: Tracks the authoring lifecycle before public exposure.
  - **CoursePublished / CourseArchived**: Published by the _Course Domain_. Consumed by the _Enterprise Search_, _Enrollment Domain_, and _Learning Path Domain_. Purpose: Synchronizes public catalogs, unlocks enrollment capabilities, and updates semantic search indexes.
  - **StudentEnrolled / EnrollmentCancelled**: Published by the _Enrollment Domain_. Consumed by the _Progress Domain_ and _Phase 5 Notifications_. Purpose: Initializes or terminates a learner's progress record and dispatches welcome/cancellation emails.
  - **LessonCompleted / ModuleCompleted**: Published by the _Progress Domain_. Consumed by the _Progress Domain_ (internal aggregation) and _Analytics_. Purpose: Generates granular telemetry for completion percentage recalculation.
  - **CourseCompleted**: Published by the _Progress Domain_. Consumed by the _Assessment Domain_, and _Review Domain_. Purpose: Signals the learner has successfully fulfilled all structural requirements of a course.
  - **AssessmentStarted / AssessmentSubmitted**: Published by the _Assessment Domain_. Consumed by the _Assessment Domain_ (timer management) and _Question Bank Domain_. Purpose: Enforces attempt limits and recalibrates question difficulty metrics based on submission aggregates.
  - **AssessmentPassed**: Published by the _Assessment Domain_. Consumed by the _Progress Domain_ and _Review Domain_. Purpose: Unlocks subsequent course modules and signals course progress completion, publishing progress milestones for downstream services.
  - **LearningPathCompleted**: Published by the _Learning Path Domain_. Consumed by _Phase 14 (Enterprise Certificates Platform)_ and *Phase 17 (Enterprise AI Platform) *(Note: The classification of Phase 17 as an independent vertical phase vs. a cross-cutting concern under Phase 5 is currently under architectural review and not yet finalized across the project.)**. Purpose: Signals completion of all learning path requirements to downstream services (such as the Enterprise Certificates Platform) and triggers AI-driven recommendations for the learner's next career steps.
- **Versioned Content**
  The architecture treats educational content as immutable versions. When a published course is modified, a new version is instantiated. This principle is critical for regulatory compliance and audit trails, ensuring that a student's historical progress remains permanently linked to the exact curriculum iteration they consumed.
- **Plug-in Ready Design**
  The platform embraces an extensible, plugin-first architecture. This allows third-party integrations (e.g., custom SCORM players, proprietary grading engines, or external AI proctoring tools) to be injected dynamically into the workflow via predefined interfaces without modifying the core enterprise codebase.

### 13.A.6 Platform Domains

The Learning Platform consists of the following explicitly bounded enterprise domains. Each domain is structured following Domain-Driven Design (DDD) principles, enforcing strict separation of concerns, ensuring independent testability, and maintaining high cohesion.

**Course Domain**
The Course Domain acts as the foundational structural authority of the Learning Platform. It is strictly responsible for managing the Course lifecycle, from initial drafting through rigorous editorial reviews to final publication and archival. It governs all Course metadata, maintaining the canonical definitions necessary for SEO and public discovery. Furthermore, it enforces Course versions, ensuring that ongoing learner sessions are insulated from destructive structural changes. Finally, it controls Publishing operations, dispatching immutable domain events to synchronize search indexes and public catalogs across the MANARATAK ecosystem.

**Learning Content Domain**
The Learning Content Domain manages the granular educational assets that populate the structural framework provided by the Course Domain. It is responsible for orchestrating Modules and Lessons, maintaining the hierarchical integrity of the curriculum. It securely handles all associated Videos, Documents, and External resources, directly interfacing with the underlying enterprise media management and Object Storage systems. Additionally, it governs Attachments, enforcing strict Secure File Access protocols and CDN delivery policies to ensure global low-latency access while protecting proprietary intellectual property.

**Enrollment Domain**
The Enrollment Domain acts as the transactional gateway between the learner and the educational content. It is absolutely responsible for Student enrollment state, serving as the Single Source of Truth for a learner's access rights. It enforces complex Enrollment policies (e.g., prerequisite checking, financial clearance via Phase 12). The domain comprehensively governs the Enrollment lifecycle, managing active participants, dropouts, and suspensions. Furthermore, it natively handles high-concurrency Waiting lists and strictly enforces classroom Capacity limits, ensuring transactional consistency even under extreme traffic spikes.

**Progress Tracking Domain**
The Progress Tracking Domain consumes asynchronous event streams to record continuous learner activity. It is explicitly responsible for verifying Lesson completion and Module completion, aggregating these micro-interactions to calculate Overall progress and exact Completion percentage. It maintains an immutable Learning history for every student, generating the precise telemetry required to trigger workflow transitions (e.g., unlocking subsequent modules) and feeding canonical data into the Enterprise Analytics and AI recommendation engines.

**Assessment Domain**
The Assessment Domain governs all evaluation mechanisms within the Learning Platform. It is responsible for orchestrating Quizzes, high-stakes Exams, and asynchronous Assignments. It also provides formative evaluation capabilities via Practice Quiz. The domain securely executes complex Grading algorithms, meticulously tracking learner Attempts, and calculating final, immutable Scores. To preserve academic integrity, this domain operates with stringent security considerations, utilizing fault-tolerant state persistence to recover exam sessions seamlessly.

**Question Bank Domain**
The Question Bank Domain serves as the centralized, version-controlled repository for all evaluation items. It is strictly responsible for maintaining the Question repository, categorizing items via structured Question categories, and quantifying Difficulty levels to support adaptive testing algorithms. It enables secure Randomization of exam variants to mitigate cheating and facilitates scalable Question reuse across multiple assessments and courses. Every question maintains its own audit trail, ensuring historical exams can be accurately reconstructed for compliance purposes.

**Review Domain**
The Review Domain manages the ingestion and moderation of learner feedback. It is responsible for collecting course Ratings and detailed Reviews, utilizing dedicated Read Models to rapidly display aggregated sentiment. It processes continuous learner Feedback and implements robust Abuse reporting mechanisms. This domain is decoupled from the core transactional flow, ensuring that feedback operations never impact the performance or stability of the primary learning or enrollment pathways.

**Bounded Context Map**

Within the Learning Platform, the domains collaborate through strict bounded contexts.

- The **Course Domain** acts as the core upstream authority, structurally defining the curriculum. It publishes state changes that downstream contexts rely on.
- The **Learning Content Domain** functions as a specialized subdomain, closely supporting the Course Domain by managing media and hierarchical assets, receiving instructions directly from Course authoring workflows.
- The **Learning Path Domain** sits above individual courses, aggregating them into larger journeys and reading from the Course Domain's published catalogs.
- The **Enrollment Domain** forms a central transactional hub. It reads course availability from the Course Domain, validates financial clearance externally, and manages the learner's access rights.
- The **Progress Domain** acts as a downstream consumer, listening to domain events from both Enrollment and Assessment to maintain an immutable history of learner activity.
- The **Assessment Domain** and **Question Bank Domain** maintain a partner relationship; the Assessment Domain executes evaluations using the items centrally authored and owned by the Question Bank.
- The **Enterprise Certificates Platform (Phase 14)** serves as a final downstream consumer. It subscribes to progress events (such as `CourseCompleted` and `LearningPathCompleted`) published by Phase 13 to trigger downstream certificate generation workflows. The Learning Platform owns progress and completion tracking only and has no authority over certificate creation, templates, numbering, or validation.
- The **Review Domain** operates in a decoupled, downstream capacity, collecting learner feedback without impacting any upstream transactional workflows.

**Domain Ownership Matrix**

To eliminate ambiguity, ownership responsibilities for every major domain are explicitly defined:

- **Course Domain**
  - **Domain Owner:** Content & Curriculum Team
  - **Owns Data:** Course, Modules, Lessons metadata, Publishing State
  - **Reads From:** Phase 6 (Imported Courses), Phase 8 (Taxonomy)
  - **Writes To:** Course Catalog
  - **Publishes Events:** `CourseCreated`, `CourseUpdated`, `CoursePublished`, `CourseArchived`
  - **Consumes Events:** N/A
- **Learning Content Domain**
  - **Domain Owner:** Content Management Team
  - **Owns Data:** Video/PDF URLs, Attachments, Subtitles
  - **Reads From:** Media Storage, Object Storage
  - **Writes To:** Learning Material References
  - **Publishes Events:** `ContentUploaded`, `ContentProcessed`
  - **Consumes Events:** `CourseArchived`
- **Enrollment Domain**
  - **Domain Owner:** Student Success & Administration Team
  - **Owns Data:** Student Enrollments, Waiting Lists, Cohorts
  - **Reads From:** Course Domain (Capacity, Availability), Phase 12 (Scholarships)
  - **Writes To:** Enrollment Registry
  - **Publishes Events:** `StudentEnrolled`, `EnrollmentCancelled`, `WaitlistPromoted`
  - **Consumes Events:** `CoursePublished`
- **Program**
  - **Domain Owner:** Curriculum Architecture Team (Part of Learning Path Domain boundaries)
  - **Lifecycle:** Managed as an Aggregate Root subordinate to the Learning Path Domain, aggregating courses into formalized academic tracks.
- **Instructor / Course Provider**
  - **Lifecycle:** Managed purely as Value Objects / External References within the Learning Platform. The actual source of truth for their lifecycle is externally owned by Phase 11 (Universities & Institutions) or Phase 6 (Import Framework).
- **Progress Domain**
  - **Domain Owner:** Analytics & Telemetry Team
  - **Owns Data:** Learning History, Completion Percentage, Resume Position
  - **Reads From:** Course Domain (Structure)
  - **Writes To:** Progress Logs
  - **Publishes Events:** `LessonCompleted`, `ModuleCompleted`, `CourseCompleted`
  - **Consumes Events:** `StudentEnrolled`, `AssessmentPassed`
- **Assessment Domain**
  - **Domain Owner:** Academic Evaluation Team
  - **Owns Data:** Exam Sessions, Attempts, Final Scores, Submissions
  - **Reads From:** Question Bank Domain (Questions, Rubrics), Enrollment Domain (Eligibility)
  - **Writes To:** Assessment Records
  - **Publishes Events:** `AssessmentStarted`, `AssessmentSubmitted`, `AssessmentPassed`, `AssessmentFailed`
  - **Consumes Events:** `CourseCompleted` (Optional triggering)
- **Question Bank Domain**
  - **Domain Owner:** Subject Matter Experts (SME)
  - **Owns Data:** Questions, Question Categories, Difficulty Levels
  - **Reads From:** Phase 8 (Skills Taxonomy)
  - **Writes To:** Question Repository
  - **Publishes Events:** `QuestionCreated`, `QuestionUpdated`, `QuestionDeprecated`
  - **Consumes Events:** `AssessmentSubmitted` (for difficulty recalibration analytics)
- **Review Domain**
  - **Domain Owner:** Quality Assurance Team
  - **Owns Data:** Ratings, Reviews, Abuse Reports
  - **Reads From:** Enrollment Domain (to verify enrollment before reviewing)
  - **Writes To:** Review Repository
  - **Publishes Events:** `ReviewSubmitted`, `ReviewModerated`
  - **Consumes Events:** `CourseCompleted` (to trigger review prompt)
- **Learning Path Domain**
  - **Domain Owner:** Curriculum Architecture Team
  - **Owns Data:** Learning Paths, Milestones, Prerequisites
  - **Reads From:** Course Domain (Course metadata)
  - **Writes To:** Learning Path Catalog
  - **Publishes Events:** `LearningPathCreated`, `LearningPathPublished`, `LearningPathCompleted`
  - **Consumes Events:** `CoursePublished`

### 13.A.7 Course Types

The Learning Platform is architecturally designed to support multiple course origins seamlessly. By defining rigorous interfaces and canonical data models, the platform unifies disparate educational sources into a single, cohesive learner experience, ensuring that native and external content benefit equally from the platform's advanced enrollment, tracking, and analytics capabilities.

**Native Courses**
Native Courses represent educational assets that are fully created, authored, and managed inside the MANARATAK ecosystem. These courses utilize the native Phase 13 course authoring tools, traversing the complete internal publishing workflow from draft to localized publication. Phase 23 - Enterprise Administration Portal will provide the admin screens for course authoring, curriculum management, media attachment, quizzes, exams, question banks, publication review, and moderation, while Phase 13 remains the course domain owner. They serve as the cornerstone of the platform's exclusive intellectual property.
Examples of Native Courses include:

- Chinese Language Courses
- CSCA Preparation
- Scholarship Preparation
- IELTS Preparation

For these courses, MANARATAK maintains absolute structural control, directly managing all underlying media assets, translation lifecycles, and localized SEO metadata.

**Imported Courses**
Imported Courses represent vast catalogs of educational content synchronized from external providers. This integration drastically accelerates the platform's time-to-value and breadth of offerings.
Examples of external sources include:

- Coursera
- edX
- FutureLearn
- Alison
- Universities
- Government Platforms
- Educational Organizations

To preserve the structural integrity of the MANARATAK architecture, a strict enterprise boundary is enforced: The Learning Platform NEVER imports data directly from these third-party endpoints. Instead, it delegates all extraction, transformation, and load (ETL) responsibilities to the Phase 6 Universal Import Framework. The Learning Platform consumes only normalized canonical data produced by Phase 6. This strategic application of the Anti-Corruption Layer (ACL) ensures that provider-specific APIs, external schema changes, or transient network failures do not pollute the core Learning Domain.

### 13.A.8 Learning Model

The Learning Platform enforces a highly structured, strongly typed, and deeply nested hierarchical taxonomy to organize educational content. This canonical data structure is the Single Source of Truth for curriculum rendering across all web, mobile, and API interfaces.

Each course execution model strictly adheres to the following structural hierarchy:

**Program**
At the highest level of aggregation, Programs group related courses into cohesive, multi-disciplinary journeys (e.g., specialized degrees or professional tracks).

↓

**Course**
The core structural aggregate representing a specific curriculum, encapsulating its own metadata, versioning rules, and publishing lifecycle.

↓

**Module**
A distinct thematic or chronological segment within a Course, allowing educators to logically group related lessons and define localized assessment checkpoints.

↓

**Lesson**
The atomic instructional unit where the actual pedagogical delivery occurs. Lessons track granular learner engagement and completion states.

↓

**Learning Material**
The physical or digital assets (Videos, PDFs, SCORM Packages, Audio files, interactive widgets) securely attached to a Lesson, served via optimized global CDNs.

This hierarchical structure supports unlimited depth while maintaining predictable navigation and scalable content organization. By standardizing this topology, the architecture guarantees that the rendering clients (UI/UX) can traverse any educational resource deterministically, ensuring that complex progress calculations, SEO structured data generation, and granular access controls are universally applicable regardless of the course's origin.

### 13.A.9 Learning Path Architecture

Within the MANARATAK ecosystem, Learning Paths are elevated beyond simple curated lists; they are modeled as first-class enterprise entities. They possess their own distinct metadata, versioning, translation states, and audit trails. The platform SHALL support complex enterprise learning journeys composed of one or more disparate educational resources, seamlessly bridging Native and Imported content.

To provide comprehensive pedagogical structuring, each Learning Path may contain a diverse array of elements:

- **Multiple Courses**: Aggregating distinct subjects into a unified track.
- **Multiple Programs**: Nesting higher-level learning programs into overarching meta-paths.
- **Required Courses**: Enforcing mandatory completion gates.
- **Optional Courses**: Providing elective flexibility for tailored learning experiences.
- **Milestones**: Defining critical achievement checkpoints within the journey.
- **Prerequisites**: Validating prior knowledge or completion states before unlocking subsequent phases.
- **Capstone Projects**: Culminating practical assignments demanding manual review workflows.
- **Final Assessments**: Summative exams governing the ultimate completion of the path.
- **Completion Signaling**: Connecting the completion of the path to the publishing of enterprise events (`LearningPathCompleted`) for downstream consumers (such as the Enterprise Certificates Platform in Phase 14).

To accommodate varied pedagogical strategies and enterprise-scale analytics, Learning Paths inherently support:

- **Ordered progression**: Forcing a strict, sequential lock-step traversal of content.
- **Flexible progression**: Allowing learners to consume modules in an adaptive, self-directed manner.
- **Completion requirements**: Calculating aggregate completion based on complex logical operators (e.g., ALL required, ANY 2 optional).
- **Estimated duration**: Pre-calculating workload expectations for improved learner planning.
- **Difficulty level**: Categorizing paths to align with learner competency profiles.
- **Target audience**: Mapping paths to specific user personas for optimized discovery.
- **Required skills**: Defining entry-level competencies via canonical skill taxonomies.
- **Acquired skills**: Emitting skill-acquisition events to Phase 15 (Enterprise Student Platform (Student Workspace)) upon path completion.
- **AI recommendations**: Consuming advisory insights from the Enterprise AI Platform to dynamically suggest the next best action for the learner.
- **Related scholarships**: Asynchronously querying Phase 12 to surface relevant financial aid opportunities dynamically.
- **Related majors**: Linking the learning journey to formal academic disciplines (Phase 10).
- **Related universities**: Connecting outcomes to recognized higher-education institutions (Phase 11).
- **Career mapping (Future Extension)**: Establishing the architectural groundwork to map acquired skills directly to external job market taxonomies.

Crucially, as a core principle of Clean Architecture and DDD, Learning Paths own their lifecycle independently from individual courses. A Learning Path can be drafted, reviewed, published, or archived without altering the state of its constituent courses, and vice versa. This decoupling ensures massive operational scalability and prevents cascading lifecycle failures across the enterprise domain.

### 13.A.10 Assessment Architecture

The Assessment Architecture provides the enterprise-grade evaluation engine for the Learning Platform, enforcing rigorous standards for measuring learner competency. It strictly separates the authoring of assessment items (managed by the Question Bank Domain) from the execution and grading of the assessments themselves, adhering to Clean Architecture principles.

The platform natively supports a comprehensive suite of evaluation modalities:

- **Practice Quiz**: Formative assessments designed for immediate feedback and low-stakes knowledge checks, driving learner engagement.
- **Timed Quiz**: Summative assessments enforcing strict duration limits via server-authoritative timers to ensure fairness.
- **Midterm Exam**: Mid-course evaluations that can integrate with manual review workflows or external proctoring systems.
- **Final Exam**: High-stakes, capstone evaluations governing course completion, enforcing strict session management.
- **Assignment**: Asynchronous, project-based evaluations requiring secure file upload capabilities, peer review lifecycles, and localized instructor feedback.
- **Manual Assessment**: Complex submissions necessitating human intervention, traversing through strict workflow states (e.g., Submitted, Under Review, Graded).
- **Automatic Assessment**: Instantaneous, deterministic evaluations processed by the grading engine without human oversight, ideal for scalable multiple-choice testing.

To ensure absolute academic integrity and adapt to diverse pedagogical needs, each assessment inherently supports:

- **Attempts**: Configurable limits on the number of times a learner can undertake the evaluation, centrally tracked within the Progress Domain.
- **Passing Score**: Absolute or percentage-based thresholds required to successfully complete the assessment.
- **Random Questions**: Dynamic generation of unique assessment instances pulled from designated Question Pools to mitigate cheating and rote memorization.
- **Time Limits**: Cryptographically secure, server-side tracking of session durations to prevent client-side manipulation or browser tampering.
- **Question Pools**: Categorized repositories of reusable items managed independently by the Question Bank Domain.
- **Result Publishing**: Workflow-controlled release of scores, allowing instructors to withhold grades until all submissions across a cohort are reviewed and finalized.

### 13.A.12

The Learning Platform shall support multiple enrollment models natively without requiring structural modifications to the core Course entity. The Enrollment Domain completely decouples the act of registration from the curriculum definition itself, adhering strictly to the Single Source of Truth principle.

Supported enterprise enrollment strategies include:

- **Open Enrollment**: Frictionless access for any authenticated learner within the MANARATAK ecosystem.
- **Invitation Only**: Restricted access requiring explicit, cryptographic tokens or direct administrative assignment.
- **Approval Required**: Workflow-gated registration necessitating manual review by instructors or administrative staff before granting access.
- **Scheduled Enrollment**: Time-bound registration windows enforcing strict opening and closing UTC deadlines.
- **Capacity Limited**: Hard caps on the maximum number of simultaneous learners, governed by atomic transaction locks to prevent overbooking during high-traffic events.
- **Wait List Enrollment**: Automated queuing mechanisms that seamlessly and fairly promote waitlisted learners when capacity becomes available.
- **Private Enrollment**: Hidden courses completely excluded from the public or internal search indexes, accessible only via direct link.
- **Organization-Based Enrollment**: B2B access models granting bulk licenses or cohort-based registration for external organizations (Owned natively by the bounded context).

Critically, enrollment policies shall remain entirely configurable without modifying the Course entity. The dedicated enrollment subsystem definitively owns the entire Enrollment lifecycle, executes complex Enrollment validation rules, performs real-time Capacity validation, guarantees Duplicate enrollment prevention, and maintains the immutable Enrollment history for every student across the enterprise.

### 13.A.13 Learning Progress Architecture

Within the enterprise ecosystem, learning progress is strictly treated as an independent enterprise domain. The Progress Tracking Domain consumes asynchronous event streams to record continuous learner activity without adding synchronous bottlenecks to the content delivery pathways.

The platform shall meticulously track:

- **Course Progress**: The macro-level aggregation of the learner's journey through the curriculum.
- **Module Progress**: Intermediate completion states of structural course groupings.
- **Lesson Progress**: The atomic completion of instructional units.
- **Assessment Progress**: The state of ongoing or completed evaluations.
- **Completion Percentage**: Real-time, mathematically deterministic calculations of overall achievement.
- **Learning Time**: Accurate telemetry measuring the learner's active engagement duration.
- **Last Activity**: Timestamp tracking to support session analytics and abandonment metrics.
- **Resume Position**: Deep-linking coordinates (e.g., video timestamp, last read page) enabling seamless cross-device continuity.
- **Learning History**: An immutable record of every micro-interaction the learner has performed.

In absolute adherence to Clean Architecture and DDD principles, progress tracking shall never modify the Course definition itself. Progress belongs exclusively to the Student Learning context. This decoupling ensures that thousands of concurrent learners can update their progress simultaneously without locking or mutating the canonical course records.

### 13.A.13.1 Course Origin, Delivery Mode & Classification Governance

**Purpose**
To establish an unambiguous, explicit architectural boundary between natively delivered educational content, externally linked learning offerings, and paid auxiliary services across the MANARATAK ecosystem.

**1. Course Categories & Classification Model**
The platform explicitly classifies every learning item into one of three immutable course categories:

- **`NativeManaratakCourse`**:
  - Authored and delivered inside the MANARATAK enterprise ecosystem.
  - May contain structural modules, lessons, videos, images, documents, quizzes, progress tracking, and specific completion rules.
  - All associated physical learning assets must use `AssetId` / `AssetReference` handles exclusively from the Enterprise Asset Platform (ADR-024, Phase 05). Direct unmanaged media URL storage is strictly prohibited.
  - Successful completion tracks progress natively and emits an approved completion event (`CourseCompleted` or `LearningPathCompleted`) to Phase 14 via the Transactional Outbox.
  - Phase 13 must not generate or store certificate records.

- **`ExternalLinkedCourse`**:
  - Imported or indexed from external learning platforms, universities, or trusted course providers.
  - MANARATAK stores structured catalog and discovery data only.
  - The student studies the course directly on the external provider's website.
  - The course record must contain a direct URL (`directCourseUrl`) pointing directly to the actual course detail page, not to the provider's general homepage or generic portal root.
  - MANARATAK must not host the external course's videos, lessons, documents, exams, or detailed progress tracking data.

- **`PaidCourse`**:
  - A real learning course authored, hosted, or tracked by MANARATAK (or explicitly supported as a paid catalog item), which requires payment to access.
  - Phase 13 owns the course record, curriculum, and progression.
  - Payment execution, invoicing, and transactional checkout are delegated strictly to Phase 19 (Enterprise Finance & Payments Platform).
  - Must not be reclassified as a non-course service.

- **`RelatedPaidService`**:
  - Non-course auxiliary offerings such as international test preparation coaching (IELTS/TOEFL coaching), CV/statement/motivation letter preparation services, translation, visa help, or general application support.
  - These are owned entirely by Phase 20 (Enterprise Services Platform) and must remain strictly separate from the course catalog.
  - Phase 13 may only store a reference/link to these services, but must not own the service catalog or fulfillment logic.
  - Payment execution belongs to Phase 19.

**2. External Course Import Eligibility Rules**
Only the following external offerings are eligible to enter the Global Courses catalog:
- A completely free course; or
- A course offering a free completion certificate.

Any paid external courses must be rejected and must not be imported into the free Global Courses catalog. Paid external courses are out of scope for the global free import path and require a separate Phase 13 paid-course catalog decision if MANARATAK chooses to support them.

**3. Mandatory Import Fields**
An external course import candidate must be rejected or sent to an administrative review queue if it lacks any of the following mandatory fields:
- `courseName` (canonical title)
- `directCourseUrl` (direct URL resolving to the actual course detail page, not a generic provider homepage)
- At least one confirmed value:
  - `isFreeCourse = true`; or
  - `isFreeCertificate = true`

**4. Optional Import Fields**
Documented enrichment fields that are optional but supported for ingestion and display:
- `courseContent` (curriculum summary)
- `shortDescription` (brief course overview)
- `learningLanguage` (instruction language)
- `studyDuration` (estimated completion time/effort, e.g., "4 weeks", "12 hours")
- `courseLevel` (e.g., 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels')
- `providerName` (institution or platform name)
- `providerSummary` (brief platform/provider description)
- `providerType` (e.g., 'University' | 'Platform' | 'Institution' | 'Other')
- `certificateType` (e.g., 'Free Certificate' | 'Paid Certificate' | 'Verified Certificate' | 'None')
- `category` (subject area classification)
- `skills` (target skills or competencies)
- `localizedNames` (translations dictionary for localized content)
- `sourceTrustLevel` (e.g., 'High' | 'Medium' | 'Low' | 'Unverified')
- `officialSourceUrl` (official source catalog/feed URL)
- `lastVerifiedAt` (verification timestamp, ISO UTC format)

*Governance Rule*: English must be the canonical baseline language for imported course data. Localized content/translations may be added separately under `localizedNames` or specific translation panels.

**5. Deduplication & Enrichment Rules**
To prevent catalog pollution, Phase 13 strictly owns and executes the following course-specific ingestion logic:
- **Canonical Course-Name Normalization**: Standardizes punctuation, whitespace, and branding suffixes.
- **Provider Identity Matching**: Resolves external platform/provider references to canonical system IDs.
- **Duplicate Detection**: Flags identical courses using compound identifiers (e.g., normalized course name and matched provider).
- **Validation of Free Claims**: Automatically audits claims of `isFreeCourse` and `isFreeCertificate` using source feed rules.
- **Direct-Course-Link Validation**: Enforces that outbound URLs point directly to course-specific paths and are not malformed or pointing to root homepages.
- **Missing-Field Merge Rules**: When a matching duplicate course is found from another import source, the process may fill empty optional fields while preserving the original provenance and source trust score. It must never silently overwrite or degrade previously reviewed/approved information.
- **Source Trust and Freshness Rules**: Calculates trust values based on historical feed reliability and updates the freshness timestamp (`lastVerifiedAt`).
- **Course Import Completeness and Review States**: Automatically transitions imported items through lifecycle states (e.g., `Draft`, `PendingReview`, `Rejected`, `ReadyForPublishing`).

*Governance Rule*: Duplicate external courses must not create multiple canonical records.

**6. Phase 06 Boundary**
To guarantee strict domain decoupling, the boundary between Phase 06 (Universal Import Framework) and Phase 13 is explicitly enforced:
- **Phase 06 Mechanics Ownership**: Phase 06 owns ONLY universal import mechanics, including source connectors, provider configurations, batch processing pipelines, chunking, retry behaviors, failed-row isolation, execution history logging, and generic deduplication/enrichment extension hooks.
- **Phase 13 Domain Ownership**: Phase 06 must not define course-specific fields, free-course eligibility rules, course naming rules, or learning-domain validation. These remain exclusively owned by Phase 13.

**7. Course Catalog, Provider, and Course Detail Page Data Structure Specification**

Phase 13 strictly owns and provides the structured domain data models and read projections (NOT the UI rendering) consumed by Phase 24 for the public courses experience, provider listings, catalogs, and detail pages.

#### 1. Main Courses Experience Grouping Specification
To guarantee structural and visual separation, the public experience consists of three distinct, non-overlapping catalog sections composed by Phase 24 using Phase 13's structured DTOs:
- **`Manaratak Courses`**: Native courses authored and delivered inside MANARATAK, with curriculum and enrollment structures owned by Phase 13.
- **`Global Free Courses`**: External courses imported and indexed from trusted platforms and universities. Global external course imports are limited to free courses or courses with free certificates unless a separate Phase 13 paid external course catalog decision is explicitly approved. External course records must include a direct course URL, not a provider homepage. Phase 13 owns course import schemas, course validation, deduplication, origin classification, and publish readiness. Phase 06 - Import Foundation owns only generic import mechanics. Phase 24 displays external course details only after Phase 13 publishes approved read models.
- **`Paid Courses`**: Real learning courses authored or explicitly supported by MANARATAK requiring payment. Phase 13 owns the course record and curriculum. Paid courses remain Phase 13 learning offerings. Paid courses must not be reclassified as Phase 20 services. Phase 19 (Enterprise Finance & Payments Platform) owns checkout, invoices, refunds, and settlement for paid courses.
- **`Related Paid Services`**: Non-course auxiliary offerings such as international test preparation coaching (IELTS/TOEFL coaching), CV/statement/motivation letter preparation services, translation, or application support. Phase 20 - Enterprise Services Platform owns non-course paid services only, such as CV writing, translation, document preparation, coaching, and consultation. Related paid services may be cross-linked from course pages but are not course records. These must remain completely visually and semantically separate from the free Global Courses catalog to avoid confusing users. Payment transactions are executed strictly by Phase 19, while domain fulfillment belongs entirely to Phase 20 (Enterprise Services Platform). Phase 13 provides only references, not course records, for these.
- *Presentation Role*: Phase 24 owns the final visitor-facing page layout composition, client-side routing, navigation, interactive filters (by language, duration, level, provider), cards UI, and search engine optimization (SEO) tags. It must consume and present Phase 13's structured entities without redefining or duplicating them.

#### 2. Global Course Provider Listing DTO
For the public platform's provider directory, Phase 13 supplies the following structured provider metadata. Phase 24 renders each provider as a compact card, which when selected, opens the provider's course catalog:
- `providerId` (canonical provider UUID)
- `providerName` (institution or platform name, e.g., "Harvard University", "Coursera")
- `providerSummary` (brief description of the platform/university)
- `providerLogoAssetId` or `AssetReference` (immutable handle referencing Phase 05 Enterprise Asset Platform)
- `providerType` (string union: `'University' | 'Platform' | 'Institution' | 'Other'`)
- `numberOfCourses` (total number of published courses mapped to this provider)
- `availableLanguages` (array of language codes, e.g., `['en', 'ar']`, representing available courses)
- `freeCourseCount` (number of courses with `isFreeCourse = true`)
- `freeCertificateCourseCount` (number of courses with `isFreeCertificate = true`)
- `sourceTrustLevel` (string union: `'High' | 'Medium' | 'Low' | 'Unverified'`)
- `lastVerifiedAt` (timestamp of last catalog verification, ISO UTC format)

#### 3. Provider Course Catalog (Course-Card DTO)
When a visitor views a provider's catalog or filters the global search, Phase 13 supplies compact course-card data. Each card points directly to the external course-specific page:
- `courseId` (canonical course UUID)
- `providerName` (associated provider name)
- `courseName` (course canonical title)
- `shortDescription` (brief, highly summarized course overview)
- `learningLanguage` (primary language of instruction)
- `studyDuration` (estimated completion duration, e.g., "6 weeks", "15 hours")
- `courseLevel` (string union: `'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'`)
- `isFreeCourse` (boolean flag signifying if the content is free to study)
- `isFreeCertificate` (boolean flag signifying if the certificate is issued without charge)
- `certificateType` (string union: `'Free Certificate' | 'Paid Certificate' | 'Verified Certificate' | 'None'`)
- `directCourseUrl` (direct URL deep-linking to the specific external course detail page; MUST NOT point to a generic homepage or root portal)
- `lastVerifiedAt` (timestamp of last verification, ISO UTC format)

#### 4. Course Detail Page DTO (Read Model)
For the public Course Detail Page, Phase 13 provides a comprehensive structured read model. Phase 24 aggregates and renders this data:
- `courseId` (canonical course UUID)
- `courseName` (full course title)
- `courseContent` (detailed curriculum description, syllabus, or module overview)
- `shortDescription` (concise summary description)
- `providerName` (associated provider or institution name)
- `providerSummary` (brief description of the provider)
- `learningLanguage` (language of instruction)
- `studyDuration` (estimated effort, e.g., "12 hours")
- `courseLevel` (difficulty tier)
- `skills` (array of target skills or learning outcomes gained, e.g., `['Data Science', 'Python']`)
- `isFreeCourse` (boolean flag; true if the audit or study is free)
- `isFreeCertificate` (boolean flag; true if the completion certificate is free)
- `certificateType` (type of certificate issued)
- `directCourseUrl` (direct outbound URL deep link to the external course page, if applicable)
- `sourceTrustLevel` (verification confidence level)
- `lastVerifiedAt` (timestamp of last metadata verification, ISO UTC format)
- `originType` (string union: `'ExternalLinkedCourse' | 'NativeManaratakCourse' | 'PaidCourse' | 'RelatedPaidService'`)
- `deliveryMode` (string union: `'ExternalRedirect' | 'InternalLmsEngine' | 'HybridTrustedIntegration' | 'PaidServicePortal'`)
- *Native Enhancements*: For native `NativeManaratakCourse` offerings, this DTO may additionally expose structures for approved modules list, lesson objects, instructor bio metadata, assessment rules, active enrollment progress, and passing completion criteria. Any physical learning materials (videos, PDFs, images) are served through secure `AssetId` handles referencing Phase 05. Completion tracking is tracked internally, eventually triggering Phase 14 certification without storing the physical certificates inside Phase 13.

**8. Native MANARATAK Course Governance Rules**
- **Native Delivery**: Created, versioned, and delivered natively within the internal LMS engine of Phase 13.
- **Enterprise Media Asset Governance**: All associated media materials (videos, images, subtitles, PDFs, audio, downloadable resources) MUST reference Enterprise Asset Platform handles exclusively via `AssetId` / `AssetReference` in strict compliance with ADR-024 (Phase 05). Direct unmanaged media URL storage is strictly prohibited.
- **Domain Ownership**: Phase 13 explicitly owns modules, lessons, learning materials, student enrollment, local micro-progress tracking, assessments, quizzes, attempt histories, and completion evaluation logic.
- **Completion Events**: Upon a learner fulfilling all completion criteria, Phase 13 emits `CourseCompleted` or `LearningPathCompleted` domain events onto the Enterprise Event Bus.
- **Certificate Governance**: Phase 14 (Enterprise Certificates Platform) exclusively owns certificate generation, templates, serial numbering, cryptographic signing, QR codes, verification, revocation, and public validation. Phase 13 MUST NOT generate, issue, or store certificate records.

**9. Cross-Phase Page and Data Ownership Specification**
To preserve system-wide architectural integrity, the ownership of composite public pages and domain entities is governed as follows:

- **Rich Country Pages (Country Study Destination Pages)**:
  - Phase 07 owns canonical country metadata and reference data.
  - Phase 10 contributes major and specialization links in the country.
  - Phase 11 contributes universities and academic programs in the country.
  - Phase 12 contributes available scholarships in the country.
  - Phase 13 contributes global/free courses relevant to the country.
  - Phase 16 (Enterprise CMS) contributes long-form editorial country guidance and narrative copy.
  - Phase 20 may contribute student services available in the country.
  - Phase 24 (Enterprise Public Platform) owns final Country Study Destination Page composition, visitor-facing layout, and rendering experience.

- **University Detail Pages**:
  - Phase 11 owns structured university and program data: institution profiles, campus details, faculties, academic programs, tuition metadata, admissions metadata, rankings, accreditations, research centers, partnerships, and logos/media via `AssetId`/`AssetReference`.
  - Phase 16 owns long-form editorial/marketing copy if needed.
  - Phase 24 owns final public university page composition and visitor-facing UI experience.
  - Phase 23 (Enterprise Administration Portal) owns admin screens and management workflows for university data, NOT data ownership.

- **Scholarship Detail Pages**:
  - Phase 12 owns structured scholarship data: funding details, eligibility rules, application deadlines, sponsor metadata, target countries, universities, programs, majors, document requirements, official links, and trust/freshness fields.
  - Phase 16 owns editorial scholarship guides and advice copy if needed.
  - Phase 24 owns final public scholarship page composition.
  - Phase 23 owns admin screens for imported/reviewed scholarships, NOT domain ownership.

- **Course Detail Pages**:
  - Phase 13 owns structured course data, curriculum details, and course detail read payloads.
  - Phase 16 owns editorial or marketing copy if needed.
  - Phase 24 owns final public course page composition and visitor experience.
  - Phase 23 owns admin screens for course management and import review workflows.

**10. Administration and Publication Governance**
- **Domain-Owned Lifecycles & State Consumption**: Phase 23 (Enterprise Administration Portal) does not invent or define its own separate course lifecycle or workflow states. Instead, it must strictly consume the domain-owned state machine defined in Phase 13 (e.g., `'Draft' | 'PendingReview' | 'Rejected' | 'ReadyForPublishing' | 'Published' | 'Archived'`).
- **No Automatic Publishing**: External courses imported via the ingestion pipeline are never published automatically. All incoming records start in a secure non-public state (e.g., `PendingReview`) and must undergo administrative validation.
- **Explicit Administrator Actions**: Phase 23 exposes administrative interfaces to execute the following authorized operations on imported records:
  - **Review Imported Course**: Inspects incoming metadata payload, origin indicators, and trust ratings.
  - **View Completeness and Validation Problems**: Flags missing optional metadata or highlights validation friction (e.g., missing descriptions, short study duration formats).
  - **Correct Structured Metadata**: Allows manual inline editing of fields (e.g., correcting names, fixing typos, adjusting levels).
  - **Request Missing-Data Enrichment**: Triggers external active enrichment routines or merges alternate provenance feeds without silently overwriting previous manual edits.
  - **Verify Direct Course URL**: Tests and validates that the `directCourseUrl` is healthy, resolves correctly, and points directly to the actual external course detail page rather than a generic provider homepage.
  - **Verify Free-Course/Free-Certificate Claims**: Reviews evidence to verify that the external course is indeed zero-cost to audit, or that the certificate is issued completely free of charge.
  - **Approve or Reject**: Transition of the record's review state. Rejection maps to a triage archive.
  - **Publish or Unpublish**: Explicitly makes the course visible/invisible in Phase 24's active read indexes.
  - **Archive**: Soft-deletes or marks the record as decommissioned, preventing future ingestion loops from recreating it.
- **Admin Workflow Ownership**: Phase 23 owns administrative UI screens, review workflows, approval queues, and publication toggles.
- **Public Composition Ownership**: Phase 24 owns public page composition and visitor rendering.
- **Publication Threshold**: Imported records MUST NOT become publicly visible until domain readiness rules are satisfied AND explicit administrative review/publication is executed in Phase 23.

### 13.A.14 Phase 13 Import Specification

**Purpose**
To define the exact boundaries and responsibilities for importing external learning data into Phase 13, adhering to the enterprise import governance framework.

**Import Ownership Boundary**
- **Phase 06 (Import Foundation)** owns the universal import mechanics, pipeline execution, source configurations, and anti-corruption layers.
- **Phase 07 (Enterprise Reference Data)** owns global references such as countries and languages.
- **Phase 08 (Academic Taxonomy)** owns academic taxonomies and degree levels.
- **Phase 10 (Major Platform)** owns majors.
- **Phase 13 (Learning Platform)** explicitly owns the ingestion, translation, mapping, validation rules, and acceptance criteria for all course and learning datasets.

**Phase 13 Import Scope**
Phase 13 is responsible for importing and modeling the following specific data entities:
- **Courses & Course Versions**: The core catalog offerings and their versioned iterations.
- **Modules & Lessons**: The structural hierarchy of course content.
- **Learning Materials**: External links or asset references to educational content.
- **External Course Provider References**: Links to the third-party institutions providing the content.
- **Course Categories & Tags**: Categorical classifications specific to learning.
- **Skill Tags**: Skills acquired upon completion.
- **Language/Localization Metadata**: Course language availability (referencing Phase 07).
- **Course-Major Mappings**: Associations between courses and academic majors (referencing Phase 10).
- **Course-Degree-Level Mappings**: Associations with degree levels (referencing Phase 08).
- **Course Prerequisites**: Rules defining required prior learning.
- **Course Duration/Difficulty Metadata**: Estimated effort and complexity levels.
- **Assessment Structures**: Formative and summative evaluation definitions, when provided by external sources.

### 13.A.15 Course Detail Page Data Specification

**Purpose**
To clarify Phase 13's responsibility in providing structured data for course detail pages and defining the exact fields exposed to downstream composition layers.

**Architectural Rules**

- **Structured Data Ownership**: Phase 13 strictly owns and provides the structured domain data for course detail pages.
- **Public Composition Boundary**: Phase 13 DOES NOT own the final public page composition, rendering, or visitor-facing page experience. This is strictly governed by Phase 24 (Enterprise Public Platform).
- **Content Boundary**: Any long-form editorial marketing copy, study guides, or guidance content required for these pages MUST be governed by Phase 16 (Enterprise CMS). Phase 13 owns learning content, not the enterprise-wide CMS.

**Structured Detail Page Data Scope**
The structured read model provided by Phase 13 MUST include the following categorical data:

- **Header / Hero Data**: Course title, canonical course name, provider, level, language, and duration.
- **Curriculum Structure**: Modules, lessons, and learning material summaries.
- **Academic Rules**: Prerequisites, learning outcomes, target majors, and difficulty metadata.
- **Certificate Availability Signal**: A boolean indicator or metadata block signaling if completing this course may yield a certificate (Note: Actual certificates are managed by Phase 14).
- **Pricing/Access Metadata**: Cost or enrollment constraints, if applicable.
- **Trust and Freshness**: Official source URL, provider trust level, data completeness status, and last verified timestamp.

### 13.A.16 Catalog Read-Model Projection

The Learning Platform integrates seamlessly with the approved search/read-model capability, ensuring all published educational content is instantly discoverable with sub-second latency. The catalog read-model projection is critical for both internal navigation and public SEO visibility. Phase 13 emits course publication events and exposes course catalog metadata for indexing/read-model consumption. Phase 13 does not own a standalone search platform. Phase 24 may display public search or discovery results, but does not own search infrastructure.

The robust discovery read models include, but are not limited to:

- **Course**: The primary aggregate for catalog discovery.
- **Module / Lesson**: Deep-linking indexes allowing granular content search.
- **Instructor**: Aggregating educational offerings by subject matter experts.
- **Organization**: Grouping content by external providers or internal departments (Owned natively by the bounded context).
- **Skills**: Searching by targeted competencies and learning outcomes.
- **Categories**: Hierarchical taxonomies for structured browsing.

The public discovery projection natively supports:

- **Full Text Search**: High-speed, typo-tolerant querying across all textual metadata.
- **Semantic Search**: Vector-based retrieval understanding learner intent beyond exact keyword matches.
- **AI Ranking**: Personalized relevance tuning driven by the Enterprise AI Platform's insights.
- **Faceted Search**: Dynamic filtering by duration, language, difficulty, and provider.
- **Multilingual Search**: Native support for cross-language querying and localized indexing.
- **Instant Suggestions**: Type-ahead capabilities delivering real-time predictive results.

Crucially, the read models are populated exclusively via asynchronous Enterprise Domain Events (e.g., `CoursePublishedEvent`), ensuring that complex, resource-intensive read-model indexing operations never impact the transactional performance of the core Learning Platform.

### 13.A.17 Analytics Architecture

The Learning Platform operates with an Analytics-ready Architecture from inception. It produces highly granular, immutable analytical events entirely independently from the core transactional operations, utilizing the Event-Driven Architecture to decouple telemetry generation from the critical path.

The platform continuously tracks and projects enterprise metrics, including:

- **Course Analytics**: Aggregating Views, Enrollments, Completions, Drop-off Rate, Popularity trends, and overall Ratings.
- **Student Analytics**: Monitoring Active Learners, aggregate Learning Time, granular Progress, cohort Completion Rate, and overall Success Rate.
- **Assessment Analytics**: Tracking the Pass Rate, Failure Rate, Average Score, Average Attempts, and performing statistical analysis on Question Difficulty to refine the Question Bank.
- **Provider Analytics**: Monitoring the performance of Imported Courses, evaluating Course Quality, and tracking external Synchronization Status.

These metrics are projected into specialized OLAP databases or analytical data lakes, allowing stakeholders to generate real-time dashboards and comprehensive compliance reports without placing any read-heavy burden on the primary operational databases.

### 13.A.18 Security Architecture

The Learning Platform adheres strictly to the centralized Enterprise IAM (Identity and Access Management) strategy, enforcing zero-trust principles across all internal and external boundaries.

Every single operation-whether originating from a web portal, mobile app, or B2B integration-must rigorously validate:

- **Authentication**: Confirming the cryptographic identity of the requester.
- **Authorization**: Ensuring the identity possesses the necessary rights to perform the action.
- **Role Permissions**: Validating specific capabilities (e.g., Instructor, Administrator, Learner).
- **Organization Permissions**: Enforcing multi-tenant boundaries for B2B or departmental isolation (Owned natively by the bounded context).
- **Administrative Policies**: Applying global enterprise rules (e.g., IP restrictions, maintenance windows).

Within the Learning Platform, content editing is strictly restricted through granular Role-Based Access Control (RBAC), ensuring only authorized personnel can transition a course through its workflow lifecycle. Furthermore, the architecture enforces strict immutability rules to prevent historical tampering: Assessment submissions become absolutely immutable the moment final grading is completed.

### 13.A.19 Performance Architecture

To meet the stringent demands of global enterprise delivery, the Learning Platform is engineered with a comprehensive Performance Architecture designed to minimize latency and maximize throughput.

Key performance objectives and implementations include:

- **Optimized CQRS Read Models**: Structuring data specifically for high-speed retrieval, bypassing complex relational joins.
- **Distributed Redis Cache**: Caching public course catalogs, SEO metadata, and heavily accessed structural hierarchies to achieve sub-millisecond response times.
- **Lazy Loading Avoidance**: Enforcing strict eager loading or projection-based querying in the data access layer to eliminate N+1 query problems.
- **Projection-based Queries**: Executing database queries that return only the exact fields required by the presentation layer, minimizing network payload size.
- **Database Index Optimization**: Maintaining rigorous index coverage across all reference IDs, foreign keys, and search vectors.
- **Background Processing**: Delegating all non-essential synchronous tasks (e.g., email dispatch, read-model indexing) to robust background worker queues.
- **Asynchronous Event Handling**: Utilizing message brokers to decouple domain operations and handle extreme traffic spikes gracefully.
- **CDN Support for Learning Assets**: Distributing static resources (videos, PDFs, images) across global edge networks to ensure low-latency delivery regardless of the learner's geographical location.

As an absolute architectural constraint, large media files shall never be stored inside the transactional database. Phase 13 does not own physical storage paths. All videos, images, PDFs, subtitles, thumbnails, SCORM packages, downloadable materials, and preview assets must be registered through Phase 05 - Core Implementation / Enterprise Asset Platform (EAP). Phase 13 stores only immutable AssetId / AssetReference handles in its learning material and media contracts. CDN delivery, signed URLs, transformations, previews, or storage resolution are obtained through approved EAP read models and delivery services. Phase 13 must not persist raw cloud storage URLs as canonical domain identifiers.

### 13.A.21 Explicit A/B/C Traceability Check

- **Part A to Part B**: Every responsibility and domain identified in Part A (Vision, Scope, Responsibilities, Platform Domains) MUST have a corresponding structured contract defined in Part B (Domain Contracts).
- **Part B to Part C**: Every contract defined in Part B MUST have a concrete implementation strategy, database mapping, and integration workflow defined in Part C (Implementation Guide).
- **Part C to Part A/B**: Part C MUST NOT introduce any new business entities, workflows, mappings, or responsibilities that are absent from Part A and Part B. If a technical requirement arises, the architecture and contracts must be updated first.

### 13.A.22 Certificate Boundary
Phase 13 emits CourseCompleted / LearningPathCompleted events only. Phase 14 - Enterprise Certificates Platform owns certificate generation, templates, QR codes, serial numbers, signing, verification, revocation, and certificate records. Phase 13 must not store certificate records or certificate templates.

### 13.A.23 Enterprise Architecture Review

**Architectural Validation**

The Learning Platform has undergone rigorous evaluation against the MANARATAK strategic directives and successfully satisfies the following critical architectural objectives:

- ✔️ **Enterprise Modular Architecture**: Verified isolation and cohesion within the broader modular monolith.
- ✔️ **Domain-Driven Design**: Verified implementation of rich domain models, ubiquitous language, and strict bounded contexts.
- ✔️ **Clean Architecture**: Verified the absolute separation of infrastructure and presentation layers from core business logic.
- ✔️ **CQRS**: Verified the optimization of read and write operational paths for enterprise scale.
- ✔️ **Event-Driven Architecture**: Verified asynchronous decoupling and eventual consistency via the Transactional Outbox pattern.
- ✔️ **Repository Pattern**: Verified robust persistence abstraction and testability.
- ✔️ **Versioned Content**: Verified immutable tracking of course iterations to support historical audits.
- ✔️ **Native Learning Platform**: Verified robust capabilities for internal authoring and publishing workflows.
- ✔️ **Imported Learning Platform**: Verified strict adherence to Phase 6 Anti-Corruption Layers for external ingestion.
- ✔️ **Assessment Platform**: Verified secure, scalable evaluation engines for formative testing.
- ✔️ **Examination Platform**: Verified high-stakes testing capabilities with fault-tolerant session state.
- ✔️ **Assignment Platform**: Verified asynchronous submission and structured grading workflows.
- ✔️ **Question Bank**: Verified centralized, versioned, and reusable item repositories.
- ✔️ **AI Integration**: Verified absolute read-only boundary enforcement for artificial intelligence capabilities.

## Enterprise Integration

This section shall describe how this platform exposes its capabilities and interacts with the broader enterprise.

- **Integration Model:** Defines the communication paradigms (e.g., synchronous APIs, asynchronous messaging).
- **Published Contracts:** The official interfaces, DTOs, and APIs exposed to consumers.
- **Consumed Contracts:** The official interfaces and APIs this phase consumes from upstream platforms.
- **Events:** The domain and integration events published to the Enterprise Event Bus.
- **Read Models:** The optimized data structures provided for high-performance querying (CQRS).
- **Enterprise Communication Rules:** Guidelines for reliable, resilient, and secure communication.

### Architecture Constraints

- **No Business Logic (if applicable):** Must not contain tenant-specific business rules unless explicitly defined as a business domain.
- **No Ownership Violations:** Strict adherence to aggregate roots; entities must not bypass defined boundaries.
- **No Circular Dependencies:** Circular references between modules or phases are strictly prohibited.
- **No Direct Database Access:** All data access must occur through defined domain repositories.
- **No Upward Dependencies:** The platform must remain ignorant of downstream consumers.
- **Technology Neutrality:** Domain contracts must remain agnostic to underlying physical technologies.
- **ADR Compliance:** All deviations must be documented and approved via Architecture Decision Records.

### Acceptance Criteria

- All architecture constraints are met.
- Domain boundaries are strictly enforced.

### Deliverables

- Architecture Specification (Part A)
- Domain Contracts (Part B)
- Implementation Guide (Part C)

### Architecture Review Checklist

- [ ] Requirements met?
- [ ] Dependencies validated?
- [ ] Security reviewed?
- [ ] Performance criteria defined?

### ARB Decision

- **Status:** Approved
- **Date:** TBD
- **Approver:** ARB

### Status

- **Current Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 12 - Scholarships](../phase-12-scholarships/phase-12-01-enterprise-architecture-specification.md)
- **Next**: [Phase 13.B - Domain Contracts](phase-13-02-domain-contracts.md)
