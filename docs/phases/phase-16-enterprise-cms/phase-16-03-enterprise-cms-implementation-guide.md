> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 16 Enterprise CMS Platform

## Part C - Implementation Guide

### 16.C.1 Architecture Overview

**Architectural Commentary**
The Enterprise CMS Platform is implemented using a strictly enforced Clean Architecture combined with CQRS (Command Query Responsibility Segregation). The Write Model (Commands) handles editorial workflows, versioning, and state transitions using Domain-Driven Design (DDD) principles and Prisma ORM. The Read Model (Queries) provides ultra-fast headless content delivery via a globally distributed caching tier with high-performance direct database queries or raw SQL queries on PostgreSQL using the database pool alongside Redis, ensuring high throughput for consumer-facing portals.

### 16.C.2 Folder Structure

**Architectural Commentary**
The solution strictly adheres to the enterprise standard organization, preventing coupling between business logic and infrastructure delivery mechanisms.

```text
src/
├── domain/            # Core DDD Entities, Value Objects, Domain Events
├── application/       # CQRS Handlers, Validators, DTOs, Mapping
├── infrastructure/    # Prisma ORM client, Redis Cache, Message Bus
├── presentation/api/  # REST/GraphQL Delivery, Express routes, Middleware
├── workers/           # Background indexing, BullMQ event consumers, scheduled publishing
└── prisma/            # Database schema definitions and migrations
```

### 16.C.3 Namespace Organization

**Architectural Commentary**
Namespaces map exactly to the physical directory structure and bounded context boundaries, ensuring clear intent and avoiding circular dependencies.

```typescript

```

### 16.C.4 Aggregate Implementation Strategy

**Architectural Commentary**
`ContentNode` serves as the Aggregate Root. All localized payloads, snapshots, and lifecycle changes must be orchestrated through the `ContentNode` to guarantee invariant consistency. Prisma ORM configures these aggregates using the standard `schema.prisma` definition file rather than inline annotations.

```prisma
// Example Aggregate Root Prisma Configuration
model ContentNode {
  contentId          String             @id @default(uuid())
  defaultSlug        String             @unique
  contentType        String
  localizedPayloads  LocalizedContent[] @relation("NodeToPayloads")
}
```

### 16.C.5 Entity Implementation Strategy

**Architectural Commentary**
Concrete entities (e.g., `Article`, `Page`, `LandingPage`) implement their respective Part B contracts (e.g., `IArticle`). They employ TypeScript factory methods for domain instantiation to encapsulate validation logic.

### 16.C.6 Value Object Implementation Strategy

**Architectural Commentary**
Structural sub-components like `ISeoMetadata` and `IOpenGraphMetadata` are implemented as TypeScript type/interface definitions (ensuring structural validation) and stored as JSON or inline columns within Prisma schemas to persist flatly alongside the aggregate within the relational table.

### 16.C.7 Repository Implementation Strategy

**Architectural Commentary**
The Write repositories implement pure Domain interfaces (e.g., `IContentNodeRepository`) and rely on Prisma ORM. Read repositories return lightweight Application DTOs utilizing optimized raw SQL queries or lightweight Prisma Client queries against SQL Read Replicas, completely avoiding complex change tracking for maximum performance.

### 16.C.8 Domain Service Implementation Strategy

**Architectural Commentary**
Stateless domain logic that spans multiple aggregates (e.g., verifying canonical uniqueness across nodes or resolving cross-references) is implemented in stateless Domain Services. These services execute purely in memory and do not invoke external infrastructure.

### 16.C.9 Application Service Implementation Strategy

**Architectural Commentary**
Express/Awilix orchestrates all application logic. An Application Service (Command Handler) coordinates the loading of an aggregate from the Repository, invoking Domain logic, saving the result, and dispatching Domain Events.

### 16.C.10 CQRS Implementation

**Architectural Commentary**
The system physically separates the Command processing pipeline from the Query pipeline.

- **Commands:** Mutate state. Validated by Zod. Orchestrated by Express/Awilix. Committed via Unit of Work.
- **Queries:** Read state. Executed via Express/Awilix directly against Read Replicas and Redis, returning strongly-typed View Models.

### 16.C.11 Command Handlers

**Architectural Commentary**
Commands are rich objects capturing user intent. E.g., `SubmitForReviewCommand` or `PublishContentCommand`. Handlers are isolated, single-responsibility classes.

```typescript
export class PublishContentCommandHandler {
  public async handle(command: PublishContentCommand): Promise<Result> {
    // Implementation fetches Node, triggers transition, generates Snapshot, commits transaction.
  }
}
```

### 16.C.12 Query Handlers

**Architectural Commentary**
Queries define the requested delivery shape. E.g., `GetLocalizedArticleQuery`. Handlers first check the Redis distributed cache. On a cache miss, they query the Read Replica via Prisma or raw SQL and hydrate the cache.

### 16.C.13 Validation Strategy

**Architectural Commentary**
Validation occurs in two phases:

1. **Application Validation:** Zod runs via a Express/Awilix pipeline behavior, ensuring commands are structurally sound (e.g., non-null identifiers, valid dates).
2. **Domain Validation:** Entities enforce business invariants (e.g., "Cannot publish without an active Maker-Checker approval").

### 16.C.14 Workflow Engine Integration

**Architectural Commentary**
The `PublishingState` transitions are managed via a robust state machine within the Aggregate. The CMS implements strict Maker-Checker governance. The Maker submits; the Checker (a different user ID) approves. Transitions emit events like `IWorkflowReviewRequested`.

### 16.C.15 Versioning Engine Integration

**Architectural Commentary**
Every transition to `Published` automatically triggers the Versioning Engine. The engine serializes the current state of the `ILocalizedContent` into JSON, stamping it with an incremental version number, timestamp, and author, storing it durably as an `IContentSnapshot`.

### 16.C.16 Localization Engine Integration

**Architectural Commentary**
Content is structured natively for global delivery. The base `ContentNode` holds the stable slug, while the `LocalizedPayloadReferences` maps locale codes (e.g., `en-US`, `ar-SA`) to localized data. Fallback resolution strategies are executed at the Query tier if a requested locale is missing.

### 16.C.17 SEO Engine Integration

**Architectural Commentary**
SEO is not an afterthought; it is structurally embedded. The API delivery tier intercepts SEO metadata from the requested payload and formats it natively for Headless SSR (Server-Side Rendering) consumers, automatically managing Canonical URLs, hreflang tags, and OpenGraph hydration.

### 16.C.18 Content Block Composition

**Architectural Commentary**
Phase 16 owns CMS-managed editorial block schemas and content payload definitions consumed by Phase 24 during public page composition. The CMS manages editorial content blocks and metadata schemas, while the final page composition, routing, and visual layout assembly are strictly owned by Phase 24 — Enterprise Public Platform. The front-end layout engine interprets the CMS block configurations and binds them to the approved design system.

### 16.C.19 Widget Configuration Provider

**Architectural Commentary**
For `IDynamicWidget` configurations (e.g., displaying a Course Catalog inside an Article), the CMS backend stores only the widget's metadata and JSON parameters. Phase 24 resolves this config at runtime, querying the respective domain's Read Models (e.g., Course Read Models from Phase 13) to render the widget contextually.

### 16.C.20 Media Asset References

**Architectural Commentary**
The CMS does not process binary files, upload images, or own physical media assets. It references media assets purely via stable `AssetId` and `AssetReference` handles managed by Phase 05 — Enterprise Asset Platform (EAP). It completely avoids storage or path ownership.

### 16.C.21 Search and Indexing Integration

**Architectural Commentary**
The CMS does not run a search engine or own a Search Platform. Upon publishing, the CMS emits content publication events (e.g., `IContentPublished`) to notify search indexes, and exposes read models or editorial metadata for authorized indexing consumers.

### 16.C.22 Cache Strategy

**Architectural Commentary**
A Distributed Redis Cache is positioned in front of all Query Handlers. Cache keys are structured hierarchically: `cms:content:{locale}:{contentId}`. When `IContentPublished` or `IContentArchived` events are handled, the cache invalidation worker clears the specific targeted keys.

### 16.C.23 Event Publishing

**Architectural Commentary**
Upon a successful Prisma ORM transaction commit, the Outbox Pattern is utilized to guarantee delivery of Domain Events (e.g., `IContentPublished`) to the Enterprise Event Bus (BullMQ / Redis / Kafka) for external downstream consumption.

### 16.C.24 Event Consumers

**Architectural Commentary**
Consumers exist within the background `workers` folder. They listen for cross-domain events (e.g., `CategoryRenamed` or `AuthorUpdated`) to automatically invalidate affected content cache entries, maintaining eventual consistency without tight coupling.

### 16.C.25 Security Implementation

**Architectural Commentary**
All editorial API endpoints require a valid JWT issued by the Enterprise Identity Provider (IdP). Consumer delivery endpoints (Headless APIs) require an API Key or Client Credentials to prevent unauthorized scraping of unlisted content.

### 16.C.26 Authorization Strategy

**Architectural Commentary**
Role-Based Access Control (RBAC) maps to Claims.

- `cms.editor`: Can draft and submit.
- `cms.publisher`: Can approve and execute Maker-Checker workflow.
- `cms.admin`: Full bypass rights for emergency publishing.

### 16.C.27 Audit Logging

**Architectural Commentary**
All mutable commands execute through an Express/Awilix Audit pipeline behavior that logs the UserId, Command Type, Timestamp, and Payload to a secure Append-Only Audit Store (e.g., OpenTelemetry or a dedicated Audit Database with structured JSON logs).

### 16.C.28 Extension Points

**Architectural Commentary**
The API supports webhooks. External systems can subscribe to `ContentPublished` events to trigger static site generators (e.g., Next.js ISR) or notify third-party syndication networks (e.g., RSS feeds).

### 16.C.29 Future Scalability

**Architectural Commentary**
The architecture natively supports GraphQL implementation over the Read Model to allow front-end applications to query exact data requirements. The stateless nature of the API tier allows horizontal scaling via Kubernetes (K8s) or Cloud Run.

### 16.C.30 Navigation Implementation Strategy

**Architectural Commentary**
Navigation structures are managed as independent aggregates, separate from the content nodes they link to. The API delivery tier provides a highly cached `/api/v1/navigation/{site}/{location}` endpoint that resolves `INavigationMenu` to a nested JSON tree, dynamically computing active routes and injecting cross-domain links.

### 16.C.31 Reusable Component Implementation Strategy

**Architectural Commentary**
Reusable components (Content Blocks) are implemented as headless JSON fragments adhering to predefined JSON Schemas. They are managed in a centralized Component Library within the CMS. When a page is composed, the CMS saves a reference (BlockId) rather than duplicating the payload. The rendering engine recursively hydrates these references during page delivery.

### 16.C.32 Content Distribution Implementation

**Architectural Commentary**
Content distribution leverages a headless architecture. The CMS operates purely as a content API (REST/GraphQL).

- **Web/Mobile:** Front-end applications (React, Flutter) fetch structured JSON via Edge-cached delivery endpoints.
- **Partner Integrations:** Content is securely exposed via authenticated Webhooks and syndication feeds (RSS/JSON-Feed) using an Enterprise API Gateway.

### 16.C.33 Multi-Site Implementation Strategy

**Architectural Commentary**
Multi-site capabilities are governed by a `SiteIdentifier` partitioning key on the Aggregate Root.

- **Isolation:** Each site acts as a logical tenant for content resolution, with its own specific Domain, Navigation, and Theme configurations.
- **Shared Content:** Content nodes can be published globally or restricted to specific `SiteIdentifier` instances.
- **Routing:** The delivery API resolves the requested site via the `Host` header or explicit tenant ID in the request payload.

### 16.C.34 Multi-Tenant Readiness Strategy

**Architectural Commentary**
While initially deployed for a single enterprise, the architecture is designed with inherent multi-tenant readiness to support future enterprise scalability.

- **Tenant Context Resolution:** Every request is deterministically resolved to a specific tenant context at the enterprise boundary.
- **Tenant Isolation Strategy:** The foundation employs logical partitioning across all shared infrastructure. Data persistence, search indices, and distributed caches strictly enforce tenant boundaries, guaranteeing robust cross-tenant isolation.
- **Tenant Provisioning Readiness:** This structural readiness ensures seamless future tenant provisioning and configuration without requiring architectural rewrites or significant refactoring.

### 16.C.35 Plugin Implementation Strategy

**Architectural Commentary**
The CMS ensures enterprise extensibility through a robust, decoupled Plugin Architecture.

- **Plugin Lifecycle & Registration:** The system supports dynamic plugin discovery, validation, and registration during runtime loading.
- **Capability Extension:** Plugins can securely register new schema definitions, inject custom workflow validation rules, or expand editorial capabilities via explicitly defined extension points.
- **Module Isolation:** All extensions operate within strict module boundaries. This ensures that custom capability extensions augment the platform without compromising the core stability, security, or enterprise governance of the CMS foundation.

### 16.C.36 AI Integration Strategy

**Architectural Commentary**
In absolute compliance with the MANARATAK Enterprise Architecture, the Enterprise AI Platform is the single owner of all Artificial Intelligence capabilities. The CMS is strictly an AI Consumer.
The CMS does NOT implement AI orchestration, manage prompts, or execute local model workflows.

- **Drafting & Summarization:** The editorial UI delegates to the Enterprise AI Platform (via standard APIs) to generate drafts.
- **Translation:** Async workflows trigger external requests to the Enterprise AI Platform for translation, consuming the result and saving it as a `Draft` locale payload.
- **Governance:** All AI-generated content remains strictly advisory and is mandated to pass the standard human Maker-Checker approval workflow before transitioning to `Published`.

### 16.C.37 Performance Strategy

**Architectural Commentary**

1. **Prisma ORM Split Queries:** Used for deep aggregate loading to avoid Cartesian explosion.
2. **Read Replicas:** Delivery queries connect via a `ReadOnlyConnection` string.
3. **Pagination:** Offset/Keyset pagination is enforced universally on collection endpoints.

### 16.C.38 Testing Strategy

**Architectural Commentary**

- **Unit Tests:** Vitest for all Domain logic, Entity state transitions, and Zod rules.
- **Integration Tests:** Testcontainers (PostgreSQL + Redis) verify Prisma ORM mappings, Repository behavior, and Express/Awilix pipeline execution.

### 16.C.Final Implementation Review Checklist

**Architectural Commentary**
This serves as the official Tollgate for architecture validation before code is authorized for production deployment.

- [ ] Alignment with Phase 16 Part A — All layers and components match the architectural specification.
- [ ] Alignment with Phase 16 Part B — Implementation strictly uses the defined Contracts without modification.
- [ ] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [ ] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [ ] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [ ] Foundation Reuse Verification — Every consumed phase is verified as a loose integration.
- [ ] Dependency Inversion — Infrastructure and Delivery depend on Application and Domain, never the reverse.
- [ ] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.**

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

**Status:** Baselined Architecture Specification

---

## Navigation

- **Previous:** [Phase 15 — Enterprise Student Platform](../phase-15-enterprise-student-platform/phase-15-03-implementation-guide.md) (or corresponding baseline)
- **Next:** [Phase 17 — Enterprise AI Platform](../phase-17-enterprise-ai/phase-17-03-implementation-guide.md) (or corresponding baseline)
