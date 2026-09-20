# Phase 8: Academic Taxonomy Platform - Final Freeze and Handoff

## 1. Executive Summary

Phase 8 established the authoritative Academic Taxonomy for the MANARATAK platform, creating a governed, versioned, and standard-aligned hierarchy for academic fields, disciplines, and standard classifications. This document serves as the formal baseline freeze for Phase 8, defining the rigid contracts that future phases (especially Phase 10: University Integration) must respect.

The taxonomy is built upon the UNESCO ISCED-F 2013 standard, extending it with MANARATAK-specific programmatic areas and specializations while preserving deterministic relationships and provenance.

**Phase 8 Status**: FROZEN

## 2. Frozen Scope & Domain Ownership

Phase 8 explicitly owns the following canonical entities:
* `AcademicTaxonomyNode`
* `AcademicTaxonomyEdge`
* `AcademicTaxonomyAlias`
* `AcademicStandardMapping`
* `DegreeLevel`

No future module (including the University platform) may assume ownership of, mutate without governance, or bypass the integrity rules of these canonical entities.

Phase 10 (Majors) owns:
* `Major`
* `MajorLevelProfile`
* `MajorVersion`
* `MajorAlias`
* `MajorRelationship`
* `MajorClassificationMapping`

Future University platform owns:
* `University`
* `Campus`
* `Faculty` / `School` / `College`
* `Department`
* `AcademicProgram`

## 3. Frozen Node Types

The `AcademicTaxonomyNode` type contract is frozen to the following values:
* `ACADEMIC_FIELD`
* `DISCIPLINE`
* `PROGRAM_AREA`
* `SPECIALIZATION_CATEGORY`
* `STANDARD_CLASSIFICATION`

Future additions require explicit architectural review.

## 4. DegreeLevel Canonical Codes

The canonical `DegreeLevel` codes are stable system-boundary references and must not be renamed or regenerated casually:
* `ASSOCIATE`
* `DIPLOMA`
* `BACHELOR`
* `MASTER`
* `FELLOWSHIP`
* `DOCTORATE`
* `CERTIFICATE`

## 5. ISCED-F Baseline

The final authoritative ISCED-F 2013 baseline is frozen with the following node counts:
* **Broad Fields**: 11
* **Narrow Fields**: 39
* **Detailed Fields**: 113
* **Total Canonical Nodes**: 163
* **Primary Hierarchy Edges**: 152

Future external standard updates must be versioned rather than silently replacing the baseline.

## 6. Deterministic Identity Contract

Taxonomy nodes follow strict deterministic identity rules based on their standard (e.g., ISCED-F) and code. Repeated seeding or imports must not generate new canonical identities or duplicate nodes. Update behaviors strictly merge or ignore existing records based on provenance rules.

## 7. Graph Integrity Contract

The graph constraints are frozen and strictly enforced at the backend level:
* No self edges
* No duplicate edges
* No cycles
* No dangling edges
* Valid hierarchy semantics (e.g., `STANDARD_CLASSIFICATION` as parent of `ACADEMIC_FIELD`)
* Admin UI cannot bypass Domain validation

## 8. Major ↔ Taxonomy Contract

The architectural relationship between Majors and the Academic Taxonomy is frozen:
* **Canonical ID/reference = semantic relationship**
* **Legacy free text = source provenance/display fallback**

Future code must not regress back to text-only relationships when canonical references (`academicFieldId`, `disciplineId`) are available.

## 9. Classification State Contract

The supported classification states and semantics are frozen:
* `MAPPED` / `EXACT_MATCH`
* `AMBIGUOUS`
* `TRUE_TAXONOMY_GAP`
* `REVIEW_REQUIRED`
* `UNMAPPED`

Unresolved states are valid records. No fake taxonomy nodes should be created to artificially eliminate unresolved states.

## 10. Legacy Text Policy

Legacy text remains preserved purely for:
* Provenance
* Audit
* Debugging
* Display (fallback)
* Reclassification
* Compatibility

## 11. Admin Governance Freeze

Administrative capabilities are frozen. Taxonomy nodes can be managed (create, update, edge management, alias/standard mapping management) through the Admin UI. Hard deletion of referenced canonical nodes remains prohibited through normal Admin workflows. Lifecycle controls and audit logging are strictly enforced.

## 12. Public/Admin API Boundary

* **PUBLIC API**: Read-only taxonomy access.
* **ADMIN API**: Authenticated governed mutations.

Public mutation endpoints must remain zero unless explicitly approved in a future architectural decision.

## 13. Authorization & Audit Logging Freeze

* **Authorization**: The canonical Admin permission requirement `admin:academic-taxonomy:manage` (or equivalent final repository permission) is enforced.
* **Audit**: Taxonomy administrative mutations must remain auditable through the Enterprise Audit infrastructure (node create/update, edge add/remove, alias/mapping management). No parallel taxonomy-specific audit framework should be introduced.

## 14. Runtime Network Remediation Freeze

The Step 8.11-B runtime network remediation behavior is accepted and frozen:
* When `DISABLE_HMR=true`, the Vite HMR server is completely disabled.
* `/@vite/client` reconnect behavior is suppressed.
* Failed WebSocket retry loops and repeated Vite WebSocket warnings are eliminated.
* Idle network behavior is HEALTHY.

## 15. University Integration Handoff

The University platform must preserve the Step 8.10 contract:
* **University Source Reference ID → canonical University identity**
* **AcademicProgram → University → Major → DegreeLevel**

The Taxonomy should normally derive from the `Major`. Organizational structures (Faculty, School, College, Department) are not taxonomy nodes.

## 16. University-Phase Deferred Work

The following items are deferred to the Phase 10 / University phase:
* A. Normalize the current University JSON-based structure into relational entities (`Campus`, `Faculty`/`School`/`College`, `Department`, `AcademicProgram`).
* B. Replace unsafe random University public ID generation.
* C. Preserve existing MANARATAK University Reference IDs.
* D. Refactor University deduplication to prioritize canonical source reference IDs.
* E. Create stable `AcademicProgram` identity strategy.

## 17. Frozen vs Extensible Matrix

| Frozen Component | Extensible through Governed Change |
| :--- | :--- |
| DegreeLevel canonical codes | Aliases |
| Phase 8 ownership boundaries | Verified standard mappings |
| Existing node types | Future CIP crosswalk |
| Canonical relationship principle | Future MANARATAK custom classification layer |
| Deterministic identity contract | Additional external classification standards |
| ISCED-F baseline version | New taxonomy versions |
| Public/Admin API boundary | |

## 18. Taxonomy Versioning Rule

An authoritative classification update (e.g., a future ISCED revision) should not silently overwrite the current baseline. It requires a controlled migration/mapping with backward compatibility and clear provenance.

## 19. Final Database Verification

Database schema verification passed:
* Required Phase 8 tables exist.
* Required columns, indexes, and foreign keys exist.
* Pending migrations: 0
* Failed migrations: 0

## 20. Final Validation

* Build, Typecheck, and Linting pass with 0 errors.
* P0 Findings: 0
* P1 Findings: 0

**PHASE 8 — FROZEN**
**READY TO BEGIN UNIVERSITY PHASE PREPARATION**
