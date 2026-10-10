# Section 07 — Academic Taxonomy / P8

Status: **IN PROGRESS — three remediation batches**, not CODE_CLOSED.

Branch: `codex/section-07-academic-taxonomy`, based on `7231f2c`.
Worktree: `/workspace/manaratak-section-07`. The original checkout and branch remain available for Section 06. Shared external dependencies are read-only symlinks; workspace package links/build outputs resolve to this worktree. No Section 06 source, city data or DB schema changed.

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

## Remaining original scope

| Original area | Remaining work |
| --- | --- |
| TAX-P0-001/002 | Browser acceptance; preserve new identity/validation safeguards. |
| TAX-P0-003 / TAX-P1-004 | Browser pagination/picker acceptance; canonical list totals/status filters implemented in batch 02. |
| TAX-P0-004 | Node/legacy-create and Degree Level edit CAS implemented; archive/status governance implemented in batch 03; runtime acceptance remains. |
| TAX-P0-005 | Real PostgreSQL contention proof deferred; graph integrity read model still pending. |
| TAX-P0-006 | Actual P6→P8 screening composition and owner preview/review/apply/idempotency; retain generic mutation denial. |
| TAX-P1-001/002/003 | Archive-only retirement and generic impact/degree edit governance implemented in batch 03; consumer browser/runtime acceptance and targeted consumer navigation remain. |
| TAX-P1-005 | Mapping direction/standard validation and preview/semantics UX. |
| TAX-P1-006 | Historical alias collision evidence and remaining seed normalization adoption. |
| TAX-P1-007 | Owner command adoption implemented in batch 02; consumer-specific payloads/cache invalidation and runtime atomicity acceptance remain. |
| 07.6 / 07.8 | Tree/primary/alternative paths, triage/integrity/orphan/alias queues, public bounds/cache acceptance. |
| FGA-07-001 / 002 | Crosswalk coverage/conflict worklist and standard compliance curation, per original appendix. |

Section 07 remains open until the complete original register is implemented. An added button, interface, passing mock or deferred runtime test does not close missing source work.
