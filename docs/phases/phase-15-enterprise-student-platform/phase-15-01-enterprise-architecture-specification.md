# Phase 15 — Enterprise Student Platform

> **P13 Final Source Alignment — 2026-09-03:** The current source implements session/API-backed live Student Workspace composition and canonical owner-read hydration. Prototype/local preview behavior is explicit-only and is not a live source of truth. Runtime/DB/E2E validation remains pending; this note does not assert production certification.


### Navigation
- **Previous:** [Phase 14 — Enterprise Certificates Platform](../phase-14-enterprise-certificates-platform/phase-14-01-enterprise-architecture-specification.md)
- **Next:** [Phase 16 — Enterprise CMS](../phase-16-enterprise-cms/phase-16-01-enterprise-architecture-specification.md)

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

# Part A — Enterprise Architecture Specification

## 15.A.1 Executive Summary

The MANARATAK 2.0 Enterprise Student Platform (Phase 15) represents the unified, personalized digital workspace for every learner within the ecosystem. It is designed as the absolute convergence point of the student's educational journey, bringing together discovery, learning, credentialing, and career preparation into a single, cohesive Personal Experience Layer.

Crucially, the Student Platform is an orchestration and presentation domain, not a system of record for core educational assets. It does not own courses, issue certificates, or process scholarship applications. Instead, it acts as the student's private command center, projecting read models and executing interactions across all other MANARATAK bounded contexts while preserving a strict Single Source of Truth enterprise architecture.

This document defines the architectural specification for the Student Platform, establishing the principles, boundaries, and enterprise integration patterns required to deliver a highly scalable, personalized, and privacy-first student experience.

## 15.A.2 Strategic Objectives

1.  **Unified Personal Experience Layer**: Deliver a single pane of glass for the student, abstracting the complexity of the underlying enterprise modular monolith.
2.  **Absolute Boundary Preservation**: Ensure the Student Platform never duplicates ownership of core domain entities (Courses, Certificates, Scholarships) and relies exclusively on CQRS read models and enterprise events.
3.  **High-Performance Personalization**: Architect a dashboard and workspace engine capable of rendering deeply personalized recommendations, timelines, and statistics with sub-second latency through aggressive caching and optimized projections.
4.  **Privacy by Design**: Establish absolute isolation between student workspaces, ensuring that personal preferences, saved items, and search histories remain strictly confidential and cryptographically isolated from unauthorized access.
5.  **Future-Ready Scalability**: Utilize Event-Driven Architecture (EDA) to maintain eventual consistency between the student workspace and core transactional domains, ensuring the platform remains ready for future microservice extraction.

## 15.A.3 Bounded Context & Boundary Confirmation

The Student Platform operates within its own strictly defined bounded context: **Student Workspace**.

### 15.A.3.1 Phase 15 Ownership Boundary
Phase 15 is explicitly defined as the Student Workspace / Personal Experience Layer only.

**In Scope (Owned exclusively by Phase 15):**
- Student workspace configuration
- Dashboard layout and arrangement settings
- Widgets and cards as private presentation state
- Saved items and saved collections (references only)
- Recent activity and recently viewed history lists
- Personal timeline projection
- Preferences, privacy, and notification display preferences
- Personal search history log
- Personal analytics projections and statistics
- Student dashboard read-model composition

**Out of Scope (Phase 15 is STRICTLY FORBIDDEN from owning):**
- Scholarship definitions or eligibility rules (Owned by Phase 12)
- University profiles, majors, or academic programs (Owned by Phase 11)
- Course content, lessons, quizzes, or learning delivery (Owned by Phase 13)
- Certificate issuance, verification, revocation, or certificate files (Owned by Phase 14)
- Payment/disbursement execution (Owned by Phase 19)
- Public visitor pages or public verification pages (Owned by Phase 24)
- AI recommendation generation, prompt management, or AI model orchestration (Owned by Phase 17)
- Global search engine ownership or site-wide CMS catalogs (Owned by Phase 16)

### 15.A.3.2 Cross-Phase Dependency & Consumption Rules
To preserve strict architectural boundaries and decouple workflows, Phase 15 integrates with the rest of the MANARATAK ecosystem under these specific constraints:
1. **Phase 11 — Universities & Institutions**: Owns university profiles, academic programs, and majors. Phase 15 consumes only high-level read models of university records to render references in saved collections.
2. **Phase 12 — Scholarships Platform**: Owns scholarship structured data, eligibility rules, and definitions. Phase 15 projects only lightweight metadata for bookmarked scholarship cards.
3. **Phase 13 — Enterprise Learning Platform**: Owns educational delivery, lessons, student course progress, and fires `CourseCompleted` or `LessonCompleted` events. Phase 15 listens to progress and completed events to construct local timeline records and progress cards.
4. **Phase 14 — Enterprise Certificates Platform**: Owns certificate generation, cryptographic signing, revocation, and reissuance. Phase 14 exposes certificate read models to Phase 15; the Student Platform queries these read models to show the certificate download lists on the dashboard but has zero certificate file ownership.
5. **Phase 16 — Enterprise CMS**: Owns CMS content, editorial content, long-form narratives, and CMS-managed content indexes. Phase 15 queries or consumes approved CMS indexes via read models to display external recommendations and CMS cards.
6. **Phase 17 — Enterprise AI Platform**: Owns the generation of personalized recommendations. It computes recommendation lists, which Phase 15 consumes passively via lightweight read models. Phase 15 has no prompt engineering or AI engine components.
7. **Phase 19 — Enterprise Finance & Payments Platform**: Owns all transactional ledgers, payment processing, and disbursement execution. Phase 15 projects only status read models for display in student workflows.
8. **Phase 23 — Administration Portal**: Owns administrative screens, review queues, and operations for workspace auditing, manual suspension, or archival triggers.
9. **Phase 24 — Enterprise Public Platform**: Owns the visitor-facing layout and public index views. It is separated from Phase 15, which is strictly for authenticated student workspaces.
10. **Phase 05 (Enterprise Asset Platform - EAP)**: Owns binary file storage and digital asset registers. Every file (profile avatar, document, preview thumbnail) displayed within Phase 15 is stored in EAP and referenced exclusively via an immutable `AssetId` or `AssetReference`.
11. **Phase 06 — Import Foundation**: Owns legacy data import mechanics and batch ETL logic only.

## 15.A.4 Domain Architecture

The Student Platform follows a Clean Architecture design, heavily leveraging CQRS to separate the lightweight transactional state of workspace configuration from the complex, aggregated read models required for the dashboard.

### 15.A.4.1 Core Domain Aggregates

1.  **StudentWorkspace**: The root aggregate defining the lifecycle and active state of a student's personal portal.
2.  **DashboardLayout**: Manages the spatial configuration, widget visibility, and personalization rules for the student's home view.
3.  **SavedCollection**: Groups and manages the student's bookmarked or favorite items across various external domains.
4.  **PersonalTimeline**: An append-only ledger of the student's historical interactions, milestones, and ecosystem events.
5.  **StudentPreferences**: Encapsulates all opt-in/opt-out configurations regarding privacy, notifications, and UI presentation.

### 15.A.4.2 Architectural Paradigms

- **Event-Driven Synchronization**: The domain relies on listening to integration events (e.g., `CourseEnrolled`, `CertificateIssued`, or generic downstream events like `ScholarshipApplied`) from other bounded contexts to update its local timeline and read models.
- **CQRS Read Side**: The dashboard heavily relies on materialized views that aggregate data from multiple services to prevent N+1 query problems during rendering.

## 15.A.5 Workspace Lifecycle

The lifecycle of the Student Workspace is intrinsically tied to the student's identity within the MANARATAK ecosystem.

1.  **Workspace Initialization**: Triggered automatically upon the reception of a `StudentIdentityCreated` integration event from the Identity Platform. This process provisions the default dashboard layout, initial preference states, and empty collections.
2.  **Workspace Synchronization**: An ongoing, event-driven state where the workspace consumes ecosystem events to update recent activities, adjust recommendations, and refresh progress widgets.
3.  **Workspace Personalization**: Driven by explicit student commands (e.g., rearranging widgets, saving a scholarship) and implicit behavioral analytics (e.g., tracking recently viewed universities).
4.  **Workspace Archival/Suspension**: Triggered by a `StudentIdentitySuspended` or `StudentIdentityArchived` event, placing the workspace into a read-only or inaccessible state while preserving all historical data for compliance.

## 15.A.6 Student Workspace Architecture

The Student Workspace is architected as an isolated tenant environment for each user. It serves as the container for all personalized modules.

### 15.A.6.1 Workspace Modules

- **The Hub**: The central landing area summarizing critical alerts, pending actions, and immediate learning objectives.
- **The Vault**: A consolidated view of all Saved Items, categorized by domain (Universities, Scholarships, Courses).
- **The Journey**: The historical rendering of the Personal Timeline and Achievements Summary.
- **The Control Center**: The interface for managing Student Preferences, Privacy Settings, and Dashboard Personalization.

### 15.A.6.2 Workspace Boundaries

To guarantee isolation, every query and command executed within the Student Platform must pass through an authorization gateway that mathematically binds the execution context to the authenticated `StudentId`. Cross-workspace queries are strictly prohibited at the architectural level.

## 15.A.7 Dashboard Architecture

The Dashboard is not a monolithic UI; it is a highly dynamic, component-driven aggregation layer.

- **Aggregation Engine**: A backend-for-frontend (BFF) architectural pattern that concurrently fetches read models from the Learning, Certificate, and external integration platforms, assembling them into a single, cohesive view model optimized for the client.
- **Graceful Degradation**: The dashboard is architected to handle partial failures. If the Scholarship read model is temporarily unavailable, the Scholarship Widget will display a graceful fallback state without crashing the entire Student Hub.
- **Real-time Capabilities**: Utilizing WebSocket or Server-Sent Events (SSE) to push critical updates (e.g., a notification that an application status has changed) directly to the dashboard without requiring a hard refresh.

## 15.A.8 Widget Architecture

Widgets are self-contained, domain-specific visual components that populate the Dashboard Layout.

- **Widget Autonomy**: Each widget (e.g., "Continue Learning", "Recent Certificates", "Upcoming Deadlines") is backed by a specific CQRS read query.
- **State Management**: Widgets manage their own loading, error, and empty states independently.
- **Widget Registry**: An enterprise configuration layer defines which widgets are available, their default positions, and their dependency requirements (e.g., the "Scholarship Tracker" widget is only visible if the student has active scholarship references).

## 15.A.9 Saved Items Architecture

The Saved Items (Favorites/Bookmarks) system acts as a universal reference manager.

- **Polymorphic References**: The `SavedItem` entity utilizes a polymorphic design, storing a `TargetDomainType` (e.g., "Scholarship", "Course") and a `TargetId`.
- **Lazy Hydration**: When rendering the Vault, the system fetches the list of saved IDs locally, and then issues batch queries to the respective bounded contexts (via read models) to hydrate the visual details (titles, images, current status).
- **Status Tracking**: If a saved scholarship expires or a saved course is deprecated, the hydration engine detects the state change and automatically updates the visual representation in the student's vault (e.g., marking it as "Unavailable").

## 15.A.10 Timeline Architecture

The Personal Timeline is an append-only architectural construct representing the student's historical journey.

- **Event Projection**: The Timeline is built by projecting enterprise integration events. When a `CertificateIssued` event is received via the Enterprise Service Bus, a corresponding `TimelineEntry` is generated.
- **Categorization & Filtering**: Timeline entries are strongly typed and categorized (Academic, Administrative, System), allowing the UI to offer rich filtering and infinite scrolling capabilities.
- **Immutability**: Timeline entries are historically immutable. If an error occurred upstream, a compensating event (e.g., `CertificateRevoked`) is projected as a new timeline entry rather than deleting the original.

## 15.A.11 Recommendation Architecture

The Personal Recommendation View is a specialized projection designed to surface relevant opportunities. In compliance with MANARATAK Enterprise Architecture, the Enterprise AI Platform is the single owner of all Artificial Intelligence capabilities.

- **Data Consumption**: It consumes pre-computed recommendation lists generated exclusively by the Enterprise AI Platform. The Student Platform is strictly a consumer and does _not_ execute machine learning algorithms, manage prompts, or perform model orchestration.
- **Presentation Logic**: The platform is responsible only for taking the recommended `EntityIds`, hydrating them via read models, and presenting them contextually (e.g., "Based on your interest in Engineering").
- **Feedback Loop**: Interactions with recommendations (Clicks, Saves, Dismissals) generate telemetry events that are published back to the Enterprise AI Platform to refine future suggestions.

## 15.A.12 Dashboard Personalization

The Dashboard Personalization engine allows students to control their digital environment.

- **Layout Engine**: Stores the spatial arrangement (grid coordinates, visibility toggles) of widgets within the `DashboardLayout` aggregate.
- **Client-Side Rendering Coordination**: The backend serves a JSON structure defining the layout; the client-side framework acts as the rendering engine, adhering strictly to the prescribed configuration.
- **Theme and Accessibility**: Stores preferences for high-contrast modes, typography scaling, and dark/light themes, ensuring consistency across all MANARATAK touchpoints.

## 15.A.13 Workspace Layout

The Workspace Layout defines the structural hierarchy of the application shell.

- **Student Navigation**: A unified side or top navigation bar that remains persistent, providing quick access to the Hub, Vault, Journey, and Control Center.
- **Contextual Sidebars**: Dynamic regions of the layout that surface Quick Actions (e.g., "Resume Course", "Contact Support") based on the current context of the main view.
- **Responsive Adaptation**: The layout engine is fundamentally responsive, storing mobile-specific vs. desktop-specific widget arrangements if necessary.

## 15.A.14 Privacy Architecture

Privacy is enforced at the architectural root of the domain.

- **Data Minimization**: The Student Platform stores only the minimum necessary data to render the workspace. It does not duplicate sensitive PII or academic transcripts natively.
- **Consent Management**: Integrates with the Identity Platform to ensure that tracking, analytics, and recommendation features are strictly gated behind explicit user consent flags.
- **Visibility Controls**: Determines which elements of the student's profile or achievements are visible to external entities (e.g., recruiters or universities), projecting this configuration to the relevant public APIs.

## 15.A.15 Personal Settings

The Personal Settings module governs the administrative aspects of the student's relationship with the platform.

- **Notification Preferences**: A granular matrix allowing students to toggle push, email, or in-app notifications for specific event categories (Marketing, Academic, System).
- **Account Settings**: Deep linking to the Identity Platform for core credential management (Password resets, MFA configuration).
- **Localization**: Management of language, timezone, and regional formatting preferences, ensuring dates and currency are displayed correctly across all widgets.

## 15.A.16 Workspace Security

The workspace is protected by an unyielding security architecture.

- **Tenant Isolation**: While physically residing in a multi-tenant database schema, logically, every query enforces a `WHERE StudentId = @CurrentIdentity` policy. There are no APIs that allow listing or querying workspaces globally without elevated administrative roles.
- **Token Validation**: Every request to the Workspace API requires a valid JWT containing the `student` role claim.
- **Anti-Scraping**: Rate limiting and behavioral analysis protect the workspace APIs against automated enumeration or data harvesting attacks.

## 15.A.18 Enterprise Read Models

To maintain high performance and prevent cross-domain database joins, the Student Platform utilizes localized Enterprise Read Models.

- **Projection Strategy**: When a `CourseUpdated` event occurs in the Learning Platform, the Student Platform updates its own lightweight, denormalized read model of that course (e.g., storing only Title, Thumbnail, and Status).
- **Eventual Consistency**: The dashboard embraces eventual consistency. A change in a university's logo might take a few seconds to propagate to the student's Saved Universities list.
- **Resilience**: By relying on read models, the Student Platform remains functional even if the primary databases of the Learning or Scholarship domains experience an outage.

## 15.A.19 Student Journey Architecture

The architecture elegantly supports the entire lifecycle without owning the transactional workflows.

1.  **Discovery**: A student searches and saves a scholarship. The Student Platform creates a `SavedItem` record.
2.  **Application**: The student applies. An external registration/scholarship application process handles the workflow. The Student Platform listens for a generic downstream status event (e.g., `ScholarshipApplied`) to update the Timeline.
3.  **Learning**: The student enrolls in a prerequisite course. Phase 13 handles the learning. The Student Platform projects the progress into the Hub widget.
4.  **Completion**: Phase 14 issues a certificate. The Student Platform receives the `CertificateIssued` event, adds an Achievement widget, and updates the Timeline.
5.  **Continuous Engagement**: The Enterprise AI Platform analyzes this history and provides new recommendations, displayed seamlessly in the Student Workspace.

## 15.A.20 Performance & Scalability

As the most heavily trafficked interface in the MANARATAK ecosystem, the Student Platform is engineered for extreme scale.

- **Aggressive Caching**: Read models for static or slowly changing data (e.g., Hydrated University Profiles) are cached in Redis.
- **Lazy Loading**: Non-critical dashboard widgets (e.g., Recommendations) are loaded asynchronously after the core Hub layout is painted, ensuring rapid Time-to-Interactive (TTI).
- **Read Optimization**: Database indexes are highly optimized for queries filtering by `StudentId` and `Timestamp`, supporting instant retrieval of the Personal Timeline.
- **Stateless APIs**: The API layer is completely stateless, allowing horizontal scaling across container orchestration platforms to handle massive spikes during enrollment or graduation seasons.

## 15.A.21 Enterprise Architecture Review

**Architectural Validation**

- [x] **Single Source of Truth**: Verified. The platform exclusively uses read models and references; it does not duplicate transactional ownership of external entities.
- [x] **Event-Driven Resilience**: Verified. Implementation of the Inbox/Outbox pattern ensures eventual consistency without distributed transactions.
- [x] **Workspace Isolation**: Verified. Tenant boundaries are strictly enforced at the query and API layers.
- [x] **Performance Metrics**: Verified. BFF aggregation and caching strategies support sub-second dashboard rendering requirements.

**Official Architecture Status**

- **Phase:** 15 (Enterprise Student Platform)
- **Status:** Baselined Architecture Specification
- **Version:** 1.0.0
- **Classification:** ENTERPRISE CONFIDENTIAL

## 15.A.22 Student Workspace State Machine

The lifecycle of the Student Workspace is strictly governed by a deterministic architectural state machine, ensuring precise control over data synchronization and user access.

- **Not Created**: The baseline state before the student identity is fully provisioned by the Identity Platform. The workspace does not exist in the read models.
- **Initializing**: A transient state triggered by the `StudentIdentityCreated` event. During this phase, the workspace provisions default layouts, establishes the timeline stream, and synchronizes initial preferences. User access is blocked until initialization completes.
- **Active**: The standard operational state. The workspace actively consumes ecosystem events, synchronizes read models, and permits full read/write operations for personalization and saved collections.
- **Suspended**: A restricted state activated by a `StudentIdentitySuspended` event. The workspace ceases real-time event synchronization. Read operations (e.g., viewing past certificates) may be permitted depending on the suspension policy, but all write operations (e.g., saving items, updating layouts) are strictly forbidden.
- **Archived**: The terminal state triggered by a `StudentIdentityArchived` event. The workspace is cryptographically locked and removed from active read models. Synchronization halts completely. Recovery from this state requires explicit administrative intervention.

## 15.A.23 Workspace Modules Registry

To maintain enterprise isolation and modularity, the Student Workspace is composed of strictly defined modules, each governed by its own boundary and projection rules.

- **Dashboard Module**: Purpose: Serves as the aggregation hub for the workspace. Owner Domain: Student Platform. Dependencies: All other MANARATAK platforms. Visibility: Private. Consumes read models for widgets.
- **Timeline Module**: Purpose: Presents an append-only ledger of the student's historical journey. Owner Domain: Student Platform. Consumes: Enterprise integration events (`CertificateIssued`, `ScholarshipApplied`).
- **Saved Items Module**: Purpose: Manages personal bookmarks and favorites. Owner Domain: Student Platform. Dependencies: Scholarship, University, and Course read models for lazy hydration.
- **Recommendations Module**: Purpose: Surfaces personalized opportunities. Owner Domain: Student Platform. Dependencies: Enterprise AI Platform datasets. Consumes no events directly, relies on pre-computed models from the Enterprise AI Platform.
- **Quick Actions Module**: Purpose: Provides context-aware shortcuts. Owner Domain: Student Platform. Dependencies: Recent activity logs and active educational references.
- **Settings & Privacy Module**: Purpose: Manages localized UI preferences and data visibility. Owner Domain: Student Platform. Security Scope: High (requires explicit consent logs).
- **Notifications Module**: Purpose: Displays targeted alerts and system messages. Owner Domain: Notification Platform (Projected to Student Platform).
- **History & Statistics Module**: Purpose: Aggregates personal telemetry and usage data. Owner Domain: Student Platform. Consumes: Internal workspace events and learning progress updates.

## 15.A.24 Dashboard Widget Lifecycle

Widgets within the dashboard operate independently, following a strict lifecycle designed to optimize performance and prevent cascading failures.

- **Installed**: The widget is available in the enterprise registry but not yet active in the student's workspace.
- **Enabled**: The widget is actively provisioned into the `DashboardLayout` aggregate. During this transition, the widget initiates its initial data fetch and subscribes to relevant real-time updates.
- **Hidden**: The widget remains enabled and synchronized in the background but is removed from the visual layout due to personalization preferences or contextual logic.
- **Disabled**: The widget is entirely deactivated for the workspace. It ceases data synchronization, drops WebSocket subscriptions, and flushes local caches.
- **Removed**: The widget is purged from the `DashboardLayout` configuration completely. Restoration requires the student to explicitly re-enable the widget from the module registry.

## 15.A.25 Saved Collections Architecture

The Saved Collections architecture extends the foundational Saved Items module by introducing logical grouping, enabling a rich organizational hierarchy within the student's vault.

- **Personal Collections**: User-defined folders allowing students to group items arbitrarily (e.g., "Dream Universities", "Master Programs"). These are owned exclusively by the Student Platform.
- **Folder Organization**: Collections support a flat hierarchical structure. Each collection acts as a metadata wrapper containing an array of polymorphic `SavedItem` references.
- **Smart Collections**: Automatically generated, rule-based groupings (e.g., "Expiring Scholarships", "Recent Courses"). These collections are dynamic read models continuously updated by the backend engine without direct user intervention.
- **Favorite Collections**: A specialized global collection providing high-priority indexing for quick access across all devices and widgets.

## 15.A.26 Dashboard Composition Engine

The Dashboard Composition Engine is the architectural core responsible for aggregating, placing, and rendering widgets into a unified interface without violating domain boundaries.

- **Widget Aggregation**: Concurrently fetches the required view models from various bounded contexts via the BFF layer to assemble the full dashboard payload.
- **Layout Generation**: Computes the final rendering layout by merging the enterprise default template with the student's personalized `DashboardLayout` aggregate.
- **Fallback Strategy**: Implements strict circuit breakers. If a specific widget's data source times out, the engine yields a pre-defined fallback skeleton for that widget, ensuring the overall dashboard continues to render.
- **Dependency Resolution**: Ensures that foundational widgets (e.g., the Identity summary) are prioritized in the rendering order over secondary widgets (e.g., Recommendations).
- **Performance Optimization**: Utilizes fragment caching in Redis to serve previously aggregated widget models while hydrating real-time components asynchronously.

## 15.A.27 Workspace Snapshot Architecture

Workspace Snapshots provide a deterministic mechanism for capturing the exact configuration and layout of a student's environment at a specific point in time. Crucially, snapshots are NOT data backups; they capture configuration, not the underlying domain data.

- **Purpose**: Enables the student to experiment with dashboard layouts and easily revert to a previously known good configuration.
- **Snapshot Lifecycle**: Snapshots are created on-demand or automatically prior to major platform updates. They are stored immutably within the workspace aggregate.
- **Restoration and Rollback**: Applying a snapshot simply overwrites the active `DashboardLayout` and presentation preferences. It does not alter the underlying Timeline, Saved Items, or read models.
- **Synchronization Recovery**: Snapshots provide a reliable recovery vector if cross-device synchronization encounters unresolvable layout conflicts, allowing the system to revert to the last synchronized state.

## 15.A.28 Cross Device Synchronization

The Student Platform is inherently multi-device, requiring robust enterprise architecture to ensure eventual consistency across Desktop, Tablet, and Mobile environments.

- **Layout Synchronization**: The `DashboardLayout` aggregate maintains device-specific view models (e.g., a 3-column layout for desktop, a 1-column layout for mobile) that are synchronized independently.
- **Preferences Synchronization**: User preferences (e.g., Dark Mode) are globally synchronized in near real-time, propagating instantly across all active sessions.
- **Widget Synchronization**: The internal state of widgets (e.g., an expanded accordion or active tab) is synchronized using lightweight operational transforms to provide a seamless continuous experience.
- **Conflict Resolution**: In the event of simultaneous modifications from different devices, the platform employs a "last-write-wins" strategy based on precise server-side timestamps.

## 15.A.29 Offline Experience Architecture

The platform provides a resilient, limited offline experience designed to retain productivity and engagement during intermittent connectivity.

- **Cached Dashboard**: Critical dashboard read models are persisted in local browser storage (IndexedDB/Service Workers). Upon offline launch, the Dashboard Composition Engine renders the last known state.
- **Cached Timeline & Statistics**: The Personal Timeline and Personal Analytics are aggressively cached on the client, allowing the student to review their historical journey without an active connection.
- **Cached Saved Items**: The student can browse their Vault and view previously hydrated `SavedItem` metadata while offline.
- **Synchronization**: Actions taken offline (e.g., dismissing a notification, rearranging a layout) are stored in a local mutation queue. Upon reconnection, the platform automatically replays these commands to the server, achieving eventual consistency.

## 15.A.30 Quick Actions Engine

The Quick Actions Engine is a highly optimized, context-aware subsystem that surfaces the most relevant commands to the student based on their current state in the MANARATAK ecosystem.

- **Generation**: Actions are generated dynamically by evaluating the student's recent activity stream and active domain states (e.g., an incomplete course registration triggers a "Continue Learning" action).
- **Prioritization**: The engine utilizes an internal scoring algorithm to rank actions. Urgent, time-sensitive actions (e.g., "Complete Registration Before Deadline") receive the highest priority.
- **Personalization**: Quick Actions adapt to user behavior. If a student frequently views the Scholarships portal, the engine promotes related shortcuts to the top of the sidebar.
- **Security**: Quick Actions strictly respect enterprise boundaries. Generating an action (e.g., "Open Certificate") is only possible if the underlying read model verifies the student's access permissions.

## 15.A.31 Dashboard Cards Architecture

Dashboard Cards represent discrete, domain-specific visual artifacts within the dashboard, distinct from the structural Widgets that contain them.

- **Responsibilities**: A Card is responsible solely for presenting a single, atomic entity (e.g., a specific Learning Card representing one active course).
- **Lifecycle and Aggregation**: Cards are instantiated by their parent Widgets. For example, the "Active Scholarships" Widget fetches a read model and instantiates a sequence of "Scholarship Cards".
- **Rendering and Personalization**: Cards are highly optimized for rendering performance. They support personalized visual states (e.g., a "New Update" badge) derived directly from the underlying read model, ensuring consistent styling across the entire workspace.

## 15.A.32 Workspace Search Architecture

The Workspace Search Engine provides a localized, highly secure index dedicated entirely to the student's private data, isolated completely from the global MANARATAK catalog search.

- **Indexing Strategy**: The search engine maintains a localized Elasticsearch (or equivalent) index populated specifically with the student's Saved Items, Timeline entries, and History. This index is strictly partitioned by `StudentId`.
- **Search Scope**: Queries executed within the workspace only traverse the student's private index, allowing instant retrieval across Learning Progress, Certificates, Saved Collections, and Personal Preferences.
- **Privacy Execution**: By isolating the index, the architecture guarantees that a student's search queries can never accidentally expose data belonging to other users or internal system records.

## 15.A.33 Personal Analytics Architecture

Personal Analytics provides the student with deep, private insights into their own educational journey through aggregated telemetry.

- **Ownership and Privacy**: All analytical data is owned entirely by the student. The platform projects these statistics for personal motivation and reflection, strictly isolating them from public profiles.
- **Aggregation Rules**: The engine aggregates data asynchronously, compiling Learning Statistics (hours studied, courses completed), Scholarship Statistics (saved opportunities, deadline alerts), and Activity Statistics (login frequency).
- **Visualization**: The data is projected into lightweight read models consumed by the Dashboard Composition Engine to render Progress Indicators and Achievements without performing heavy computational queries during page load.
- **Enterprise Boundaries**: The Analytics engine respects the Single Source of Truth by deriving all insights exclusively from the enterprise event stream (e.g., `LessonCompleted`, `ScholarshipApplied`), never directly querying the databases of other bounded contexts.

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

- [x] Requirements met?
- [x] Dependencies validated?
- [x] Security reviewed?
- [x] Performance criteria defined?

### ARB Decision

- **Status:** Baselined Architecture Specification
- **Date:** 2026-07-24
- **Approver:** ARB

### Status

- **Current Status:** Baselined Architecture Specification
