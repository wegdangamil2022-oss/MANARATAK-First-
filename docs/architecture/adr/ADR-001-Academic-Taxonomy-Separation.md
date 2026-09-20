# ADR-001: Academic Taxonomy Separation from Reference Platform

## 1. ADR Metadata

- **ADR ID:** ADR-001
- **Title:** Academic Taxonomy Separation from Reference Platform
- **Status:** Accepted
- **Version:** 1.0.0
- **Date:** 2026-07-19
- **Decision Owner:** Chief Enterprise Software Architect
- **Reviewers:** Principal Domain Architects, Data Architect
- **Approval Authority (ARB):** Architecture Review Board

## 2. Decision Status

**Accepted**

## 3. Context

In the initial conceptualization of the MANARATAK 2.0 architecture, academic classification entities (such as Fields of Study, Degree Types, Academic Disciplines, and Certification Levels) were grouped within a generic "Reference Platform." This broad Bounded Context was intended to house all read-heavy, static, or semi-static lookup data required across the enterprise.

However, as the architectural design matured, it became evident that grouping deeply specialized academic hierarchies with generic enterprise lookups (e.g., Countries, Currencies, Languages) created artificial coupling. The academic data possesses a distinct business lifecycle, complex hierarchical relationships, and localized editorial requirements that do not apply to standard reference data.

## 4. Problem Statement

The aggregation of Academic Taxonomy within the generic Reference Platform became structurally insufficient, presenting several critical architectural concerns:

- **Domain Growth:** The academic classification system is expanding into a deeply nested, graph-like taxonomy requiring specialized traversal and querying mechanisms.
- **Independent Lifecycle:** Academic taxonomies mutate based on international education standards and internal curatorial workflows, distinct from the near-static nature of generic reference data.
- **Business Ownership:** Content administrators and academic domain experts require specialized governance over academic classifications, whereas standard reference data is typically governed by system administrators.
- **Data Governance:** Commingling generic reference data with core academic domain logic blurred the boundaries of Data Governance and Master Data Management (MDM).
- **Future Scalability:** As the platform scales, the academic taxonomy will become the primary connective tissue for AI-driven semantic matching (e.g., matching a student to a highly specialized program).
- **Separation of Concerns:** The Reference Platform was violating the Single Responsibility Principle by managing both universally generic enums and highly specialized, domain-critical academic hierarchies.
- **Bounded Context Clarity:** The boundaries of the Reference Bounded Context were stretched too far, bleeding into the core educational domain.
- **Maintainability:** A single, monolithic reference service would become a deployment bottleneck and increase the blast radius of potential schema changes.

## 5. Decision Drivers

The following architectural drivers motivated the formal separation:

- **Domain-Driven Design (DDD) Purity:** Ensuring every Bounded Context represents a cohesive, singularly focused business capability.
- **Decentralized Data Ownership:** Aligning the physical architecture with the organizational structure by allowing academic subject matter experts to own their taxonomy.
- **AI Readiness:** Providing a dedicated, structured graph of knowledge that the AI Engine can ingest independently for semantic reasoning.
- **Performance Optimization:** Allowing tailored caching strategies (e.g., edge-caching deeply nested taxonomy trees) without impacting generic lookup caches.

## 6. Considered Alternatives

### Alternative A: Keep Academic Taxonomy inside Reference Platform

- **Description:** Maintain the status quo, housing all reference data in a single massive Bounded Context.
- **Advantages:** Simplifies initial infrastructure deployment; avoids creating a new domain service.
- **Disadvantages:** Violates DDD principles; creates an unmanageable monolithic domain; intertwines unrelated data lifecycles; complicates authorization and editorial workflows; impedes specialized caching and search indexing.

### Alternative B: Create an independent Phase 8 (Academic Taxonomy)

- **Description:** Extract all academic classification entities into a completely isolated, standalone Phase 8 (Academic Taxonomy) with its own Bounded Context, database schema, and dedicated API contracts.
- **Advantages:** Perfect alignment with DDD; clean separation of concerns; dedicated business ownership; tailored scalability and caching; robust foundation for future AI semantic analysis.
- **Disadvantages:** Introduces cross-domain dependencies for downstream platforms; requires establishing new inter-domain communication contracts; slightly increases infrastructure footprint.

### Alternative C: Split only selected entities

- **Description:** Extract complex hierarchies (e.g., Programs, Disciplines) but leave simple flat lists (e.g., Degree Types) in the generic Reference Platform.
- **Advantages:** Appears as a compromise that limits the size of the new domain.
- **Disadvantages:** Creates a fractured and highly confusing domain model; introduces ambiguity regarding where specific data resides; forces consuming platforms to query two distinct services to reconstruct a complete academic profile; violates architectural consistency.

## 7. Decision

**Alternative B is formally accepted.**

The Academic Taxonomy is hereby established as a fully independent, first-class enterprise domain (the Phase 8 (Academic Taxonomy)).

The Reference Platform will be strictly limited to managing truly generic, cross-domain lookup data (e.g., Geography, ISO codes, System Enums). All entities related to education, disciplines, programs, and academic hierarchies are migrating to the dedicated Phase 8 (Academic Taxonomy).

## 8. Decision Scope

- **Governed by this decision:** The logical separation of academic taxonomy (Fields of Study, Degree Types, Academic Disciplines, Certification Levels) from generic reference data, establishing it as a distinct and independent Bounded Context.
- **Outside of scope:** The physical data migration plan, specific technology selection, database schema design, and API contract specification for the new domain.
- **Unaffected domains:** Core infrastructure domains (e.g., Background Jobs, Configuration Architecture, Observability) and business domains that do not directly depend on academic classifications (e.g., Notifications).

## 9. Decision Constraints

- **No implementation details:** This decision governs logical architecture, not code-level implementation.
- **No technology selection:** Technology choices remain governed by the Master Blueprint.
- **No database decision:** The physical data storage layer is not dictated by this logical separation.
- **No deployment model changes:** The new platform will be deployed according to the existing deployment strategy.
- **No API specification:** API contracts will be designed during the implementation phase.
- **No changes to Modular Monolith architecture:** The new platform will be integrated as a modular component within the established modular monolith pattern.

## 10. Architectural Consequences

- **Positive - Scalability:** The Academic Taxonomy can be scaled independently, particularly optimized for complex graph traversals and edge-caching required by front-end applications.
- **Positive - Maintainability:** Smaller, highly cohesive codebases are easier to test, secure, and maintain.
- **Positive - Governance:** Clear assignment of Data Stewards for the Academic Taxonomy, separate from IT-managed generic reference data.
- **Positive - DDD Alignment:** Restores the purity of the Bounded Contexts.
- **Positive - Future Expansion:** Provides a solid, isolated foundation for future features like curriculum mapping and dynamic skill taxonomy.
- **Positive - CMS Integration:** The Enterprise CMS can seamlessly integrate with the Academic Taxonomy to build localized landing pages for specific fields of study.
- **Positive - AI & Search:** The AI Engine and Enterprise Search can ingest the taxonomy as a distinct knowledge graph to power semantic matching and intelligent routing.
- **Negative - Increased Latency:** Downstream platforms requiring both generic reference data and academic taxonomy data must now orchestrate requests across two distinct domains (mitigated via caching).
- **Negative - Integration Complexity:** Requires formal API contracts between the University/Phase 12 (Scholarships)s and the new Academic Taxonomy domain.

## 11. Affected Domains

- Reference Platform
- Phase 8 (Academic Taxonomy) (New)
- Phase 11 (Universities & Institutions)
- Phase 12 (Scholarships)
- Phase 15 (Enterprise Student Platform (Student Workspace))
- Universal Import Platform
- Enterprise Search Platform
- AI Engine

## 12. Dependency Impact

- **Phase 11 (Universities & Institutions):** Will consume the Phase 8 (Academic Taxonomy) as a mandatory dependency to classify Universities and Campus Programs.
- **Phase 12 (Scholarships):** Will consume the Phase 8 (Academic Taxonomy) to classify funding opportunities and eligibility criteria by academic discipline.
- **Phase 15 (Enterprise Student Platform (Student Workspace)):** Will consume the Academic Taxonomy to build structured student profiles, academic histories, and interests.
- **Import Platform:** ETL pipelines must be re-routed; academic classification data mapped from external providers will flow exclusively into the Phase 8 (Academic Taxonomy).
- **Search Platform:** Will index the Academic Taxonomy to provide unified, cross-platform autocomplete and faceted search capabilities.
- **AI Platform:** Will ingest the taxonomy via asynchronous event streams to build its semantic knowledge graph.

## 13. Decision Impact Matrix

| Domain                                                     | Impact Level | Required Action                                                            | Owner                          |
| ---------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- | ------------------------------ |
| Reference Platform                                         | High         | Deprecate and remove academic entities from the generic domain.            | Domain Architect (Reference)   |
| Phase 8 (Academic Taxonomy)                                | High         | Establish new Bounded Context, entity models, and API contracts.           | Domain Architect (Taxonomy)    |
| Phase 11 (Universities & Institutions)                     | Medium       | Update dependencies to consume taxonomy data from the new platform.        | Domain Architect (University)  |
| Phase 12 (Scholarships)                                    | Medium       | Refactor eligibility criteria dependencies to reference the new platform.  | Domain Architect (Scholarship) |
| Universal Import Platform                                  | Medium       | Re-route academic classification ETL pipelines to the new taxonomy domain. | Platform Architect (Import)    |
| Enterprise Search Platform                                 | Low          | Update indexing targets to ingest the new taxonomy graph.                  | Platform Architect (Search)    |
| AI Engine                                                  | Low          | Ingest the separated taxonomy to enhance semantic matching capabilities.   | Platform Architect (AI)        |
| Phase 15 (Enterprise Student Platform (Student Workspace)) | Low          | Update profile schemas to link to the new taxonomy service.                | Domain Architect (Student)     |

## 14. Migration Impact

This ADR dictates a fundamental shift in the logical architecture and the Bounded Context boundaries. It is an architectural decision regarding domain isolation and dependency graphing. It is not a data migration guide; physical database schema migrations and code-level refactoring will be executed as part of the core implementation phase adhering to these new boundaries.

## 15. Risks

- **Data Consistency:** Extracting the domain introduces the risk of eventual consistency delays if related data (e.g., a University assigned to a newly created Discipline) spans domain boundaries.
- **Network Latency:** Synchronous cross-domain calls between the Phase 11 (Universities & Institutions) and Phase 8 (Academic Taxonomy) could degrade performance.
- **Over-Engineering:** Creating a dedicated domain for taxonomy could be viewed as premature optimization if the hierarchy remains simple.

## 16. Risk Mitigation

- **Data Consistency:** The platform will rely on the Enterprise Event-Driven Architecture (Outbox Pattern) to broadcast taxonomy changes asynchronously, allowing downstream domains to maintain materialized views where strict consistency is not required.
- **Network Latency:** Implemented via aggressive multi-tiered caching (L1/L2) and Edge CDN. The Academic Taxonomy is highly read-heavy and mutates infrequently, making it an ideal candidate for extensive caching to eliminate synchronous database hits.
- **Over-Engineering:** The strategic roadmap (AI semantic matching, global scholarship routing) definitively proves the taxonomy will not remain simple. Proactive extraction prevents inevitable, highly disruptive refactoring later.

## 17. Compliance

- **Enterprise Architecture:** Aligns with the Master Blueprint's mandate for highly cohesive, loosely coupled systems.
- **DDD:** Strictly enforces Bounded Context boundaries and ubiquitous language.
- **Clean Architecture:** Ensures the domain logic of academic classification remains isolated from generic infrastructure and generic reference concerns.
- **Modular Monolith:** Validates the modular structure by ensuring the new platform can be deployed as an isolated module within the unified runtime.
- **Enterprise Governance:** Complies with Phase 1.30 and 1.31, representing a formally governed, reviewed, and documented architectural decision.

## 18. Related Documents

- MANARATAK-2.0-Master-Blueprint.md
- MANARATAK-2.0-Roadmap-v4.1.md
- Enterprise Architecture Governance (Phase 1.30)
- Enterprise Architecture Decision Management (Phase 1.31)

## 19. Decision Approval

- **Architecture Review Board (ARB):** Approved
- **Decision Owner:** Chief Enterprise Software Architect
- **Approval Date:** 2026-07-19

## 20. Future Review Trigger

This ADR must be formally reviewed by the Architecture Review Board (ARB) under any of the following conditions:

- Enterprise Architecture restructuring or large-scale domain decomposition.
- Migration toward a Microservices physical deployment architecture.
- Major redesign of the Academic Taxonomy structure (e.g., integrating a completely new international standard).
- Significant enterprise governance changes impacting data ownership.

## 21. Revision History

- **Initial Version (1.0.0):** Created to document the separation of the Phase 8 (Academic Taxonomy) from the generic Reference Platform.
