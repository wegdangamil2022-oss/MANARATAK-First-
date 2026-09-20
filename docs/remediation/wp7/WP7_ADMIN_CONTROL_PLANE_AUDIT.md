# WP7 Admin Control Plane Audit

## Path Classification

| Domain | apps/admin | apps/web legacy route | Classification after WP7 |
| --- | --- | --- | --- |
| Reference Data | `/settings/reference-data` | `/admin/*` parent preview shell | `CANONICAL` / `TRANSITIONAL_WRAPPER` |
| Academic Taxonomy | `/academic-taxonomy` | `/admin/academic-taxonomy*` | `CANONICAL` / `TRANSITIONAL_WRAPPER` |
| International Tests | `/international-tests*` | `/admin/international-tests*` | `CANONICAL` / `TRANSITIONAL_WRAPPER` |
| Majors | `/majors*` | `/admin/majors*` | `CANONICAL` / `TRANSITIONAL_WRAPPER` |
| Universities | `/universities` readiness view | `/admin/universities*` | `CANONICAL READINESS` / `TRANSITIONAL_WRAPPER` |

All legacy web Admin routes are intercepted at the root boundary and redirected to `VITE_ADMIN_URL`. When the canonical deployment URL is absent they report unavailable; they never activate preview data as a fallback.

## Security And Audit

`apps/admin` verifies `/auth/me`, but authorization authority remains on the backend. `/api/v1/admin` is protected by the persisted Admin guard, domain permission guards, and `MutationAuditMiddleware('ADMIN')`. The UI does not grant mutation authority.

## Data And Network

- Reference lists request 50 records and support an API maximum of 100.
- Taxonomy lists request 50 records and support an API maximum of 100.
- International Test and Major API lists are server filtered and capped at 100.
- The International Test list no longer applies an IELTS-only client filter.
- The International Test detail read model already includes variants, sections, availability, preparation materials, and evidence. Tab-mount duplicate requests were removed from active execution: initial detail requests changed from up to 6 to 1.
- Major filters send canonical DegreeLevel codes and `academicFieldId`; legacy text remains display metadata.
- `mapped-majors` remains explicit `NOT_CONFIGURED` until a Phase 10-owned reverse read contract exists.

## Ownership

Reference Data owns canonical geographic/language/currency identities. Phase 8 owns Taxonomy and DegreeLevel. Phase 9 owns International Test administration but not university acceptance. Phase 10 owns Major/Profile linkage but not taxonomy identities. University remains readiness-only; no import path was added.
