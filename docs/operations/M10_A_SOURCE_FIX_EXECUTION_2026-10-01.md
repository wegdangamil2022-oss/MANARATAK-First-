# MANARATAK — M10-A source execution evidence

Date: 2026-10-01. Repository: `wegdangamil2022-oss/MANARATAK-First-`.
Branch: `fix/m10-a-source-contracts`.
Starting source SHA: `ded7d25b364b2b974ba1fb143f1ec5c141f761fb`.

## Scope and ownership — M10-01

The user authorized implementation of the database-independent portions of
M10-01 through M10-06, following sections 21, 28 and 30 of the supplied v2 plan
and the supporting administration capability register. M0–M9 are accepted for
planning. This is a change and verification record, not another platform audit.

| Task | Source owner / changed contract | Local evidence | Source status | Connected status |
|---|---|---|---|---|
| M10-01 | Change list, API/use-case ownership, acceptance cases and boundaries below | Reviewed scoped files; isolated fix branch and execution record | COMPLETE | No pilot authorized or performed |
| M10-02 | Admin ReferenceData Save/Preview transport and existing security middleware | T02 transport + command contract tests | SOURCE_PASS | RUNTIME_UNTESTED |
| M10-03 | Admin session client; shared CSRF manager policy retained | T03 stable retry, refresh denial, cancellation and session-change tests | SOURCE_PASS | RUNTIME_UNTESTED |
| M10-04 | ReferenceData owner DTO, query schema, list/count repository and Admin consumers | T04 pagination/query/picker tests | SOURCE_PASS | RUNTIME_UNTESTED |
| M10-05 | Universities canonical relationship validator and repository write boundary | T05 generated-client compilation and mocked repository tests | SOURCE_PASS | RUNTIME_UNTESTED |
| M10-06 | Session CSRF tests, server polling orchestration tests, ADR-028 metadata verifier | T06 session/worker/immutable-metadata tests and source boundary gate | SOURCE_PASS | RUNTIME_UNTESTED |

Codex owns these source changes and local tests. The connected environment owns
cookie/session/browser behavior, durable database effects, worker delivery and
applied-migration reconciliation. Source success does not close M10 or establish
Runtime/E2E success. Pilots, M10-B authoring expansion and M11 bulk import remain
outside this delivery.

## Files and changes

### Administration transport — M10-02 / M10-03

- `apps/admin/src/api/referenceData.ts`: typed ReferenceData transport; all four
  saves and both previews use the Admin client. Country/currency/language keys
  are placed in route parameters and removed from the strict request body.
- `apps/admin/src/api/client.ts`: construct one effective mutation request with
  original idempotency key, body, caller headers and signal; one shared refresh
  and at most one authentication retry. Successful refresh invalidates the cached
  session CSRF token. Failed refresh or a second 401 marks the Admin session
  unauthorized and emits the existing session-expired event. Cancelled commands
  and commands whose session changed cannot replay. A verified authorized session
  can clear the previous refresh-denial latch.
- `apps/admin/src/pages/ReferenceDataAdminPage.tsx`: removes direct mutation fetch
  paths in favor of this transport. The existing security policy still generates
  keys for POST/PUT/PATCH; it has not been relaxed or extended to new exemptions.

### Reference pagination — M10-04

- `packages/domain/src/reference-data/dto/ReferenceDataContracts.ts`: collection
  identifiers and typed `{ data, total, page, pageSize, totalPages }` contract.
- `packages/domain/src/reference-data/contracts/IReferenceDataRepository.ts`:
  adds the owner count operation.
- `packages/application/src/reference-data/use-cases/ReferenceDataUseCases.ts`:
  normalized, validated page result; existing array list methods remain available
  to their existing consumers.
- `packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts`:
  shared typed predicates for list/count, real total without skip/take, stable
  ID tie breaker in page order, country-scoped region queries.
- `apps/api/src/presentation/api/router/ReferenceDataQueryContract.ts`:
  shared bounded reference filter shape. Page size is 1–100; page is a positive
  integer bounded to 1,000,000 at the HTTP boundary. Unknown keys, invalid/repeated
  values and malformed country codes are rejected. Admin explicit activeOnly
  parsing remains; it is not accepted on public routes.
- `apps/api/src/presentation/api/router/ReferenceDataAdminRouter.ts`: all five
  collection endpoints expose page metadata and retain the `data` array.
- `apps/api/src/presentation/api/router/ReferenceDataPublicRouter.ts`: reuses
  the shared reference query shape; retains localized public response behavior.
- `apps/admin/src/api/referenceData.ts`: loads sequential pages of at most 100
  for complete reference selectors. A malformed response or the explicit
  1,000-page safety limit fails visibly instead of silently truncating.
- `apps/admin/src/api/canonicalPickers.ts`: countries, regions, cities, languages
  and currencies use this complete reference-page loader and preserve scopes;
  canonical lifecycle state is respected when deciding selectable options.
- `apps/admin/src/pages/StudyDestinationDetailPage.tsx`: replaces unsupported
  pageSize=250 reference requests with the same bounded all-page loader for
  language/currency selectors. Independent initial reads remain parallel.
- `apps/admin/src/pages/ReferenceDataAdminPage.tsx`: previous/next controls,
  matching-record total, explicit loading/error/empty states; a stale response
  cannot overwrite the newer page. React skill checklist applied to affected
  hooks and components. No browser verification is claimed.

Non-reference major/test/university/taxonomy selectors and the separate
StudyDestination relationship graph were not redesigned in this package.

### Geography — M10-05

- `packages/infrastructure/src/universities/UniversityCanonicalRelationshipValidator.ts`:
  uses typed Prisma delegates; removes the nonexistent AdministrativeRegion
  `isActive` selection. Regions have no synthetic activity check. Existing
  country/city activity checks and parent checks remain. Country foreign IDs are
  checked when present; region/city country consistency is checked even without
  an explicitly selected country. The actual University repository calls this
  validation before its create/update or normalized replacement mutations.

### Tests and immutable metadata — M10-06

- `apps/api/tests/presentation/api/router/AuthRouter.spec.ts`: authenticated
  refresh/session binding for CSRF issuance; invalid token, absent session and
  inactive identity reject issuance. No security implementation weakened.
- `apps/api/tests/presentation/api/router/CompositionBoundaryClosure.spec.ts`:
  strengthens the existing unauthenticated 401 assertion with absence of a CSRF
  header. The mounted app's canonical problem-details envelope remains asserted.
- `apps/api/tests/infrastructure/workers/PollingWorkerRuntime.spec.ts`: actual
  polling runtime with isolated worker/monitoring adapters and fake timers;
  ordered owner delivery, flag gating, non-overlap, failure reporting, continuation
  and graceful stop.
- `tests/remediation/w3-integration-runtime.test.mjs`: follows the current
  `server.ts -> startPollingWorkers -> ownerDomainOutboxWorker` orchestration.
- `scripts/architecture/migration-metadata-policy.mjs`: exact historical SQL hash
  and sidecar metadata validation; future migrations retain inline metadata gate.
- `scripts/architecture/verify-persistence-boundaries.mjs`: integrates that policy
  and checks named exception files exist.
- `docs/architecture/persistence/persistence-ownership.manifest.json`: three
  individually named M7 historical metadata sidecars; original historical
  baseline unchanged. No live applied state is asserted.
- `docs/architecture/persistence/migration-metadata-policy.md`: review procedure,
  immutable historical SQL and forward-repair rules.
- `tests/architecture/migration-metadata-policy.test.mjs`: exact bytes accepted,
  tampering rejected, future waiver rejected, incomplete metadata rejected.

Other changed/added behavior tests:

- `apps/admin/src/api/client.spec.ts`
- `apps/admin/src/api/referenceData.spec.ts`
- `apps/api/tests/presentation/api/router/ReferenceDataAdminRouter.spec.ts`
- `apps/api/tests/presentation/api/router/ReferenceDataPublicRouter.spec.ts`
- `apps/api/tests/presentation/api/router/ReferenceDataCommandContract.spec.ts`
- `packages/application/tests/reference-data/ReferenceDataPagination.spec.ts`
- `packages/infrastructure/tests/reference-data/ReferenceDataPagination.spec.ts`
- `packages/infrastructure/tests/reference-data/PrismaReferenceDataRepository.spec.ts`
- `packages/infrastructure/tests/universities/UniversityCanonicalRelationshipValidator.spec.ts`
- `packages/infrastructure/tests/universities/PrismaUniversityRepository.spec.ts`

## Test evidence — final results

All dependencies were already present. No package installation or internet fetch
was required. Supertest listeners, fake fetch, in-memory stores and mocked Prisma
delegates are local test adapters, not a database or Google AI Studio session.

| Evidence ID | Test scope | Actual final result |
|---|---|---|
| T02 | Four saves and two previews attach CSRF and distinct idempotency keys; strict bodies; actual CSRF/idempotency middleware with a memory store: same key/body replay, changed body conflict, principal scope, missing key and invalid cookie-bound CSRF | PASS |
| T03 | Original generated/provided/header key, headers/body/signal preserved; one refresh for concurrent 401s; second 401 bounded; denied/network refresh exposes re-login; abort and session changes block replay; permission/conflict do not trigger auth retry; actual CSRF wrapper obtains a new session token after refresh | PASS |
| T04 | Page-two total includes all 120 memory rows; five typed list/count predicates match; invalid/unknown query rejected; later-page reference option remains selectable; StudyDestination loader reaches page three; malformed response fails | PASS |
| T05 | Schema-compatible region query, missing/inactive/foreign relationships rejected; actual repository create/update succeeds with compatible geography and performs no write for wrong-country geography; invalid normalized replacement deletes/inserts nothing | PASS |
| T06 | CSRF session conditions; real orchestration with mocked deliveries; immutable SQL metadata and future migration policy; source worker composition regressions | PASS |

Final Vitest batches:

- 11 affected test files: **123 passed**.
- Existing ReferenceData use-case/repository regression files: **32 passed**.
- CompositionBoundaryClosure selected bootstrap test: **1 passed**, **4 deselected**.
  Only the selected test explicitly disables external services and supplies the
  database double; the other cases were not run as this task forbids DB access.
- Node test batches: **23 passed** across migration policy and six existing W3
  worker/provider source or isolated adapter regression files.
- Total distinct executed tests: **179 passed**. No final failures.

Intermediate failures were resolved by matching mocks to the new owner page
operation, respecting cookie-bound CSRF policy and the mounted app's problem
envelope, and asserting the new deterministic name+ID sort in existing repository
tests. No assertion was weakened to ignore authentication, permissions, conflicts,
relationship validity or count completeness.

## Static and build gates

- `node node_modules/typescript/bin/tsc -b`: PASS for the configured project
  references, including the validator against the installed generated Prisma
  client. No Prisma generation or DB introspection was performed.
- `node scripts/verify-api-native-esm-specifiers.mjs`: PASS — 94 files, zero
  invalid relative specifiers.
- `node scripts/resolve-api-workspace-esm.mjs`: PASS for six API workspace packages.
- `node scripts/report-api-preview-configuration.mjs`: completed without error;
  this is a source/build diagnostic, not a live environment readiness assertion.
- Admin Vite production build: PASS. Nonblocking warning: minified Admin bundle
  remains larger than 500 kB (about 1.86 MB, 484 kB gzip); bundling optimization
  was not part of this contract repair.
- API esbuild production bundle using the existing package-script externals: PASS.
  The bundle was built, not started.
- Persistence boundary verifier: PASS — ownership 246/246, zero forbidden direct
  cross-context mutations, six approved read-model paths, 47 unchanged historical
  baseline names and three fingerprint-bound sidecars.
- `git diff --check`: PASS.
- Byte comparison of all **63 committed migration.sql files** against starting
  HEAD: **zero differences**. No historical SQL or checksum was edited.

The existing npm executable was not in PATH, so local Node and dependency binaries
were used directly to perform the typecheck/build script steps. No npm install
or npx download was used.

## Connected verification queue — all RUNTIME_UNTESTED

| Runtime case | Required future evidence |
|---|---|
| R02 Save/Preview | With an authorized test account, save a controlled reference fixture; read it back. Repeat exactly the same key/body and prove one durable effect. Change body under same key and prove 409 with unchanged row. Preview must produce zero domain writes; idempotency/audit infrastructure records may still be written by middleware. |
| R03 Session expiration | Expire the access token while the refresh session is valid; verify exactly one refresh, same command key/body/caller headers, renewed session CSRF, one durable effect. Invalid refresh shows re-login and no replay. Changing accounts during refresh must not submit the old command. |
| R04 Pagination/selectors | Compare totals with the same scoped filter in the connected DB. Navigate beyond page one in ReferenceData and select a later-page language/currency/geography record. Unsupported keys/pageSize=250 remain 400. |
| R05 Canonical geography | Save a valid Country/Region/City relationship with actual canonical IDs, then read it back. Try a foreign country/region/city, missing ID and inactive country/city; rejection must precede any persisted write. |
| R06 Worker delivery | In a controlled worker environment verify enabled/disabled flags, one iteration at a time, durable owner delivery, truthful failure/success telemetry and graceful stop. Local tests prove orchestration only. |
| R06 Applied migration state | Read-only review of applied migration names/checksums against the existing immutable source. No historical SQL rewrite, checksum repair or migration execution is authorized by this record. |
| RBAC boundary | Repeat affected endpoints with a denied employee/student account and show server-side permission denial with zero mutation. The memory command test injects a test principal; it does not prove live authentication/RBAC. |

No DB connection, migration, seed, import, deployment or pilot was performed.
The full repository suite, live browser flow and Runtime/E2E suite were not run.
Existing unrelated local storage and the earlier untracked platform-audit file
are outside this change set. `main` is not updated by this M10-A delivery.
