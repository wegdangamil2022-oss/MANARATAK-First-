# MANARATAK 2.0: Phase 5.8 BasicSearch Architecture Baseline

## Bounded Context Architecture Specification

**Status:** APPROVED  
**Revision:** 5.8.0  
**Architecture Baseline:** FROZEN  
**Domain Layer:** Core/Common Shared Abstractions  
**Scope:** Architecture Design Only

---

### 1. Vision & Executive Summary

In an enterprise-grade multi-tenant architecture such as MANARATAK 2.0, search capability is a ubiquitous operational need spanning multiple business domains. However, coupling domain entities directly to search engine technologies, query syntaxes, or physical indexing strategies results in brittle pipelines, vendor lock-in, and leaks bounded context boundaries.

The **Enterprise Basic Search Foundation** is a purely decoupled, domain-driven, vendor-neutral, and UI-agnostic abstraction framework. It establishes a complete separation between **Search Definition** (owned exclusively by the Domain) and **Search Execution** (owned exclusively by Infrastructure). This framework governs _how_ search demands are expressed, _how_ results are referenced, and _how_ search metadata is encapsulated, without exposing the core system to any database implementation details, search engine drivers, or third-party query protocols.

---

### 2. Purpose & Foundational Questions

The Search Foundation answers exactly four structural questions for the entire MANARATAK 2.0 monorepo:

1. **What can be searched?**  
   Described via generic `SearchScope` definitions, declaring logical, bounded partitions of resource indexes.
2. **How is searchable content described?**  
   Represented via schema-free, provider-neutral `SearchableMetadata` and strongly bound metadata contracts.
3. **How are search requests represented?**  
   Encapsulated within an immutable, strongly typed `SearchRequest` aggregate, combining search parameters, generic query filters, logical groupings, sorting, and pagination boundaries.
4. **How are search results represented?**  
   Standardized via `SearchResult` aggregates containing typed collections of matched resource references, relevance scores, and query execution metrics.

---

### 3. Scope Boundaries

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  BOUNDED CONTEXT: BASIC SEARCH FOUNDATION                    │
│                                                                              │
│    [Domain-Owned Search Definitions]        [Infrastructure-Owned Execution] │
│                                                                              │
│  ┌───────────────────┐    Creates    ┌────────────────┐                      │
│  │  SearchReference  ├──────────────►│ SearchRequest  │                      │
│  └───────────────────┘               └───────┬────────┘                      │
│                                              │                               │
│                                      ┌───────▼────────┐                      │
│                                      │ SearchCriteria │                      │
│                                      └────────────────┘                      │
│                                              │ (Submits Definition)          │
│                                              ▼                               │
│                                      ┌────────────────┐                      │
│                                      │  SearchEngine  │                      │
│                                      │  Adapter/Driver│                      │
│                                      └───────┬────────┘                      │
│                                              │ (Executes Physical Query)     │
│                                              ▼                               │
│  ┌───────────────────┐               ┌────────────────┐                      │
│  │   SearchResult    │◄──────────────┤ Compile Results│                      │
│  └─────────┬─────────┘               └────────────────┘                      │
│            │ (References Matches)                                            │
│  ┌─────────▼─────────┐                                                       │
│  │    SearchMatch    │                                                       │
│  └─────────┬─────────┘                                                       │
│            │ (Decoupled Reference)                                           │
│  ┌─────────▼─────────┐                                                       │
│  │SearchTargetRef    │                                                       │
│  └───────────────────┘                                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### A. Responsibilities (In-Scope)

- **Search Reference:** Defining `SearchReference` as a dedicated, opaque value object. External business domains must refer to search requests and search sessions exclusively through this reference to prevent exposing raw internal identifiers.
- **Search Target Reference:** Introducing `SearchTargetReference` to point to matched external objects dynamically. The search platform never owns, imports, or understands the meaning of the referenced business entities.
- **Search Request Structure:** Formulating criteria, sorting rules, pagination boundaries, and logical scopes in an immutable aggregate form.
- **Search Scope Abstraction:** Abstracting target indexes (`SearchScope`) as immutable, string-based namespaces.
- **Generic Criteria Representation:** Translating query filter structures into standard, compiler-safe value objects (`SearchFilter`, `FilterValue`, `LogicalOperator`, `FilterComparison`).
- **Pagination & Sorting Abstraction:** Structuring offset, cursor boundaries, sorting fields, and directions (`SortDirection`, `SortField`).
- **Result Standardization:** Structuring search results strictly as a provider-neutral collection of `SearchTargetReference` entities and elapsed performance metrics.
- **Search Logical Lifecycle:** Managing the core logical states and lifecycle transitions of search request aggregates.

#### B. Non-Responsibilities (Strictly Out-of-Scope)

- **Search Engines & Servers:** Absolute ignorance of specific indexing platforms, distributed cluster servers, or index nodes.
- **Physical Indexes:** No management of write indices, document mappings, schemas, or synchronization triggers.
- **High-Dimensional & Neural Retrieval:** Distance metrics, embedding vectors, mathematical similarity equations, or cognitive indexing (delegated to Phase 17 — Enterprise AI Platform).
- **Algorithmic Tokenization:** Natural language processing, token stemmers, lemmatization pipelines, or synonym lookup maps.
- **Database Query Construction:** Translating abstract criteria into physical relational queries, key-value expressions, or document filter languages.
- **Physical Execution & Performance:** Execution caching, index selection, shard routing, and connection pooling.

---

### 4. Bounded Context & Ignorance Enforcements

To preserve clean architectural boundaries, this bounded context maintains absolute ignorance of downstream modules, business contexts, and physical indexing/database technologies.

#### Domain Ignorance Rules

1. **No Business Domain Entities:** The platform must **NEVER** import or reference business entities such as those describing participants, institutional data, financial options, or application statuses.
2. **No Operational Frameworks:** No imports or references to customer management, content management, workflow automation, or cognitive systems.
3. **No Vendor or Technology Terminology:** Complete absence of product-specific database names, mapping schemas, third-party cache engines, or dedicated query syntaxes.
4. **No Advanced Search Paradigms:** No knowledge of mathematical embeddings, spatial distances, or conceptual match equations (delegated to Phase 17 — Enterprise AI Platform).

---

### 5. Domain Model Blueprint

The Search Foundation models search configurations and result mappings cleanly inside the core domain layer.

#### A. Value Objects (Immutable)

##### 1. `SearchRequestId`

Unique, domain-generated identification for a specific query invocation. Used strictly inside the domain boundary.

##### 2. `SearchReference`

A dedicated, opaque value object representing a public-facing pointer to a search request or search session. External business domains reference search workflows and sessions exclusively via `SearchReference` to preserve absolute boundary decoupling and prevent leaking internal ID structures.

##### 3. `SearchScope`

A business-agnostic value indicating which logical index partitions or generic target namespaces are requested (e.g., `"core.records"`, `"system.logs"`).

##### 4. `SearchCriteria`

Encapsulates search queries (free-text queries) and arrays of search filters, serving as the logical query specification. **Strictly immutable** after creation.

##### 5. `SearchFilter`

Specifies a single filter parameter comprising:

- `field`: The targeted generic metadata path.
- `operator`: The comparison criteria (e.g., `EQUALS`, `CONTAINS`, `GREATER_THAN`, `IN`).
- `value`: The target parameter wrapper.

##### 6. `SearchPagination`

Describes cursor or offset parameters:

- `page`: Logical index representation.
- `limit`: Maximum result boundaries.

##### 7. `SearchSorting`

Determines ordering sequences:

- `field`: Target metadata sort path.
- `direction`: Ascending or Descending ordering options.

##### 8. `SearchTargetReference`

An opaque, provider-neutral reference pointing to an external resource. It encapsulates:

- `entityNamespace`: Opaque string designating the source domain (e.g., `"academic.institutions"`).
- `resourceKey`: Opaque identifier of the external entity.
  The search platform remains entirely blind to the meaning, structure, or state of the entity referenced by this value object.

##### 9. `SearchMatch`

A standardized container for a single search match, owning:

- `target`: The generic `SearchTargetReference` representing the external resource.
- `score`: Relational relevance coefficient (0.0 to 1.0).
- `payload`: Opaque dictionary mapping (`Record<string, any>`) representing generic attributes for presentation display, strictly free of concrete domain entity models.

---

#### B. Aggregate Roots

##### 1. `SearchRequest` (Aggregate Root)

Encapsulates the transactional lifetime of an expressed query search intention.

- **Properties:**
  - `id: SearchRequestId`
  - `reference: SearchReference`
  - `scope: SearchScope`
  - `criteria: SearchCriteria`
  - `sorting?: SearchSorting`
  - `pagination: SearchPagination`
  - `timestamp: Date`
- **Invariants:**
  - `pagination` limit must fall within safe operational ranges to protect backends from memory exhaustion.
  - `scope` must be non-empty and adhere to valid character patterns (dot-separated namespaces).
  - All properties and nested structures are declared immutable to prevent query parameter tampering during traversal.

##### 2. `SearchResult` (Aggregate Root)

An immutable value wrapping the standardized, provider-neutral outputs of a search execution. It contains absolutely no business entities, persistence schemas, or engine-specific payloads.

- **Properties:**
  - `id: SearchRequestId`
  - `reference: SearchReference`
  - `matches: SearchMatch[]`
  - `totalCount: number`
  - `executionTimeMs: number`
- **Invariants:**
  - `matches` length must not exceed the original request's limits.
  - `totalCount` cannot be negative.
  - `executionTimeMs` must reflect non-negative elapsed durations.

---

### 6. Domain Repository & Specification Pattern

Rather than establishing custom query lookup methods, all repository query criteria are standardized using the **Specification Pattern**. No repository-specific lookup methods are allowed.

#### Repository Contract

```typescript
export interface ISearchRequestRepository {
  /**
   * Preserves search requests for audit log traces.
   */
  save(request: SearchRequest): Promise<void>;

  /**
   * Retrieves historical search requests matching a specific logical specification.
   */
  findBy(specification: ISpecification<SearchRequest>): Promise<SearchRequest[]>;
}
```

#### Specification Base Interface

```typescript
export interface ISpecification<T> {
  /**
   * Evaluates if a candidate entity satisfies the criteria specification.
   */
  isSatisfiedBy(candidate: T): boolean;
}
```

---

### 7. Domain Lifecycle & Operational States

The Search Platform governs ONLY the logical lifecycle of search requests. The execution lifecycle, physical query optimization, connection pooling, and target index selection belong exclusively to the Infrastructure layer.

```
┌─────────────────┐        (Create)        ┌─────────────────┐        (Complete)        ┌──────────────────┐
│   Formulating   ├───────────────────────►│  RequestCreated ├─────────────────────────►│ RequestCompleted │
│ Search Criteria │                        │  (Logical Open) │                          │  (Result Bound)  │
└─────────────────┘                        └────────┬────────┘                          └──────────────────┘
                                                    │
                                                    │ (Timeout / Invalidation)
                                                    ▼
                                           ┌─────────────────┐
                                           │ RequestExpired  │
                                           └─────────────────┘
```

1. **Formulating:** Client constructs query options and parameters.
2. **RequestCreated:** `SearchRequest` Aggregate is instantiated, emitting a creation event.
3. **Execution Delivery:** The infrastructure driver processes the query and binds matches to a standardized `SearchResult` definition.
4. **RequestCompleted:** The search request is marked as completed and matched target references are returned.
5. **RequestExpired:** The logical session or request lifetime exceeds retention bounds and is closed.

---

### 8. Domain Events

Domain events are strictly limited to business-significant lifecycle transitions. All operational events regarding caching, parsing, shard routing, index writing, or connection states are removed.

#### 1. `SearchRequestCreatedEvent`

- **Trigger:** Dispatched immediately when a `SearchRequest` aggregate is constructed.
- **Payload:** `requestId`, `searchReference`, `scope`, `timestamp`.

#### 2. `SearchRequestCompletedEvent`

- **Trigger:** Dispatched when a search request resolves and returns results.
- **Payload:** `requestId`, `searchReference`, `totalCount`, `executionTimeMs`, `timestamp`.

#### 3. `SearchRequestExpiredEvent`

- **Trigger:** Dispatched if a logical search session or cached request state is cleared or invalidated.
- **Payload:** `requestId`, `searchReference`, `timestamp`.

---

### 9. Cross-Context Integrations (Decoupled Interactions)

To query business databases without establishing tight coupling, upstream contexts publish state transformations into a generic indexing pipeline. The search foundation operates entirely downstream, blind to the source logic:

1. **Decoupled Reference:** Matches returned in a `SearchResult` represent entity keys mapped inside `SearchTargetReference`.
2. **Resolution:** Upstream contexts (e.g., academic context) intercept these matches and resolve the keys into full business domain models for rendering.

---

### 10. Architectural Constraints & Quality Attributes

- **Provider Neutrality:** The codebase must remain 100% abstract, with zero reference to physical query syntaxes, caching mechanisms, indexing servers, or vendor-specific platforms.
- **Immutability Constraint:** Every Value Object and Aggregate Root maintains zero setter access. Modifying search criteria requires instantiating a completely new `SearchRequest`.
- **Reference Decoupling:** External boundaries never directly consume `SearchRequestId`. All references use `SearchReference`.

---

### 11. Security & Compliance Core Rules

- **Access Partitioning:** `SearchScope` formats are coupled to multi-tenant structures to ensure queries never breach organizational boundaries.
- **PII Isolation:** Payload dynamic objects must never store unencrypted personal identifier data.

---

### 12. Architecture Decision Records (ADR)

#### Architecture Decision Record 1: Separation of Search Definition and Execution

- **Status:** APPROVED
- **Context:** Decoupling search formulation from physical engine behaviors to ensure long-term architectural flexibility.
- **Decision:** The Domain owns only the logical definition (structures, criteria, validation bounds, metadata templates), while the physical execution, optimization, and search engine integration belong exclusively to the Infrastructure layer.
- **Consequences:** Provides complete technology-neutral design. Upgrading or changing database indexing engines has zero impact on application and domain logic.

#### Architecture Decision Record 2: Abstract Target Referencing

- **Status:** APPROVED
- **Context:** Preventing the search platform from importing or coupling with external business aggregates.
- **Decision:** All search result elements represent matches via `SearchTargetReference` value objects containing opaque namespaces and keys.
- **Consequences:** The Search context remains completely unaware of what it is searching or displaying, allowing new business modules to hook into the search structure without modifications to the Search Foundation.

#### Architecture Decision Record 3: Search Criteria Immutability

- **Status:** APPROVED
- **Context:** Assuring query auditability and preventing parameter manipulation during dispatch pipelines.
- **Decision:** All `SearchCriteria` structures are completely immutable once created. Any change or refinement to criteria requires constructing a new `SearchRequest` with a distinct `SearchReference`.
- **Consequences:** Guarantees absolute trace lineage, repeatable query processing, and side-effect free operations.

#### Architecture Decision Record 4: Decoupled Public References

- **Status:** APPROVED
- **Context:** Preventing client layers and external domains from exposing internal system IDs of search transactions.
- **Decision:** All external interfaces and business boundaries communicate with the search platform exclusively through `SearchReference` value objects.
- **Consequences:** Eliminates direct leakage of database/surrogate identifiers and encapsulates tracing correlation fields securely.

#### Architecture Decision Record 5: Logical Search Lifecycle Boundaries

- **Status:** APPROVED
- **Context:** Demarcating the operational bounds of search-related domain events.
- **Decision:** The search domain owns and emits events only for logical, business-significant transitions (`SearchRequestCreatedEvent`, `SearchRequestCompletedEvent`, `SearchRequestExpiredEvent`). All operational phases, performance optimizations, and infrastructure-specific behaviors are isolated from domain events.
- **Consequences:** Keeps domain events clean and clear of technical infrastructure noises, satisfying strict Clean Architecture criteria.

---

### 13. Risks & Mitigations

| Identified Risk                 | Impact | Architectural Mitigation Strategy                                                                           |
| :------------------------------ | :----- | :---------------------------------------------------------------------------------------------------------- |
| **Overly Complex Filter Abuse** | Medium | Impose strict caps on logical groupings and criteria sizes inside domain invariants.                        |
| **Cross-Tenant Leakage**        | High   | Tenant contexts are baked directly into the `SearchScope` namespace definitions during request formulation. |
| **Stale Cache References**      | Low    | Expire logical request states cleanly using explicit lifecycle triggers.                                    |

---

### 14. Strategic Recommendations

1. **Context-Specific Resolvers:** Presentation layer adapters should fetch abstract results, extract `SearchTargetReference` pointers, and delegate entity retrieval to context-specific database repositories.
2. **Async Schema Compilation:** Index compilation from business modifications should run out-of-band via background workers to maintain high-throughput transaction boundaries.

---

### 15. ARB Approval & Refinement Sign-off

```
========================================================================
            ENTERPRISE ARCHITECTURE BOARD SIGN-OFF & APPROVAL
========================================================================
```

- **Authorized Sign-off:** Lead Architect (AI Agent)
- **Status:** **APPROVED**
- **Architecture Baseline:** **FROZEN**
- **Next Phase Authorization:** Phase 5.8 (Implementation Baseline Authorization)

---

### 16. Official Architecture Review Board (ARB) Decision & Approval

```
========================================================================
               FINAL ARCHITECTURE CERTIFICATION & APPROVAL
========================================================================
```

The Architecture Review Board (ARB) has completed the final architecture review of **Phase 5.8 — Enterprise Basic Search Foundation**.

The architecture has been verified and fully complies with:

- Official Roadmap Baseline v4.0
- Clean Architecture Principles
- Domain-Driven Design (DDD)
- SOLID Principles
- Enterprise Architecture Patterns
- The Dependency Rule
- Provider Neutrality

#### ARB Certifications:

- **Decoupled SearchReference:** `SearchReference` is certified as the official cross-context search reference to hide underlying search transaction details.
- **Abstract Target Referencing:** `SearchTargetReference` is verified as the exclusive decoupled mechanism for referencing external searchable entities without domain leaks.
- **Criteria Immutability:** Search criteria are permanently immutable after `SearchRequest` creation; any changes require a new request and reference context.
- **Provider-Neutral Results:** `SearchResult` aggregates contain exclusively provider-neutral metadata and collection references to `SearchTargetReference`.
- **Clean Responsibility Separation:** Search definition (Domain-owned) is completely separated from search execution (Infrastructure-owned).
- **Logical Lifecycle Boundary:** The Search Platform lifecycle is restricted strictly to logical request lifecycles. All operational details like execution, indexing, optimization, and physical storage remain entirely within the Infrastructure layer.
- **Standardized Contracts:** All repository contracts follow the pure Specification Pattern without custom entity lookup methods.
- **Minimal Event Engine:** Domain events are restricted to business-significant lifecycle transitions (`SearchRequestCreatedEvent`, `SearchRequestCompletedEvent`, `SearchRequestExpiredEvent`).
- **Absolute Vendor Ignorance:** The platform architecture contains zero references to specific search indices, indexing vendors, distributed storage engines, caching engines, or vector database platforms.

```
========================================================================
                         ARCHITECTURE FREEZE
========================================================================
```

- **Status:** **APPROVED**
- **Revision:** **5.8.0**
- **Architecture Baseline:** **FROZEN**

The Enterprise Basic Search Foundation Architecture is hereby declared the permanent **Architecture Baseline** for Phase 5.8. No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.7 Audit Implementation Baseline](../Audit/phase-05-07-audit-implementation-baseline.md)
- **Next**: [Phase 5.8 Basic Search Implementation Baseline](phase-05-08-basicsearch-implementation-baseline.md)
