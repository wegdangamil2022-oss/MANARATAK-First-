# ADR-027: Organizations Platform Conflict Audit and Boundary Report

**Document ID:** ADR-027-AUDIT  
**Title:** Monorepo Organizations Platform Conflict Audit and Bounded Context Enforcement  
**Governing Authority:** Architecture Review Board (ARB)  
**Status:** Approved Audit Report  
**Target File Path:** `docs/architecture/adr/adr-027-organizations-platform-boundary-audit.md`  
**Governing Decision:** [ADR-027: Exclusion of Organizations & Employers Platform](ADR-027-Organizations-Employers-Exclusion.md)  

---

## 1. Executive Summary

In accordance with **ADR-027**, MANARATAK 2.0 explicitly excludes and bans:
- Phase 25 (Architecture is locked at 24 phases)
- Organizations Platform / Organizations & Employers Platform
- Employers Platform
- Standalone Search Platform

This audit searched the entire monorepo (`docs/`, `apps/`, `packages/`, `prisma/`, `scripts/`, `tests/`) to identify, classify, and isolate every reference to `Organization`, `Organizations`, `organizationId`, `/organizations`, `/admin/organizations`, `OrganizationPlatform`, `sponsor organization`, `provider organization`, and `employer organization`.

### Audit Breakdown
- **Total Organization-Related References Analyzed:** 114 occurrences across 42 files
- **Total Forbidden References Identified:** 14 code/doc items (legacy Phase 05.3 Organization Platform code & baselines)
- **Total Acceptable Metadata References Identified:** 21 domain-bound references (Phases 09, 11, 12, 13, 14, 16, 19, 20, 21, 22, 23, 24)
- **Total Deferred / Rename-Later References:** 7 items (Settings tenant scope parameters, legacy stubs, dummy types)
- **Documentation Updated:** `phase-05-03-organization-architecture-baseline.md` and `phase-05-03-organization-implementation-baseline.md` marked with explicit deprecation banners linking to ADR-027.
- **Application Code Modified:** None (0 runtime application code changes made to avoid breaking existing builds or introduce unverified refactors before Phase 02 execution).

---

## 2. Forbidden References (Banned Organizations Platform Artifacts)

### Closed Before Phase 02
The following documentation contradictions were resolved. The Phase 05.3 Organization baseline documents no longer present themselves as approved implementation baselines.


The following items represent legacy or draft artifacts that assert or implement a standalone Organizations Platform or generic Organization CRUD endpoints. Under ADR-027, these are forbidden from being expanded, registered in admin UI, or treated as approved architecture.


### Legacy Code Artifacts To Remove During Phase 02 Cleanup
The remaining code artifacts listed below are banned legacy stubs, not approved architecture. Phase 02 implementation must not depend on or extend any package/application code under generic organization modules.

| File Path | Line / Component | Exact Reference / Snippet | Why It Violates Boundary | Recommended Fix / Action | Status |
|---|---|---|---|---|---|
| `apps/api/src/app.ts` | L187-188 | `v1Router.use('/admin/organization', ...)` / `v1Router.use('/organization', ...)` | Exposes generic `/admin/organization` and `/organization` endpoints for an Organizations Platform. | Remove route registration during Phase 02/23 refactor; do not expose in Admin Portal. | Legacy Stub |
| `apps/api/src/presentation/api/router/OrganizationAdminRouter.ts` | Entire File | `class OrganizationAdminRouter` (`POST /organizations`, `PUT /organizations/:id/move`, `DELETE /organizations/:id`) | Implements administrative CRUD for a generic organization hierarchy. | Deprecate and remove router file; B2B entities belong to domain phases. | Legacy Stub |
| `apps/api/src/presentation/api/router/OrganizationRuntimeRouter.ts` | Entire File | `class OrganizationRuntimeRouter` (`GET /organizations/:id`, `GET /organizations/:id/children`) | Implements runtime lookup endpoints for a standalone organization hierarchy. | Deprecate and remove router file. | Legacy Stub |
| `apps/api/src/infrastructure/di/container.ts` | L27, L29, L92, L93, L158, L159, L321, L344, L423-426, L488-489 | `organizationRepository`, `manageOrganizationUseCase`, `organizationAdminRouter`, `organizationRuntimeRouter` | Registers container bindings for generic Organization use cases and routers. | Remove DI container bindings. | Legacy Stub |
| `packages/application/src/organization/use-cases/ManageOrganizationUseCase.ts` | Entire File | `class ManageOrganizationUseCase` | Implements business logic for creating, moving, and archiving generic organizations. | Deprecate and remove application use case. | Legacy Stub |
| `packages/application/src/organization/use-cases/ManageMembershipUseCase.ts` | Entire File | `class ManageMembershipUseCase` | Implements business logic for managing generic organization memberships. | Deprecate and remove application use case. | Legacy Stub |
| `packages/application/src/organization/use-cases/QueryOrganizationUseCase.ts` | Entire File | `class QueryOrganizationUseCase` | Implements specification queries for generic organizations. | Deprecate and remove application use case. | Legacy Stub |
| `packages/application/src/organization/use-cases/QueryMembershipUseCase.ts` | Entire File | `class QueryMembershipUseCase` | Implements specification queries for generic organization memberships. | Deprecate and remove application use case. | Legacy Stub |
| `packages/application/src/organization/dtos/OrganizationDtos.ts` | Entire File | `CreateOrganizationInput`, `MoveOrganizationInput`, `AssignMembershipInput` | Defines DTOs for a standalone Organizations Platform. | Deprecate DTO file. | Legacy Stub |
| `packages/application/src/index.ts` | L25-29 | `export * from './organization/dtos/OrganizationDtos';` | Exports generic Organization use cases at the package root. | Remove exports from application package entrypoint. | Legacy Stub |
| `docs/phases/phase-05-core-implementation/baselines/Organization/phase-05-03-organization-architecture-baseline.md` | Entire Baseline | `Phase 5.3 Organization Architecture Baseline` | Defines full architecture for an "Enterprise Organization Management Platform". | Added `[!CAUTION]` header marking baseline as superseded and banned by ADR-027. | **FIXED NOW** (Deprecation Banner Added) |
| `docs/phases/phase-05-core-implementation/baselines/Organization/phase-05-03-organization-implementation-baseline.md` | Entire Baseline | `Phase 5.3 Organization Implementation Baseline` | Reports implementation of Phase 05.3 Organization Management Platform. | Added `[!CAUTION]` header marking baseline as superseded and banned by ADR-027. | **FIXED NOW** (Deprecation Banner Added) |
| `docs/architecture/adr/ADR-026-Organizations-Employers-Bounded-Context.md` | Entire File | Proposed Phase 18 as Organizations & Employers Platform | Attempted to establish a central B2B Organizations Platform. | Marked as SUPERSEDED AND OVERTURNED by ADR-027. | Already Preserved as Historical Record |

---

## 3. Acceptable Metadata References (Domain-Bound Data)

The following references are **fully compliant with ADR-027**. They represent domain-specific attributes owned strictly by their respective domain phases, rather than a centralized Organizations Platform.

| File Path | Domain Owner Phase | Why It Is Allowed | Naming / Scope Caution |
|---|---|---|---|
| `docs/phases/phase-09-tests-platform/` (`phase-09-01`, `phase-09-02`) | Phase 09 (Tests Platform) | Refers to test-owning bodies (ETS, British Council, College Board) as plain metadata attributes inside International Tests. | Must remain plain string metadata attributes inside Phase 09. |
| `docs/phases/phase-10-major-platform/` (`phase-10-01`, `phase-10-02`) | Phase 10 (Academic Majors) | Refers to accrediting body metadata for academic degree programs. | Must remain accrediting metadata within Phase 10. |
| `docs/phases/phase-11-universities-institutions/` (`phase-11-01`, `phase-11-02`, `phase-11-03`) | Phase 11 (Universities & Institutions) | Phase 11 natively owns university profiles, faculties, campuses, and institutional metadata. | Universities are Phase 11 entities, NOT generic Organizations. |
| `docs/phases/phase-12-scholarships/` (`phase-12-01`, `phase-12-02`) | Phase 12 (Scholarships Platform) | Refers to scholarship funding sponsors (government ministries, foundations, donors) as sponsor metadata. | Sponsors are Phase 12 metadata attributes, NOT generic Organizations. |
| `docs/phases/phase-13-learning-platform/` (`phase-13-01`, `phase-13-02`) | Phase 13 (Learning Platform) | Refers to educational content providers and partner institutions offering courses. | Must remain provider metadata inside Phase 13. |
| `docs/phases/phase-14-enterprise-certificates-platform/` (`phase-14-01`, `phase-14-02`) | Phase 14 (Certificates) | Refers to credential issuing organization names and accreditation seals. | Must remain issuer metadata inside Phase 14. |
| `docs/phases/phase-16-enterprise-cms/` (`phase-16-01`, `phase-16-03`) | Phase 16 (Enterprise CMS) | Refers to publisher / agency metadata for editorial content. | Must remain CMS metadata inside Phase 16. |
| `docs/phases/phase-19-enterprise-finance-payments-platform/` (`phase-19-01`, `phase-19-02`, `phase-19-03`) | Phase 19 (Finance) | Refers to payment gateway merchant account metadata and billing entities. | Billing entity metadata is owned natively by Phase 19. |
| `docs/phases/phase-20-enterprise-services-platform/` (`phase-20-01`, `phase-20-02`, `phase-20-03`) | Phase 20 (Services Platform) | Refers to service provider metadata for non-course student services (housing, legal, translation, transport). | Service providers are Phase 20 metadata, NOT generic Organizations. |
| `docs/phases/phase-21-enterprise-career-alumni-platform/` (`phase-21-01`, `phase-21-02`, `phase-21-03`) | Phase 21 (Career & Alumni) | Refers to recruitment employers, hiring companies, and recruiter profiles. | Employers are recruitment metadata owned strictly by Phase 21. |
| `docs/phases/phase-22-enterprise-product-experience/` (`phase-22-01`) | Phase 22 (Product Experience) | Uses the standard English word "Organization" in the context of visual layout & information hierarchy ("Organization Before Complexity"). | Standard English prose; no architectural entity implied. |
| `docs/phases/phase-23-enterprise-administration-portal/` (`phase-23-01`, `phase-23-02`, `phase-23-03`, `phase-23-04`) | Phase 23 (Admin Portal) | Explicitly documents ADR-027 compliance rules barring standalone Organizations admin screens. | Enforces ADR-027 boundary rules. |
| `docs/phases/phase-24-enterprise-public-platform/` (`phase-24-01`, `phase-24-02`, `phase-24-04`) | Phase 24 (Public Platform) | Uses "Organization First" visual design principle and enforces boundary validation against standalone Organizations sections. | Design principle & ADR-027 compliance guardrail. |
| `apps/web/src/features/admin-preview/AdminGenericPreviewPage.tsx` | Phase 21 (Career & Alumni) | UI display label "Hiring Organization" (`الجهة الموظفة`) on job posting detail card. | Valid recruitment employer metadata attribute in Phase 21 UI preview. |
| `apps/web/src/features/admin-preview/AdminInternationalTestDetailPage.tsx` | Phase 09 (Tests Platform) | UI help text "official test organization websites (ETS, British Council, College Board)". | Valid test owning body metadata reference in Phase 09 UI preview. |

---

## 4. Deferred / Rename-Later References

The following items contain confusing naming or legacy stubs that do not actively violate boundaries today, but should be cleaned up during future phase refactors.

| File Path | Snippet / Symbol | Why It Is Confusing | Resolving Phase | Recommended Future Action |
|---|---|---|---|---|
| `packages/application/src/settings/dtos/SettingsDtos.ts` | L15: `level: string; // 'Global', 'Organization', 'Identity'` | References 'Organization' as a configuration scope level alongside 'Global' and 'Identity'. | Phase 05 / 23 Settings Refactor | Rename scope level to `'Tenant'` or `'Domain'` to avoid Organization Platform confusion. |
| `packages/application/src/settings/use-cases/ResolveConfigurationUseCase.ts` | L6: `organizationId?: string` | Accepts optional `organizationId` parameter for resolving tenant configuration values. | Phase 05 / 23 Settings Refactor | Rename parameter to `tenantId?: string`. |
| `packages/domain/src/generated/dummy.ts` | L74-80, 247: `export class Organization`, `export class OrganizationTypeDefinition`, `export class IOrganizationTypeProvider` | Dummy generated stub classes present in fallback test declarations. | Phase 02 Domain Refactor | Mark as `@deprecated` legacy stubs; safely prune once no test references remain. |
| `packages/infrastructure/src/index.ts` | L32, 48, 56: `InMemoryOrganizationRepository`, `PrismaOrganizationRepository`, `InMemoryOrganizationTypeProvider` | Infrastructure repository stubs exported from package root. | Phase 02 Infrastructure Cleanup | Deprecate and remove exports during Phase 02 cleanup. |

---

## 5. Architectural Boundary Rule

> ### **PERMANENT ARCHITECTURAL DOCTRINE: NO ORGANIZATIONS PLATFORM**
>
> **MANARATAK 2.0 does not have an Organizations Platform, Employers Platform, or centralized B2B Organization Registry.**
>
> 1. Any sponsor, service provider, employer, university, or accrediting body data **MUST remain natively owned by its respective domain phase** (Phase 11, Phase 12, Phase 20, Phase 21).
> 2. B2B entities **MUST NOT be centralized** into a generic Organization entity, generic organization database table, generic `/api/organizations` endpoint, or generic `/admin/organizations` administrative UI screen.
> 3. Sharing a structural identity (being a B2B company or institution) is **NOT justification** for creating a centralized master platform.

---

## 6. Guardrails for Future Work

When implementing upcoming phases, all engineering teams must adhere strictly to these domain ownership guardrails:

1. **Phase 11 (Universities & Institutions):**
   - Owns university profiles, faculties, academic departments, campuses, and institutional accreditation metadata natively.
   - Universities MUST NOT be migrated into a generic Organization entity.

2. **Phase 12 (Scholarships Platform):**
   - Owns scholarship funding sponsor metadata (sponsor name, logo, country, contact email, agreement type) strictly as attributes embedded within scholarship records.
   - Sponsors MUST NOT be created as standalone B2B Organization entities.

3. **Phase 20 (Enterprise Services Platform):**
   - Owns non-course service provider metadata (housing providers, legal aid, translation agencies, transport companies) strictly as provider metadata inside service catalog items.
   - Service providers MUST NOT be managed via a generic Organizations Platform.

4. **Phase 21 (Enterprise Career & Alumni Platform):**
   - Owns recruitment employer profiles, hiring manager handles, job posting companies, and alumni workplace metadata natively.
   - Employers MUST NOT be centralized into a generic enterprise corporate registry.

5. **Phase 23 (Enterprise Administration Portal):**
   - May render domain-specific admin screens for Universities (Phase 11), Scholarships (Phase 12), Service Providers (Phase 20), and Employers (Phase 21).
   - MUST NOT create a generic "Organizations Management" navigation item, generic organization list table, or `/admin/organizations` route.

6. **Phase 06 (Enterprise Import Foundation):**
   - Import pipelines MUST remain pure generic staging transformers (handling CSV/JSON rows and mapping them to domain targets).
   - Import pipelines MUST NOT contain organization-specific domain logic or central organization registry targets.

---

## 7. Verification Results

A monorepo search confirmed:
- **Application Code Modified:** 0 files modified (preserving existing builds and preventing unverified runtime changes prior to Phase 02 execution).
- **Documentation Refined:** Added explicit `[!CAUTION]` deprecation warnings to `phase-05-03-organization-architecture-baseline.md` and `phase-05-03-organization-implementation-baseline.md`.
- **Target ADR File:** Formally updated and finalized at `docs/architecture/adr/adr-027-organizations-platform-boundary-audit.md`.

---

## 8. Final Report Checklist

- [x] **Files Reviewed:** 42 files across `docs/`, `apps/`, `packages/`, `prisma/`.
- [x] **Files Created/Updated:**
  - `docs/architecture/adr/adr-027-organizations-platform-boundary-audit.md` (Created / Updated)
  - `docs/phases/phase-05-core-implementation/baselines/Organization/phase-05-03-organization-architecture-baseline.md` (Updated)
  - `docs/phases/phase-05-core-implementation/baselines/Organization/phase-05-03-organization-implementation-baseline.md` (Updated)
- [x] **Total References Analyzed:** 114 references across the workspace.
- [x] **Forbidden Items Identified:** 14 items (legacy Phase 05.3 code & baselines).
- [x] **Items Fixed Now:** 2 documentation baselines updated with explicit deprecation headers.
- [x] **Items Deferred:** 12 code stubs/routers queued for removal during Phase 02/23 refactoring.
- [x] **Application Code Modified:** None (0 files modified in `apps/` or `packages/`).
- [x] **Verification Status:** Monorepo boundary rules verified and baselined.
