# MANARATAK 2.0: Phase 21 (Enterprise Career & Alumni Platform) Enterprise Architecture

**Document ID:** PHASE-21-01-ARCH-SPEC
**Status:** Baselined & Approved
**Phase:** 21
**Domain:** Enterprise Career & Alumni Platform
**Artifact:** Part A - Architecture Specification

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

---

## 21.A.1 Executive Summary

The Enterprise Career & Alumni Platform (Phase 21) serves as the centralized engine managing the complete professional lifecycle of students and graduates within the MANARATAK 2.0 ecosystem. By consolidating career progression, job placements, recruitment pipelines, and alumni networking into a singular domain, this platform bridges the gap between academic achievement and professional execution.

---

## 21.A.2 Architectural Vision & Position

**Architectural Commentary**
The architectural vision is to establish a unified, highly scalable platform that serves as the absolute Single Source of Truth (SSoT) for careers, internships, graduate programs, recruitment employers, alumni, job applications, and career development. The architecture natively supports both current global employment ecosystems and future integrations without requiring systemic structural changes to core records.

### 21.A.2.1 The Career Ownership Boundary

Phase 21 exclusively owns the concepts of Career Profiles, Professional Portfolios, Recruitment Employer Metadata, Job Portals, Internship Portals, Graduate Programs, Alumni Networks, Job Applications, and Recruitment Workflows. It explicitly relies on Phase 15 — Enterprise Student Platform for foundational student identity data, isolating professional capability attributes from core demographic and academic records.

---

## 21.A.3 Enterprise Principles

1. **Single Source of Truth (SSoT):** This platform is the undisputed master system for all professional data, job listings, recruitment applications, and career development milestones across MANARATAK.
2. **Decoupled Lifecycle:** The professional lifecycle is independent of the academic lifecycle. A user transitions seamlessly from Student to Alumni without requiring identity duplication or systemic migration.
3. **Global Pluggability:** Job listings, employer recruitment metadata, and internships are architected globally, supporting unlimited regional employment permutations dynamically.
4. **Immutable Portfolio State:** Once a professional milestone (e.g., certification, degree completion) is verified, it acts as an immutable trust anchor for employers within the ecosystem.
5. **ADR-027 B2B Isolation:** Phase 21 owns recruitment-specific employer metadata, recruiter handles, job publishers, internship hosts, and alumni participants strictly within the Career & Alumni bounded context. In accordance with ADR-027, Phase 21 does NOT operate a general organization registry, B2B contract platform, or cross-domain organization master.

---

## 21.A.4 Platform Capabilities

**Architectural Commentary**
The platform is composed of dedicated, isolated capability modules ensuring that specific professional lifecycle events are handled by purpose-built aggregate roots.

Phase 21 explicitly assumes complete ownership and responsibility for:

- Career Profiles & Professional Portfolios
- CV & Resume Structured Data
- Skills Taxonomy & Competency Tracking
- Job Portal & Internship Portal
- Graduate Programs & Leadership Cohorts
- Recruitment Employer Metadata & Recruiter Workspaces
- Job & Internship Applications (Recruitment Funnels)
- Recruitment Workflows & Interview Management
- Career Roadmaps & Skill Gap Mapping
- Alumni Profiles & Alumni Networks
- Mentorship Programs & Career Events
- Career & Placement Read-Models

*Operational Boundaries:*
- Paid career services (e.g., professional CV writing, 1-on-1 coaching execution) are fulfilled operationally by Phase 20 — Enterprise Services Platform.
- AI features (e.g., AI resume reviews, AI interview coaching, skill-gap scoring, AI matching) are explicitly delegated to Phase 17 — Enterprise AI Platform.
- All payments, invoicing, and financial movements are managed via Phase 19 — Enterprise Finance & Payments Platform.

---

## 21.A.5 Career Profile & Portfolio Governance

**Architectural Commentary**
The Career Profile decouples professional representation from the core student academic record. It allows applicants to dynamically curate multiple professional artifacts suited for global recruitment.

The architecture supports complete professional profiles encompassing:

- **CV and Resume Data:** Structured resume data and version-controlled document references.
- **Asset Registration:** All uploaded CVs, resumes, cover letters, certificates, recommendation letters, and portfolio media MUST be registered with Phase 05 — Core Implementation Enterprise Asset Platform (EAP) using immutable `AssetId` / `AssetReference` handles.
- **Skills:** Taxonomical skill management (hard skills, soft skills).
- **Languages:** Proficiency scales and verified certificates.
- **Certifications:** Professional qualifications and digital badges.
- **Experience:** Chronological employment history and responsibilities.
- **Projects & Portfolios:** Detailed case studies, capstones, and asset handles.
- **External Links:** GitHub, LinkedIn, Personal Website integrations.
- **Career Interests:** Target industries, preferred locations, and expected compensation ranges.

---

## 21.A.6 Job Portal

**Architectural Commentary**
The Job Portal acts as the global marketplace aggregate. It separates the listing, discovery, and application mechanisms into distinct sub-domains optimized for search and filtering loads.

The architecture supports global job publishing across all boundaries:

- Jobs in Yemen
- Jobs in Saudi Arabia
- Jobs in UAE
- Jobs in Qatar
- Jobs in Kuwait
- Jobs in Oman
- Jobs in China
- International Jobs
- Remote Jobs

**Filtering capabilities strictly maintained:**

- Country & City
- Industry & Sector
- Employer Name
- Job Type & Employment Type (Full-time, Part-time, Contract, Remote)
- Experience Level
- Compensation ranges
- Education requirements
- Language proficiency

---

## 21.A.7 Internship Platform

**Architectural Commentary**
Internships represent a unique employment lifecycle phase requiring different governance, compliance, and academic reporting structures than standard full-time employment.

The platform explicitly supports:

- Internships
- Summer Training
- Apprenticeships
- Co-op Programs
- Industrial Training
- Student Placements

---

## 21.A.8 Graduate Programs

**Architectural Commentary**
Graduate programs bridge academic outcomes with elite enterprise onboarding. These programs require sophisticated cohort tracking and multi-stage assessment pipelines.

The platform architecture standardizes:

- Graduate Programs
- Future Leaders Programs
- Leadership Programs
- Fresh Graduate Programs
- Rotational Programs

---

## 21.A.9 Employer Directory & Recruiter Management

**Architectural Commentary**
In accordance with ADR-027, the Employer Directory maintains recruitment-specific employer metadata, recruiter accounts, job publishers, internship hosts, and alumni career participants strictly within the Career & Alumni bounded context. Phase 21 does NOT operate a centralized B2B contract registry, general organization database, or cross-domain organization master.

The domain models recruitment entities for:

- Yemeni Employers
- Saudi Employers
- Chinese Employers
- International Employers
- Government Agencies & NGOs (Recruitment Handles)
- Technology & Industry Employers

---

## 21.A.10 Service & Career Import Specification

**Architectural Commentary**
To populate and maintain career, job, and alumni datasets at scale, Phase 21 defines a rigorous Import Specification and Governance model.

### 21.A.10.1 Import Boundary Separation
- **Phase 06 — Import Foundation Platform Ownership:** Phase 06 owns generic import infrastructure, CSV/Excel/JSON file parsing, data streaming connectors, execution batching, row-level validation queues, duplicate detection execution, failed-row review queues, audit logs, and retry mechanics.
- **Phase 21 — Enterprise Career & Alumni Platform Ownership:** Phase 21 owns career-domain import schemas, field mapping rules, domain validation logic, completeness criteria, canonical naming normalization, deduplication merging logic, and administrative import state machine transitions.

### 21.A.10.2 Importable Datasets
Phase 21 supports governed batch imports for the following career-domain datasets:
1. **Job Listings:** Active and archived job postings from external or legacy sources.
2. **Internship Listings:** Short-term and placement opportunities.
3. **Graduate Programs:** Multi-stage rotational and leadership cohort listings.
4. **Recruitment Employers & Recruiters:** Employer metadata and recruiter handles for job posting.
5. **Alumni Records:** Historical graduate directories and career participant metadata.
6. **Professional Skills Taxonomies:** Standardized skill, industry, and role hierarchies.
7. **Career Events:** Job fairs, networking webinars, and campus recruitment schedules.
8. **Mentorship Opportunities:** Mentor profiles and topic classifications.
9. **External Job Board References:** Syndicated job handles and external source mappings.

### 21.A.10.3 Job Listing Field Requirements
- **Mandatory Fields:** Every imported job record MUST specify:
  - `jobTitle`: Public vacancy title.
  - `employerReferenceId`: Assigned employer handle in Phase 21.
  - `employmentType`: Employment model (e.g., FullTime, PartTime, Contract, Internship).
  - `jobCategory`: Assigned industry or functional category.
  - `jobDescription`: Comprehensive scope and responsibility summary.
  - `country`: Country location (or Remote identifier).
  - `applicationDeadline`: Expiration date for candidate submissions.
  - `recruiterContactId`: Assigned recruiter handle.
- **Optional Fields:**
  - `city`, `salaryRange`, `currencyCode`, `experienceLevelYears`, `requiredSkills`, `educationRequirement`, `languageRequirements`, `remoteOptionBoolean`, `externalPostingUrl`.

### 21.A.10.4 Canonical Naming & Deduplication Rules
- **Canonical Name Normalization:** All imported job titles and employer names MUST be automatically normalized by stripping marketing fluff (e.g., "Urgent Hiring!", "Best Opportunity 2026!"), emojis, source platform clutter, and duplicate spacing.
- **Deduplication Matching Key:** Duplicates are detected using a composite match key: `canonicalJobTitle` + `employerReferenceId` + `countryOrCity` + `employmentType`.
- **Safe Metadata Merging:** When a duplicate listing is detected, missing optional fields are merged into the existing record without duplicating active job postings.
- **Immutability of Published Listings:** Admin-reviewed or published job listings MUST NEVER be silently overwritten by subsequent batch imports.

### 21.A.10.5 Administrative Import Lifecycle States
Imported career records MUST progress through a governed administrative lifecycle:
- `Imported`: Staged raw data ingested from Phase 06.
- `Incomplete`: Lacks mandatory fields or contains invalid skill taxonomy codes.
- `Complete`: All mandatory fields present and structurally valid.
- `NeedsReview`: Marked for administrative review due to unusual compensation or regulatory flags.
- `ReadyToPublish`: Approved by administrators for catalog publishing.
- `Published`: Live and discoverable in the active Job Portal.
- `Rejected`: Flagged as non-compliant or fraudulent.
- `Archived`: Expired or retired listing.

---

## 21.A.11 Integration Model

**Architectural Commentary**
Phase 21 interacts across the enterprise using strictly defined boundary contracts and official phase integrations:

- **Phase 15 — Enterprise Student Platform:** Consumes core student identity and academic status.
- **Phase 11 — Universities & Institutions:** Verifies institutional degrees, graduation status, and academic placement credits.
- **Phase 17 — Enterprise AI Platform:** Delegates AI resume parsing, AI resume reviews, AI interview coaching, skill-gap calculations, and AI match scoring to Phase 17.
- **Phase 20 — Enterprise Services Platform:** Routes requests for professional service execution (e.g., professional CV writing, 1-on-1 coaching) to Phase 20.
- **Phase 19 — Enterprise Finance & Payments Platform:** Routes all monetized recruiter job posting fees, featured listing invoices, and payment movements to Phase 19.
- **Phase 05 — Core Implementation:** Registers all professional files (CVs, cover letters, certificates, portfolios, logos) via Enterprise Asset Platform (EAP) `AssetId` handles.
- **Phase 23 — Enterprise Administration Portal:** Exposes placement rate, skill gap, and recruitment health read-models for executive oversight.
- **Phase 24 — Enterprise Public Platform:** Supplies public job search, internship catalog, and alumni network presentation views.

---

## 21.A.12 Scalability Strategy

**Architectural Commentary**
The professional ecosystem generates high data velocity as applications, profile updates, and global listings scale. The architecture natively supports horizontal scaling.

The platform guarantees structural capability for:

- Unlimited Employers (Recruitment Metadata)
- Unlimited Jobs & Internships
- Unlimited Job Applications
- Unlimited Graduates & Alumni
- Unlimited Countries & Regions
- Unlimited Industries & Skill Taxonomies

---

## 21.A.13 Future Evolution

**Architectural Commentary**
While Phase 21 targets current recruitment paradigms, the architectural boundaries reserve capacity for future integrations without database schema modifications.

The architecture explicitly delegates AI execution to Phase 17 — Enterprise AI Platform while storing advisory results for:

- AI Career Recommendations (via Phase 17)
- AI Resume Review & Scoring (via Phase 17)
- AI Interview Coach (via Phase 17)
- External Job Boards syndication
- Deep LinkedIn & GitHub profile handle synchronization
- Global Recruitment Platforms bridging
- Professional Certifications verification
- Enterprise HR Integration (ATS compatibility)

---

## 21.A.14 Architecture Constraints

**Architectural Commentary**
To maintain enterprise integrity, the following constraints are immutable across Phase 21:

1. **No Identity Silos:** Phase 21 MUST NOT create redundant user identities or authentication schemes. It relies entirely on Phase 05 — Core Implementation.
2. **ADR-027 Organization Isolation:** Phase 21 MUST NOT build a general B2B organization registry, company master table, or contract platform. It maintains recruitment-specific employer metadata only.
3. **No Direct File Storage:** All resumes, CVs, portfolio files, certificates, and media MUST be stored via Phase 05 EAP `AssetId` / `AssetReference` handles.
4. **No Direct AI Ownership:** AI models, prompts, provider routing, and safety policies belong exclusively to Phase 17 — Enterprise AI Platform. Phase 21 consumes advisory outputs only.
5. **No Direct Paid Service Execution:** Professional CV writing and paid coaching execution belong operationally to Phase 20 — Enterprise Services Platform.
6. **No Financial Escrow or Payments:** All employer invoices, payments, and fees MUST be processed through Phase 19 — Enterprise Finance & Payments Platform.
7. **Strict Job Application Scope:** Job and internship applications represent recruitment workflows only, completely separate from university academic admissions (Phase 11 / Phase 15) or scholarship applications (Phase 12).

---

## 21.A.15 Enterprise Review & Acceptance

**Architectural Commentary**
The following criteria constitute the formal governance gates for Phase 21, ensuring compliance with all MANARATAK 2.0 directives.

### 21.A.15.1 Architecture Validation

- **Decoupling:** Validated. Professional attributes are cleanly isolated from student academic identities.
- **ADR-027 Compliance:** Validated. B2B recruitment metadata is strictly bounded without creating a central organization master.
- **Scalability:** Validated. The platform natively supports an unlimited scale of job listings, applications, and regional distributions.
- **Ownership Boundaries:** Validated. Phase 21 strictly owns career, alumni, and recruitment capabilities while delegating AI (Phase 17), Assets (Phase 05), Services (Phase 20), and Finance (Phase 19).

### 21.A.15.2 Acceptance Criteria

- [x] Absolute centralization of all career profiles, job listings, internships, recruitment applications, and alumni networks is established.
- [x] Full integration with Phase 05 EAP for asset handle storage (`AssetId`) is mandated.
- [x] Explicit delegation of AI intelligence to Phase 17 — Enterprise AI Platform is documented.
- [x] Import specification (Phase 06 mechanics vs. Phase 21 domain schemas/lifecycle) is defined in full.
- [x] ADR-027 compliance is strictly enforced across all employer models.

### 21.A.15.3 Architecture Review Checklist

- [x] Architecture Validation
- [x] Ownership Boundary Validation
- [x] Integration & Phase Alignment Validation
- [x] Import Specification Validation
- [x] Readiness Review

### 21.A.15.4 ARB Decision

**Decision:** APPROVED FOR BASELINE SPECIFICATION
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)
**Date:** July 2026

