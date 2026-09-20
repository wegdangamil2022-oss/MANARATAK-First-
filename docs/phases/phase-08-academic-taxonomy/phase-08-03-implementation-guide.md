> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 08 Academic Taxonomy

## Part C – Implementation Guide

### 8.C.1 Database Strategy

**Architectural Commentary**
The taxonomy represents a foundational, read-heavy dataset subject to complex polyhierarchical queries. A robust database strategy is required to support high-performance traversal and relationship resolution without tightly coupling the domain to the persistence mechanism.

**WHY:**
The physical database strategy relies on normalized tables representing the canonical academic taxonomy entities, mapping tables for lateral relationships, and the indexing strategy required for performance.

**WHAT:**

- **Academic Taxonomy Tables:** Implementation shall map canonical entities (Fields, Disciplines, Programs, Specializations, Categories) to dedicated relational tables or tenant-isolated collections.
- **Mapping Tables:** Lateral semantic relationships (e.g., Equivalents, ReplacedBy) SHALL be persisted in dedicated intersection tables.
- **Indexing & Constraints:** The strategy mandates composite indexes on Canonical Public IDs, Standard Codes, and Status fields. Strict foreign key constraints must guarantee referential integrity.
- **Incremental Closure Maintenance & Transaction Boundaries:** All entity mutations and their corresponding closure updates MUST be enveloped within a single atomic transaction scoped to the specific aggregate root.

- **Phase 7.13 Generic Hierarchy & DAG Foundation:** The physical layer MUST strictly consume the Phase 7.13 infrastructure for all closure table operations. It SHALL NOT implement custom tree structures, custom DAG algorithms, or redundant closure tables.

The database strategy is strictly isolated to the persistence layer. The domain layer remains completely unaware of relational tables, foreign keys, or indexing strategies, adhering to Dependency Inversion.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.2 Entity Mapping

**Architectural Commentary**
An explicit mapping strategy ensures that the application domain remains agnostic of the database schema while maintaining canonical identity and extensibility across the enterprise.

**WHY:**
Implementation must map the abstract domain contracts to concrete entities that encapsulate business rules, lifecycle states, Value Objects, and inheritance strategies.

**WHAT:**

- **Aggregate Boundaries & Value Objects:** The Academic Taxonomy Entity serves as the Aggregate Root. Complex attributes MUST be implemented as immutable Value Objects.
- **Persistence Mapping & Entity Inheritance Strategy:** Persistence mapping SHALL be implemented exclusively within the Infrastructure Layer. The Domain Model MUST remain completely persistence-ignorant. The implementation MUST consume the mapping configuration defined by the Infrastructure Layer. The implementation SHALL NOT introduce persistence concerns into the Domain Model.

- **Phase 7 Reference Foundation:** All academic entities MUST inherit the physical mapping configurations from the `IReferenceEntity` foundation, ensuring UUID primary keys, standardized lifecycle states, and JSON extensibility.

Mapping configurations (e.g., ORM profiles) MUST be strictly segregated from the domain model. Entities must never contain persistence logic or database connection awareness.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.3 Repository Implementation

**Architectural Commentary**
Repositories abstract the data access layer, preventing persistence-specific logic from bleeding into the application services and ensuring mockability for testing.

**WHY:**
The implementation involves creating concrete repositories that satisfy the academic repository contracts while extending generic repository capabilities.

**WHAT:**

- **Academic Repository Extensions:** Concrete repositories SHALL implement taxonomy-specific queries, resolving lateral relationships and querying temporal validity.
- **Separation from Business Logic:** Complex filtering MUST be implemented using the Specification pattern. Repositories SHALL NOT contain business validation, authorization logic, or domain event publishing logic.

- **Phase 7 Reference Foundation:** The implementation MUST extend the enterprise generic repository from Phase 7. Basic CRUD operations are inherited and MUST NOT be rewritten.

The repository acts as the absolute boundary between the domain and the physical database. Downstream services must only interact with the repository interfaces, never directly with data contexts or query builders.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.4 Validation Pipeline

**Architectural Commentary**
Corrupt taxonomy data or circular dependencies compromise the entire enterprise ecosystem. A strict validation pipeline guarantees that only canonical, structurally sound entities are persisted.

**WHY:**
Implementation must construct a sequence of validators that evaluate domain rules, duplicate detection, standard formatting, mapping consistencies, and validation ordering.

**WHAT:**

- **Validation Pipeline:** Validation SHALL be implemented using a standard enterprise pipeline pattern executing before transaction initiation.
- **Duplicate & Mapping Validation:** The pipeline MUST enforce uniqueness constraints and ensure cross-standard mappings do not create semantic contradictions or link to archived entities.
- **Validation Ordering:** Structural validation must occur first, followed by complex hierarchical cycle detection.

- **Phase 7 Standards Foundation:** MUST be consumed to verify that the entity's Standard Code aligns with the formatting rules of the declared Academic Standard.
- **Phase 7.13 Generic Hierarchy & DAG Foundation:** The implementation MUST consume the `ICycleDetectionValidator` before any parent-child relationship is persisted to prevent infinite loops.

Validation is an application service concern orchestrating domain rules. The pipeline must halt execution and return standardized error envelopes before any database transaction is opened.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.5 Service & CQRS Implementation

**Architectural Commentary**
Segregating read operations from write operations optimizes performance, scaling, and security, adhering strictly to Separation of Concerns.

**WHY:**
Implementation involves distinct command handlers for state mutations and query handlers for data retrieval and read model projection.

**WHAT:**

- **Command Flow:** Write operations MUST be encapsulated in explicit Commands. Handlers orchestrate validation, aggregate invocation, and persistence.
- **Query Flow & Read/Write Models:** Read operations MUST bypass the domain model, projecting data directly into integration contracts. The write model enforces invariants.
- **CQRS Responsibilities:** The implementation MUST NOT mix command and query logic.

- **Phase 7 Reference Foundation:** Consumes standardized CQRS dispatcher interfaces and execution result envelopes to maintain uniform enterprise communication.

Application services serve strictly as orchestrators. They MUST NOT contain domain logic; they merely coordinate repositories, validators, and the domain model, bridging the API/Gateway layer with the core domain.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.6 Cache Integration

**Architectural Commentary**
Accessing the database for every path resolution would introduce unacceptable latency. A caching strategy is necessary for read optimization.

**WHY:**
Implementation requires integrating a distributed cache layer to serve taxonomy projections, utilizing tenant-agnostic cache keys and strict cache invalidation rules.

**WHAT:**

- **Cache Strategy & Invalidation:** Employs a read-through cache for lookups. Any mutation MUST trigger explicit cache invalidation targeting the entity, ancestors, and descendants.
- **Tenant-Agnostic Cache Keys:** Cache keys MUST be globally deterministic and tenant-agnostic.
- **Read Optimization:** Stores pre-computed projections and serialized taxonomy paths.

- **Phase 5 Cache Foundation:** The implementation MUST strictly consume the Phase 5 Cache Foundation. It SHALL NOT implement custom caching mechanisms, in-memory singletons, or bypass the enterprise cache provider.

Cache logic must be implemented via decorators or interceptors around query handlers, keeping the core query logic completely unaware of caching infrastructure.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.7 Event Integration

**Architectural Commentary**
Downstream platforms must react to taxonomy changes asynchronously, avoiding tight coupling or synchronous RPC bottlenecks.

**WHY:**
Implementation of Publisher/Subscriber patterns managing Domain Events and Integration Events.

**WHAT:**

- **Domain vs Integration Events:** Domain Events are dispatched in-process. The implementation MUST map these to enterprise Integration Events for cross-boundary communication.
- **Publisher/Subscriber & Responsibilities:** The Phase 8 (Academic Taxonomy) acts strictly as a Publisher. Events MUST carry canonical identity and delta, but avoid massive payloads.
- **Event Payload Constraints:** Events MUST NOT include the complete entity graph. Events MUST NOT carry large object payloads. Events SHALL only contain:
  - Canonical Entity Identifier
  - Event Metadata
  - Version Sequence Number
- **State Retrieval:** Downstream systems requiring additional state MUST retrieve it through the appropriate Projection or Query interfaces. The objective is to prevent Event Bus payload bloating and preserve loose coupling.

- **Enterprise Transactional Outbox:** The implementation MUST consume the Enterprise Transactional Outbox Baseline (`Enterprise.Core.Infrastructure.OutboxDomainEventInterceptor`). It SHALL NOT orchestrate direct publishing to the message broker.

Domain events MUST be captured by interceptors and written to the Enterprise Transactional Outbox within the same database transaction. Application layer must NOT orchestrate publishing directly.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.8 Import Integration

**Architectural Commentary**
A standardized import process ensures consistent canonical normalization and minimizes manual data entry errors for massive external taxonomies (ISCED-F, US CIP).

**WHY:**
Implementation of an import pipeline handling canonical normalization, supersede strategies, import validation, and synchronization for academic taxonomy datasets as specified in Part A §8.12.

**WHAT:**

- **Import Pipeline & Validation:** Maps external data to the canonical model, validating structural integrity (parent-first ingestion).
- **Canonical Normalization:** Normalizes terms (casing, unicode) to ensure consistent identities.
- **Supersede & Synchronization Strategy:** Utilizes Lifecycle Contracts to deprecate old nodes and map them to new ones during standard version upgrades.
- **Scope of Imported Datasets:** Implements domain import pipelines for 9 academic taxonomy datasets defined in Part A §8.12: Academic Fields, Disciplines, Programs, Specializations, Categories, International Academic Standards, Cross-Standard Mappings, Synonyms/Aliases/Localized Terms, and Parent-Child Taxonomy DAG Nodes.

- **Import Boundary & Foundation Consumption:**
  - **Phase 06 (Universal Import Platform):** Provides generic execution infrastructure (sources, configuration, worker queues, error tracking). Phase 08 consumes Phase 06 without duplicating import mechanics.
  - **Phase 07 (Enterprise Reference Data & Generic Hierarchy Foundation):** Provides shared reference entities and DAG closure table mechanics (§7.13).
  - **Phase 08 (Academic Taxonomy):** Owns academic taxonomy field definitions, cross-standard mapping rules, validation logic (ISCED/CIP compliance, taxonomy cycle checks), and import acceptance criteria.

The import process acts as an client to Application Services, submitting Commands (Create, Update) identical to those submitted by administrative interfaces.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.9 Seed Strategy

**Architectural Commentary**
The enterprise requires a functional baseline of global standards to operate. A deterministic seed strategy guarantees environment consistency.

**WHY:**
Implementation of a repeatable, idempotent seeding mechanism managing official seed sources, incremental loading, and dependency resolution.

**WHAT:**

- **Official Seed Sources:** Generated from immutable enterprise manifests in version control.
- **Parent-First & Incremental Loading:** Must guarantee topological loading. Seeding MUST be idempotent, updating drifted metadata instead of recreating.
- **Pending Entities & Seed Validation:** Initial data may load as 'Pending'. All seed payloads MUST pass the standard Validation Pipeline.

- **Phase 7 Standards Foundation:** The seeder must resolve dependencies against the Phase 7 Standards Foundation before injecting taxonomy nodes.

Seeding logic executes exclusively during environment bootstrapping or migration phases. It must not bypass application layer validation rules.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.10 Cross Mapping Implementation

**Architectural Commentary**
Institutions operate across multiple jurisdictions requiring translation between standards. A formal implementation tracks these equivalencies.

**WHY:**
Implementation of cross-mapping entities managing One-to-One, One-to-Many, Many-to-One, and Mapping Lifecycle tracking.

**WHAT:**

- **ISCED ↔ CIP mapping:** The implementation must support mapping nodes across distinct standard trees.
- **Equivalency Handling:** Physical mapping tables MUST enforce uniqueness on Source-Target pairs to prevent duplicates. Explicit weights handle broad/narrow matches.
- **Mapping Lifecycle:** Mappings MUST have an independent lifecycle (Pending, Verified, Deprecated).

- **Phase 7 Reference Foundation:** Mapping entities consume identity and metadata extensibility from Phase 7.

Mappings are lateral relationships managed independently of the DAG hierarchy. Hierarchy queries must not traverse cross-mappings automatically unless explicitly requested via specific mapping queries.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.11 Localization Implementation

**Architectural Commentary**
Academic taxonomies must be presented in the native language of the user or institution while retaining a single canonical identity.

**WHY:**
Implementation of translation dictionaries, multilingual names, native names, and localization strategy.

**WHAT:**

- **Multilingual & Native Names:** Entities MUST persist a canonical default alongside a collection of localized translations.
- **Localization Strategy:** Projections must accept a Locale parameter, returning the localized string or falling back gracefully.

- **Phase 7 Reference Foundation:** The implementation MUST consume the Locale and Translation Value Objects defined in Phase 7.

The domain manages translation value objects; persistence handles JSONB/translation tables. Application services orchestrate locale resolution based on the caller's context.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.12 Search Integration

**Architectural Commentary**
Relational databases are inefficient at full-text search, fuzzy matching, and autocomplete across deep hierarchical trees.

**WHY:**
Integration of the taxonomy read-models with the enterprise search index to support Hierarchy, Canonical, and Resolution search.

**WHAT:**

- **Academic Taxonomy Indexing:** All 'Active' entities MUST be synchronized into the enterprise search index.
- **Hierarchy & Canonical Search:** Search documents MUST include materialized paths. Prioritize Exact Matches on Standard Code over fuzzy text matches.

- **Phase 7 Resolution Foundation:** The implementation must support term resolution by indexing historical names and aliases managed by the Resolution Foundation.

The Phase 8 (Academic Taxonomy) publishes state changes. A dedicated, decoupled search worker updates the index. The taxonomy domain model remains completely unaware of search infrastructure.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.13 AI Integration

**Architectural Commentary**
AI can assist in resolving unstructured terms or mapping external curricula, but it must operate within strict deterministic boundaries under the Enterprise AI Platform ownership model.

**WHY:**
Implementation guidelines for AI consumption regarding taxonomy classification, recommendation support, and canonical normalization.

**WHAT:**

- **Enterprise AI Platform Ownership:** The Enterprise AI Platform is the sole owner of all AI capabilities. The Academic Taxonomy Platform acts exclusively as a consumer of AI.
- **Taxonomy Classification & Recommendation Support:** The Enterprise AI Platform analyzes text to suggest targets or cross-standard mappings, passing them to Phase 8 to be persisted in a 'Pending' status awaiting governance verification.
- **AI Responsibilities & Limitations:** The Enterprise AI Platform handles fuzzy matching and context extraction. It MUST NOT directly mutate the taxonomy, create entities, or bypass governance. Phase 8 implements no AI models, orchestrates no workflows, and manages no prompts.

- **Phase 7 Resolution Foundation:** All AI outputs MUST be resolved against the Reference Resolution Foundation to ensure the AI returns a valid, existing Canonical Identity.

The Enterprise AI Platform operates as an external service. The core taxonomy application services must treat AI input with zero trust, subjecting it to standard validation.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.14 Security Review

**Architectural Commentary**
The Academic Taxonomy is highly sensitive reference data. Unauthorized modifications compromise enterprise reporting and international compliance.

**WHY:**
Implementation of access controls, auditing, permission models, and strict authorization boundaries.

**WHAT:**

- **Authorization & Security Boundaries:** Write operations MUST require elevated Governance claims. Permissions are evaluated at the Command Handler level prior to domain invocation.
- **Audit Integration:** Every state mutation MUST be automatically recorded by the enterprise audit logging foundation.
- **Explicit Constraint:** No custom authorization system, user tables, or role definitions are introduced.

- **Core IAM:** The implementation MUST consume the Core Identity and Access Management foundation for all token validation and claim evaluation.

The domain model remains completely unaware of the security context; authorization is strictly a concern of the Application Service or API gateway layer.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.15 Performance Strategy

**Architectural Commentary**
The taxonomy is a central bottleneck. If resolving an academic program takes too long, all downstream workflows suffer.

**WHY:**
Implementation of explicit optimizations targeting read operations, closure tables, hierarchy traversal, query optimization, and scalability.

**WHAT:**

- **Closure Table Optimization & Query Optimization:** Physical tables MUST be heavily indexed. Repositories must utilize strict projections, avoiding full entity instantiation and N+1 recursive calls.
- **Shortest Path & IsPrimaryParent Tie-Breaking:** Path materialization must utilize `Depth` to resolve shortest paths and `IsPrimaryParent` to deterministically select canonical paths without runtime computation.
- **Scalability Considerations:** The read model and caching layer must be horizontally scalable.
- **Materialized Path Constraints:** Materialized Paths MAY be generated exclusively for read-optimized projections and query acceleration. Materialized Paths MUST NOT become the authoritative source of truth. Hierarchy validation, relationship integrity, and canonical hierarchy resolution MUST continue to rely exclusively on the Generic Hierarchy & DAG Foundation (Phase 7.13). Materialized Paths are optimization artifacts only.

- **Phase 5 Cache Foundation:** Represents the primary performance lever. The database should only be queried upon cache misses, utilizing the Phase 5 infrastructure for distributed high availability.

Performance tuning (indexing, query planning) is strictly an infrastructure concern. The domain model remains optimized for business rule clarity, not database query execution.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.16 Testing Strategy

**Architectural Commentary**
Bugs in the taxonomy foundation will cascade throughout the entire enterprise. Rigorous, multi-layered testing is non-negotiable.

**WHY:**
A comprehensive testing strategy encompassing unit, integration, hierarchy, DAG integrity, mapping, performance, and regression testing.

**WHAT:**

- **Unit & Integration Testing:** Domain Entities require 100% code coverage. Repository implementations must be validated against production-equivalent persistence environments. The architecture must not prescribe any specific testing framework, tool, or technology.
- **Hierarchy & DAG Integrity Tests:** Complex multi-node circular dependency injections MUST be tested to guarantee cycles are successfully blocked.
- **Performance & Regression Tests:** Hierarchy traversal MUST be benchmarked to meet enterprise SLAs. All resolved bugs require regression tests.

- **Phase 7.13 Generic Hierarchy & DAG Foundation:** Testing must leverage existing DAG fixture generators and validation assertions from the foundation layer to ensure consistency.

Testing frameworks and fixtures must remain in isolated test projects, never packaged with or referenced by production deployment artifacts.

**HOW:**

```typescript
// Implementation standard patterns apply.
// Specific code structures depend on domain context.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

### 8.C.Final Implementation Review Checklist

**Architectural Commentary**
This serves as the official Tollgate for architecture validation before code is authorized for production deployment.

- [x] Alignment with Phase 8 Part A — All layers and components match the architectural specification.
- [x] Alignment with Phase 8 Part B — Implementation strictly uses the defined Contracts without modification.
- [x] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [x] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [x] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [x] Foundation Reuse Verification — Every consumed phase is verified as a loose integration.
- [x] Dependency Inversion — Infrastructure and Delivery depend on Application and Domain, never the reverse.
- [x] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core domain tables. It strictly prohibits storing external or cross-boundary data.

**Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 08 — Domain Contracts](phase-08-02-domain-contracts.md)
- **Next**: [Phase 09 — Tests Platform](../phase-09-tests-platform/)
