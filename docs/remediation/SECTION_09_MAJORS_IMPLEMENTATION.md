# Section 09 — P10 Majors & Disciplines implementation

Branch: `codex/section-09-majors`. Base: `008f3bd` (main after sections 01–08).

Status: **IMPLEMENTED_SOURCE — RUNTIME_DEFERRED — NOT_MERGED**.
This report describes this source change. It does not certify the entire Phase-10 historical catalog/database freeze or replace final acceptance of the original admin-review checklist.

## User constraints

Implement fixes and the new-major review section. Run only bounded checks once, correct failures without rerunning. No migration execution, Prisma generation, seeds, database access, actual imports, providers, browser/E2E, workers, deployment, load testing or heavy acceptance. Commits use `[skip ci]` with hooks disabled.

## New majors

An unresolved university-program or scholarship major reference appears in the admin **New majors** review queue, including `AMBIGUOUS` university mappings. The source program name stays university-owned; the discovery queue is not a canonical Major and cannot publish itself. Archived/rejected source owners are excluded.

The database groups complete source sets before search/source filtering and stable pagination (25 default, 50 maximum). There is no 10,000-row-per-owner truncation or application-level full-catalog scan. Counts represent all matching groups, including an empty late page. Source-type filtering does not secretly limit the evidence resolved by a decision. SQL Unicode normalization is for queue grouping only, never automatic semantic matching. PostgreSQL normalization/Unicode collation and `sha256(bytea)` support need verification in the authorized runtime.

Each decision carries the complete source-set digest. The server locks the candidate, compares that digest, writes through university/scholarship-owned ports, checks exact source labels/IDs/degrees/timestamps and requires the affected-row count to match. Any mismatch aborts the transaction. Complete source sets above 500 references remain visible but require a separate bounded review workflow; they cannot be partially approved through this form.

Approval creates a reviewed draft concept, or explicitly links an existing compatible concept. Canonical P8 degree IDs must match the requested level, and taxonomy must be selected. A discovery spanning multiple supported levels creates separate profiles/source versions for the same concept, rather than a second concept per degree. Linking requires compatibility with **all** discovered degree IDs. Adding a missing level to a currently published concept remains blocked; explicit owner review is required. Fellowships use their separate owner and cannot be minted as Majors by this queue.

Immutable `NewMajorCandidateDecision` records preserve reviewer, reason, digest, target and source evidence for approve/link/reject. A rejected unchanged source-set leaves the pending queue; changed evidence resurfaces. Alias/discovery naming retains canonical identity boundaries; blocked inline translation fields were removed from the discovery form rather than bypassing the localization owner.

Candidate decisions, canonical creation, child profiles/source versions, owner reconciliation, canonical audit and Outbox persist in the same audited transaction. Approval/link operations require Major review plus university and scholarship management permissions; rejection requires Major review. Server actor identity cannot come from the body. Outbox includes the resulting Major ID when available.

## Admin governance and publication

- Live Major/profile administration is now the default; immutable source catalogs remain a separate explicit review view.
- Admin paging and filtered counts use a bounded SQL union of level profiles and legacy roots, stable timestamp/ID ordering and identical count filters. Alias search and canonical taxonomy mappings are supported. Page-only legacy source-catalog counts are labeled accordingly.
- Every owner mutation requires authenticated actor, reason and caller `If-Match`. The root is locked and its `updatedAt` millisecond revision compared before writes. The successful mutation advances revision monotonically. Import version allocation uses the same root lock and changes revision. Profile/alias URLs share the root revision in the admin client; stale commands are not automatically retried.
- Canonical audit uses the root Major ID and preserves a profile reference. The timeline reads the existing audit repository with a separate audit permission and a validated bounded cursor. The UI loads it on demand.
- Editing content resets working-version approval and profile review state. `COMPLETE` means ready for human review, not final approval. The review command requires distinct, owned, nonempty sections covering the Bachelor/Master/Doctorate templates, a persisted owner source matching the version hash, a reviewer and reason.
- Approval binds the actual identity/profile/content/mappings/sources digest. Publication requires the **latest** working version to be approved, current canonical references to be active, and the approval digest still to match. An older approved version cannot hide a newer unreviewed import.
- `MajorPublicationSnapshot` is insert-only and owner-bound to Major, profile and version. Public page/list/count read the snapshot through the current profile pointer; drafts never become public merely because the root is published.
- A working copy preserves source identity and clones sections into a new version. The old snapshot stays visible while the copy is edited/reviewed. Explicit unpublish clears the pointer; unrelated lifecycle commands do not accidentally clear the current release while preparing a replacement. Replaced live versions become SUPERSEDED inside the same transaction while their snapshots remain immutable.
- Public AR/EN projection explicitly allowlists nested fields. Unknown JSON, source blocks, review metadata, private/version fields, draft profiles and unreviewed sections cannot spread into public responses. Generic graph JSON/lifecycle/pointer writes are refused.
- Alias and major relationships use reviewed commands and persisted endpoints. Duplicate/self links are refused; parent/child changes serialize and check recursive cycles. Classification uses canonical P8 nodes. Source identity/code ranges remain preserved; profile code allocation uses one transaction lock and a bounded aggregate rather than fetching every code.
- Admin detail editing now uses the actual PATCH route; empty content is not silently replaced by old content. Governance UI provides review coverage, copy/approve/publish/unpublish, aliases/relationships/taxonomy, version comparison and bounded older-version browsing. Async reads cancel on scope changes and duplicate commands are guarded.

## One-time validation and limits

| Check | Observed result | Final limitation |
| --- | --- | --- |
| Targeted Vitest, four new suites | **30 passed / 2 failed / 32 total**, 6.71 s | Both failures were fixture assertions treating tagged-template SQL arguments as Prisma.sql objects. Assertions corrected; **not rerun**. No 32/32 claim. |
| TypeScript package/admin/API build, timeout 60 s | **22 diagnostics**, completed within timeout | Removed unused helpers/import; added Vite client type reference for missing ImportMeta.env; removed two impossible comparisons in existing P7 UI. **Not rerun**; final compiler success is unconfirmed. |
| New migration metadata helper | **PASS** | Source metadata only; no database operations. |
| git diff --check | **PASS**, empty log | One execution before later corrections/polish/docs; not rerun. |

Tests cover public privacy/templates, authenticated command contracts/permissions/forged actor, caller revisions, genuine audited-executor rollback on Outbox failure, source-set conflicts, bounded empty-page totals, owner-conditioned reconciliation and immutable public-read constraints. They use local unit/HTTP mocks, not PostgreSQL or browser acceptance. Raw logs are retained unchanged under `evidence/section-09/implementation/`.

Final code also contains improvements after the one-time checks, including canonical audit/timeline, persisted owner-source matching, code allocator, history paging, and small UI/data-integrity corrections. Those changes were manually reviewed, not retested. Existing historical suites were not run. The React checklist was applied to hooks, independent fetching, cancellation, labels, permission guards and on-demand history. No final full-build/browser/SQL-success claim is made.

## Activation and remaining acceptance

The new owner-only migration is source only. Activate schema and role assignments together in an authorized later session. No reviewer/publisher role or runtime data was changed here. Verify SQL Unicode grouping, actual owner-port conflicts and locking, multi-level allocation, immutable triggers/FKs, approved-version hashes, public cursor/count consistency, audit/Outbox rollback/delivery and the new admin flows against PostgreSQL/browser.

Legacy published profiles without a reviewed snapshot intentionally fail closed in these new public reads. Preserve their data and schedule an explicit reviewed republish/activation; do not auto-backfill approvals. The 825/1116/1114 major catalogs and 329 fellowships, source identity reconciliation, backups/rollback and actual database counts remain deferred under the user's prohibition on database work. This change does not claim that catalog/database freeze is complete.

Section 09 is not merged into main by this change. No next section was opened.
