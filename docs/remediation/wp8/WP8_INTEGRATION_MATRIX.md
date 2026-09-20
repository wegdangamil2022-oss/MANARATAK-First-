> **HISTORICAL / SUPERSEDED — 2026-09-03:** This report is evidence only. The active authority is `docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md` v2.0.0 and the P13 Final Source Closure Report.

# WP8 Cross-Domain Integration Matrix

Status date: 2026-08-12

This matrix records source contracts. Runtime, persistence, and data evidence remains pending in Google Studio unless explicitly stated otherwise.

| Provider / owner | Consumer | Contract | Canonical identity | Source status | Runtime / DB validation | Remaining deviation |
|---|---|---|---|---|---|---|
| Phase 6 Import Foundation | Owning domain adapters | `UniversalImportHandoff` | Source, artifact, execution, correlation, and provenance identities | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | `PENDING_RUNTIME` | Durable queue and recovery behavior require the external runtime |
| Phase 7 Reference Data | Phase 9 International Tests | `IReferenceResolver` and canonical reference IDs | Country, Region, City, Language, Currency IDs/codes | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | `PENDING_DATABASE` | Existing persisted links and resolver-backed reads require DB evidence |
| Phase 7 Reference Data | Admin Control Plane | Canonical reference selector DTOs/API contracts | Reference ID; code is lookup input, not a replacement identity | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | `PENDING_RUNTIME` | UI-to-API behavior requires the Admin runtime |
| Phase 8 Academic Taxonomy | Phase 9 International Tests | Canonical `DegreeLevel` contract | Canonical DegreeLevel ID/code | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | `PENDING_DATABASE` | Persisted Test reference reconciliation remains pending |
| Phase 8 Academic Taxonomy | Phase 10 Majors | `DegreeLevel` and taxonomy reference contracts | DegreeLevel ID and canonical taxonomy IDs | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | `PENDING_DATABASE` | The 3,402 Major links require DB reconciliation |
| Phase 9 International Tests | Admin Control Plane | International Test application read/mutation contracts | Stable Test ID/slug plus canonical reference IDs | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | `PENDING_RUNTIME` | Selector, RBAC, and audit execution require runtime evidence |
| Phase 10 Majors | Admin Control Plane | Major application read/mutation contracts | `MJR-*`, `MAS-*`, `DOC-*`, `FEL-*` and canonical Degree/Taxonomy IDs | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | `PENDING_RUNTIME`, `PENDING_DATABASE` | Filters and mutations require runtime and persisted-link evidence |
| Phase 11 readiness contracts | Future Phase 11 application adapter | Existing University integration/readiness contracts | Existing institution identity and canonical Degree/Major references | `DESIGNED` / `NOT_IMPLEMENTED` | `PENDING_RUNTIME`, `PENDING_DATABASE` | No active Phase 11 `IReferenceResolver` consumer exists; do not infer readiness |

## Dependency Direction

- Phase 6 publishes a generic handoff; owning domains decide matching, merge, promotion, and canonical persistence.
- Phase 7 owns reference semantics and exposes contracts to higher domains.
- Phase 8 owns DegreeLevel and academic taxonomy semantics and does not depend on Phase 10 persistence.
- Presentation and Admin depend on application contracts, not Prisma.
- No University import is authorized or implemented by WP8.
# Country Detail Scholarship Wiring (2026-08-13)

- The Country detail screen queries the Scholarship owner API using the existing `studyCountry` filter.
- The Admin Scholarship route now passes this filter to the repository instead of silently dropping it.
- No scholarship source directory currently exists under `workspace/import-sources`; consequently no scholarship-country records were invented or imported.
- `targetUniversities` and `targetAcademicPrograms` remain optional free-text arrays in the current persistence contract. They are not presented as canonical University/Major relationships.
- Database writes in this preparation: `0`.
