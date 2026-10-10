# Section 07 — Academic Taxonomy / P8

Status: **CODE_CLOSED — RUNTIME_DEFERRED** (2026-10-10).

All original Section 07 source tasks, including FGA-07-001/002, are implemented across four commits/batches. Runtime acceptance remains open under the review's Post-28 policy. This status does not claim successful deployment, applied schema, real database execution, browser acceptance, or a fully passing repository-wide verification gate.

Final source commit: the commit containing this document, on the branch below. Earlier source commits: `7b5e2c0`, `84d053b`, `0374d1e`.

Branch: `codex/section-07-academic-taxonomy`, based on `7231f2c`.
Worktree: `/workspace/manaratak-section-07`. The original checkout and branch remain available for Section 06. Shared external dependencies are read-only symlinks; workspace package links/build outputs resolve to this worktree. No Section 06 source, city data or DB schema changed.

The first three batches below are historical records; their then-pending source work is resolved by the final closure register. Failed checks remain recorded and were not rerun.

## First batch

- TAX-P0-001: normal node edit now targets its stable nodeId through a new authenticated PUT route. Standard/type/code identity changes are refused by both application and persistence; the UI locks the standard type. Editing never invokes upsert/create.
- TAX-P0-002: Admin uses the domain completeness report (isComplete/canBeReviewed). The description explicitly distinguishes node validation from cycle detection at edge creation.
- TAX-P0-003: relationship/mapping selection searches server-side and navigates 25-node pages with standard/type filters, cancellation and stale-response guards. It no longer preloads only the first 100 nodes. A full 25-item page can expose one extra empty next page; exact totals remain follow-up work.
- TAX-P0-004, partial: the new node edit route requires expectedUpdatedAt, enforces a persistence CAS under SERIALIZABLE isolation, returns 409 on conflict, and preserves the edit form. Degree Levels and legacy upsert mutations remain pending.
- TAX-P0-005: MULTIPLE_PRIMARY_PARENTS is an ERROR. The existing serializable graph-check/write and P2034 retry path is retained; no schema migration or DB guard was applied.
- TAX-P1-006, partial: shared NFC/case/whitespace alias normalization is used by validation, admin lookup and Prisma writes. Unicode scripts and accents are retained, with no transliteration. Historical normalization/collision reconciliation and seed path adoption remain follow-up work; no existing data was rewritten.
- TAX-P1-008: corrected P7/P8/P9 comments; routes/ownership unchanged.

## One-shot verification

- TypeScript: PASS (`npm run typecheck`, 60s ceiling), once.
- Targeted tests: **80 PASS / 1 FAIL**, 9 files, 5.83s, once. Includes stable-ID/identity refusal/stale editor, persistence CAS, HTTP authorization/schema/409, Unicode and existing graph/router/repository contracts.
- Failure: the existing multiple-primary-parent test still expected zero ERROR issues despite the newly required blocking severity. Its expected count was corrected from 0 to 1. **Not rerun**, as explicitly required by the user. Do not report 81/81 PASS.
- No full lint/build/quality/audit/persistence suite or heavy/provider/browser/DB test ran. No migration, seed, backfill, deployment or merge occurred. CI skipped on this commit to avoid automatic repetition.

Exact logs: `evidence/section-07/batch-01/`. These are isolated source/mock tests; genuine DB isolation and browser/provider behavior remain POST-28.

## Second batch

- TAX-P0-004: Degree Level edits require `expectedUpdatedAt`, use a database compare-and-swap including frozen canonical identity, and return HTTP 409 without clearing form inputs. Updates preserve aliases/provenance. Version timestamps advance even within the same millisecond. The old node-create route now requires a revision for existing identities; fresh production creation uses `create`, never a silent upsert overwrite. Seed ports are retained separately.
- TAX-P0-005 / TAX-P1-007: production DI supplies the existing atomic business/audit/outbox coordinator to taxonomy and Degree Level commands. Repositories bind to its transaction; taxonomy writes take one shared PostgreSQL transaction advisory lock before checks, spanning graph/alias/mapping writes and owner audit/event append. The existing HTTP success/failure audit is retained as an additional request record. Missing Degree Levels throw before success audit/event emission. No schema or runtime data changed.
- TAX-P1-004: admin list returns bounded `data/total/page/pageSize/totalPages/hasNextPage`; filtered count and list reuse the same predicate, including parent filtering. Stable ordering includes node ID. Admin and picker use the server's next-page flag, eliminating a phantom final empty page. Read-only public preview retains its earlier page-length fallback because its response is unchanged.
- 07.8, partial: both public and actually composed localized list/search paths enforce ACTIVE and bounded pages (default 50, maximum 100, page ceiling 1000). Cache invalidation and descendant/ancestor traversal limits remain pending.
- React review: checked hook dependencies, cancelled/stale picker responses, preserved conflict inputs, button types and existing error/status accessibility using the React best-practices skill. No browser acceptance run.

Second-batch verification: TypeScript PASS once (`tsc -b` scoped to domain/application/infrastructure/admin/api; 60s ceiling). Targeted tests: **18 PASS / 0 FAIL**, four files, 3.66s, once. Earlier first-batch suites were not rerun; their historical one failure remains documented above. New mock tests do not prove real PostgreSQL contention, durable rollback or consumer delivery. Evidence: `evidence/section-07/batch-02/`.

## Third batch — lifecycle and generic impact

- TAX-P1-001: adopted **archive-only taxonomy retirement**. Existing canonical IDs, names, aliases, edges, mappings and downstream references stay intact; no hard delete, automatic reassignment or implicit replacement. Public taxonomy discovery/direct reads already hide ARCHIVED records. Restore/status transitions require an operator reason and acknowledgement too. Creating an already archived identity is refused. A future supersession model requires a separate reviewed contract; no new taxonomy status/schema introduced.
- TAX-P1-002: a generic owner-neutral usage gateway returns relationship counts through bounded Prisma `_count` selections. It covers taxonomy major/profile links, classifications, tests, course resolutions/links/projections and hierarchy/crosswalk links; Degree Levels cover major profiles, test degrees, university programs and scholarship targets/eligibility. Historical code-only test and major-profile degree links are counted separately using `degreeLevelId: null`, avoiding duplicate ID-backed counts. Counts represent relationship rows, not unique people or unique consumer entities. P8 application/domain imports no downstream owner repository.
- Actual status changes require a nonempty reason (maximum 1000 characters), an explicit historical-reference acknowledgement and successful server-side impact retrieval. The impact adapter binds to the owner atomic transaction; failures abort the business write. CAS protection from batch 02 remains in force. Owner audit records the reason and requested status; owner event remains in the same transaction. Advisory locking covers cooperating taxonomy owner commands, not independent downstream consumer writes.
- TAX-P1-003: edit forms now show the impact counts, preserve error/conflict inputs, require reason/acknowledgement for status changes and disable status submission until the impact report loads. Degree metadata/aliases are inspectable (bounded display) and both forms deep-link to the audit center by target ID. Fixed the unsupported degree DRAFT option to DEPRECATED. New degree MERGED/SUPERSEDED transitions are refused until replacement semantics exist; the current API enum remains backward-compatible for historical reads.
- React best-practices review: shared typed panel; stable setter effect dependency; request abort/stale guard; associated field labels, required checkbox/text area, error/status roles and scrollable edit forms. No browser/dev server started.

Third-batch source verification: TypeScript PASS once (`tsc -b` scoped to domain/application/infrastructure/admin/api, 60s ceiling); **17 PASS / 0 FAIL**, three new lifecycle/read-model/HTTP suites, 3.05s, once. Prior tests were not repeated. No DB access, migration, seed, provider, browser or load tests; real aggregate query performance and consumer races remain runtime acceptance work. Exact logs: `evidence/section-07/batch-03/`.

## Final source closure register

| Requirement | Implemented behavior and evidence |
| --- | --- |
| TAX-P0-001 | Stable-ID edits; immutable standard/type/code identity in UI, use case and persistence; no edit upsert. Batch 01 contracts. |
| TAX-P0-002 | Shared completeness DTO and honest node-only validation; separate actual graph diagnostics. |
| TAX-P0-003 | Searchable, filtered 25-node server picker with paging and stale-response cancellation. No fixed first-100 catalog. |
| TAX-P0-004 | Node and Degree Level timestamp CAS, 409 conflict and preserved edit inputs; legacy create refuses versionless overwrites. |
| TAX-P0-005 | Blocking multiple-primary validation and shared owner transactional lock; source-only partial unique index for one primary per child. Real contention proof deferred. |
| TAX-P0-006 | Actual DI dispatcher registers a pure P8 screening consumer for ACADEMIC_TAXONOMY/TAXONOMY. P6 upload route leads to owner preview/review/apply; durable owner review/CAS, source/preview hashes, explicit approval, refresh invalidation, idempotent applied receipts and atomic audit/outbox. No generic canonical promotion. New nodes always become DRAFT. |
| TAX-P1-001 | Explicit archive-only retirement; no deletion, implicit replacement, reference rewriting or new supersession states. |
| TAX-P1-002 | Generic read-only usage counts, mandatory lifecycle reason/acknowledgement and owner impact check before status changes. |
| TAX-P1-003 | Degree CAS, usage warning, aliases/metadata inspection, audit links and links to actual consumer workspaces. Consumer links open the workspace; no entity-filtered view is claimed. |
| TAX-P1-004 | Matching SQL predicates for total and page; stable ordering and server pagination metadata; hierarchy pages preserve actual edge flags. |
| TAX-P1-005 | Node-derived mapping standards, searchable target, source→target preview with real validation and EXACT/BROAD/NARROW/RELATED/UNKNOWN explanations. Final save validates again transactionally. |
| TAX-P1-006 | Shared NFC/Unicode-preserving identity in validation, persistence and seed planning; bounded legacy raw/stored alias collision lookup; drift/conflict/duplicate queue. Historical data is reported, never silently rewritten. |
| TAX-P1-007 | Explicit TaxonomyCatalogChanged/DegreeLevelChanged owner events with reload payloads in the business/audit/outbox transaction. Public endpoints use no-store rather than serving a stale catalog cache. Delivery proof deferred. |
| TAX-P1-008 | Phase comments corrected without changing routes or domain ownership. |
| 07.6 | Actual root→children graph browser, true primary breadcrumb and alternative parents, bounded relation pages, orphan/root/unmapped filters, integrity and alias queues, bulk DRAFT/READY_TO_REVIEW dry-run/review with exact preview hash. Bulk workflow cannot publish/archive. |
| 07.7 | P8 stays separate from Majors and other consumers. Usage/import gateways are approved cross-context read models; no downstream owner repository dependency or canonical consumer rewrite. DegreeLevel's existing reference persistence declaration is preserved. |
| 07.8 | ACTIVE-only list/search/direct/parent/child paths, localized owner use cases and paged SQL hierarchy reads; maximum page size 100/page 1000; immediate no-store public cache semantics. |
| FGA-07-001 | SQL-paged source/target-standard crosswalk report with type/status/query/confidence/state filters, accurate facets and mapped/unmapped/ambiguous/conflicting/unresolved worklists linked to editors. No automatic match/publication or relationship mutation. |
| FGA-07-002 | Read-only consistent bounded snapshot; version/asOf and explicit scope/boundary evidence; iterative cycles, primary conflicts, approved roots/orphans, empty roots, isolated leaves, depth, unreachable national mappings, invalid/historical mappings and alias issues. No graph repair or deletion. |

## Final implementation details

- New owner import use cases and screening consumer live under `packages/application/src/academic-taxonomy/`; the transactional raw-SQL review gateway lives in `packages/infrastructure/src/academic-taxonomy/PrismaAcademicTaxonomyImportGateway.ts`. JSON hashes sort object keys recursively so PostgreSQL JSONB key ordering cannot invalidate a reviewed preview. Source hashes, node revisions and current validation are checked again before canonical application. Applied receipt replays skip duplicate business/audit/outbox effects.
- Owner review persistence is declared in Prisma/ADR-028 ownership manifest, with an **unapplied** source migration `20261010010000_taxonomy_owner_import_review`. Parameterized SQL avoids generating a shared Prisma client during this review. Production activation requires that migration and later normal client generation; no DB commands were run here.
- Diagnostics cap selected/context nodes at 5,000 and each edge/alias/mapping collection at 20,000; oversized scopes fail closed and can be narrowed by standard. Reports return 25 issues and at most 32 IDs per issue. Scoped reports disclose boundary edges and do not invent global cycle/reachability claims. Primary path traversal stops at 32 hops; alternative parents are paged.
- Historical alias collision lookup compares raw and stored identities through the same JavaScript NFC normalizer, capped at 20,000 aliases. Above that bound the write fails closed pending future reconciliation. No historical normalization/backfill occurred.
- New workspaces are actual API clients, with loading/error/empty states, bounded paging, editor links, cancelled/stale reads, preview-bound apply controls and reason/acknowledgement inputs. Taxonomy owner import is reachable from the P6 file-upload domain route and returns to the imports view via URL parameters. No dev server/browser was started.
- Condensed React review covered unconditional hooks, abort/stale guards, preview invalidation, native navigation buttons, control labels, button types and error/status announcements. Browser keyboard/accessibility acceptance remains deferred.

## Final one-shot verification — exact results

| Check | Observed result | Resolution / limitation |
| --- | --- | --- |
| Scoped TypeScript (`tsc -b` domain/application/infrastructure/admin/api; 60s ceiling) | FAIL: five TS2783 diagnostics on one crosswalk facet-default expression | Replaced duplicate spread defaults with `Object.assign(defaults, result.counts)`. Source reviewed; **not rerun**, per user instruction. Do not claim final TypeScript PASS. |
| Four new targeted Vitest suites | **33 PASS / 0 FAIL**, 3.67s | Ran once after the expression fix; unit/mock/HTTP contracts only. |
| `git diff --check` | PASS | Ran once before the TypeScript expression fix and final documentation. No repeated whitespace gate. |
| Persistence boundary verifier | FAIL: **18 inherited migration metadata violations** | All findings are missing owner/scope/ADR-028 markers in six pre-existing `20261009` migrations outside Section 07. No finding targeted the new P8 migration/model/adapter. Not rerun and not described as a passing global gate. |

Inherited verifier findings apply to `20261009010000_eap_asset_reference_serialization`, `20261009020000_eap_restore_operation_barrier`, `20261009030000_eap_archive_operation_barrier`, `20261009040000_settings_override_history`, `20261009050000_settings_current_version_ownership`, and `20261009060000_settings_definition_validation_rules`. Their SQL was already present at HEAD before this batch; these files are unchanged by Section 07. Their owners must resolve their metadata separately. They are not suppressed or added to historical exceptions here.

Exact unedited logs: `evidence/section-07/closure/`. The new tests cover dispatcher mutation denial/foreign payloads, reviewer approval/source revisions, JSONB-stable previews, stale apply/refresh, receipt replay, rollback on outbox failure, bulk preview/impact changes, true primary edges, structural/Unicode diagnostics, SQL pagination/filter contracts and archived public paths/cache headers. Mock rollback proves the application boundary contract, not PostgreSQL durability.

Historical batch results remain: batch 01 **80 PASS / 1 FAIL**, expectation corrected without rerun; batch 02 **18 PASS**; batch 03 **17 PASS**. Do not combine these into a claim that every historical test passed.

## Runtime remains deferred

See [Section 07 runtime register](SECTION_07_ACADEMIC_TAXONOMY_RUNTIME_DEFERRED.md). No migration, database write, seed, alias rewrite, city import, heavy suite, provider test, load test, browser E2E, deployment or merge occurred. The new owner import persistence cannot operate on a database lacking its unapplied table. Existing duplicate primary history must be reconciled before activating the unique index.

Source closure follows Section 07.10–07.12 and the user's no-repeat rule: relevant source failures were corrected, lightweight targeted contracts were run once, complete source work is committed, and operational acceptance stays explicitly open. Advanced ontology reasoning, SKOS publication, automatic semantic classification and full external ontology synchronization remain outside the agreed scope.
