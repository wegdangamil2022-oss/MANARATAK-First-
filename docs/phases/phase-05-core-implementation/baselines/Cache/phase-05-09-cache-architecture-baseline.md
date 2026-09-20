# MANARATAK 2.0: Phase 5.9 Cache Architecture Baseline

## Architecture Design Specification

**Status:** APPROVED  
**Revision:** 5.9.0  
**Architecture Baseline:** FROZEN  
**Phase:** 5.9  
**Layer:** Domain / Enterprise Architecture

---

## 1. Vision & Purpose

The Enterprise Cache Foundation acts as the definitive Single Source of Truth for cache metadata, cache policies, and cache lifecycle modeling within the MANARATAK 2.0 ecosystem. Its primary purpose is to decouple the _logical definition_ of cache (what is cacheable, under what policies, and its lifecycle) from the _physical execution_ of caching (where and how data is stored in memory or distributed systems).

## 2. Scope & Bounded Context

This architecture describes the **Cache Bounded Context**. It is a cross-cutting, generic foundation designed to be utilized by other bounded contexts strictly through provider-neutral interfaces.

### 2.1 Responsibilities

The Cache Platform is exclusively responsible for modeling:

- Cache Identity and official references.
- Cache Entries as aggregate roots.
- Cache Keys and Scopes.
- Cache Policies (rules governing caching behavior).
- Cache Lifetimes and Metadata (Expiration, Invalidation, Ownership).
- Cache Logical Lifecycle.

### 2.2 Non-Responsibilities

The Cache Platform must **NEVER** handle:

- Physical Cache Storage.
- Memory Management.
- Distributed Cache Coordination.
- Cache Replication or Synchronization.
- Eviction Algorithms (e.g., LRU, LFU).
- Data Compression or Serialization.
- Cache Execution or Networking.
- Infrastructure integrations.

## 3. Provider Neutrality & Business Ignorance

The Cache Foundation is entirely agnostic of both business domains and infrastructure.

- **No Business Knowledge:** It knows nothing of users, students, scholarships, universities, courses, organizations, CRM, CMS, AI, or any other business entities.
- **No Infrastructure Knowledge:** It knows nothing of specific caching engines, cloud providers, database caches, CDNs, HTTP caches, browser caches, distributed caches, or physical memory implementations.

---

## 4. Domain Model

### 4.1 Aggregate Root

- **`CacheEntry`**: The central Aggregate Root representing the logical metadata of a cached item. It encapsulates its identity, reference, scope, key, policies, and lifecycle states. It never contains physical storage representations or the actual cached payload.

### 4.2 Value Objects

All Value Objects are strictly immutable.

- **`CacheEntryId`**: The internal immutable identifier of the cache entry. Never exposed outside the domain.
- **`CacheReference`**: The opaque, official cross-context reference used by other domains to refer to a cache entry without coupling to its internal ID.
- **`CacheKey`**: The immutable, logical key representing the cached data.
- **`CacheScope`**: The generic namespace defining the isolation boundary of the cache entry.
- **`CacheMetadata`**: A composite object aggregating specific metadata segments.
- **`CachePolicy`**: Provider-neutral rules defining how the entry should be logically treated.
- **`CacheExpirationMetadata`**: Domain definitions of logical lifetime bounds and expiry thresholds.
- **`CacheInvalidationMetadata`**: Rules indicating when and under what conditions the entry becomes invalid.
- **`CacheOwnershipMetadata`**: Metadata identifying the logical owner or source system of the cache entry.

---

## 5. Repository Contracts

Repositories strictly follow the **Specification Pattern**. No custom lookup methods are permitted.

- **`ICacheEntryRepository`**:
  - `save(entry: CacheEntry): Promise<void>`
  - `findBy(specification: ISpecification<CacheEntry>): Promise<CacheEntry[]>`
  - `remove(entry: CacheEntry): Promise<void>`

---

## 6. Business Rules & Lifecycle

### 6.1 Lifecycle States

The `CacheEntry` progresses through a strict logical lifecycle:

1. **Created**: The cache entry is logically defined.
2. **Expired**: The logical lifetime boundary has been crossed.
3. **Invalidated**: The entry was explicitly marked invalid due to ownership or policy constraints.
4. **Removed**: The entry metadata is logically purged.

### 6.2 Core Business Rules

- **Rule 1:** A `CacheEntry` must possess a valid `CacheKey` and `CacheScope` at creation.
- **Rule 2:** Modification to a `CacheKey` is permanently forbidden.
- **Rule 3:** Business domains must reference entries via `CacheReference` exclusively. `CacheEntryId` must not be leaked.
- **Rule 4:** Expiration is evaluated logically; physical eviction is the responsibility of Infrastructure.

---

## 7. Domain Events

Domain events are strictly limited to business-significant lifecycle transitions. They must not reflect physical memory, engine, replication, or synchronization events.

- **`CacheEntryCreatedEvent`**: Emitted when a new cache entry is logically defined.
- **`CacheEntryExpiredEvent`**: Emitted when the domain marks an entry as logically expired based on policy evaluation.
- **`CacheEntryInvalidatedEvent`**: Emitted when the entry is explicitly invalidated.
- **`CacheEntryRemovedEvent`**: Emitted when the entry metadata is purged from the logical registry.

---

## 8. Cross-Context Relationships

- **Upstream:** Business contexts interact with the Cache Foundation to request logical cache allocation or invalidation, passing provider-neutral metadata via `CacheReference`.
- **Downstream:** The Application layer coordinates with Infrastructure adapters that translate `CacheEntry` states into physical memory operations via Application Gateways.

---

## 9. Architectural Constraints

- **Dependency Rule:** Domain depends on nothing. Application depends on Domain. Infrastructure depends on Application and Domain. API depends on Application.
- **Purity Constraint:** The Domain must not import or reference any infrastructure SDKs or caching libraries.
- **No Reverse Coupling:** The Cache domain must not import specific business domain models.

---

## 10. Risks & Recommendations

- **Risk:** Developers may attempt to leak caching payloads (the actual data being cached) into the `CacheEntry` aggregate.
  - **Recommendation:** Strictly enforce that `CacheEntry` contains only _metadata_. Physical payload retrieval/storage must be handled dynamically by the Application Layer working with an Infrastructure execution Gateway.
- **Risk:** Infrastructure execution details bleeding into Domain logic.
  - **Recommendation:** Maintain abstract `CacheExpirationMetadata` and `CacheInvalidationMetadata` expressed in standard logical concepts, which Infrastructure interprets independently.

---

## 11. Architecture Decision Records (ADRs)

### ADR-1: Cache Provider Neutrality

- **Context:** The system needs caching capabilities without locking into specific memory or distributed cache engines.
- **Decision:** The Cache Foundation will be entirely provider-neutral. It will not reference any specific caching technology or vendor.
- **Consequences:** Ensures long-term flexibility, protects the domain from technology churn, and prevents infrastructure vendor lock-in.

### ADR-2: Cache Metadata Ownership

- **Context:** Deciding where cache rules and metadata are managed.
- **Decision:** The Cache Platform acts as the sole owner of all cache metadata (keys, scopes, policies). It will never manage physical payloads or business entities.
- **Consequences:** Centralizes cache governance and auditability, ensuring clear boundary separation.

### ADR-3: Cache Key Immutability

- **Context:** Managing cache integrity across distributed environments.
- **Decision:** The `CacheKey` Value Object is strictly immutable upon creation.
- **Consequences:** Eliminates race conditions and consistency issues related to dynamic key mutations.

### ADR-4: Cache Lifecycle Ownership

- **Context:** Determining the boundary for cache lifecycle transitions.
- **Decision:** The Domain layer dictates logical lifecycle transitions (Creation, Expiration, Invalidation, Removal).
- **Consequences:** Protects cache business rules from being scattered across Application or Infrastructure layers.

### ADR-5: Expiration Boundary

- **Context:** Delineating expiration intent from physical eviction.
- **Decision:** The Domain defines the logical expiration policy. Infrastructure executes the physical expiration.
- **Consequences:** Keeps the domain pure and testable while allowing infrastructure to optimize physical memory management.

### ADR-6: Invalidation Boundary

- **Context:** Handling cache invalidation triggers.
- **Decision:** The Domain defines the invalidation intent. Infrastructure performs the physical invalidation of stored payloads.
- **Consequences:** Ensures invalidation logic remains a business concern independent of the physical storage engine used.

---

## 12. Official Architecture Review Board (ARB) Decision & Certification

```text
========================================================================
                 FINAL ARCHITECTURE CERTIFICATION
========================================================================
```

The Architecture Review Board (ARB) has completed the final review of the Enterprise Cache Foundation architecture. The architecture has been verified against the Official Roadmap Baseline v4.0, Clean Architecture, Domain-Driven Design (DDD), SOLID Principles, Enterprise Architecture, Dependency Rule, and Provider Neutrality.

**The ARB certifies that:**

- `CacheReference` is the official cross-context cache reference.
- `CacheEntryId` remains strictly internal to the Cache Platform.
- `CacheOwnerReference` is the exclusive mechanism for referencing external ownership.
- `CacheEntry` contains only provider-neutral metadata and immutable cache definitions.
- `CacheKey` is permanently immutable.
- Cache Definition is completely separated from Cache Execution.
- Cache Lifecycle is limited to the logical lifecycle of cache entries.
- Physical cache creation, retrieval, expiration, invalidation, eviction, and cleanup remain exclusively Infrastructure responsibilities.
- Repository contracts follow the Specification Pattern.
- Domain Events are restricted to business-significant lifecycle transitions.
- The platform contains no infrastructure assumptions.
- The platform contains no vendor-specific terminology.

```text
========================================================================
                         ARCHITECTURE FREEZE
========================================================================
```

The Enterprise Cache Foundation Architecture is hereby declared the permanent **Architecture Baseline** for Phase 5.9.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.8 Basic Search Implementation Baseline](../BasicSearch/phase-05-08-basicsearch-implementation-baseline.md)
- **Next**: [Phase 5.9 Cache Implementation Baseline](phase-05-09-cache-implementation-baseline.md)
