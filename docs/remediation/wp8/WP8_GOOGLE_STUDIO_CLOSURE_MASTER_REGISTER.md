# WP8 Google Studio Closure Master Register

> **Operational supersession notice (2026-09-06):** Any instruction in this historical remediation artifact that requires an “Original Development Database”, a Google Studio recovery gate, or `WP1_RECOVERY_GATE` is superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains historical/evidence context and is not current database-operation authority.

Governance update (2026-08-13): the historical 96 groups are now classified in [WP8_96_GROUP_RECLASSIFICATION_REGISTER.md](./WP8_96_GROUP_RECLASSIFICATION_REGISTER.md). Google Studio is the final evidence/runtime environment, not the owner of unfinished product implementation. University Stage 2+ and Scholarships are tracked separately in [EXPANSION_CLOSURE_REGISTER.md](../EXPANSION_CLOSURE_REGISTER.md).

Status date: 2026-08-12

This is the central index for external database/runtime closure. Original WP registers remain authoritative for item-level ownership and evidence. Nothing in this register authorizes a database mutation before backup and an approved migration gate.

| Owner WP | Tracked closure groups | Current source status | Why DB/runtime is required | Migration/backfill | Backup requirement | Before counters | Expected after counters | Referential validation | Rollback evidence | Final closure evidence |
|---|---:|---|---|---|---|---|---|---|---|---|
| WP-1 | 5 | `PENDING_DATABASE`, `PENDING_RUNTIME` | Original Development DB is available only in Google Studio | No remediation migration; recovery evidence only | Full recoverable backup and restore verification | Capture schema/migration/data baseline | Unchanged | Recovery point and schema snapshot | Non-destructive restore proof | [WP-1 manifest](../wp-minus-1/CURRENT_STATE_MANIFEST.md) plus backup/restore evidence |
| WP0 | 2 | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | Network, disk, payload, and load claims need the deployed runtime | No | WP-1 prerequisite | Capture runtime baseline | Within documented budgets | Endpoint/payload comparison | Configuration rollback evidence | [WP0 records](../wp0/) plus runtime measurements |
| WP1 | 13 | `SOURCE_DESIGNED`, `PENDING_DATABASE`, `PENDING_RUNTIME` | Outbox, audit atomicity, health, Admin bootstrap, and active persistence need real infrastructure | Yes where approved by WP1 register | Required before schema/data work | Capture tables, migrations, audit/outbox counters | Match approved WP1 acceptance criteria | Transaction, audit, outbox, and health evidence | Restore and migration rollback | [WP1 register](../wp1/WP1_DATABASE_CLOSURE_REGISTER.md) |
| WP2 | 2 | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | Durable import execution/recovery and adopter behavior need runtime persistence | Only if separately approved | WP-1 prerequisite | Import executions, retries, failures | No silent memory fallback; durable state retained | Execution/idempotency/retry checks | Queue/persistence rollback | [WP2 records](../wp2/) |
| WP3 | 12 | `SOURCE_IMPLEMENTED_RUNTIME_PENDING`, `PENDING_DATABASE` | Canonical Reference Data rows, aliases, lifecycle, and existing links need reconciliation | Potential staged mapping/backfill | Required | Reference and unresolved-link counters | No duplicate canonical identities or broken links | FK/orphan/resolver checks | Mapping reversal and restore | [WP3 register](../wp3/WP3_DATABASE_CLOSURE_REGISTER.md) |
| WP4 | 8 | `SOURCE_IMPLEMENTED_RUNTIME_PENDING`, `PENDING_DATABASE` | DegreeLevel/taxonomy rows and reverse Major links need DB proof | Potential staged mapping/backfill | Required | Degree/taxonomy/link counters | Canonical DegreeLevel and taxonomy linkage | FK/orphan/reverse-link checks | Mapping reversal and restore | [WP4 register](../wp4/WP4_DATABASE_CLOSURE_REGISTER.md) |
| WP5 | 10 | `SOURCE_IMPLEMENTED_RUNTIME_PENDING`, `PENDING_DATABASE` | Test references, cycles, availability, and content metadata need persisted validation | Potential staged reconciliation | Required | 56 active, 3 archived; persisted counters captured separately | Source counts preserved; canonical links valid | Duplicate, orphan, lifecycle, and availability checks | Staged rollback and restore | [WP5 register](../wp5/WP5_DATABASE_CLOSURE_REGISTER.md) |
| WP6 | 11 | `SOURCE_IMPLEMENTED_RUNTIME_PENDING`, `PENDING_DATABASE` | All 3,402 Major identities and canonical Degree/Taxonomy links need DB proof | Potential staged mapping/backfill | Required | MJR 843; MAS 1,116; DOC 1,114; FEL 329 | Same 3,402 identities; zero orphan canonical links | Duplicate, malformed, gap, FK, and readiness checks | Mapping reversal and restore | [WP6 register](../wp6/WP6_DATABASE_CLOSURE_REGISTER.md) |
| WP7 | 7 | `SOURCE_IMPLEMENTED_RUNTIME_PENDING`, `PENDING_DATABASE` | Admin selectors, backend RBAC, audit passage, and mutations need runtime/DB evidence | No unapproved data mutation | WP-1 prerequisite | Capture access/audit/mutation baseline | All critical mutations authorized and audited | RBAC denial, selector identity, audit checks | Deployment/config rollback | [WP7 register](../wp7/WP7_DATABASE_CLOSURE_REGISTER.md) |
| WP8 | 4 | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | Build, tests, cross-domain runtime integration, and final DB reconciliation cannot run locally | No new WP8 migration | All preceding backup gates | Source counters recorded; runtime baseline pending | Source counters unchanged; all external gates evidenced | Full cross-domain and referential suite | Consolidated rollback evidence | This register, integration matrix, deviation register, build/test output |
| WP9 | 10 | `SOURCE FREEZE PREPARED`, `PENDING_DATABASE`, `PENDING_RUNTIME` | Final Phase 10 freeze requires catalog linkage, canonical profile/mapping reconciliation, relationship integrity, and executable validation | Staged reconciliation/backfill only after approval | Verified WP-1 backup and restore point required | Capture all Major/profile/source/mapping/relationship counters before work | 3,402 reviewed identity results; duplicate, missing, orphan, dangling, regenerated, and lost-relation counts all zero | DegreeLevel, taxonomy, source-owner, publication, and relationship checks | Before snapshot, inverse mappings, restore test, and rollback output | [WP9 risk register](../wp9/WP9_PHASE_10_RISK_AND_DEVIATION_REGISTER.md), clean build/tests, and final ARB approval |
| WP10 | 12 | `READINESS_PREPARED`, `NOT_IMPORTED`, `PENDING_DATABASE`, `PENDING_RUNTIME` | University schema, identity reconciliation, reference resolution, sample import, authorization, and rollback require the original DB/runtime | Approved additive schema migration and reviewed reference backfills may be required | Verified WP-1 backup and restore point required | Universities, `INS-*`, aliases, reference resolution, hierarchy, programs, requirements, duplicates, unresolved rows | Source IDs preserved; duplicate/orphan/dangling/fake-reference counts zero; reviewed sample deltas explained | Country/Region/City, Campus hierarchy, Program Major/Degree, Admission Test, and owner checks | Migration rollback plus sample-import rollback and restore output | [WP10 safety gate](../wp10/PHASE_11_UNIVERSITY_IMPORT_SAFETY_GATE.md), migration dry run, Import Platform runtime evidence, Admin RBAC/Audit, and final bulk-import approval |

Central tracked closure groups: **96**. This is a planning count of grouped rows/evidence gates, not a database counter. The linked original registers govern detailed counts and owners.

## 2026-08-13 Local Runtime Update

Local dependencies are now available in Codex. Typecheck, the non-database test suite, and production builds for Web and Admin have executable local evidence. These results are recorded in [CODEX_LOCAL_CLOSURE_RECLASSIFICATION.md](./CODEX_LOCAL_CLOSURE_RECLASSIFICATION.md).

This update does not close database-backed tests, deployed-runtime smoke tests, network measurements, Recovery Gate evidence, migrations, imports, backfills, or rollback verification. Those items remain assigned to their original owner gates.

## Migration Gate

The source-controlled entry point is `scripts/db-remediation-gate.ts`. Planning, checksums, status, baseline counters, dry-run sequencing, and rollback inventory are prepared in Codex. Deployment is programmatically blocked until `WP1_RECOVERY_GATE=CLOSED` and a separate `ALLOW_DATABASE_MUTATIONS=YES` authorization are both present. Rollback is never automatic.

No stage is `COMPLETE` in the current environment.

| Stage | Status | Required evidence |
|---|---|---|
| Expand | `SOURCE_DESIGNED` / `PENDING_DATABASE` | Approved additive migration and schema review |
| Mapping / Dry Run | `PENDING_DATABASE` | Deterministic mapping report and unresolved rows |
| Backup | `PENDING_DATABASE` | Backup artifact, checksum, and restore verification |
| Backfill | `PENDING_DATABASE` | Approved command, counters, and error report |
| Referential Validation | `PENDING_DATABASE` | FK, orphan, duplicate, and semantic checks |
| Switch | `PENDING_RUNTIME` | Runtime compatibility and monitored cutover |
| Rollback Test | `PENDING_DATABASE`, `PENDING_RUNTIME` | Restored data and application behavior evidence |
| Contract Cleanup | `PENDING_RUNTIME` | Consumers verified before removal of compatibility paths |
