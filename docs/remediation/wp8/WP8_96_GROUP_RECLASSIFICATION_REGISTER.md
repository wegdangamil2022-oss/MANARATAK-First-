# 96-Group Closure Reclassification Register

Status date: 2026-08-13

This is the authoritative classification layer for the historical 96 closure groups. It preserves group IDs and counts while separating source implementation from external evidence. University Stage 2+ and Scholarships are tracked outside this number.

## Classes

- `CLOSE_IN_CODEX`: source, local build, or local test evidence can fully close the group.
- `PREPARE_IN_CODEX`: Codex must deliver code, commands, tests, counters, and rollback procedure; final proof requires the approved database.
- `GOOGLE_STUDIO_RUNTIME_ONLY`: no remaining product implementation; only execution, measurement, or retained runtime evidence remains.
- `STALE`: historical wording no longer represents the delivery plan and must be replaced without deleting the group ID.

## WP-1 (5)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP-1-01 | Development DB identity and environment proof | `GOOGLE_STUDIO_RUNTIME_ONLY` | Safe inspection checklist | Confirm Development target |
| WP-1-02 | Recoverable backup | `GOOGLE_STUDIO_RUNTIME_ONLY` | Backup command and checksum template | Backup artifact |
| WP-1-03 | Schema snapshot | `GOOGLE_STUDIO_RUNTIME_ONLY` | Read-only snapshot command | Snapshot output |
| WP-1-04 | Migration and baseline counters | `GOOGLE_STUDIO_RUNTIME_ONLY` | Status/counter command set | Captured baseline |
| WP-1-05 | Non-destructive restore verification | `GOOGLE_STUDIO_RUNTIME_ONLY` | Restore verification procedure | Successful recovery proof |

## WP0 (2)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP0-01 | Runtime network measurements | `GOOGLE_STUDIO_RUNTIME_ONLY` | Measurement script/checklist | Startup, idle, normal, Admin measurements |
| WP0-02 | Disk, payload, and unnecessary-load validation | `PREPARE_IN_CODEX` | Automated inventory and budgets | Deployed runtime measurements |

## WP1 (13)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP1-01 | Session durability | `PREPARE_IN_CODEX` | DB integration tests | Persisted create/revoke/expiry proof |
| WP1-02 | Credential persistence | `PREPARE_IN_CODEX` | Sanitized invariant checks | Persisted credential evidence |
| WP1-03 | Admin bootstrap | `PREPARE_IN_CODEX` | `SOURCE_PREPARED`: read-only persisted verifier and protected endpoint | Existing owner identity proof |
| WP1-04 | Persisted RBAC | `PREPARE_IN_CODEX` | `SOURCE_PREPARED`: permission/assignment checks; runtime allowed/denied evidence pending | Runtime matrix |
| WP1-05 | Audit persistence | `PREPARE_IN_CODEX` | Repository integration tests | Durable rows |
| WP1-06 | Critical audit atomicity | `PREPARE_IN_CODEX` | `SEVEN_OWNERS_ADOPTED`: Reference Data, International Tests, Majors, Universities, Scholarships, Roles, and Role Assignments share business/audit/Outbox transactions | Rollback proof; remaining owners |
| WP1-07 | Outbox model | `PREPARE_IN_CODEX` | `SOURCE_PREPARED`: additive model validated | Approved migration state |
| WP1-08 | Outbox migration | `PREPARE_IN_CODEX` | `SOURCE_PREPARED`: forward/rollback SQL | Applied/rolled-back evidence |
| WP1-09 | Business + Outbox transaction | `PREPARE_IN_CODEX` | `SEVEN_OWNERS_ADOPTED`: active Reference Data, International Tests, Majors, Universities, Scholarships, Roles, and Role Assignments use transaction-bound repositories | Atomic runtime proof; remaining owners |
| WP1-10 | Dispatcher persistence | `PREPARE_IN_CODEX` | `SOURCE_PREPARED`: claim/lease/state adapter; composition blocked | Durable dispatch proof |
| WP1-11 | Dispatcher retry/idempotency/recovery | `PREPARE_IN_CODEX` | `LOCAL_BEHAVIOR_PASS`: retry/idempotency tests; DB concurrency pending | Concurrency and recovery evidence |
| WP1-12 | DB/Redis health truthfulness | `PREPARE_IN_CODEX` | `SOURCE_PREPARED`: query/PONG required, missing checks fail closed, errors sanitized | Live dependency results |
| WP1-13 | Build/typecheck/test/deployment reality | `CLOSE_IN_CODEX` | `CLOSED_LOCAL`: typecheck, Web/Admin builds, and 1,122 non-DB tests pass | Smoke test only |

## WP2 (2)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP2-01 | Durable import execution persistence | `PREPARE_IN_CODEX` | `SOURCE_PREPARED`: active Prisma queue, atomic checkpoints/DLQ, no fallback; 33 tests pass | Persisted execution rows |
| WP2-02 | Retry, idempotency, dry-run, and recovery | `PREPARE_IN_CODEX` | `SOURCE_PREPARED`: conditional transitions and governed DB plan/status/baseline/deploy tooling | Runtime recovery proof |

## WP3 (12)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP3-01 | Stable Reference IDs | `PREPARE_IN_CODEX` | Identity verifier | DB uniqueness counters |
| WP3-02 | Country code quality | `PREPARE_IN_CODEX` | ISO audit command | Existing-row results |
| WP3-03 | Currency/language code quality | `PREPARE_IN_CODEX` | Code/alias audit | Existing-row results |
| WP3-04 | Region-to-Country integrity | `PREPARE_IN_CODEX` | Referential query | Orphan counters |
| WP3-05 | City-to-Country integrity | `PREPARE_IN_CODEX` | Referential query/backfill plan | Orphan counters |
| WP3-06 | City-to-Region compatibility | `PREPARE_IN_CODEX` | Compatibility report | Unresolved rows |
| WP3-07 | Alias and historical names | `PREPARE_IN_CODEX` | Ownership/model proposal | Approved persistence evidence |
| WP3-08 | Superseded/merged lifecycle | `PREPARE_IN_CODEX` | Lifecycle migration plan | Reversible DB proof |
| WP3-09 | University location references | `STALE` | Replaced by staged University register | Stage-specific evidence |
| WP3-10 | Test center location references | `PREPARE_IN_CODEX` | Resolver/mapping report | Persisted center reconciliation |
| WP3-11 | Test currency references | `PREPARE_IN_CODEX` | Currency resolver/backfill | Persisted fee reconciliation |
| WP3-12 | Study Destination profile persistence | `STALE` | Track under owning feature register | Owner-phase evidence |

## WP4 (8)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP4-01 | Canonical DegreeLevel rows | `PREPARE_IN_CODEX` | Seven-code verifier | Stable DB rows |
| WP4-02 | Major profile DegreeLevel references | `PREPARE_IN_CODEX` | Mapping/dry-run/backfill | Linked profile counters |
| WP4-03 | Test DegreeLevel references | `PREPARE_IN_CODEX` | Relationship validator | Persisted link counters |
| WP4-04 | Legacy degree labels | `PREPARE_IN_CODEX` | Exception mapping | Reviewed backfill |
| WP4-05 | Taxonomy edge runtime behavior | `PREPARE_IN_CODEX` | Integration tests | DB mutation/rollback proof |
| WP4-06 | Taxonomy audit persistence | `PREPARE_IN_CODEX` | Audit test | Durable audit row |
| WP4-07 | Reverse mapped-majors query | `CLOSE_IN_CODEX` | `CLOSED_LOCAL`: Phase 10-owned repository/Application contract and API tests | Runtime smoke only |
| WP4-08 | Existing taxonomy/ISCED baseline | `PREPARE_IN_CODEX` | Baseline comparator | DB comparison |

## WP5 (10)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP5-01 | Test Country references | `PREPARE_IN_CODEX` | Canonical mapping and API filters | Persisted relationships |
| WP5-02 | Test Language references | `PREPARE_IN_CODEX` | Canonical mapping | Persisted relationships |
| WP5-03 | Test Currency references | `PREPARE_IN_CODEX` | Resolver/backfill | Persisted fee links |
| WP5-04 | Test DegreeLevel references | `PREPARE_IN_CODEX` | Reconciliation command | Persisted relationships |
| WP5-05 | Availability SSoT | `PREPARE_IN_CODEX` | Deterministic reconciliation | One persisted representation |
| WP5-06 | City availability | `PREPARE_IN_CODEX` | Proven-ID mapping | Persisted City links |
| WP5-07 | Provider country semantics | `CLOSE_IN_CODEX` | Explicit non-availability contract | Runtime smoke only |
| WP5-08 | Version/cycle identity | `PREPARE_IN_CODEX` | Model/migration/rollback | Persisted cycle proof |
| WP5-09 | Referential validation | `PREPARE_IN_CODEX` | Automated validation command | Zero unexplained invalid rows |
| WP5-10 | 56 active + 3 archived reconciliation | `PREPARE_IN_CODEX` | Source manifest comparator | DB identity/status counters |

## WP6 (11)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP6-01 | optionalFields collisions | `PREPARE_IN_CODEX` | Inventory/quarantine/rollback | Existing-row counters |
| WP6-02 | Major profile DegreeLevel | `PREPARE_IN_CODEX` | Deterministic mapping | Linked/unresolved counters |
| WP6-03 | Degree reconciliation | `PREPARE_IN_CODEX` | Canonical comparator | DB mismatch report |
| WP6-04 | Taxonomy mappings | `PREPARE_IN_CODEX` | Mapping validator | Gap/dangling counters |
| WP6-05 | MajorSource integrity | `PREPARE_IN_CODEX` | Owner validator | Ownerless count zero |
| WP6-06 | MajorRelationship integrity | `PREPARE_IN_CODEX` | Endpoint/semantic validator | Dangling/self/duplicate counts |
| WP6-07 | Classification integrity | `PREPARE_IN_CODEX` | Owner/taxonomy validator | Invalid counts |
| WP6-08 | Completeness recalculation | `PREPARE_IN_CODEX` | Policy command and rollback | Before/after states |
| WP6-09 | 3,402 catalog linkage | `PREPARE_IN_CODEX` | Catalog-to-DB reconciler | One result per identity |
| WP6-10 | Orphan detection | `PREPARE_IN_CODEX` | Cross-table orphan report | Zero unclassified orphans |
| WP6-11 | Before/after evidence | `PREPARE_IN_CODEX` | Counter/report automation | Retained DB outputs |

## WP7 (7)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP7-01 | Reference hierarchy selectors | `PREPARE_IN_CODEX` | Canonical selector tests | Persisted selections |
| WP7-02 | Taxonomy/Degree selectors | `PREPARE_IN_CODEX` | Canonical selector tests | Persisted selections |
| WP7-03 | Test reference selectors | `PREPARE_IN_CODEX` | Canonical selector tests | Persisted links |
| WP7-04 | Major canonical filters | `PREPARE_IN_CODEX` | Filter integration tests | DB-consistent results |
| WP7-05 | University readiness preview | `STALE` | Replaced by staged University register | Stage-specific evidence |
| WP7-06 | Admin audit records | `PREPARE_IN_CODEX` | Authorized/denied test harness | Durable rows/correlation IDs |
| WP7-07 | Backend RBAC | `PREPARE_IN_CODEX` | Permission matrix harness | Runtime allowed/denied output |

## WP8 (4)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP8-01 | Typecheck and production builds | `CLOSE_IN_CODEX` | `CLOSED_LOCAL`: full TypeScript build plus Web/Admin production builds pass | Deployment smoke only |
| WP8-02 | Non-DB automated tests | `CLOSE_IN_CODEX` | `CLOSED_LOCAL`: 1,122 pass; 16 DB tests explicitly skipped | None |
| WP8-03 | Cross-domain architecture contracts | `CLOSE_IN_CODEX` | `CLOSED_LOCAL`: WP7/WP8 dependency verifiers pass | Runtime smoke only |
| WP8-04 | Full DB integration suite | `PREPARE_IN_CODEX` | Executable suite plus governed plan/status/baseline/deploy gate | Target-runtime output |

## WP9 (10)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP9-01 | 3,402 Catalog-to-DB links | `PREPARE_IN_CODEX` | Reconciler | DB linkage report |
| WP9-02 | Persisted optionalFields collisions | `PREPARE_IN_CODEX` | Collision tool | Existing-row report |
| WP9-03 | DegreeLevel profile reconciliation | `PREPARE_IN_CODEX` | Mapping tool | DB counters |
| WP9-04 | Taxonomy mapping reconciliation | `PREPARE_IN_CODEX` | Mapping tool | DB counters |
| WP9-05 | MajorSource owners | `PREPARE_IN_CODEX` | Integrity tool | Ownerless zero |
| WP9-06 | Classification mappings | `PREPARE_IN_CODEX` | Integrity tool | Invalid zero |
| WP9-07 | Major relationships | `PREPARE_IN_CODEX` | Integrity tool | Invalid zero |
| WP9-08 | Publication Readiness behavior | `PREPARE_IN_CODEX` | Mutation integration tests | Persisted bypass zero |
| WP9-09 | Build/executable tests | `CLOSE_IN_CODEX` | `CLOSED_LOCAL`: current-source build and executable test evidence retained | Locked-runtime rerun only |
| WP9-10 | Final Phase 10 freeze | `GOOGLE_STUDIO_RUNTIME_ONLY` | Freeze checklist | Approval after DB evidence |

## WP10 (12)

| ID | Closure group | Class | Codex deliverable | External evidence |
|---|---|---|---|---|
| WP10-01 | University immutable source identity | `PREPARE_IN_CODEX` | Staged identity contract | Existing-identity proof |
| WP10-02 | Country/Region/City resolution | `PREPARE_IN_CODEX` | Canonical resolver/dry run | Persisted references |
| WP10-03 | Major/Degree consumption | `PREPARE_IN_CODEX` | Program linkage contract | Persisted program links |
| WP10-04 | Admission Test consumption | `PREPARE_IN_CODEX` | Requirement contract | Persisted requirement links |
| WP10-05 | Generic import handoff | `PREPARE_IN_CODEX` | Phase 6 adapter/tests | Durable execution proof |
| WP10-06 | Duplicate strategy | `PREPARE_IN_CODEX` | Deterministic matcher/review results | Existing-row comparison |
| WP10-07 | Stage 1 dry run | `CLOSE_IN_CODEX` | 10,723-row no-write report | DB identity comparison only |
| WP10-08 | Rollback strategy | `PREPARE_IN_CODEX` | Stage-scoped rollback command | Successful rollback proof |
| WP10-09 | Migration readiness | `PREPARE_IN_CODEX` | Reviewed additive migration/dry run | Applied migration evidence |
| WP10-10 | Sample import | `PREPARE_IN_CODEX` | Sample/verify/rollback workflow | Transaction results |
| WP10-11 | Admin authorization and audit | `PREPARE_IN_CODEX` | Guard/audit integration tests | Durable runtime evidence |
| WP10-12 | Final Stage 1 import approval | `GOOGLE_STUDIO_RUNTIME_ONLY` | Approval checklist | Explicit approval after all gates |

## Count Control

| WP | Count |
|---|---:|
| WP-1 | 5 |
| WP0 | 2 |
| WP1 | 13 |
| WP2 | 2 |
| WP3 | 12 |
| WP4 | 8 |
| WP5 | 10 |
| WP6 | 11 |
| WP7 | 7 |
| WP8 | 4 |
| WP9 | 10 |
| WP10 | 12 |
| **Total** | **96** |

Current classification totals: `CLOSE_IN_CODEX = 8`, `PREPARE_IN_CODEX = 77`, `GOOGLE_STUDIO_RUNTIME_ONLY = 8`, `STALE = 3`.
