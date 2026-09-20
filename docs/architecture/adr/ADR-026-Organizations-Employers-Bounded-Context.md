# ADR-026: Organizations & Employers Bounded Context & Reference Remediation

> [!CAUTION]
> **SUPERSEDED AND OVERTURNED**
> This ADR (ADR-026) is no longer active and has been explicitly overturned by **ADR-027**.
> The proposed "Organizations & Employers Platform" must NOT be used for implementation, roadmap planning, or as an active dependency target. The finalized enterprise roadmap remains at 24 phases, and Phase 18 is officially the **Enterprise Student Tools Platform**.
> This document is preserved purely for historical context.

## 1. ADR Metadata

- **ADR ID:** ADR-026
- **Title:** Organizations & Employers Bounded Context & Reference Remediation
- **Status:** Superseded by ADR-027
- **Version:** 1.0.0
- **Date:** 2026-07-23
- **Decision Owner:** Chief Enterprise Software Architect
- **Reviewers:** Principal Domain Architects, Governance Lead, Security Architect
- **Approval Authority (ARB):** Architecture Review Board

## 2. Decision Status

**Superseded by ADR-027** (Pending Execution Authorization)

---

## 3. Context

During the execution of the Architecture Repair Program (ARP), an audit of Phase 01 through Phase 17 architectural documentation (recorded in `AUDIT-ARP-002-DANGLING-REFERENCES`) revealed a critical architectural anomaly regarding data ownership:

Multiple enterprise domain specifications—including Phase 09 (International Tests), Phase 10 (Academic Majors), Phase 11 (Universities & Institutions), Phase 12 (Scholarships), Phase 13 (Learning Platform), Phase 14 (Certificates & Credentials), Phase 16 (Enterprise CMS), and early Phase 05 baselines—reference external entities such as **Organizations**, **Employers**, **Corporate Sponsors**, **Accrediting Bodies**, and **Recruitment Agencies**.

However, several of these specifications incorrectly asserted that Phase 07 (Enterprise Reference Foundation) serves as the "canonical owner" or "SSoT" for Organization entities.

An audit of Phase 07 (`phase-07-01-architectural-baseline.md`, `phase-07-02-domain-contracts.md`) demonstrates that Phase 07 is strictly a low-level infrastructure layer designed exclusively for:

1. Static system taxonomies (Countries, Cities, Currencies, Languages).
2. Polyhierarchical DAG (Directed Acyclic Graph) structures managed via closure tables.
3. System-wide code standards and localized string lookups.

Phase 07 holds zero business capability for managing B2B corporate profiles, employer verification workflows, sponsor agreements, organizational hierarchies, B2B multi-tenant memberships, or recruitment agency accounts.

This creates a fundamental Data Ownership gap in the MANARATAK 2.0 Master Blueprint: business domain specifications depend on an "Organization Bounded Context" that lacks a dedicated, top-level Phase definition.

---

## 4. Problem Statement

The assumption that Phase 07 owns B2B Organization entities introduces major enterprise architectural risks:

1. **Infrastructure & Domain Layer Contamination:** Forcing Phase 07 (Reference Data) to store corporate profiles, B2B contract metadata, employer verification statuses, and sponsor logos violates the Single Responsibility Principle (SRP) and contaminates the immutable reference infrastructure.
2. **Data Ownership Ambiguity:** Domains like Scholarships (Phase 12), Universities (Phase 11), Certificates (Phase 14), and Learning Platform (Phase 13) lack a clear, authoritative domain contract for referencing B2B employers, sponsors, and accrediting bodies.
3. **Governance & Compliance Risk:** Enterprise B2B capabilities (such as corporate licensing, employer verification, sponsor portal access, and compliance audits) cannot be governed without a formal, sovereign Bounded Context.

---

## 5. Decision

The Architecture Review Board (ARB) hereby establishes the following three-part architectural decision:

### 5.1 Strict Demarcation of Phase 07 (Enterprise Reference Foundation)

Phase 07 is strictly confirmed as a **Pure Infrastructure Reference Layer**. Its responsibility is bounded strictly to static taxonomies, standard geographic/ISO codes, and DAG closure tables.

- Phase 07 **DOES NOT** own, store, or manage Organizations, Employers, Corporate Sponsors, Accrediting Bodies, or B2B Entities.
- All textual and code references in Phase 07 and dependent phases asserting Phase 07 ownership over Organizations are formally revoked.

### 5.2 Formal Establishment of "Organizations & Employers Platform" Bounded Context

The **Organizations & Employers Platform** is formally established as a sovereign Bounded Context and future Phase within the MANARATAK 2.0 Master Blueprint (designated as **Phase 18 / Bounded Context: Organizations & Employers**).

The Organizations & Employers Platform shall serve as the sole Single Source of Truth (SSoT) for:

- Corporate Profiles & B2B Entity Identity.
- Employer Verification & Accreditation Records.
- Scholarship Sponsors, Corporate Donors & NGO Funding Bodies.
- Educational Accrediting Bodies & Professional Regulatory Boards.
- Corporate Training Centers & B2B Cohort Membership Governance.

### 5.3 Mandated Re-Mapping Strategy for All Dangling References

All 13 dangling references identified across the architectural specification files shall be formally re-mapped from Phase 07 to the **Organizations & Employers Bounded Context (Phase 18 / `OrganizationsPlatform`)**:

1. **Phase 05 (Organization & Settings Baselines):**
   - `docs/phases/phase-05-core-implementation/baselines/Settings/phase-05-04-settings-architecture-baseline.md` (Line 123): Re-map `OrganizationId` scope from Phase 07 fallback to `OrganizationsPlatform`.
   - `docs/phases/phase-05-core-implementation/baselines/Organization/phase-05-03-organization-architecture-baseline.md`: Re-align draft Organization references with the formal Phase 18 Bounded Context.

2. **Phase 09 (International Tests Domain Contracts):**
   - `docs/phases/phase-09-tests-platform/phase-09-02-domain-contracts.md` (Section 9.B.1, Lines 12 & 82): Update architectural notes to explicitly defer test owning body organization identities to `OrganizationsPlatform` rather than Phase 07 Reference Foundation.

3. **Phase 10 (Academic Majors Domain Contracts & Specs):**
   - `docs/phases/phase-10-major-platform/phase-10-01-enterprise-architecture-specification.md` (Section 10.A.1, 10.A.3) & `phase-10-02-domain-contracts.md` (Section 10.B.1, Line 11, 35-37): Re-map `organizationReferenceId` from Phase 07 to `OrganizationsPlatform`.

4. **Phase 11 (Universities & Institutions Domain Contracts & Specs):**
   - `docs/phases/phase-11-universities-institutions/phase-11-01-enterprise-architecture-specification.md` (Section 11.A.4, 11.A.8) & `phase-11-02-domain-contracts.md` (Line 135): Re-map `accreditingBodyReferenceId` and accrediting body resolution from Phase 07 to `OrganizationsPlatform`.

5. **Phase 12 (Scholarships Domain Contracts & Specs):**
   - `docs/phases/phase-12-scholarships/phase-12-01-enterprise-architecture-specification.md` (Section 12.9) & `phase-12-02-domain-contracts.md` (Section 12.B.3, Lines 188, 203, 711): Re-map `IScholarshipSponsorEntity` optional organization links from Phase 07 Organization to `OrganizationsPlatform`.

6. **Phase 13 (Learning Platform Specs & Contracts):**
   - `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md` (Sections 13.A.12, 13.A.16, 13.A.18) & `phase-13-02-domain-contracts.md` (Lines 532, 795): Re-map corporate/institutional B2B provider references to `OrganizationsPlatform`.

7. **Phase 14 (Certificates & Credentials Specs & Contracts):**
   - `docs/phases/phase-14-enterprise-certificates-platform/phase-14-01-enterprise-architecture-specification.md` (Sections 14.A.7, 14.A.11) & `phase-14-02-domain-contracts.md` (Lines 96, 143): Re-map corporate/government issuer `organizationId` attributes to `OrganizationsPlatform`.

8. **Phase 16 (Enterprise CMS Architecture Specification):**
   - `docs/phases/phase-16-enterprise-cms/phase-16-01-enterprise-cms-architecture-specification.md` (Section 15): Re-map `Organization Platform Read Models` to explicitly reference `OrganizationsPlatform`.

---

## 6. Considered Alternatives

### Alternative A: Expand Phase 07 to Include Organization Data

- **Description:** Add Organization, Employer, and Sponsor tables/contracts directly into Phase 07 (Enterprise Reference Foundation).
- **Rationale for Rejection:** Rejected. Phase 07 is an infrastructure layer for pure reference taxonomies (Countries, Cities, Currencies). Adding mutable B2B corporate entities, verification statuses, and contact details bloats the infrastructure core and breaks Domain-Driven Design boundaries.

### Alternative B: Duplicate Organization Entities Local to Each Phase

- **Description:** Allow Phase 12 (Scholarships) to maintain its own Sponsors, Phase 11 (Universities) to maintain its own Accrediting Bodies, and Phase 14 (Certificates) to maintain its own Issuing Corporations.
- **Rationale for Rejection:** Rejected. Creating siloed, duplicate Organization entities across multiple phases violates the Single Source of Truth (SSoT) principle and prevents cross-domain analytics on corporate partnerships.

### Alternative C: Formally Establish "Organizations & Employers" as a Dedicated Bounded Context

- **Description:** Establish a sovereign Bounded Context ("Organizations & Employers Platform") and re-map all external domain references to point to it.
- **Rationale for Selection:** Accepted. This aligns strictly with DDD principles, preserves Phase 07 as a lean reference infrastructure layer, and gives B2B organization data a dedicated, governed home.

---

## 7. Architecture Constraints

1. **Zero Phase 07 Organization Mutations:** No contract in Phase 07 shall define an `Organization` aggregate root or entity.
2. **Loose Coupling via External Reference ID:** All consuming domains (Phases 09, 10, 11, 12, 13, 14, 16) shall reference organizations using a string identifier (`organizationReferenceId: string` or `organizationId: string`) pointing to `OrganizationsPlatform`, without tight ORM table coupling.
3. **TypeScript Interface Standards:** All updated domain contracts must strictly comply with ADR-025 (TypeScript interface syntax).

---

## 8. Architectural Consequences

- **Positive - Pure Infrastructure Isolation:** Phase 07 remains clean, lightweight, and focused purely on taxonomies and DAG closure tables.
- **Positive - Explicit B2B Governance:** Establishes a formal, dedicated home for corporate profiles, sponsors, accrediting bodies, and employers.
- **Positive - Master Blueprint Alignment:** Resolves all 13 dangling references across Phase 01 through Phase 17 architectural documentation.
- **Negative - Future Phase Planning:** Requires formal drafting of Phase 18 specification and domain contracts during subsequent architecture sprints.

---

## 9. Dependency Impact

- **Phase 07:** Clarified as purely taxonomy/DAG infrastructure.
- **Phases 05, 09, 10, 11, 12, 13, 14, 16:** All documentation text and interface comments asserting Phase 07 ownership over Organizations will be updated to point to the `Organizations & Employers Platform`.
