# M10-16 — University/Campus/Program/AdmissionRequirement source preparation

## Scope and actual state

Authority: revised activation plan v2, sections 21/30/33. M0–M9 remain accepted. This continuation implements local source fixes and prepares connected acceptance; it does not run M10-16 or waive its M10-15 prerequisite. **SOURCE_PREPARED / RUNTIME_UNTESTED.** No DB connection, migration, seed, import, deployment or Google AI Studio access occurred.

## Concrete fixes

- Normalized program replacement previously bypassed the duplicate admission requirement check used by individual program authoring. Both paths now use the same check before repository mutation, including duplicates with omitted child IDs. Existing nullable DB uniqueness does not replace this application check.
- Both paths reject NaN/Infinity admission minimum scores. Optional/null scores and finite fractional scores remain permitted. No pass threshold, score equivalency or cross-test meaning is inferred.
- `CANONICALLY_MAPPED` requires a Major target; existing active DegreeLevel and same Major/degree profile checks remain in effect. An explicit unmapped Draft remains possible.
- Requirement identity is the tuple of test/variant/version, serialized without delimiter collisions. Distinct reviewed variants/versions remain possible; supplied children still require the selected Test owner.

No SQL, migration checksum, schema, security middleware, authorization or retry policy changed. Atomic Admin composition is preserved.

## Source tests and their limits

The new infrastructure tests exercise the actual repository rejection path before program deletion/update/create, foreign campus scoping, finite score rules and valid optional scores. Before the fix, five negative cases failed; the normalized duplicate case reached the replacement path instead of rejecting before writes.

The new application tests invoke the real Admin use case, mutation coordinator and audited outbox executor with a transaction simulation. Business mid-write, audit and outbox failures propagate and restore the simulated state. Success uses one context, the existing program ID and correlated actor/audit/event. This proves composition and error propagation; PostgreSQL locks, Prisma rollback, concurrency and durable events require connected testing.

## Connected acceptance prerequisites — not executed

1. Pull the verified main SHA and review current schema parity. The M10-07 forward migration must be applied through the existing recovery procedure if still pending; no historical migration rewrite.
2. Complete and authenticate the actual Tests then Majors M10-15 acceptance. Source/mock PASS cannot satisfy this prerequisite.
3. Select one reviewed existing INS University, an existing same-owner Campus and an explicit reviewed Program/source. Obtain current canonical IDs from the connected environment and verify account permissions from persisted identity. Use approved owner source/import workflows for missing fixtures; this runbook creates none automatically.
4. Resolve the selected item's country/region/city and DegreeLevel/Major/Test choices using current active scoped records and documented evidence. Unresolved/quarantined items stay held.
5. Approve the small connected test scope and recovery evidence before actual writes. Inject faults only in an approved disposable environment. Keep credentials and sensitive identity values outside chat/Git.

## Required acceptance cases

| Case | Real action and required observation |
| --- | --- |
| UNI-RT-01 | Official Admin `/universities/:id`: save canonical location; inspect CSRF/Idempotency-Key, exact owner/geo IDs, independent DB read and UI refresh. Cross-country/region mismatch rejects without business writes. |
| UNI-RT-02 | Select an existing Campus owned by this University, create a reviewed Program via the owner API, refresh and read its exact ID/source/degree/Major/Test relationships. |
| UNI-RT-03 | Update the same Program by its existing ID; Program ID and University INS remain stable. Capture source/version and audit evidence. |
| UNI-RT-04 | Foreign Campus/organization/Program IDs reject before mutation. Test variant/version from another Test and incompatible Major/degree reject. |
| UNI-RT-05 | Duplicate test/variant/version requirement, invalid minimum score, and claimed canonical Major without a target reject before child writes; finite reviewed optional score succeeds. Non-JSON numeric values are covered locally through direct source calls. |
| UNI-RT-06 | Inject failure after the first business write, at audit persistence and at outbox persistence separately. Independent DB reads prove no partial program/link/requirement/audit/event acceptance. |
| UNI-RT-07 | Retry with the same key and payload; no additional accepted Program or owner mutation. Changed payload/key conflict, expired session/refresh failure and concurrent conflict follow existing policies. |
| UNI-RT-08 | Student and employee lacking University permission cannot invoke the owner routes; student session remains valid. Current role grant/revoke evidence is checked in the environment. |
| UNI-RT-09 | Explicit reviewed ready→publish: Public `/universities/:slug` and Admin show the same accepted identity. Draft/inactive/archived Programs and requirements stay hidden. Test actual canonical filters in Arabic/English. |
| UNI-RT-10 | Unpublish→Public API/browser hidden within documented cache policy. Published structural edits reject; unpublish then reviewed owner edit behaves according to policy. |
| UNI-RT-11 | Reconcile accepted University/Campus/Program/Test links: orphan, duplicate and unexplained ID drift = 0. Inspect actual audit/outbox/receipt and recovery evidence before accepting M10-16. |

Verified routes relative to the API base:

- `GET /admin/universities/:id`, `GET /admin/universities/:id/publication-readiness`.
- `PATCH /admin/universities/:id` for current canonical location.
- `POST /admin/universities/:id/academic-programs`, `PUT /admin/universities/:id/academic-programs/:programId`, `DELETE` on the same Program route for archive.
- `PUT /admin/universities/:id/normalized-details` is a structural replacement operation. Use individual Program authoring for update identity acceptance; a replacement response is not evidence that every child retained its ID.
- `POST /admin/universities/:id/mark-ready`, `/:id/mark-publishable`, `/:id/publish`, `/:id/unpublish`; validate the current endpoint names against the deployed SHA.
- `GET /universities/:slug` and the current public canonical query contract; unknown query parameters must still reject.

Each runtime record needs deployed SHA, sanitized actor/trace, UI and HTTP observation, independent DB before/after, audit/event IDs and Public effect where applicable. A checklist or source test is not runtime evidence. M10-17/19 and whole M10 remain open.

## Executed verification

- 17 scoped files / 107 tests PASS: University application/domain/infrastructure and Admin/Public routers. Includes 12 new integrity/transaction-composition cases.
- Root TypeScript build and strict standalone compilation of the two new tests PASS.
- API production build PASS; Vercel API/Admin/Web/root type contexts report zero diagnostics.
- Scoped ESLint, source quality/cycle/accessibility, persistence ownership and historical migration metadata PASS.
- Full registered source closure manifest PASS. Database integration and browser E2E were explicitly skipped runtime gates.
- Environment inventory current (240 names); secret scan PASS (3,323 tracked files); whitespace PASS.

The connected cases above remain RUNTIME_UNTESTED. No claim of durable Prisma rollback, live permissions, runtime publication or M10 closure is made.