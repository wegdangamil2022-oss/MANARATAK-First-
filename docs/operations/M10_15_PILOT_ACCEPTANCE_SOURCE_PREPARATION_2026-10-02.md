# M10-15 — Tests → Majors: source preparation and connected acceptance

## State and scope

M0–M9 remain accepted. M10-01–14 source changes are on main. This task prepares the next possible work locally; it does not execute a pilot, connect to a DB, access Google AI Studio, migrate, seed, import or deploy.

**SOURCE_PREPARED / connected M10-15 = RUNTIME_UNTESTED.** M10-16–19 and broad imports are not started. A successful mock cannot close a pilot or the whole M10.

## Source fix

The Test child score writer previously checked only `minimum > maximum`; NaN/Infinity and non-positive increments could pass that check. Section writes did not validate their score range. The shared score policy now rejects non-finite bounds, reversed ranges, optional non-positive/non-finite increments and invalid validity months before persistence. Existing root validation and publication use the same policy; invalid stored section bounds cannot pass publication. Fractional positive increments and reviewed pass/fail text are preserved; the software does not invent a pass threshold or cross-test equivalency.

Existing canonical provider/family/degree/taxonomy owner checks, immutable source/version receipts, recovery approvals, audit/outbox transaction policy and admin permission checks remain authoritative. No historical SQL, checksum or schema was modified.

## Executable evidence boundary

The 17 required cases and their expectations are defined in `scripts/import/M10PilotAcceptance.ts`. The bundled JSON template has every case `RUNTIME_UNTESTED`, no UUIDs and no runtime evidence. IDs must be captured from the actual connected owner operation; the template never allocates or guesses them.

```sh
# On a clean checkout, compile the required source packages first:
npm run build -w @manaratak/application

# Offline: show a fresh template on stdout; keep operator evidence outside Git.
npm run pilot:m10:template

# Offline, read-only: inspect a local, sanitized evidence JSON.
npm run pilot:m10:inspect -- /path/to/operator-evidence.json
```

The inspector requires the exact protocol hash, unique known case IDs, bounded UUID lists, timestamps and local evidence references. `SOURCE_MOCK` results never count as connected evidence. Missing/failed cases remain open. Even a structurally complete runtime submission returns **EVIDENCE_SUBMITTED_REQUIRES_OPERATOR_VERIFICATION**, with `runtimeAccepted: false`: a JSON file cannot prove that its own claims are authentic. The connected operator must inspect the referenced UI/HTTP/DB/audit evidence. Do not paste cookies, passwords, connection strings or approval tokens into the evidence file or chat.

## Connected prerequisites — not run here

1. Pull the verified main commit. Complete the existing controlled schema parity/recovery procedure, including the M10-07 migration if still unapplied. Do not rerun M9.
2. Verify the current account by persisted stable identity and current permissions, using the existing owner preflight procedure. No email-based owner inference. Keep configured secrets inside the connected environment.
3. Obtain current canonical provider/family, DegreeLevel, taxonomy and existing target IDs from a read-only session. Capture lifecycle and owner relationships. Select **1–5 reviewed Tests**, then a small explicitly selected Major set after Tests pass. No bulk import.
4. Record exact raw source hash, source classification, reviewer decision/reason, preview/change-set and recovery evidence. Follow the M10-11 writer runbook for prepare/inspect/dry-run/approved-write/reconcile/compensating rollback. A blocked dry-run is not write approval. Actual mutations need the environment operator's approval and existing recovery gate.

## Tests first

Use the official Admin `/international-tests` list/detail. Capture a real save request with CSRF and Idempotency-Key, its current actor permissions and sanitized response, then compare its exact owner ID/provider/family with a separate DB read and a refresh of the UI.

Verified API paths (relative to the configured API base):

- `GET /admin/international-tests/:id`, `/:id/readiness`, `/:id/relationships`, `/:id/import-versions`.
- Reviewed score/section operations: `POST|PUT /admin/international-tests/:id/score-scale` and `/:id/sections`.
- Explicit reviewed lifecycle: `POST .../:id/verify-source`, `/:id/mark-publishable`, `/:id/publish`, `/:id/archive`. Publication is never implicit in import.
- Public smoke: `GET /international-tests/:slug`. Draft/archive must be hidden; published record must retain the reviewed identity and policy.

Prove stable IDs, source/version preservation, same-plan zero-write retry, actual score/version/policy readback and verified source. Test missing/foreign canonical references, inactive/unverified/student actor, missing permission/CSRF, stale preview, reversed/non-finite scores and invalid increment. Capture rejection before business persistence. Inject mid-write and audit/outbox failure only in an approved disposable test environment; verify rollback, receipt/audit consistency and zero accepted orphan/duplicate/identity drift. Test compensating rollback separately from public publication, because new downstream changes must block blind rollback.

## Then Majors

Use official Admin `/majors` list/detail, a selected existing approved source identity and the existing owner import/review workflow. Do not invent an unsupported Major create/profile endpoint or write directly with Prisma from a new script.

Verified paths:

- `GET /admin/majors/:id`, `/:id/profiles`, `/:id/versions`, `/:id/sources`, `/:id/classification-mappings`.
- `POST /admin/majors/:id/classification-mappings` with a reviewed existing taxonomy UUID, optional **same-owner** profile UUID, reason/evidence and current transport protections.
- Use the current Major list query `taxonomyNodeId` through the official UI/backend contract.
- `POST .../:id/mark-ready`, `/:id/mark-publishable`, `/:id/publish`, `/:id/unpublish`, `/:id/archive`.
- Public smoke: `GET /majors/:slug` and the actual degree/taxonomy list filters.

A publishable **same MajorLevelProfile** must carry DegreeLevel and taxonomy together; a degree on one profile and taxonomy on another is insufficient. Prove exact IDs after refresh, source/version preservation, foreign owner/inactive reference/degree mismatch rejection, denied employee/student writes, retry behavior, failure rollback, audit/outbox and zero accepted duplicate/orphan/identity drift. Publication must make the accepted record discoverable; Draft/unpublish/archive must hide it, including refreshed/cached public responses.

## Evidence and hold policy

For each case capture a sanitized local evidence reference, actual observed timestamp and stable entity IDs. Include UI interaction, HTTP request/response, independent DB read, audit/outbox/receipt and public observation where applicable. Keep source assertions labelled SOURCE_MOCK. Do not replace failed cases with successful source tests.

Tests remain the next domain until all their connected cases have real evidence. Majors remain pending afterward; unresolved Major references block the affected item. Operator review of a complete bundle is required before M10-16 or any pilot closure. This preparation does not close M10-15, M10-C or M10.

## Source verification actually executed

- 20 scoped test files / 158 tests PASS: Tests application/domain, Majors application and M10 evidence boundary.
- Root TypeScript project build and strict standalone checks for the new scripts/tests PASS.
- API and Admin production builds PASS. Admin retains the existing large bundle warning.
- Vercel TypeScript contexts PASS with zero diagnostics; scoped ESLint, source quality and persistence/migration metadata gates PASS.
- Full registered source closure manifest PASS; DB integration and browser E2E remain explicitly skipped runtime gates.
- Environment inventory current (240 variable names); tracked secret scan and staged whitespace check PASS.
- Read-only evidence CLI reports all 17 cases RUNTIME_UNTESTED, Tests next, databaseWrites=0, runtimeAccepted=false.

No connected UI/API/DB/public/audit pilot was executed. This is source verification only.