# WP7 Database Closure Register

> **Operational supersession notice (2026-09-06):** Any instruction in this historical remediation artifact that requires an “Original Development Database”, a Google Studio recovery gate, or `WP1_RECOVERY_GATE` is superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains historical/evidence context and is not current database-operation authority.

Status: `DATABASE_VERIFICATION_REQUIRED`

No database operation was executed in WP7.

| Finding | Required Google Studio verification | Expected invariant | Evidence required |
| --- | --- | --- | --- |
| Reference hierarchy | Verify Country/Region/City canonical IDs and hierarchy rows used by Admin | Admin selections resolve to active Phase 7 identities | Counts, invalid parents, orphan cities, rollback point |
| Taxonomy and DegreeLevel selectors | Verify active Phase 8 IDs returned to Admin and persisted relationships | No free-text value acts as canonical Degree/Taxonomy identity | Before/after unresolved counts and rollback evidence |
| International Test references | Verify Country/Language/Currency/Degree IDs on persisted tests | Phase 9 Admin writes reference active canonical rows | Missing/inactive reference counters |
| Major canonical filters | Verify Major/Profile DegreeLevel and Taxonomy linkage coverage | Canonical filters produce DB-consistent results | Linked/unresolved counts and query samples |
| University readiness | Verify read-only preview counters only after runtime is available | No University import or inferred readiness | Read-only baseline counters |
| Audit records | Exercise one authorized and one denied mutation per Phase 7-10 domain | Every sensitive mutation produces durable audit evidence | Correlation IDs and audit row counts |
| RBAC | Exercise persisted permissions for each Phase 7-10 guard | Backend permission decisions remain authoritative | Allowed/denied matrix without credentials |

All mutation-dependent checks remain blocked until the original Development Database recovery gate is closed.
