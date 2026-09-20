# Phase-16-01-Enterprise-CMS-Architecture-Specification

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

## 1. Document Information

- **Project:** MANARATAK 2.0
- **Phase:** Phase 16
- **Part:** Part A
- **Title:** Enterprise CMS Architecture Specification
- **Artifact Type:** Enterprise Architecture Specification
- **Classification:** Foundation Architecture
- **Status:** Approved
- **Version:** 1.0 (Official)
- **Approval Authority:** Architecture Review Board (ARB)
- **Architecture Status:** Frozen
- **Document Status:** Official
- **Approval Type:** Enterprise Architecture Approval

## Governance Note

**This document serves as the authoritative architectural blueprint for the Enterprise CMS.**
All implementation work performed in Phase 16 Part B and Phase 16 Part C must comply with this architecture.
No implementation may contradict this document.
No future modification may occur unless approved through a formal ADR and Architecture Review Board (ARB) process.

## 2. Vision

To provide a globally scalable, decoupled, and highly resilient content ecosystem that empowers editorial teams to craft, compose, and distribute localized informational content globally, serving as the singular authoritative voice for MANARATAK 2.0 without ever entangling business logic.

## 3. Mission

To deliver the Enterprise CMS as an autonomous, API-first headless platform that orchestrates the complete editorial content lifecycle, providing robust localization, CMS-managed block composition, and editorial metadata optimization, while strictly adhering to the mandated architectural boundaries that isolate editorial content from transactional business domains.

## 4. Enterprise Content Philosophy

The Enterprise CMS exists as the sole guardian of organizational narrative and informational content. It operates under the philosophy that editorial knowledge is a distinct enterprise asset, fundamentally separate from transactional business data. By acting as the single editorial authority, it ensures that the enterprise speaks with a unified, localized, and consistent voice across all touchpoints, preventing the fragmentation of content across isolated business silos.

## 5. Enterprise Objectives

- **Centralized Editorial Authority:** Establish a single platform for managing all non-transactional, informational, and promotional content across the enterprise.
- **Decoupled Delivery:** Ensure content delivery remains completely decoupled from core business operations, enabling sub-second content distribution globally via the delivery tier.
- **Unconstrained Localization:** Provide an unconstrained, multi-tiered localization strategy that supports deep regional context without structural duplication.
- **Workflow-Driven Governance:** Enforce strict editorial governance through comprehensive, role-based multi-stage review workflows prior to publication.

## 6. Architectural Goals

- **Strict Separation of Concerns:** Guarantee zero bleed of business entities into the CMS domain.
- **High Availability (AP Bias):** Prioritize Availability and Partition Tolerance (AP) in the CAP theorem for content delivery; slightly stale content is strictly preferred over delivery failure.
- **Composable Content:** Support CMS-managed content block composition via reusable editorial widgets, blocks, and metadata components.
- **CQRS Native Integration:** Consume projected Read Models from other domains rather than engaging in direct synchronous queries.

## 7. Architectural Principles

- **API-First & Headless:** Content must be fully decoupled from presentation. All content is exposed via structured data payloads.
- **Event-Driven Distribution:** State changes (Draft, Published, Archived) must emit domain events to trigger downstream caching invalidation, and external index updates.
- **Immutability in Versioning:** Every published state is immutable. Updates create new draft versions rather than mutating historical records.
- **Localization-First:** Every content node must be inherently localizable from inception.

## 8. Editorial Governance Principles

- **Editorial Authority:** The Enterprise CMS exercises absolute authority over all published organizational narratives and non-transactional communications.
- **Separation of Duties:** Authorship and approval must be structurally separated to prevent unilateral publication of sensitive enterprise information.
- **Content Ownership:** Every content entity must have a clearly defined owner responsible for its accuracy, relevance, and lifecycle.
- **Editorial Independence:** Content creation and validation must proceed independently of software release cycles or transactional business workflows.

## 9. Content Governance

- **Quality & Consistency:** All content must adhere strictly to enterprise brand guidelines, structural schemas, and taxonomic standards before reaching the publication phase.
- **Lifecycle Governance:** Content is actively managed from inception through archival, preventing the accumulation of outdated, orphaned, or inaccurate information.
- **Compliance Readiness:** The governance model ensures that content workflows can accommodate future regulatory or legal compliance reviews seamlessly.

## 10. Compliance Principles

- **Traceability:** Every modification, approval, and state transition within the content lifecycle is permanently recorded.
- **Auditability:** The architecture provides a complete, unalterable historical ledger of all editorial actions to satisfy internal and external auditing requirements.
- **Legal Retention:** Archived content is securely retained according to enterprise data retention policies, ensuring historical availability for legal or compliance inquiries.
- **Content Integrity:** Delivery mechanisms ensure that published content remains tamper-proof and authentic from the origin to the consumer.

## 11. Enterprise CMS Responsibilities

The Enterprise CMS Context is solely responsible for:

- The creation, orchestration, and curation of Editorial Content (Articles, News, static informational pages, study guides, and CMS-managed content blocks).
- The structure and management of CMS-managed editorial navigation metadata (Menus, Redirects, and editorial content URL paths).
- Optimization and global localization logic (SEO, Metadata, and Slugs for editorial content).
- The editorial and publishing workflow lifecycle, including versioning and auditing of content states.
- Taxonomic classification of editorial content (Tags, Categories).

## 12. Explicit Non-Responsibilities

To prevent the anti-pattern of a "God CMS," this bounded context explicitly excludes:

- **Business Logic:** Does not execute, validate, or own business transactions (e.g., course enrollments, scholarship applications).
- **Business Entities:** Does not own, manage, or persist core enterprise entities (e.g., Courses, Universities, Scholarships, User Profiles).
- **Media Asset Processing:** Does not store binary files, transcode video, or optimize images (delegated strictly to Phase 05 — Enterprise Asset Platform).
- **User Identity:** Does not manage end-user authentication or authorization profiles.
- **Public Page Composition:** Does not own public page assembly, public layout templates, visitor-facing routing experience, or final rendering composition (all owned by Phase 24 — Enterprise Public Platform).
- **Global Search Platform:** Does not own or run a global search engine or enterprise search platform.

## 13. Enterprise Content Ownership Reference

This architecture is strictly bound by the approved **Enterprise Content Ownership Model**.

- The **Enterprise CMS** is the ONLY CMS in the enterprise.
- Business Domains (e.g., Phase 13 — Learning Platform) are Enterprise Platforms, NOT CMSs.
- The Enterprise CMS owns **ONLY** Editorial Content.
- Business Domains own **ONLY** Business Data.
- The Enterprise CMS consumes cross-domain data exclusively via **Read Models**.
- The Enterprise CMS **never** owns Business Entities.
- **Phase 05 — Enterprise Asset Platform (EAP)** owns the complete Media/Asset Lifecycle.

### 13.1 Cross-Phase Content & Data Ownership Boundary

To reinforce Section 12 and 13, the Enterprise CMS complies with explicit cross-phase data ownership rules across public and detail pages:

- **Editorial Copy Ownership**: Phase 16 owns only long-form editorial narratives, promotional copy, study guides, provider descriptions, and marketing content for course pages. It DOES NOT own course entities, import rules, pricing rules, progress, or certificates.
- **Domain Record Non-Ownership**: Phase 16 DOES NOT own canonical domain records or structured detail datasets (e.g. Course curriculum, University tuition/rankings, Scholarship funding/deadlines, Country reference codes).
- **Composite Page Role**:
  - **Country Destination Pages**: Phase 16 supplies long-form editorial country guidance, while Phase 07 — Enterprise Reference Data, Phase 10 — Enterprise Majors Platform (or approved Majors read models), Phase 11 — Universities & Institutions, Phase 12 — Scholarships, Phase 13 — Learning Platform, and Phase 20 — Enterprise Services Platform supply structured Read Models. Phase 24 — Enterprise Public Platform owns public page assembly, routing, and composes the final page.
  - **University Detail Pages**: Phase 16 supplies editorial marketing copy if needed; Phase 11 — Universities & Institutions owns structured university data.
  - **Scholarship Detail Pages**: Phase 16 supplies editorial scholarship guides if needed; Phase 12 — Scholarships owns structured scholarship data.
  - **Course Detail Pages**: Phase 16 supplies editorial copy, long-form narratives, and marketing/promotional content if needed; Phase 13 — Learning Platform owns structured course data, provider DTOs, import validation, and completion events. Phase 14 — Enterprise Certificates Platform owns certificates, and Phase 05 — Enterprise Asset Platform (EAP) owns asset handles. Phase 16 must not own course entities, import rules, pricing rules, progress, or certificates.

## 14. Bounded Context Position

Within the Enterprise Modular Monolith, the Enterprise CMS sits at the periphery, acting as an integration hub for presentation concerns. It is completely isolated from the transactional core. It relies heavily on the Event Platform for disseminating state changes and the Shared Infrastructure for persistence, while actively projecting data for external consumption without holding locks on business operations.

## 15. Relationship with Enterprise Platforms

- **Phase 13 — Learning Platform:** The CMS creates promotional content blocks and guides for courses, but consumes Course Read Models. It does not own the syllabus or educational metadata.
- **Phase 12 — Scholarships:** The CMS publishes informational articles and guides about financial aid, consuming Scholarship Read Models. It does not process applications or own eligibility rules.
- **Phase 11 — Universities & Institutions:** The CMS builds promotional editorial content for partner institutions, consuming University Read Models. It does not govern institutional or accreditation data.
- **Phase 07 — Enterprise Reference Data:** The CMS provides travel guides or localization rules, consuming Country/Reference Read Models. It does not define geopolitical boundaries or reference data.
- **Partnerships Editorial Context:** The CMS may publish editorial articles and news about enterprise partners, but it does not manage or own partner relationships, B2B contracts, employers, organizations, or institutional business entities.
- **Phase 05 — Enterprise Asset Platform (EAP):** The CMS references media assets exclusively via standard `AssetId` and `AssetReference` handles. EAP wholly owns binary upload, optimization, storage, transcoding, and physical storage paths.
- **Enterprise Search Capabilities:** The CMS emits content publication events, maintains CMS-managed content indexes, and exposes editorial metadata for approved search/read-model consumers. It does not own a global search platform or search engine.
- **Phase 17 — Enterprise AI Platform:** The Enterprise AI Platform is the single owner of all Artificial Intelligence capabilities. The CMS acts exclusively as a consumer of AI services (e.g., requesting automated translation or summarization drafts). The CMS does not own prompts or implement AI orchestration. All AI-generated output remains strictly advisory until it passes human editorial approval.
- **Phase 15 — Enterprise Student Platform:** The CMS does not own student profiles, but may serve personalized content variations based on non-PII demographic segments provided via the delivery tier.
- **Notification Platform:** The CMS triggers notifications for the editorial team (e.g., "Review Required") via the Notification Platform.
- **Analytics Platform:** The CMS provides structured identifiers so the Analytics Platform can track engagement metrics per content node.

## 16. Supported Editorial Content Types

The architecture natively supports diverse informational topologies:

- **Static Pages:** Editorial definitions for static informational/evergreen content (e.g., About Us, Privacy Policy).
- **Articles & News:** Time-sensitive informational publications.
- **Editorial Content Blocks:** Informational block structures for configuring marketing content or defining CMS-managed widgets that integrate cross-domain Read Models.
- **Announcements:** High-priority, site-wide alert banners.
- **Reusable Components:** Granular blocks (e.g., a "Testimonial" block) that can be embedded across multiple editorial pages.

## 17. Content Lifecycle

The structural lifecycle of any content entity ensures data integrity:

1.  **Instantiation:** Creation of the base node and global identifier.
2.  **Drafting:** Iterative modification in an isolated, unpublished state.
3.  **Review:** Submission into the Workflow Engine for governance validation.
4.  **Publication:** Promotion to the live Delivery API, triggering cache invalidations.
5.  **Archival:** Deprecation of content, triggering redirect generation and index removal.

## 18. Publishing Lifecycle

Distinct from the structural lifecycle, the Publishing Lifecycle governs global visibility:

- **DRAFT:** Visible only to the internal editorial interfaces.
- **SCHEDULED:** Held in state until a temporal trigger fires via the background execution engine.
- **PUBLISHED:** Fully distributed to the global delivery tier and available via public endpoints.
- **ARCHIVED:** Removed from public availability; historical version retained in the canonical storage.

## 19. Review Workflow

Content must survive a rigorous governance workflow:

- **Maker-Checker Constraints:** The author (Maker) cannot be the publisher (Checker).
- **Multi-Stage Approval:** Drafts must pass semantic review, localization review, and search optimization validation.
- **Rejection Routing:** Rejected content returns to the Draft state with attached editorial feedback.

## 20. Localization Strategy

- **Base Language Designation:** Every content node establishes a foundational language.
- **Sparse Localization:** Translations are treated as sparse overlays. If a specific field is not translated, the delivery layer falls back to the Base Language.
- **Independent Lifecycles:** A secondary language translation can be in a draft state while the primary base language is fully published.

## 21. Versioning Strategy

- **Immutable Snapshots:** Every transition to a published state generates an immutable snapshot.
- **Audit Trail:** The system tracks the exact differential, temporal metadata, and identity of the actor for every version.
- **Rollback Capability:** The architecture supports instantaneous restoration of any historical snapshot.

## 22. Search Optimization Architecture

- **Deterministic Routing:** URL structures are explicitly mapped, preventing duplicate content penalties.
- **Global Meta Management:** Centralized control over page titles, descriptions, and external sharing metadata schemas.
- **Automated Indexing:** Emitting events to dynamically regenerate discovery maps whenever content state changes.
- **Canonical Enforcement:** Absolute resource locators are strictly generated to prevent cross-domain canonical cannibalization.

## 23. Navigation Architecture

- **Decoupled Menus:** Site navigation (Headers, Footers, Sidebars) is modeled as independent aggregates, not hardcoded into pages.
- **Hierarchical Trees:** Supports deeply nested, ordered routing structures.
- **Dynamic Resolution:** Navigation items can explicitly link to external Domain Read Models.

## 24. Reusable Content Components

- **Block-Based Authoring:** Content is constructed from strongly-typed schemas (e.g., Hero Banner, Rich Text, Image Gallery) rather than monolithic unstructured blocks.
- **Write Once, Render Anywhere:** A single component can be referenced by multiple layouts. Updating the source component instantly updates all downstream consumers via cache invalidation.

## 25. Content Composition

Content composition is the orchestration of structured data payloads. Phase 16 owns CMS-managed editorial block schemas and content payload definitions consumed by Phase 24 during public page composition. The CMS acts as the editorial content aggregator, exposing these structured block configurations and metadata that the public layout layers (owned by Phase 24 — Enterprise Public Platform) interpret, assemble, and render into the final visitor-facing pages.

## 26. Widget Architecture

Widgets represent dynamic placeholders within the CMS content that require real-time resolution.

- The CMS stores the configuration of the Widget.
- At runtime, the presentation layer (Phase 24) executes the widget logic, querying the respective domain's Read Models to assemble the final interface.

## 27. Page Layout Composition Role

The spatial page routing, public layout structures, and final composite rendering are strictly managed by Phase 24 — Enterprise Public Platform. Phase 16 provides the editorial content, metadata schemas, and configurable CMS blocks to populate these templates. This separation ensures editorial flexibility without entangling CMS in final presentation routing or composition.

## 28. Multi-Site Strategy

The architecture natively supports the orchestration of multiple distinct digital properties, brands, or regional portals from a single unified CMS instance. It achieves this by contextualizing content nodes and navigation trees to specific site identifiers, ensuring that editorial teams can manage a global portfolio of experiences without duplicating the underlying platform infrastructure.

## 29. Multi-Tenant Readiness

The foundation is architecturally prepared for future multi-tenancy. While currently operating as a single-tenant enterprise platform, the underlying data models and routing schemas are designed with logical boundaries that can enforce strict tenant isolation, should the enterprise require distinct organizational partitions in the future.

## 30. Content Distribution Strategy

Editorial content is distributed across enterprise channels via a decoupled, omni-channel approach. The Enterprise CMS serves as the singular source of truth, broadcasting structured content to web portals, mobile applications, and partner integrations simultaneously, ensuring absolute consistency regardless of the consumption medium.

## 32. Security Principles

- **Input Sanitization:** Absolute validation against registered block schemas to prevent injection attacks and unauthorized content execution.
- **Delivery Isolation:** The public delivery layer is physically separated and permission-scoped away from the internal authoring environment.

## 33. Permission Philosophy

- **Granular RBAC:** Access is scoped by Action (Create, Edit, Publish) and Context (Locale, Category).
- **Principle of Least Privilege:** An editor for a specific regional locale cannot modify alternative regional content or trigger publication if they lack explicit checker rights.

## 34. Performance Principles

- **Static at the Edge:** All published content is designed to be highly cacheable at the global distribution tier.
- **Event-Triggered Invalidation:** Domain events drive surgical cache invalidation, eliminating the need for time-based expiration polling.

## 35. Scalability Principles

- **Read-Heavy Optimization:** The read-to-write ratio in a CMS is exceptionally high. The delivery layer scales horizontally, fully decoupled from the heavier, transactional authoring capabilities.
- **Stateless Delivery:** The delivery layer maintains zero session state, allowing for infinite horizontal scaling across stateless compute nodes.

## 36. Future Extensibility

- **Plugin Architecture:** The core CMS engine is designed to accept plugins for extending block schemas, adding custom validation rules, or integrating third-party editorial tools.
- **Experimentation Readiness:** The schema architecture supports multivariate payload delivery, laying the foundation for future edge-based optimization and testing.

## 37. Architecture Summary

The Phase 16 Enterprise CMS Platform delivers a strictly isolated, highly scalable, API-first headless content engine. By enforcing the Enterprise Content Ownership Model, it guarantees that marketing and editorial teams can compose rich, localized, dynamic experiences globally without ever compromising the structural integrity or performance of MANARATAK 2.0's core transactional business domains.

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
- **Date:** 2026-07-24
- **Approver:** ARB

### Status

- **Current Status:** Baselined Architecture Specification

---

## Navigation

- **Previous:** [Phase 15 — Enterprise Student Platform](../phase-15-enterprise-student-platform/phase-15-01-architecture-specification.md) (or corresponding baseline)
- **Next:** [Phase 17 — Enterprise AI Platform](../phase-17-enterprise-ai/phase-17-01-architecture-specification.md) (or corresponding baseline)
