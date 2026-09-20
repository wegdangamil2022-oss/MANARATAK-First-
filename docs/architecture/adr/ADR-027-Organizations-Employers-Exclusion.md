# ADR-027: Exclusion of Organizations & Employers Platform

**Decision ID:** ADR-027
**Title:** Exclusion of the Organizations & Employers Platform from the Finalized Architecture
**Status:** Approved & Baselined
**Context:**
An early architecture review finding indicated the absence of a dedicated "Organizations & Employers Platform" responsible for centralizing Sponsors, Employers, Educational Partners, Recruitment Agencies, and Institutional Partners. A prior, draft-level decision (ADR-026) briefly considered formalizing this as Phase 18. However, the MANARATAK 2.0 enterprise architecture is now fully finalized across all 24 phases. Phase 18 has been permanently allocated to the Enterprise Student Tools Platform. The ARB was tasked with conducting a final impact assessment on whether a dedicated Organizations Platform is required.

**Problem Statement:**
Creating a single, monolithic "Organizations & Employers Platform" attempts to group disparate business entities based purely on their structural identity (being a B2B organization) rather than their behavioral domain contexts. This risks creating an anemic, highly coupled generic data service rather than a cohesive business platform.

**Decision:**
The Architecture Review Board (ARB) has decided to **intentionally exclude** the Organizations & Employers Platform from the final MANARATAK 2.0 architecture.

- This is an intentional architectural decision rather than an omission.
- Future architectural reviews must treat this issue as **CLOSED**.
- The platform may only be introduced in the future through a new Architecture Review Board (ARB) approval and an approved Architecture Decision Record (ADR).
- This decision supersedes and overturns any prior draft decisions (including ADR-026) that proposed establishing this bounded context.
- The roadmap remains fixed at 24 phases.

**Architectural Principle:**
MANARATAK 2.0 does not centralize entities solely because they are organizations. Entities are modeled according to their business behavior, lifecycle, ownership, and bounded context. Sharing the same structural identity (being an organization) is NOT sufficient justification for creating a Platform. This principle becomes part of the enterprise architectural doctrine.

**Rationale:**

1. **Domain Cohesion:** Organizational entities are owned by the bounded context in which they participate. There is no centralized enterprise organization registry. Each bounded context owns only the organizational relationships required for its own business behavior.
2. **Roadmap Finality:** The enterprise roadmap is finalized at 24 phases. Re-introducing a foundational B2B platform would require cascading refactoring across multiple finalized phases.
3. **YAGNI (You Aren't Gonna Need It):** The finalized platforms are fully capable of managing their specific B2B relationships natively without relying on a centralized organizational registry.

**Alternatives Considered:**

- **Implement as Phase 18:** Rejected. Phase 18 is strictly finalized as the Enterprise Student Tools Platform.
- **Append as a New Phase (Phase 25):** Rejected. The architecture is locked and finalized. Adding generic master data management platforms at this stage violates architecture simplicity and current roadmap constraints.

**Architectural Consequences:**

- **Positive:** Preserves the purity of existing Bounded Contexts. Specialized platforms retain sovereign ownership of the B2B entities relevant exclusively to their domains.
- **Positive:** Prevents the creation of a monolithic bottleneck that all other platforms would have had to integrate with for basic B2B operations.

**Business Consequences:**

- Business processes involving employers remain isolated within the Career domain, ensuring specialized focus on recruitment features without being bogged down by generic corporate registry requirements.

**Scope Impact:**

- The enterprise scope remains firmly fixed on the finalized 24-phase roadmap. No new platforms are added.

**Governance Impact:**

- This ADR serves as the definitive ruling on organizational entities. Any future attempts to centralize B2B organizations must challenge this ADR explicitly.

**Final ARB Decision:**
APPROVED - The Organizations & Employers Platform is permanently excluded from MANARATAK 2.0.
