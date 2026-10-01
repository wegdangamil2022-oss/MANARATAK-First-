# WP8 Deviation Register

All known critical external closure dependencies are documented below. Source remediation status does not close these deviations.

| Deviation | Owner | Reason | Risk | Closure condition |
|---|---|---|---|---|
| Original Development DB recovery evidence unavailable locally | WP-1 | DB exists only in Google Studio | No proven recovery point for real data | Backup, checksum, schema/migration snapshot, counters, and non-destructive restore proof |
| Runtime/network/payload validation pending | WP0 | Application runtime unavailable locally | Performance and network claims remain unverified | Execute WP0 measurement checklist in Google Studio |
| Audit/outbox atomicity and active infrastructure evidence pending | WP1 | Requires real DB/runtime services | Mutation or event evidence may be incomplete | Execute WP1 DB/runtime register with rollback proof |
| Durable import queue/recovery pending | WP2 | Persistence/runtime unavailable | Retry/idempotency durability is not proven | Runtime failure/restart tests against approved Development persistence |
| Canonical Reference Data persistence reconciliation pending | WP3 | Existing rows/links unavailable | Aliases, lifecycle, or references may be inconsistent | Staged mapping, referential checks, and rollback evidence |
| DegreeLevel/taxonomy persistence reconciliation pending | WP4 | Existing rows and reverse links unavailable | Duplicate SSoT or broken Major links | Canonical counters and bidirectional referential validation |
| International Test persistence reconciliation pending | WP5 | Existing Test/reference data unavailable | Source baseline may not match persisted state | Prove 56 active/3 archived and canonical references in DB |
| Major persistence linkage pending | WP6 | 3,402 source identities cannot be compared to DB | Missing/duplicate identity or canonical links | Reconcile all identities and Degree/Taxonomy links with zero loss |
| Admin runtime/RBAC/audit evidence pending | WP7 | Admin runtime and DB unavailable | Source wiring may differ from effective authorization/audit behavior | Runtime integration suite with denial and audit evidence |
| Build and executable test suite unavailable | WP8 | Dependencies are not present | Source tests have not executed in the actual toolchain | Install only in approved Google Studio flow, then build and run full suite |
| Phase 11 Reference Resolver consumption not implemented | Phase 11 / future authorized WP | Current University readiness contracts do not consume `IReferenceResolver` | Geography/reference readiness cannot be asserted centrally | Add owner-approved application adapter and contract/runtime tests before activation |

Undocumented critical deviations identified by WP8 source reconciliation: **0**.
