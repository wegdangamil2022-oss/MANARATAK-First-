# Repository CI repair — 2026-10-10

Verification is source-only. No migration, seed, production deployment, or database mutation is performed by this repair.

## Persistence review

Already committed migrations with missing ADR-028 headers retain their original SQL bytes. Individual SHA-256 sidecars in the persistence ownership manifest classify their owners; these do not assert that the migrations were applied to a database.

The Reference Data owner review queue is an approved read model over Import's screening receipts. Its adapter reads only `ownerDomain: REFERENCE_DATA`, uses bounded pagination and explicit receipt field selection, sanitizes the evidence projection, and never edits import receipts or implies that screening grants apply/publication permission. Import remains the receipt owner. This is the sole new cross-context read approved in the ownership manifest.

Database-backed diagnostic tests remain in the separate database test configuration; they require a supplied disposable database. Source unit and security gates remain mandatory.

## Behavior repaired

Admin course requests now distinguish provider routes, imported course IDs, and learning path IDs. Mutations use the selected owner's revision and review reason; reading one imported course cannot authorize another course's write. Regression tests exercise both the successful per-owner version headers and missing-read refusal.

Scholarship major editing preserves target keys instead of resolving identities by display labels. Canonical search filters use owner IDs. Source evidence and publication/verification state are visible in the scholarship editor.

Reference owner review DTOs live in Domain so the admin frontend does not import Application. Source authority credentials are injected by API configuration rather than read inside Infrastructure. Vercel's API TypeScript context explicitly includes Vite's ambient declarations because the existing loader verification also traces frontend files; this adds types without frontend runtime imports.

Source verifiers and test fixtures follow the current bounded pagination, review, revision, immutable publication, and atomic mutation contracts. Reviewed workflow steps, authority checks, and rollback assertions remain enforced.

## Verification

Passed locally: TypeScript project build and Vercel loader contexts (zero diagnostics), ESLint (zero errors; existing warnings remain), workspace builds, Google AI Studio launch/read-write isolation verification and build, current environment inventory, translation source/schema and 25 behavioral tests, source quality, source architecture, source closure manifest, and Prisma validate/generate without a database connection.

Focused regressions passed: 16 admin client/provider tests, 24 international-test/imported-course/scholarship workflow tests, and all three migration-metadata policy tests, including tampered SQL and unlisted future migration refusal. Complete unit/security runs are also enforced by the existing GitHub CI on the repair commit.
