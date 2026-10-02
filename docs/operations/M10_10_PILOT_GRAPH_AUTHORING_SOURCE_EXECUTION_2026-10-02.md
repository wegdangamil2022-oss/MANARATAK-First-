# M10-10 — Pilot graph authoring source execution

Date: 2026-10-02. Base: `main` / `a98ef5522f6300ba3bac9f243133debf55552cf0`.
Branch: `fix/m10-pilot-graph-authoring`.
Plan authority: revised activation plan v2, sections 21, 28 and 30, M10-10.

## Status and scope

**SOURCE_IMPLEMENTED / SOURCE_TESTED. Runtime acceptance: RUNTIME_UNTESTED.**
M0–M9 are accepted for planning. This change completes the missing actions needed
to author canonical classification links for the first Tests/Majors pilot. It
does not close M10 or authorize the pilot before its remaining prerequisites.

- Existing taxonomy node/edge/alias/mapping authoring, serializable cycle
  validation, DegreeLevel editing and publication workflows remain in place.
- Major detail previously displayed classification mappings without a write
  action. It now adds a reviewed mapping to the root or one of its own level
  profiles through `POST /admin/majors/:id/classification-mappings`.
- Test detail previously displayed cross-domain relationships without an action
  for canonical countries/languages/taxonomy/degrees. It now adds one reviewed
  canonical link through `POST /admin/international-tests/:id/canonical-relationships`.
  Saved links are displayed from the reloaded owner DTO.
- Program acceptance, Scholarship requirements and Course ownership remain with
  their respective owner workflows. These actions do not create those links.
  No new family/version/degree identity, raw label inference or fuzzy write is added.

## Behavior and implementation

1. New bodies are strict. Owner ID comes from the route, actor from authentication.
   Canonical IDs must be UUIDs. Injected owner/actor/status/standard-code/metadata
   fields are rejected. Reason and evidence reference are mandatory.
2. Existing administrative section permission, session, CSRF and idempotency
   middleware apply. UI uses the existing admin client, including bounded refresh
   retry with preserved request headers, body and command key.
3. New use cases require the atomic coordinator and authenticated actor. Business
   write, actor/review audit and Outbox append share one transaction. Failed audit
   or Outbox append aborts the write; no unaudited fallback exists for these actions.
4. Major persistence locks the root owner before checking state and duplicates,
   verifies profile ownership and immutable states, and locks the canonical node
   before checking ACTIVE status. Standard type/code come from the canonical node.
   Duplicate detection covers imported profile mappings with both owner fields
   and historical profile-only mappings. No historical row is rewritten.
5. Test persistence locks the owner and an allowlisted canonical target table.
   The existing canonical relationship service validates ACTIVE references and
   derives compatibility codes. One existing owner writer is called; unrelated
   relationships and published identity/state are not replaced.
6. PUBLISHED/ARCHIVED/REJECTED/SUPERSEDED/MERGED owners cannot be changed through
   these actions. Major local `cat-` catalog items need canonical promotion first.
7. `taxonomyNodeId` is an explicit UUID filter for Major admin/public lists. It
   matches root references, root mappings and profile references/mappings. It
   composes with existing search, pagination and public PUBLISHED predicates.
   Admin canonical filtering queries persistence rather than silently ignoring
   the filter in the source catalog. The filter UI uses a canonical chooser.
8. New editors support bounded taxonomy search, clear choices on reference-kind
   changes, suppress stale save completion on owner changes/unmount and disable
   immutable owners. No browser verification is claimed from source rendering.

### Persistence read contract (ADR-028)

`PrismaMajorRepository` may read AcademicTaxonomyNode only to validate and derive
an existing canonical classification reference during the reviewed Major write.
The read owner `academic_taxonomy` is explicitly registered in the persistence
manifest. It has no cross-context ORM write authority. Row locks protect the
reference check; taxonomy remains owned by its original domain.

## Changed files

- Admin: `ReviewedGraphEditor.tsx`, `SavedTestCanonicalRelationships.tsx`,
  `MajorDetailPage.tsx`, `MajorAdminPage.tsx`, `InternationalTestDetailPage.tsx`.
- API: `MajorAdminRouter.ts`, `MajorPublicRouter.ts`, `InternationalTestAdminRouter.ts`.
- Application: `AdminMajorUseCases.ts`, `InternationalTestUseCases.ts`.
- Domain: `majors/majors.ts`, `tests-platform/repository.ts`.
- Persistence: `PrismaMajorRepository.ts`, `PrismaInternationalTestRepository.ts`,
  `docs/architecture/persistence/persistence-ownership.manifest.json`.
- Four new test files: Admin `ReviewedGraphEditor.spec.tsx`, API
  `ReviewedGraphAuthoring.spec.ts`, Application `ReviewedGraphAuthoring.spec.ts`,
  Infrastructure `ReviewedMajorGraph.spec.ts`.
- This execution record. No schema, migration SQL/checksum or seed changes.

## Verification actually executed

- Targeted Vitest: **11 files / 179 tests PASS**. Includes existing admin transport,
  Major/Test routes and use cases, taxonomy graph/domain validation and the new
  tests. Existing taxonomy cycle rejection was also exercised through the real
  validator in the application serializable boundary.
- New cases: canonical mapping, profile owner mismatch, inactive/missing node,
  duplicate including imported profile shape, immutable owner, missing actor or
  evidence, all four Test canonical target kinds, Audit/Outbox rollback, section
  permission/session denial, session-bound CSRF, required command key, replay and
  changed-payload conflict, canonical admin/public filtering and source UI rendering.
- Root TypeScript build and Vercel context checker: **PASS**, 0 diagnostics
  (API/Admin/Web/root, including API tests).
- Local Admin and API production builds: **PASS**. Admin retains its existing
  bundle-size advisory; it is not a build failure.
- Complete registered source closure manifest: **PASS** with `--source-only`.
- Source quality: **PASS**, 0 package/file cycles and accessibility findings.
- Persistence ownership: **PASS**, 246/246 models, 0 direct cross-context ORM writes.
- Scoped lint of new source/tests: **PASS**, no findings; whitespace check PASS.
- Secret scan and exact-head GitHub CI are required before merge. Their actual
  results are recorded in the PR; this document does not predict them.

## Connected verification still required — RUNTIME_UNTESTED

No database connection, migration, seed, import, deployment or Google AI Studio
operation was performed here.

1. Pull the merged main revision. Respect the earlier M10-07 pending migration
   runbook before starting an API that expects its region schema; inspect pending
   migrations and the backup/recovery gate. M10-10 adds no migration.
2. Prove live owner/employee/student authorization, CSRF and idempotency replay
   through the real session/store. Never send secrets through chat.
3. On approved pilot draft owners, add one root/profile classification mapping
   and one of each applicable Test canonical link. Reload the owner and inspect
   canonical IDs, provenance, actor/reason/evidence audit and Outbox entry/delivery.
4. Prove concurrent duplicate rejection and owner/target lifecycle changes against
   real PostgreSQL locks. Source mocks establish call/transaction behavior, not
   actual database isolation or lock scheduling.
5. Prove duplicate imported-profile rejection, foreign-profile denial and inactive
   target denial; ensure no additional row/event/audit success is committed.
6. Exercise taxonomy cycle rejection, existing degree editing and publish readiness
   with actual records. Confirm admin/public canonical filters find published
   mapped owners after authorized publication through the existing workflow.
7. Browser: canonical search beyond the first page via query, kind switch, profile
   chooser, saved-link reload, immutable owner, rapid owner navigation during save,
   and student/section-limited employee access. UI source rendering is not E2E.

Next source task: **M10-11 — governed International Tests importer writer**.
Live pilot execution remains a separate connected-environment step after its gates.
