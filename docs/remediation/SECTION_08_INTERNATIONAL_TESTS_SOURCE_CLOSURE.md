# Section 08 — International Tests / P9

**CODE_CLOSED — RUNTIME_DEFERRED, 2026-10-10.**

Baseline: `5dad0918c9b06418c6af9f92278edd114213c1b8` (main, Sections 01–07 integrated). Source closure branch: `codex/section-08-international-tests`; closure commit is the commit containing this register. The approved 9 October source-closure policy applies: runtime, database and provider acceptance remain Post-28, rather than being claimed as passed.

## Source result

Publication now has a separate immutable P9 payload. Approving a candidate binds its public fields, source version/hash, reviewed source blocks, evidence and reviewed provider origin to a stable digest. Publication acquires the owner transaction lock, rechecks the candidate/attestation/approval, creates a sequential P9 publication version and insert-only snapshot, binds the owner's existing published-version pointer, then persists business state, Audit and Outbox together. The version ID is included in the canonical publication event. Public list/detail resolve matching owner snapshots; later edits create draft state while retaining the visible frozen release. Unpublish/archive/revocation hide releases without deleting their history.

Administrative commands require a server-authenticated actor and caller `If-Match` revision; they lock the owner and compare the persisted revision before writing. All successful owner mutations advance revision and invalidate previous candidate approval, except explicit approval/publication. Editing a published root/child/graph changes draft state without leaking mutable fields through public reads. Imported changes participate in the same revision protocol. `IMPORTED`, `READY_TO_REVIEW`, `NEEDS_REVIEW`, `REJECTED` and `ARCHIVED` remain meaningful; `INCOMPLETE` stays exclusively a completeness dimension. Compatibility `/upsert` is now a creation alias: updating an existing record requires an explicit owner/revision edit, rather than an implicit merge.

Variant, section, fee, link, material and editorial-profile updates include both child ID and parent test ID in the atomic persistence predicate. Canonical graph edits use existing owner-reviewed incremental writers; generic replacement is refused. Explicit relationship removal affects only the selected owner's draft relation; published snapshot history remains unchanged.

Evidence submissions retain old/new evidence in append-only owner history. Source verification requires a SHA-256 identity, retrieval time, trusted classification, exact reviewed provider HTTPS origin and explicit server reviewer/reason. URL credentials, different origins and HTTP are refused. Verification, approval and revocation retain immutable attestations as well as canonical audit actions. Changed evidence or candidate hashes block reuse; stale source evidence requires renewed retrieval/verification. These are human source attestations: no network fetch or live provider verification occurred.

Source-block decisions are separate from immutable raw content and bind owner/version/hash, reviewer, time, reason and optional mapping reference. Outstanding blocks block approval/publication. The actual owner readiness endpoint exposes missing/stale verification, approval, block review and source freshness. Previously approved file versions are retained; reviewed publication versions do not overwrite raw import versions.

The existing four-tab admin workflow now includes source decisions, explicit review transitions, evidence hash/retrieval inputs, manual reviewed AR/EN names, sequential published releases, protected audit timeline and source freshness. Sourced profile editors cover sessions, version applicability, center/address metadata, requirements, registration/policies and qualified language equivalency; family-inapplicable equivalency, arbitrary metadata, foreign versions, invalid dates/timezones and untrusted official URLs are refused. No booking, payment, automatic CEFR conversion or university acceptance decision was added.

Public projection is a recursive allowlist: import evidence/snippets/conflicts/optionalFields, future administrative columns, internal notes and reviewer metadata are excluded. The existing localization platform preserves AR/EN source names, requested locale and fallback resolution; the shared presentation/detail view uses the selected name, direction, labels and number formatting. Testing windows appear as availability, never recognition. P7 location IDs are independently validated for activity and city-country membership, with reviewed snapshot display names. Institution links come from a bounded University-owned approved/published admission projection; P9 never writes admission rules or invents recognition.

Provider and source-version queries now page; source-name/hash review can look up an older version directly within its owner. The admin list uses filtered SQL aggregates, stable whitelisted sort plus UUID tie-break, actual availability-country filters, provider/completeness/stale facets and URL state. Public discovery initially loads one bounded page; its directory performs server-side search/category/pagination rather than eagerly materializing the catalog. The review workspace has bounded source/evidence/release pages and protected consumer usage pages; unauthorized University/Audit queries fail independently.

## Item disposition

| Plan item | Source implementation |
| --- | --- |
| ITEST-ADM-001 | Immutable owner publication snapshot; transaction-bound approval/apply/pointer/Audit/Outbox; matching owner public list/detail. |
| ITEST-ADM-002 | All five original child writers and new editorial profiles use `(id,testId)` update predicates. |
| ITEST-ADM-003 | Explicit recursive public allowlist, reused by both public application services and snapshot construction. |
| ITEST-ADM-004 | Central lifecycle policy, row lock, persisted revision CAS, draft isolation, stale approval refusal. |
| ITEST-ADM-005 | Append-only evidence/verification/approval/revocation attribution and provider-origin/hash checks. |
| ITEST-ADM-006 | Existing localization projection + fallback evidence, shared AR/EN adapter and bidirectional detail labels/numbers. |
| ITEST-ADM-007 | Owner/hash-bound APPROVED/IGNORED/MAPPED source decisions, actual source/readiness blockers. |
| ITEST-ADM-008 | Canonical status type, safe create states, explicit submit/request-changes/reject/approve commands and separate review/verify/publish scopes. |
| ITEST-ADM-009 | Sourced session/version applicability, validity/section timing, center, requirements, policies and eligible language equivalency workflows; no booking/payments. |
| ITEST-ADM-010 | Windows separated from recognition; actual approved/published University admission links through the owner read gateway. Unsupported scholarship links stay omitted. |
| ITEST-ADM-011 | Full-filter SQL aggregate metrics, stable whitelisted sorting and bounded offset pages. |
| ITEST-ADM-012 | Searchable paged P7 availability selectors, duplicate/activity/membership validation and localized snapshot location names. |
| ITEST-ADM-013 | Incremental canonical graph add/remove, stable relation IDs; no generic delete/recreate replacement. |
| ITEST-ADM-014 | Safe manual create identity/defaults and separate reviewed AR/EN names; imported source/hash naming protections retained. |
| ITEST-ADM-015 | Sanitized stable problem codes, 400/401/403/404/409/422/500 semantics, HTTPS origin/credential checks; no SSRF fetch. |
| ITEST-ADM-016 | Existing per-owner version lock retained, sequential publication version allocation, provider/version pages and bounded remote public discovery. |
| ITEST-ADM-017 | Canonical actor/action/time/reason/correlation timeline under Audit permission, alongside paged immutable attestations and publication releases. |
| FGA-08-001 | Country availability/provider/completeness filters + URL state; source stale facet. |
| FGA-08-002 | University-owned admission reverse usage/count/paging and scale-change review warning; read permission isolated. |
| FGA-08-003 | Category freshness based on evidence retrieval (fee/window 30d, registration 90d, center 180d), not generic root updatedAt; explicit renewed verification. |

## One-shot verification — actual results

| Check | Observed result | Subsequent correction / scope |
| --- | --- | --- |
| Five focused Vitest suites, 2.93 seconds | **31 PASS, 1 FAIL (32 total)** | Failed render assertion expected the official-links section without supplying any link. Added a real HTTPS link to the test fixture; **not rerun**. No final 32/32 claim. |
| Scoped TypeScript, one attempt with 60-second ceiling | **FAIL: six diagnostics** | Removed unused import/React test import; converted unknown Omit pagination/country values; closed the country selector JSX expression. **Not rerun**. Downstream admin/web semantic checking was limited by the parse error. |
| New P9 migration ownership metadata | **PASS** | Source-only ADR-028 validation; no SQL execution. |
| `git diff --check` | **PASS (empty log)** | Single execution before final fixes, fixture adaptations, location projections and documentation; not repeated. |

Tests exercised recursive privacy/URL/lifecycle negatives, five cross-parent writes, transaction/CAS refusal, immutable owner snapshot queries, stable hashes/two-release isolation/stale approval, real Atomic executor rollback and audit/outbox boundaries, authenticated/revision/permission/forged-actor/sanitized HTTP failures, and shared AR/EN presentation. Persistence tests use mocks, not a database. The short suites do not establish real PostgreSQL durability, live source bytes or deployment success.

Exact, unedited observed logs are under `evidence/section-08/closeout/`; the focused Vitest config remains in the repository. Legacy admin/application/persistence fixtures were adapted for required revisions, atomic commands, canonical enums, snapshot reads and sanitized errors but were **not run**. Final readiness, attestation retention, source-version lookup, manual create/defaults, source freshness/location presentation and fixture changes postdate the one-shot checks. There is no final compiler or whole-suite PASS claim.

React review covered hook ordering, independent parallel bounded reads, stale-response/cancellation guards, explicit error states, native labels/control semantics, no raw JSON authoring, request debouncing, stable keys, insert-only source history and avoidance of zero-count conditional rendering. Browser interaction remains deferred.

## Activation and Post-28 acceptance

The source-only `20261010100000_tests_publication_governance` migration creates P9 governance revisions, immutable publication snapshots and evidence history, with owner foreign keys and insert-only triggers. It was **not applied**; no Prisma generation, query, migration, backfill, seed, import, worker, provider access, deployment or data mutation was executed. Existing migration history was not edited. Three new permission catalog entries require separately reviewed IAM assignment before operators use verification, approval or publication; no runtime role was modified.

Before deployment, activate schema/client/roles together in the authorized environment and verify locking, revision/edit/publish races, actual audit/outbox rollback/delivery, transaction isolation and insertion numbering. Existing visible legacy roots have no certified snapshot: public reads intentionally fail closed for those rows. Preserve their original data and review each source/candidate before an explicit republish; never auto-backfill a supposedly approved release. Schedule this transition so existing student-facing content is not unexpectedly removed during deployment.

Post-28 must verify original provider bytes/source hashes and freshness policies, genuine review permissions, real parent-bound Prisma updates, source blocks/manual localization round trips, two-release public isolation and immediate hiding, official-link/asset behavior, browser AR/EN flows, full data-scale pagination/aggregate performance and University/Scholarship consumer contracts. The current projection omits unsupported/unapproved links and never evaluates admission eligibility. No official authority or provider success was fabricated.

Section 09 was not opened. Source commits use `[skip ci]`; heavy/shared acceptance checks remain deferred as instructed.
