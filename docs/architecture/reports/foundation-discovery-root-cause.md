# MANARATAK 2.0
# P0-3 Prevent Reimplementation of Core Foundations
# Phase 1 — Discovery Addendum: Architectural Root Cause Analysis

## 1. Executive Summary
Before proceeding to the Consolidation Blueprint, the Architecture Review Board (ARB) has conducted a deep-dive analysis into *why* the duplicated foundations identified in Phase 1 occurred. The objective is to ensure the upcoming blueprint resolves the systemic architectural flaws rather than merely relocating code. 

The analysis reveals that the duplications are not random developer errors, but rather the result of a missing "Enterprise Shared Contracts" layer, Quasi-Shared Kernel Syndrome (where early domains absorbed enterprise responsibilities), and flawed interpretations of Domain-Driven Design (DDD) decoupling principles.

## 2. Root Cause Analysis by Component

### 2.1 Base Repositories & CQRS Interfaces (`IQueryService`, `IReferenceRepository`)
- **Location:** Phase 7 (Reference Data)
- **Why was it reimplemented?** Phase 7 was one of the first foundational data domains designed. It needed structural patterns to operate.
- **What prevented reuse?** There was no centralized `Enterprise Shared Contracts` package available during Phase 7's design.
- **Root Cause:** **Quasi-Shared Kernel Syndrome.** Because Phase 7 is foundational to the business, architects accidentally allowed it to absorb enterprise technical foundations. Downstream domains are now forced to either tightly couple to Phase 7 to reuse these interfaces or duplicate them entirely.

### 2.2 Event Envelopes (`IEnterpriseDomainEvent`, `IReferenceEvent`)
- **Location:** Phase 13 (Learning Platform), Phase 7 (Reference Data)
- **Why was it reimplemented?** Each domain needed to dispatch events and defined its own envelope to ensure compilation.
- **Was the dependency direction incorrect?** Yes. If Phase 13 defines the enterprise event envelope, it forces the global Event Bus to depend on the Learning Platform, violating the dependency rule. 
- **Root Cause:** **Intentional but Flawed Decoupling.** In strict DDD, domains shouldn't share internal models. However, an *Event Envelope* is an Enterprise Integration Contract, not an internal domain model. Failing to define a single shared `IIntegrationEvent` in a central core forces the message broker to handle fragmented payloads.

### 2.3 Specification Pattern (`ISpecification<T>`)
- **Location:** Phase 8 (Academic Taxonomy)
- **Why was it reimplemented?** Phase 8 required dynamic querying and filtering.
- **Was an enterprise equivalent unavailable?** The `packages/core` workspace contains a base specification, but Phase 8 redefined it as an interface (`ISpecification<T>`) tailored to its own domain.
- **Root Cause:** **Siloed Domain Modeling.** The domain architects prioritized local bounded context purity over enterprise reuse. They built a localized specification pattern rather than extending the enterprise core.

### 2.4 Domain-Specific Infrastructure (`IEnterpriseIdentifierGenerator.GenerateMajorIdentifier()`)
- **Location:** Phase 10 (Major & Degree)
- **Why was it reimplemented?** The domain needed a custom ID format.
- **Was the dependency direction incorrect?** Yes. The infrastructure interface was polluted with domain-specific vocabulary (`Major`).
- **Root Cause:** **Violated Dependency Inversion (Leaky Abstractions).** Instead of defining a generic infrastructure contract (`GenerateCanonicalId(prefix)`), the domain forced the infrastructure to know about "Majors". This forces the infrastructure package to be modified every time a new domain is added.

### 2.5 Validation & Mapping Utilities (`ICycleDetectionValidator`, `IDataMapper`)
- **Location:** Phase 7 (Reference Data)
- **Why was it reimplemented?** Reference Data heavily relies on hierarchical trees and external data ingestion.
- **What prevented reuse?** These utilities were nested inside the Phase 7 bounded context.
- **Root Cause:** **Missing Shared Utility Kernel.** Graph cycle detection and DTO mapping are universal computer science problems, not Reference Data business logic. Placing them in Phase 7 prevents the Academic Taxonomy (Phase 8) or Learning Paths (Phase 13) from reusing them without introducing lateral domain-to-domain coupling.

## 3. Systemic Architectural Failures Identified

1. **The "Missing Shared Contracts" Layer:** The primary driver of duplication is the absence of a dedicated, lightweight `Enterprise.Shared.Contracts` layer that sits below all bounded contexts in the dependency graph.
2. **Lateral Coupling Risks:** To reuse Phase 7's `IApiResponse` or `IQueryService`, other domains must reference Phase 7. This creates illegal lateral coupling between bounded contexts.
3. **Misapplied "Share Nothing" Principle:** Teams correctly applied DDD's "share nothing" principle to business logic, but incorrectly applied it to technical integration contracts (like Events and API Responses), breaking enterprise consistency.

## 4. Strategic Directives for the Consolidation Blueprint (Phase 2)
To permanently resolve these root causes, the Phase 2 Blueprint MUST:
1. Establish a strict `Enterprise Shared Contracts` boundary.
2. Forbid Bounded Contexts from defining cross-cutting technical abstractions (CQRS, Event Envelopes, API Wrappers).
3. Extract generic algorithms (Cycle Detection) and integration patterns (Data Mappers) into a shared utility foundation.
4. Refactor all "leaky" infrastructure interfaces (e.g., specific ID generators) into generic, parameterized contracts.

**Decision**: The root causes have been successfully identified.

GO to Phase 2 (Enterprise Foundation Consolidation Blueprint)
