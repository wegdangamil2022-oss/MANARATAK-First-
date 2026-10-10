# Section 11 — Scholarships (P12) — checks and deferred verification

Date: 2026-10-10. Branch: `codex/section-11-scholarships`. Base: `91b7d978228c849ffc5d7c5f235bca52541c356a`.

## Executed — one bounded read-only source check

A **single read-only static source assertion pass** was executed once against the pushed Section 11 branch before this documentation commit. It retrieved 11 P12 source/migration files and evaluated 18 scoped string-level assertions. **Result: 18 PASS / 0 FAIL.**

Covered: schema + unapplied revision SQL; row-locked compare-and-fail for stale revisions; revision increments; atomic audit/outbox fail-closed; API reason/If-Match enforcement; all 6 lifecycle commands using the owner request context; admin client revision propagation; explicit public allowlist; published version/root filter; published Major/University filtering; HTTPS official-source gate; canonical sponsor University relation; funding/eligibility range checks; academic-program owner consistency; source-key child upserts; import conflict review; Scholarship Major writer excluding published owners; canonical sponsor picker wiring.

**Scope qualification:** these are source text/structure invariants, not TypeScript compilation, unit test, Prisma schema validation, database integrity, or runtime behavior. All 18 passing means the selected source anchors exist in the branch. No subsequent rerun was performed and no previous-phase tests were repeated.

## Not executed during the initial source round — explicit constraints

- No `tsc`, comprehensive build, `vitest`, heavy/E2E/browser tests or remote actions.
- No database query, Prisma generate, migrations applied, seed, import, data promotion, background provider execution or network calls to production services.
- No CI pipeline was intentionally run; each commit has `[skip ci]`.
- No deployment or `main` merge.

## Deferred operational follow-up

1. Preflight production/staging records and apply reviewed source-only revision migration under approved DB procedure, coordinate release with generated Prisma client.
2. Once allowed, single scoped P12 type and unit/API checks; confirm nested compound-key upserts, owner row locks and Prisma relation APIs against generated client.
3. Test concurrent owner mutations (one must return 409), ETag/If-Match/428 behavior, JWT/RBAC and CSRF, audit + outbox atomicity and rollback.
4. Check verified publications with approved P10 Major/profile, published P11 University, P7 currencies, P8 degrees, P9 international tests and canonical sponsor link.
5. Exercise import-candidate review, identity collision, duplicate major evidence, explicit merge/reject/rollback on a non-production fixture and downstream P10 New Major review decisions.
6. Validate actual scholarship detail/list screens, all command buttons and public bilingual projections with real persisted records; exclude private evidence/unapproved relations.

Final classification: **SOURCE_FIXES_COMMITTED / BOUNDED_STATIC_CHECKS_PASSED / OPERATIONAL_SIGNOFF_DEFERRED**.

## Authorized quick branch review — 2026-10-10

Reviewed the 17-file Section 11 diff against main `91b7d97` and the available Phase 12 architecture requirements (canonical references, independent ownership, source merge/provenance, publication review and version integrity). The original consolidated admin review plan remains unavailable; this is not a certification of every item in that missing checklist.

Executed once with local source aliases, Node environment and two workers:
`timeout 45s node node_modules/vitest/vitest.mjs run --config .section11-quick-vitest.config.ts`

Selected files: `PublicScholarshipUseCases.spec.ts`, `ScholarshipImportAtomicTransferUseCase.spec.ts`, and the new `Section11Review.spec.ts`.
**Observed result: 28 PASS / 5 FAIL / 33 total, 2.85 seconds.** Raw output: `evidence/section-11/quick-review-tests.log`.

Failure causes and source corrections:
- One locale projection regression: removed alternate `localizedNames` from the public payload while retaining selected-language displayName resolution.
- Two import merge failures: preserve the existing canonical displayName instead of blocking provenance merge over a supplier display label; incoming evidence is retained. Conflicting populated funding/eligibility/reference values still require explicit reconciliation.
- Two unpublished eligibility-Major failures: verify eligibility-linked Majors at publication and include their actual owner status for public projection filtering.

Additional manual corrections: hydrate missing child fields without replacing populated values; read existing sponsor University from sponsorContext; strip hydrated read relations before nested Prisma writes; reject unbalanced If-Match quoting; compare and lock the existing Scholarship revision before import merge; invalidate publish readiness on structural repository edits including import changes. The import test fixture now models the required revision lock.

`git diff --check origin/main..HEAD` executed once before these corrections: PASS. No check or test was rerun after corrections. Final correctness/type-check/runtime success is not claimed.

No database calls, schema application, Prisma generation, heavy tests, browser, full build, deployment or main merge. Push only, as authorized. The temporary test config was removed after its single execution.

## Authorized rerun to zero failures — 2026-10-10

The user explicitly authorized rerunning the selected quick tests until no failures remained, superseding the earlier no-rerun constraint for this task.

- First rerun: 32 PASS / 1 FAIL, 2.58 seconds. The changed-duplicate-target case correctly blocked writing but returned a revision error before the specific stale review decision error.
- Correction: validate the durable merge decision before acquiring/comparing the target revision; the revision lock still precedes every merge write.
- Final rerun, same three files and 45-second bound: **33 PASS / 0 FAIL**, 3 files passed, 2.31 seconds.
- Raw outputs: `evidence/section-11/zero-failures-first.log` and `evidence/section-11/zero-failures-final.log`.

This confirms the selected unit tests only. TypeScript compilation, generated Prisma compatibility, database concurrency/integrity, full test coverage, browser and deployment remain unverified. No database operation or heavy test was executed.
