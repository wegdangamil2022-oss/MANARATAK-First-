# M10-07 — Regions authoring: source execution

## Scope and status

- Authority: section 30, M10-07 of the revised activation plan v2; M10-02/04/05 are the accepted source prerequisites.
- Base: main at `20025bd4244cff86915d4fd0a5bb77e085dd8a68`.
- Branch: `fix/m10-b-region-authoring`.
- M0–M9 are accepted for planning. No historical stage was audited again.
- M10-07 source: IMPLEMENTED. Connected acceptance: RUNTIME_UNTESTED.
- No database connection, migration execution, seed, import, deployment or Google AI Studio access occurred.
- M10 as a whole is not closed. M10-08 and later work remain.

## Changes and ownership

| Owner / files | Implementation |
|---|---|
| Domain: ReferenceDataContracts.ts, IReferenceDataRepository.ts, ReferenceGovernance.ts | Typed region write/detail DTOs, REGION governance discriminator, lifecycle/version/effective dates, aliases, optimistic version and explicit conflict errors. Country/code/ID are immutable on edit. |
| Application: ReferenceDataUseCases.ts | Region create/edit require an authenticated actor and the atomic Audit/Outbox executor. Actual UUID is generated before the transaction and used consistently as audit target and aggregate ID. No unaudited fallback for region commands. Region lifecycle requires expectedVersion. City assignment rejects non-ACTIVE regions. |
| Application: ReferenceResolverService.ts | Canonical region resolution exposes activity from lifecycleState, including alias resolution; deprecated/terminal records never return unknown activity. Governed alias lookup selects distinct reference IDs so repeated locale/type rows for one ID do not become false ambiguity; two different IDs remain ambiguous. |
| Infrastructure: PrismaReferenceDataRepository.ts | Typed Prisma create/update/detail/list and alias reads. Immutable history includes persisted fields, aliases, reason and actor. Locks serialize edits/lifecycle/assignments. ACTIVE country is checked inside the write transaction. Stale edits fail. Deprecation retains existing links and removes the region from active reads. Terminal lifecycle rejects any cities/universities/campuses. Merge/supersession require another ACTIVE region in the same country and record a governed relationship without changing IDs or silently reparenting data. |
| Infrastructure: UniversityCanonicalRelationshipValidator.ts | Reads the newly authored lifecycleState using a typed select and rejects non-ACTIVE region assignments. This field requires the new migration below; the M10-A historical missing-field repair is not reversed by querying a nonexistent field on the old schema. |
| API: ReferenceDataAdminRouter.ts | GET /regions, GET /regions/:id, POST /regions, PUT /regions/:id, REGION history/relationships/lifecycle. Strict bodies, UUID paths, bounded names/aliases, required expectedVersion on edit/lifecycle; actor is server-owned. Uses the existing mounted admin:reference-data:manage permission, session CSRF and idempotency policies. Typed failures return 404 or 409. |
| API: CanonicalIdempotencyMiddleware.ts | Persists successful empty 204 responses before sending them, so lifecycle retry replays once. Fingerprints retain concrete resource IDs to prevent one key/payload from replaying against a different region. A normalized route still defines the storage scope. Existing persisted keys with the old fingerprint can return conflict after upgrade; use a new key for a new command, never repeat a committed command merely to change its key. |
| Admin: referenceData.ts, client.ts | All region mutations use the existing administration client with CSRF, idempotency, bounded refresh retry and unchanged command body/key. The client handles empty 204 responses. Mutation cache invalidation makes subsequent chooser loads reflect saved names/state. |
| Admin: AdministrativeRegionsTab.tsx, ReferenceDataAdminPage.tsx | Regions tab, country/search filters and bounded pagination, create/detail/edit, preserved alias locale/type, version history, explicit history/loading/errors, conflict reload, lifecycle reason and country-scoped replacement chooser. Non-ACTIVE records are read-only. No direct fetch or new session bypass. React skill checks: typed props/state, accessible labels and explicit button types, stale response protection, cleanup and parallel-independent reads where applicable. |
| Persistence: schema.prisma, new migration, recovery manifest | Region governance fields and index; baseline snapshots preserve existing IDs and provenance. DB guards serialize new ReferenceCity/University/UniversityCampus region assignments, reject mismatched country/non-ACTIVE region, forbid direct region deletion/identity mutation and block terminal state with dependent rows. Cross-context scope is limited to canonical FK guards, not writes to another domain's business records. Recovery is BACKUP_RESTORE_REQUIRED. |

### Migration boundary

`packages/infrastructure/prisma/migrations/20261001010000_m10_region_governance/migration.sql` is new, forward-only source and **UNAPPLIED**.

All historical migration SQL files are unchanged. The new migration includes ADR-028 owner/scope metadata and a recovery manifest entry. Existing regions retain their IDs and names and begin at ACTIVE/version 1, matching the previous region model which had no lifecycle. Their baseline snapshots use the explicit migration actor, not a fabricated account identity. Cross-context FK guards require the canonical country ID when assigning a university/campus region.

**Activation prerequisite:** this branch's Prisma region reads select new columns. Do not activate its API against the previous database schema. A connected operator must review and apply the new migration through the existing governed recovery/deploy procedure, with backup/restore evidence and schema parity, before enabling these reads/writes. No deployment or live migration is authorized/executed by this source task.

## Tests executed

- Targeted ReferenceData/application/Prisma/API/admin transport suite: 18 files, 172 tests PASS.
- Follow-up after updating older university geography fixtures for the new ACTIVE lifecycle contract: 5 files, 62 tests PASS. The unchanged cross-country and no-write assertions are retained.
- Final combined ReferenceData/university/transport/resolver suite on 2026-10-02: 20 files, 199 tests PASS, including four inactive-state cases and two alias cases. TypeScript, persistence metadata, W2 (84/84) and source quality passed again after the resolver follow-up.
- New cases cover stable ID, alias locale/type preservation, stale-version/country/code conflicts, inactive/missing country, duplicate code, actor ownership, audited executor requirement, in-memory rollback on Audit/Outbox failure, lifecycle reason/version, dependency blocking, terminal rules, same-country active replacement, foreign/inactive city assignment, permission denial, anonymous access, session CSRF, idempotency, 204 replay, cross-resource key conflict, chooser freshness and one refresh retry with identical command body/key.
- Full local unit sweep initially: 415 files PASS, 2 files failed, 3 skipped; 2210 tests PASS, 6 failed, 7 skipped. The six failures were older fixtures missing lifecycleState, not failures to enforce the intended negative case. Both files were repaired and rerun successfully in the follow-up above. This is not represented as a second full local sweep.
- `tsc -b`: PASS. Vercel TypeScript context checker: PASS, zero diagnostics.
- Admin/Web/API production builds: PASS. Existing bundle-size warnings remain. API's first invocation could not locate npm in the shell; rerun used the already verified temporary npm CLI/shim without installing dependencies.
- Prisma generate: PASS, local client generation only. Prisma validate: PASS using dummy localhost port-1 DATABASE_URL/DIRECT_URL; validation makes no database connection. The first validation lacked DIRECT_URL and was rerun with the dummy value.
- Persistence ownership/metadata: PASS, 246/246 models, zero direct cross-context ORM mutations. W1: PASS 136/136; W2: PASS 84/84. W1's first invocation lacked bash; rerun used the existing Git bash directory.
- Source quality: PASS, zero cycles/accessibility findings. Scoped ESLint: zero errors, 29 existing warnings. Secret scan and diff whitespace check: PASS.
- Local Node: 24.19.0; installed Vitest: 4.1.10. The repository lock pins the patched dependency version and CI is the Node 22.16 / clean-install authority.
- GitHub's four workflows (Enterprise CI, Security Gates, Source Architecture Guards, Imported Courses Source Closure) passed for the initial source commit `402dced`. Current-head check status is tracked on draft PR #7; an older successful run is not evidence for a later revision. The draft activation gate remains until connected verification, regardless of source CI success.

Mocks and in-memory adapters do not prove PostgreSQL trigger syntax, row-lock concurrency, real FK constraints or persisted production audit records. Live browser acceptance remains untested.

## Connected verification cases — RUNTIME_UNTESTED

Execute only in the approved connected test environment after backup/recovery review and controlled migration activation. Do not start pilots or bulk imports.

| Case | Action | Expected evidence |
|---|---|---|
| REG-RT-01 schema | Apply the reviewed forward migration through the existing governed process; run migration status and schema parity. | Migration ledger/parity PASS; historical checksums unchanged; existing region IDs/counts unchanged; initial REGION snapshots match prior rows. |
| REG-RT-02 create/edit | An authorized account creates a region under an ACTIVE country with aliases including locale/type, reloads detail and the region chooser, then edits using the returned version. | Same UUID after reload/edit; chooser shows current name; versions increase; aliases retain locale/type; AuditRecord/Outbox/version actor reference the authenticated identity. |
| REG-RT-03 stale/identity | Save using an old version; attempt to change country/code; create the same country/code under a different command key. | 409; no extra business/version/audit/outbox success records. |
| REG-RT-04 access/security | Student or staff without admin:reference-data:manage requests list/detail/save/lifecycle; authorized account submits missing/foreign-session CSRF or missing idempotency key. | 401/403/400 as appropriate, zero region mutation; no relaxed policy. |
| REG-RT-05 command replay | Replay one successful save/lifecycle with the same key and payload. Try that key/payload on a second region ID. | Original result replays, write/version/audit once; 204 replay is empty; different target returns conflict. |
| REG-RT-06 dependencies | Link a city to a region, deprecate it, then try archive/merge/supersede. Test university/campus dependencies separately. | Existing FK/UUID remains; chooser disallows deprecation; terminal transition returns conflict until dependencies are explicitly resolved. No automatic city deletion/reparenting. |
| REG-RT-07 concurrency | In two real DB sessions race a region terminal transition against a new city/university/campus assignment; also race two edits at the same version. | Parent locks and DB guards prevent a committed new relationship to a terminal region; no orphan; only one version-fenced edit commits. |
| REG-RT-08 replacement | On a deprecated region with no dependencies test foreign/inactive/self target, then valid ACTIVE target in same country. | Invalid targets rejected; valid relationship/history saved atomically and source ID retained. |
| REG-RT-09 rollback | Inject Audit or Outbox failure inside the approved disposable test transaction. | No business/alias/version/relationship/audit/outbox partial commit. |
| REG-RT-10 session/UI | In the real browser perform session refresh during save, permission revoke, page navigation/search, reload after a conflict, history failure and successful 204 lifecycle. | Bounded retry/same key; server permission denial; no stale detail overwrite; explicit errors; correct post-save chooser and history. |

Retain sanitized request IDs, stable reference IDs, counts and PASS/FAIL evidence. Never put database URLs, credentials, passwords or session/CSRF tokens into the report.

## Next source task

M10-08: city canonical chooser scoped by country/region, stable canonical IDs and raw-label/ambiguity review. It is not claimed complete by adding the Regions tab.
