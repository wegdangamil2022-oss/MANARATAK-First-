# Repository quality follow-up — 2026-11-04

Follow-up to [the deep cleanup](REPOSITORY_DEEP_CLEANUP_2026-11-04.md), starting at `05c70c36`. The final source-validation checkpoint is `f8b8a308`. This is a repository/source-unit review, not certification of every live workflow or external provider.

## Changes

- Removed **115 unused administration methods** and their unused course-request helper from `apps/web/src/api/client.ts`. Audited method-name references across tracked source, tests, scripts, workflows and documentation, and retained dependencies of surviving methods. The student/public application keeps its active methods; the dedicated Admin application continues using its own client. The obsolete imported-course adapter's source test was updated to require that imported-course administration stays out of the student client. The existing backend checks still require explicit routes and reject a generic `/:action` endpoint.
- Removed the unused, deprecated `PrismaConnection` compatibility holder. Runtime database ownership remains in `RuntimeResourceRegistry`; this removal creates no connections or pools.
- Replaced broad event arrays with the actual lifecycle-event unions for audit records, background jobs, cache entries, enterprise events and files. Replaced unrestricted metadata/token/parameter values with `unknown` at the boundaries that require validation or narrowing. Kept the underlying values, ordering, relationships and persistence schema.
- Strengthened `Result.ok` error typing, value-object object constraints, identity uniqueness dependencies, validation schemas, Redis client ownership and logging, HTTP trace identifiers, Prisma degree-record mapping, and compiler-inferred callback types. Removed permissive class index signatures. Dynamic repository transactions that need a larger redesign retain their existing annotations; they were not disguised with replacement casts or weakened rules.
- Degree-level JSON writes now use the existing Prisma JSON normalization boundary. Tests verify nested provenance, input immutability, omitted-field preservation, the existing null-to-empty-object contract, and rejection of unsupported/cyclic values before any database write. No stored data was rewritten.
- Fixed a real event-dispatch defect: removing a dispatched aggregate previously required an `equals` method absent from `IAggregateRoot`. Removal now uses the same declared identity contract as registration. Regression tests cover dispatch, re-registration of the same identity, duplicate identities, and preservation of other pending aggregates.
- Added defensive narrowing of persisted search-filter JSON. Primitive/array legacy values are ignored while valid object filters retain their order and values.
- Moved **five local certificate tests** into the normal unit gate. Rendering uses local in-memory artifacts; provider tests use mocked fixture-only HTTP. The three actual PostgreSQL certificate tests retain their isolated-database gate. No real signer, directory provider or delivery service was activated.
- Refreshed environment-inventory source references after removing the two unnecessary certificate-test flags: **363 variable names**, without reading or copying local configuration values.

## Validation

| Check | Final result |
| --- | --- |
| Full TypeScript project build/check | Passed |
| Workspace production builds; final student build after the last deletion | Passed |
| Full Vitest suite on the final source checkpoint | **847 files passed, 1 skipped; 6,283 tests passed, 3 skipped; zero failures** |
| Full Node unit suite on the clean final source checkpoint | **1,135 passed, zero failed/skipped** |
| Client/boundary focused tests | 156 passed |
| Source architecture, authorization audit and source-plan contracts | Passed; zero package/file dependency cycles |
| CI source preflight | Passed, including 40 gate tests |
| Secret signature scan | Passed |
| Repository organization | Passed; zero broken relative imports, important links or evidence-integrity issues |
| Environment inventory | Current; 363 names |
| Full ESLint | **Zero errors; 4,659 warnings**, down **201** from 4,860 |

The first comprehensive run found one source assertion requiring the retired adapter. That assertion was replaced with the current ownership invariant; its 12-test file passed, followed by the complete passing Vitest rerun above. The full Node gate was also repeated on the clean final source checkpoint. The 156 focused tests overlap the full suite and are not added to the total: the two complete gates have **7,418 passing cases** in total.

The three remaining skipped tests belong to `CertificateIsolatedDatabase.spec.ts` and require an explicitly isolated PostgreSQL certificate database. They were not enabled against the original database.

## Remaining work and limits

Warnings remain visible: **4,445 explicit-any warnings, 119 unused-binding warnings and 95 React-effect dependency warnings**. No ESLint rules, severity settings, warning baseline, source-quality baseline or test assertions were disabled to obtain these counts. This is further progress, not a claim that all quality debt is closed. Sensitive-field omission bindings, named DI dependencies and request-generation cancellation logic require semantic review rather than blind automatic removal.

Dependency manifests and the lockfile are unchanged in this follow-up. The previous development-audit range discrepancy remains documented in [the deep-cleanup review](REPOSITORY_DEEP_CLEANUP_2026-11-04.md#development-audit-discrepancy); no fresh registry audit is claimed here.

No operational database command, migration, seed, bulk data deletion, account/role/MFA change or external-provider activation was performed. Historical migration SQL, import source datasets and existing signed evidence remain unchanged. No screenshots or interactive image inspection were used. Detailed local audit and test logs are outside the checkout in the private `repository-quality-20261104` directory.
