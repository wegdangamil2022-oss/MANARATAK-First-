# Section 11 — Scholarships (P12) — checks and deferred verification

Date: 2026-10-10. Branch: `codex/section-11-scholarships`. Base: `91b7d978228c849ffc5d7c5f235bca52541c356a`.

## Executed — one bounded read-only source check

A **single read-only static source assertion pass** was executed once against the pushed Section 11 branch before this documentation commit. It retrieved 11 P12 source/migration files and evaluated 18 scoped string-level assertions. **Result: 18 PASS / 0 FAIL.**

Covered: schema + unapplied revision SQL; row-locked compare-and-fail for stale revisions; revision increments; atomic audit/outbox fail-closed; API reason/If-Match enforcement; all 6 lifecycle commands using the owner request context; admin client revision propagation; explicit public allowlist; published version/root filter; published Major/University filtering; HTTPS official-source gate; canonical sponsor University relation; funding/eligibility range checks; academic-program owner consistency; source-key child upserts; import conflict review; Scholarship Major writer excluding published owners; canonical sponsor picker wiring.

**Scope qualification:** these are source text/structure invariants, not TypeScript compilation, unit test, Prisma schema validation, database integrity, or runtime behavior. All 18 passing means the selected source anchors exist in the branch. No subsequent rerun was performed and no previous-phase tests were repeated.

## Not executed — explicit constraints

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
