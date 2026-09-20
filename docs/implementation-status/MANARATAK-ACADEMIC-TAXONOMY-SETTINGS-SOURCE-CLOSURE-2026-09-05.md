# MANARATAK — Academic Taxonomy + Settings Source Closure

**Date:** 2026-09-05  
**Mode:** Source-only; no database, migration, backfill, or production mutation execution.
**Status:** CLOSED — final source closure gate passed.

## Academic Taxonomy ownership

Academic Taxonomy owns the canonical academic classification graph, node lifecycle, aliases, standards mappings, degree-level taxonomy references, and localized public projection. Majors and other domains reference this taxonomy through their boundaries; they do not create duplicate taxonomy truth. Public taxonomy surfaces expose **ACTIVE only** records. Admin mutations require the taxonomy permission and are audit-recorded.

## Settings ownership

Settings owns dynamic configuration definitions, non-secret scoped assignments, feature-flag metadata, deterministic resolution, immutable version history, and rollback-as-new-version. Settings does **not** own admin identities, RBAC, raw secrets, runtime health, or canonical reference data.

Resolution precedence is explicit: `IDENTITY > TENANT > DOMAIN > GLOBAL > definition default`. Each scope identifier is supplied independently. Historical setting versions are immutable and a reused version identifier is rejected. Secret-marked definitions cannot persist a default value or accept values/rollback through the Settings API.

Repository persistence also protects aggregate identity: an assignment id cannot be reused for another key/scope, a `(key, scope)` cannot silently switch to a different assignment id, and the persisted `currentVersionId` cannot be moved directly to an already-existing historical version. Rollback therefore always creates a new immutable version with explicit lineage rather than rewriting history or moving the pointer backward.

## Admin surfaces

- `/academic-taxonomy`: searchable/paginated taxonomy management, detail relationships, aliases, standard mappings, degree-level linkage, and audit-backed mutations.
- `/settings`: API-backed definitions and scoped values/history with explicit links to IAM/RBAC, Secret Provider/Environment, and Reference Data owners.
- Legacy Web Settings preview is a redirect only; fake admin users/roles/metrics are removed.

## Runtime / database statement

Source closure does not claim production database or secret-provider readiness. Runtime/database validation remains environment-dependent. Database executions, migration executions, and backfill executions for this closure are zero.

## Final closure evidence

- `ACADEMIC_SETTINGS_SOURCE_CLOSURE = 79/79 PASS`
- Academic taxonomy baseline: 163 nodes, 152 edges, 39 aliases, 1 standards mapping, zero dangling edge/alias/mapping references.
- Source Quality: package cycles = 0, file cycles = 0, accessibility findings = 0, gate = PASS.
- Source Architecture Guard = PASS.
- Modified TS/TSX source parse check = 57/57 PASS (includes retained Jobs/AI changes in the same working source tree).
- W2 = 23/23 PASS; Universities P9 = 97/97 PASS; Scholarships P12 = 188/188 PASS.
- Finance = 150/150 PASS; Health & Readiness = 63/63 PASS; Jobs = 68/68 PASS.
- Courses = 88/88 PASS; International Tests = 37/37 PASS; Study Destinations = 90/90 PASS; Certificates = 90/90 PASS.
- Phase 17 source = PASS; Phase 18 source = PASS.
- Prisma schema changed = 0.
- Existing migration files = 49/49 identical; added = 0, removed = 0, changed = 0.
- Database executions = 0; migration executions = 0; backfill executions = 0.

Dependency-backed Vitest/Prisma runtime validation was not forced because this ZIP-derived working tree does not contain `node_modules`; no dependencies were downloaded solely to manufacture a green runtime result.
