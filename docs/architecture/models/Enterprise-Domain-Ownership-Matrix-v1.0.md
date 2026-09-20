# Enterprise-Domain-Ownership-Matrix-v1.0

## 1. Document Information

- **Title:** Enterprise Domain Ownership Matrix
- **Version:** 1.0.2
- **Status:** Finalized — aligned with Roadmap v6.0
- **Date:** 2026-09-03
- **Owner:** Chief Enterprise Software Architect
- **Approval Authority:** Architecture Review Board (ARB)
- **Artifact Type:** Enterprise Governance Artifact
- **Authority:** `docs/governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md`

> **P13 Final Source Alignment — 2026-09-03:** Re-audited against Roadmap v6.0 and the final source implementation. Ownership and dependency direction remain authoritative. Student Workspace composes P10/P11/P12 saved-item owner reads plus P13 learning and P14 certificate reads through application contracts; P24 live composition consumes P15 session/API state. Runtime/DB/E2E proof remains explicitly pending and is not certified by this document.

## 2. Purpose

This matrix assigns one architectural owner to each Roadmap v6.0 domain and removes historical phase-number/role drift. Human job titles are illustrative governance roles; domain ownership is bound to the phase/capability, not to a person or team name.

## 3. Roadmap Domain Ownership

| Phase / Domain | Primary Owner | Technical Owner | Business Steward | Data Steward | Architecture Owner | Operational Owner |
| --- | --- | --- | --- | --- | --- | --- |
| **Phases 1–5 — Enterprise Foundation / EAP** | Foundation Architect | Foundation Technical Lead | Platform Governance Owner | Foundation Data Steward | Enterprise/Foundation Architect | SRE Lead (Foundation) |
| **Phase 6 — Universal Import Infrastructure** | Import Platform Architect | Technical Lead (Import) | Data Operations Owner | Import/Provenance Steward | Import Platform Architect | SRE Lead (Data Platform) |
| **Phase 7 — Global Reference Data** | Domain Architect (Reference) | Technical Lead (Reference) | Reference Data Owner | Reference Data Steward | Domain Architect (Reference) | SRE Lead (Core) |
| **Phase 8 — Academic Taxonomy** | Domain Architect (Taxonomy) | Technical Lead (Taxonomy) | Academic Taxonomy Owner | Taxonomy Steward | Domain Architect (Taxonomy) | SRE Lead (Core) |
| **Phase 9 — International Tests** | Domain Architect (Tests) | Technical Lead (Tests) | Assessments Owner | Tests Data Steward | Domain Architect (Tests) | SRE Lead (Core) |
| **Phase 10 — Majors & Disciplines** | Domain Architect (Majors) | Technical Lead (Majors) | Majors Product Owner | Majors Data Steward | Domain Architect (Majors) | SRE Lead (Core) |
| **Phase 11 — Universities & Institutions** | Domain Architect (Universities) | Technical Lead (Universities) | Institutions Owner | University Data Steward | Domain Architect (Universities) | SRE Lead (Core) |
| **Phase 12 — Scholarships** | Domain Architect (Scholarships) | Technical Lead (Scholarships) | Scholarships Owner | Scholarship Data Steward | Domain Architect (Scholarships) | SRE Lead (Core) |
| **Phase 13 — Learning** | Domain Architect (Learning) | Technical Lead (Learning) | Learning Product Owner | Learning Data Steward | Domain Architect (Learning) | SRE Lead (Learning) |
| **Phase 14 — Enterprise Certificates** | Domain Architect (Certificates) | Technical Lead (Certificates) | Credentialing Owner | Certificate Data Steward | Domain Architect (Certificates) | SRE Lead (Credentials) |
| **Phase 15 — Enterprise Student / Student Workspace** | Domain Architect (Student) | Technical Lead (Student) | Student Experience Owner | Student Workspace Steward | Domain Architect (Student) | SRE Lead (Student) |
| **Phase 16 — Enterprise CMS** | Domain Architect (CMS) | Technical Lead (CMS) | Editorial/Product Content Owner | Content Steward | Domain Architect (CMS) | SRE Lead (Content) |
| **Phase 17 — Enterprise AI** | Domain Architect (AI) | Technical Lead (AI) | AI Product/Governance Owner | AI Data Steward | Domain Architect (AI) | SRE Lead (AI) |
| **Phase 18 — Enterprise Student Tools** | Domain Architect (Student Tools) | Technical Lead (Student Tools) | Student Tools Product Owner | Tool Registry Steward | Domain Architect (Student Tools) | SRE Lead (Student Tools) |
| **Phase 19 — Enterprise Finance & Payments** | Domain Architect (Finance) | Technical Lead (Finance) | Finance Product Owner | Finance Data Steward | Domain Architect (Finance) | SRE Lead (Finance) |
| **Phase 20 — Enterprise Services** | Domain Architect (Services) | Technical Lead (Services) | Services Product Owner | Services Data Steward | Domain Architect (Services) | SRE Lead (Services) |
| **Phase 21 — Enterprise Career & Alumni** | Domain Architect (Career & Alumni) | Technical Lead (Career & Alumni) | Career & Alumni Product Owner | Career/Alumni Steward | Domain Architect (Career & Alumni) | SRE Lead (Career) |
| **Phase 22 — Enterprise Product Experience** | Product Experience Architect | Technical/Product Experience Lead | Product Experience Owner | Experience Metadata Steward | Product Experience Architect | Product Operations Lead |
| **Phase 23 — Enterprise Administration Portal** | Admin Platform Architect | Technical Lead (Admin) | Administration Product Owner | Admin Control-Plane Steward | Admin Platform Architect | SRE Lead (Admin) |
| **Phase 24 — Enterprise Public Platform** | Public Platform Architect | Technical Lead (Public) | Public Experience Owner | Public Composition Steward | Public Platform Architect | SRE Lead (Public) |

## 4. Non-Transferable Authority Boundaries

- **P7:** owns global reference identity such as country/region/city/language/currency; downstream domains reference canonical IDs.
- **P8:** owns academic taxonomy, classification hierarchy and `DegreeLevel`; it does **not** own canonical Majors.
- **P10:** owns canonical Major identity and major lifecycle. University-major, scholarship-major and course-major relationships are owned by the downstream domain that creates the relationship.
- **P11:** owns University/Institution/Campus/AcademicProgram truth. AcademicProgram binds University + Major + DegreeLevel through canonical references.
- **P12:** owns scholarship definitions, eligibility and scholarship relationships. This matrix does **not** assign a broad scholarship-application processing aggregate to P12.
- **P13:** owns learning catalog/progression/completion truth and publishes completion events. It does **not** issue certificates.
- **P14:** is the sole authority for certificate issuance, verification, revocation, templates/signature policy and credential lifecycle.
- **P15:** owns authenticated student workspace/profile state, collections, recently viewed/history, privacy/preferences and references/read models. It does **not** own Universities, Scholarships, Learning, Certificates, or an unspecified broad university/scholarship application engine.
- **P16:** owns editorial/CMS content lifecycle; it does not own business-domain records.
- **P17:** owns AI providers/models/prompts/execution/cost/safety boundaries; downstream tools consume AI contracts.
- **P18:** owns student-tool registry/orchestration/experience; it does not own AI provider execution or source domain truth.
- **P19:** owns finance execution: payments, ledger, invoices, refunds, settlement and financial status.
- **P20:** owns services catalog/request/fulfillment/provider-dispatch semantics; finance remains P19.
- **P21:** owns career opportunities, career applications and alumni/recruitment metadata within the Roadmap scope.
- **P22:** owns product-experience principles/contracts; it does not own P23 admin or P24 public domain data.
- **P23:** owns admin UI/control-plane composition and dispatch only. Domain mutations must flow through the owning domain's Application/API contract.
- **P24:** owns public composition, visitor routing, SEO and rendering only. Published business truth remains with P7–P21 owners.

### Broad university/scholarship application ownership

Roadmap v6.0 does not, by itself, designate P12 or P15 as the owner of a general-purpose university/scholarship application-processing aggregate. This matrix therefore makes **no ownership claim** for that broad workflow. A future assignment requires an explicit Roadmap/ADR decision before API/event/domain ownership is added.

## 5. Governance Rules

1. Every domain truth has exactly one owning phase.
2. A consumer may cache/project owner data but may not become a second owner.
3. Cross-domain writes use the owner's Application/API contract; direct cross-domain Prisma/database access is forbidden.
4. Reverse navigation is a read model/projection, not ownership transfer.
5. Phase 23 and Phase 24 are composition/control-plane phases and must not absorb business persistence.
6. Ownership changes require a new Roadmap/ADR or explicit ARB-approved authority update before implementation.
7. Role labels in this matrix must never be used to renumber or reinterpret Roadmap phases.

## 6. RACI for Cross-Domain Contract Changes

| Change | Owning Domain | Consumer | Phase 23 / 24 | ARB |
| --- | --- | --- | --- | --- |
| Change owner domain model/invariant | A/R | C | I | C for cross-domain impact |
| Change public cross-domain API/event contract | A/R | C | C if affected | A for breaking enterprise contract |
| Add admin command surface | A for business command | C | R (P23 UI/control plane) | C |
| Add public composition/read model | A for source truth | C | R (P24 composition) | C |
| Reassign phase ownership | C | C | I | A/R via Roadmap/ADR governance |

## 7. Validation

This matrix is P1-closed only if:

- P16–P21 no longer carry role/domain identities from unrelated phases;
- P10, P22, P23 and P24 are explicitly represented;
- P8/P10, P13/P14, P15 and P23/P24 boundaries match Roadmap v6.0;
- no broad university/scholarship application ownership is silently attributed to P12 or P15;
- all authority statements agree with the Dependency Graph, Bounded Context Map, Event Catalog and API Registry.

## 8. Approval and Revision History

- **Architecture Review Board:** Approved baseline; P1 authority alignment applied 2026-09-03.
- **Chief Enterprise Software Architect:** Approved baseline; Roadmap v6.0 is controlling authority.
- **1.0.0:** Initial Enterprise Domain Ownership Matrix.
- **1.0.1:** Corrected P16–P21 ownership drift, added missing Roadmap domains, and froze P8/P10/P13/P14/P15/P23/P24 authority boundaries.
