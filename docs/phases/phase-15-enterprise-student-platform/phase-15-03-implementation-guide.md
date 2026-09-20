> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 15 Enterprise Student Platform

### Navigation
- **Previous:** [Phase 14 — Enterprise Certificates Platform](../phase-14-enterprise-certificates-platform/phase-14-01-enterprise-architecture-specification.md)
- **Next:** [Phase 16 — Enterprise CMS](../phase-16-enterprise-cms/phase-16-01-enterprise-architecture-specification.md)

## Part C - Implementation Guide

### 15.C.1 Executive Summary

**Architectural Commentary**
This document provides the definitive implementation guide for **Phase 15 (Enterprise Student Platform)**. It translates the architectural requirements of Part A and the rigid boundaries of Part B into concrete enterprise integration patterns, architectural workflows, and deployment topologies.

### 15.C.2 Technology Stack

**Architectural Commentary**

- **Runtime Environment**: Node.js 22.16.0 (`>=22.16.0 <23`) with TypeScript
- **Web API Framework**: Express.js for BFF/Presentation API Layer
- **Primary Persistence**: Prisma with PostgreSQL (Workspace State, Configurations, Timeline)
- **Background Workers & Queue Management**: BullMQ with Redis (for asynchronous inbox/outbox relays, timeline ingestion, and statistics processing)
- **Distributed Cache & Real-time State**: Redis (for Quick Actions, Recent Activity, and Recently Viewed caches)
- **Distributed Tracing & Metrics**: OpenTelemetry API & SDK Integration
- **Structured Logging**: Winston / Pino emitting structured JSON logs compatible with standard Node.js aggregators

### 15.C.3 Project Structure

**Architectural Commentary**
The platform is strictly organized using Clean Architecture principles to isolate domain business logic from infrastructure dependencies.

```text
enterprise-student-workspace/
├── src/
│   ├── contracts/             # (Part B Definitions & Interfaces)
│   ├── domain/                # Pure Domain Aggregates and Business Rules
│   │   ├── entities/          # Workspace, DashboardLayout, SavedItem
│   │   ├── value-objects/     # WidgetPosition, ThemePreference, PrivacySettings
│   │   └── events/            # Internal Domain Events
│   ├── application/           # CQRS Use Cases and Orchestration
│   │   ├── commands/          # Mutative Workflows (e.g., UpdateDashboard)
│   │   ├── queries/           # Read Model Retrievals (e.g., GetDashboard)
│   │   └── event-handlers/    # Enterprise Integration Consumers
│   ├── infrastructure/        # Concrete Technical Implementations
│   │   ├── persistence/       # Prisma Clients and Repository Implementations
│   │   ├── caching/           # Redis Cache Strategies
│   │   └── integrations/      # Anti-Corruption Layers for Upstream Read Models
│   └── presentation/          # Entry Points
│       ├── api/               # Express.js REST API (High Availability)
│       └── workers/           # BullMQ Background Event Consumers
├── prisma/
│   └── schema.prisma          # Database Schema Definition
├── package.json
└── tsconfig.json
```

### 15.C.4 Workspace Initialization & Lifecycle

**Architectural Commentary**

- **Workspace Initialization**: The workspace is initialized strictly via an asynchronous choreography pattern. When the upstream platform publishes a `StudentIdentityCreated` event, the Phase 15 Inbox processor triggers an internal `InitializeWorkspace` command. This seeds the root aggregate, provisions the default `DashboardLayout`, and establishes baseline preferences, ensuring zero synchronous blockage during user registration.
- **Workspace Lifecycle**: State transitions are governed by the Enterprise Lifecycle Framework. A workspace moves linearly between `Initializing`, `Active`, `Suspended`, and `Archived`. Suspension implicitly disables all mutative command handlers via strict authorization policies while optionally preserving read-only access to historical data.
- **Workspace Snapshots**: Implemented as immutable, point-in-time serialized captures. When a snapshot is commanded, the current `DashboardConfiguration` is frozen, serialized to a standardized representation, and appended to the snapshot ledger. Restoration involves overriding the active `DashboardLayout` aggregate with the preserved snapshot payload.
- **Cross-device Synchronization**: Device state synchronization utilizes optimistic concurrency and delta payloads. When a layout change occurs on one device, the presentation layer pushes a delta update to the command handler. Upon successful commit to the database, a `DashboardUpdated` domain event is published. A real-time gateway consumes this event and pushes real-time streaming updates to all other active sessions bound to that specific `WorkspaceId`.

### 15.C.5 Dashboard & Widget Orchestration

**Architectural Commentary**

- **Dashboard Composition**: The `DashboardLayout` acts as a pure structural aggregate. It is strictly forbidden from persisting external domain data. It manages widget arrangements and coordinates layout configurations across device targets (Desktop, Tablet, Mobile).
- **Widget Management**: Widgets represent modular presentation boundaries. The `WidgetConfiguration` is persisted as a schemaless structure within the persistence layer, allowing UI presentation rules and feature flags to evolve independently of the backend schema.
- **Constraint Enforcement**: The domain layer enforces strict mathematical validation on widget limits. This ensures that matrix boundaries are respected, preventing grid collisions, overlapping cards, or out-of-bounds placements before changes are committed to the repository.

### 15.C.6 Discovery & Navigation

**Architectural Commentary**

- **Quick Actions**: Action recommendations are generated via a background computational engine. It analyzes recent activity, upcoming deadlines (read from local Projections), and platform events to score and rank actions. The highest priority outcomes are materialized into a fast-read distributed cache for instant retrieval.
- **Recent Activity**: Implemented as a high-performance, short-lived bounded queue. To guarantee constant operational latency, once the predefined capacity (e.g., max 50 items) is reached, older items are evicted.
- **Recently Viewed**: Serves as a rolling index of specific external references. Implemented using an LRU (Least Recently Used) cache pattern backed by distributed memory to ensure extremely low latency.
- **Search History**: Search queries are logged to relational storage for behavioral tuning and autocomplete functionality. Strict adherence to the `IPrivacyPreference` aggregate dictates whether this log is completely ephemeral, anonymized, or retained for contextual recommendations.

### 15.C.7 Personalization & Curation

**Architectural Commentary**

- **Saved Items**: The bookmarking engine is inherently polymorphic. A `SavedItem` strictly relies on a `DomainType` and `EntityId` combination rather than duplicating upstream data.
- **Saved Collections**: To populate the UI for collections, the Application Layer orchestrates an aggregate query, joining local pointers against external Read Models (e.g., fetching `ICourseProjection` representations for saved courses).
- **Timeline**: An append-only ledger designed around event sourcing principles. As cross-domain integration events occur, background workers project these into immutable `TimelineEntry` records, establishing a centralized audit trail of the student's journey.
- **Personalization**: The `StudentPreference` aggregate serves as the global configuration root. All enterprise subsystems must respect these preferences. Updates are propagated via the Event Bus, allowing downstream platforms (e.g., Notification gateways) to cache and enforce the student's notification and privacy matrices.
- **Personal Statistics**: To prevent expensive transactional aggregate queries, metrics (e.g., total learning hours, completed courses, and active external workflow references) are recalculated incrementally via stream processing or scheduled background batch jobs, persisting the result in a denormalized `PersonalStatistics` record.

### 15.C.8 Persistence & Repository Guidance

**Architectural Commentary**

- **Repository Implementation Guidance**: Repositories act as the strict boundary between the Application and Infrastructure layers. They must exclusively accept and return domain interfaces. All ORM tracking, relational mapping, and database exceptions are completely encapsulated within the infrastructure implementation.
- **Transaction Boundaries**: Data mutations adhere to Aggregate Root transaction boundaries. A single command initiates one atomic database transaction wrapping exactly one aggregate (e.g., updating a widget wraps the entire `DashboardLayout` aggregate). Cross-aggregate updates within a single transaction are strictly prohibited.
- **Concurrency Handling**: Optimistic Concurrency Control (OCC) is enforced across all mutating operations. Every aggregate root incorporates a concurrency version token. Concurrent write attempts triggering a version mismatch will result in a concurrency exception, prompting a safe abort or UI conflict resolution.
- **Cache Strategy**: The platform employs a Read-Through cache strategy for high-frequency queries. Write operations utilize a Cache-Invalidation pattern to ensure the distributed cache remains strictly coherent with the relational single source of truth.

### 15.C.9 CQRS & Read Model Composition

**Architectural Commentary**

- **CQRS Implementation Guidance**: The architecture mandates strict physical or logical segregation between Commands and Queries. Commands are processed via imperative handlers that load, mutate, and save domain aggregates. Queries bypass the domain entirely, utilizing optimized read paths directly from the database or cache.
- **Read Model Composition**: To render rich UI views without synchronously calling upstream microservices, the Application Layer relies on local Projections. These flat models represent the minimum viable data required by the presentation layer.
- **Projection Updates**: Upstream state changes are consumed via Integration Events. For example, when an upstream domain publishes a course update, Phase 15’s event handlers asynchronously update its local course projection replica, ensuring Dashboard queries remain fast and highly available.

### 15.C.10 Event-Driven Architecture & Integration

**Architectural Commentary**

- **Event Driven Architecture Implementation**: The workspace operates completely asynchronously in relation to external enterprise domains, acting as both a consumer of upstream state changes and a producer of behavioral events.
- **Event Publishing**: Domain events generated by aggregate mutations are committed to a Transactional Outbox within the same database transaction. A separate relay process sweeps the Outbox and guarantees at-least-once delivery to the Enterprise Event Bus.
- **Event Consumption**: The platform utilizes the Enterprise Inbox pattern to record incoming integration events. This ensures absolute exactly-once processing and protects the Timeline and Statistics processors from duplicated messages.
- **Background Processing**: Heavy computational tasks, timeline ingestion, snapshot generation, and outbox relays operate as isolated background worker services. These scale independently of the synchronous API nodes based on queue saturation.

### 15.C.11 Resilience & Reliability

**Architectural Commentary**

- **Failure Recovery**: The platform leverages resilient retry policies with exponential backoff for transient dependencies (e.g., database timeouts, cache unavailability). Exhausted retries are routed to a Dead Letter Queue (DLQ) for operator triage, preventing queue blockage.
- **Security Considerations**: Strict enforcement of tenant isolation and ownership boundaries. Every query and command must validate that the authenticated context matches the requested `WorkspaceId`. Cross-workspace access is structurally denied at the Application Layer prior to execution.
- **Performance Considerations**: Latency is minimized by caching serialized dashboard layouts at the distributed edge. Database indexing is optimized exclusively for read-model lookups indexed heavily by `WorkspaceId`.

### 15.C.12 Enterprise Observability

**Architectural Commentary**

- **Monitoring**: Service Level Indicators (SLIs) focus on API response times, event ingestion lag, outbox processing depth, and distributed cache hit ratios.
- **Logging**: All logs are emitted in a structured format. The `WorkspaceId` and enterprise `CorrelationId` are mandatory tags appended to the logging context of every request and background process to ensure end-to-end trace mapping across platforms.
- **Observability**: Distributed tracing spans the full lifecycle of a user interaction, capturing the initial ingress request, database query execution times, outbox dispatch latency, and subsequent event consumption.

### 15.C.13 Quality Assurance & Deployment

**Architectural Commentary**

- **Testing Strategy**:
  - _Domain Tests_: Pure unit testing of business rules (e.g., testing grid placement constraints) with zero infrastructure dependencies.
  - _Integration Tests_: Validation of repository mappings, caching serialization, and Inbox/Outbox deduplication logic.
  - _Architecture Tests_: Automated enforcement of Clean Architecture dependency boundaries (e.g., ensuring Application does not reference Infrastructure).
- **Deployment Considerations**: The platform is packaged as stateless containers. The Presentation API layer scales horizontally based on concurrent HTTP requests, while the Background Worker layer scales based on message broker queue depth. Database schema migrations are executed via automated pipelines strictly prior to application deployment.

### 15.C.Final Implementation Review Checklist

**Architectural Commentary**
This serves as the official Tollgate for architecture validation before code is authorized for production deployment.

- [x] Alignment with Phase 15 Part A — All layers and components match the architectural specification.
- [x] Alignment with Phase 15 Part B — Implementation strictly uses the defined Contracts without modification.
- [x] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [x] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [x] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [x] Foundation Reuse Verification — Every consumed phase is verified as a loose integration.
- [x] Dependency Inversion — Infrastructure and Delivery depend on Application and Domain, never the reverse.
- [x] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.**
- **Phase 05 (Enterprise Asset Platform - EAP):** Resolves and renders all media, profile avatars, certificate previews, and thumbnails purely via immutable `AssetId` and `AssetReference` read models, completely avoiding physical storage path ownership.
- **Phase 11 — Universities & Institutions:** Consumes read-model representations of academic profiles for saved collections.
- **Phase 12 — Scholarships Platform:** Projects lightweight scholarship references on student widgets.
- **Phase 13 — Enterprise Learning Platform:** Listens to progress and completion events to update student activity streams and learning timeline entries.
- **Phase 14 — Enterprise Certificates Platform:** Integrates certificate read models for fast in-app dashboard queries.
- **Phase 16 — Enterprise CMS:** References CMS-managed content indexes via read models for curation widgets.
- **Phase 17 — Enterprise AI Platform:** Consumes pre-computed analytics and recommendations passively.
- **Phase 19 — Enterprise Finance & Payments Platform:** Interacts with transaction logs via event-driven status projections.
- **Phase 23 — Administration Portal:** Supports remote workspace administration, suspension, or archival controls.
- **Phase 24 — Enterprise Public Platform:** Strictly segregated from personal student portal workspaces.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

**Status:** Baselined Architecture Specification
