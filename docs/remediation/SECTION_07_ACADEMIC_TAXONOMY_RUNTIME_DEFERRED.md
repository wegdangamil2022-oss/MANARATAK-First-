# Section 07 — Runtime acceptance deferred to Post-28

Source status: **CODE_CLOSED — RUNTIME_DEFERRED**, 2026-10-10. Branch: `codex/section-07-academic-taxonomy`.

This register records unexecuted acceptance work from review sections 07.10/07.11. It does not authorize deployment or database execution. Source evidence is in [the implementation register](SECTION_07_ACADEMIC_TAXONOMY_IMPLEMENTATION.md).

| Runtime item | Later acceptance evidence required |
| --- | --- |
| Source migration activation | Review existing multiple-primary history, plan a governed reconciliation preserving alternative edges, then apply the owner review table and partial unique index in an authorized environment; record schema/client/deployment versions. No automatic cleanup is included. |
| Node/Degree concurrency | Two genuine editors/transactions: stale edit returns 409 with preserved inputs; no silent overwrite or identity duplicate. |
| DAG atomicity | Real PostgreSQL concurrent primary/edge writes, cycle refusal, serializable retries and advisory lock behavior; prove business/audit/outbox rollback together. |
| P6→P8 import | Genuine file staging, durable SCREENING_ONLY receipt, owner preview/review/apply, replay, changed source/reference rejection and preview refresh; no generic taxonomy promotion or automatic publication. |
| Lifecycle and consumers | Archive/restore with real usage impact and reason/ack; historical canonical IDs remain valid in Majors/Tests/Courses/Programs/Scholarships while Public discovery hides archived nodes. |
| Public/localization/cache | Real AR/EN responses and every archived direct/list/search/hierarchy path; verify intermediary caches honor no-store immediately after owner changes. |
| Admin browser acceptance | Picker beyond the first 100, true primary and alternative paths, relation paging, graph drill-down, diagnostics/editor links, degree metadata/consumer navigation, mapping preview and review-bound bulk apply; keyboard/loading/stale states. |
| Reports/performance | Real mapped/unmapped/ambiguous/conflicting fixtures and SQL facets/filters, snapshot isolation/asOf/version stability, oversized scope failure, boundary warnings, query cost and bounds on representative catalogs. |
| Historical Unicode | Review alias drift/collisions across Arabic, accented Latin, CJK and Cyrillic; any later rewrite requires its own plan and evidence. Current owner writes fail closed over the reconciliation bound. |
| Event delivery | Real TaxonomyCatalogChanged/DegreeLevelChanged outbox publication, retries and consumer reload handling; source events alone are not delivery evidence. |
| Repository-wide blockers | Six inherited EAP/settings migration metadata defects (18 verifier findings) require their owners' correction. Final TypeScript expression correction was not rechecked under the no-repeat rule. |

No runtime item is marked PASS. Heavy checks were intentionally deferred, not timed out and reported successful.
