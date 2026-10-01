# M10-09 — Provider registry source implementation

## Scope and boundary

Authority: revised activation plan v2 sections 21/28/30, M10-09 (dependencies M10-02/04), and the Course capability register. Base: main `eddd52facc7d10819d07a4547da1ec6d5aceda3f`. Branch: `fix/m10-provider-registry`.

M0–M9 remain accepted for planning. Source implementation is complete for management of existing external provider identities and reviewed aliases/domains. No new provider identity is fabricated from an unknown source label. No DB connection, migration execution, seed/import, connector execution, HTTP verification or deployment occurred. No schema/migration change was needed for M10-09. Runtime acceptance remains **RUNTIME_UNTESTED**, and M10 overall is open.

## Changed capabilities and ownership

| Files / owner | Behavior |
|---|---|
| Domain `courses/provider-registry.ts` | Separate administration repository and bounded filters; reviewed mapping command with expectedUpdatedAt/reason/evidence. Existing seed contract is preserved, with optional fencing for health continuation writes. |
| Application `CourseProviderRegistryUseCases.ts`, courses export | Lists/detail/review resolution and audited update. Unknown or unapproved provider labels return REVIEW_REQUIRED with no FK; only approved exact canonical/alias resolution returns the existing stable provider ID. Mapping validation rejects duplicate normalized aliases, invalid/local/IP/wildcard/URL domain entries and an official website outside the reviewed HTTPS domain scope. No fuzzy resolution or network fetch. |
| Infrastructure `PrismaExternalCourseProviderRepository.ts` | Typed Prisma list/count filters and deterministic pages. Registry writes require the audited transaction client, serialize administration edits, lock the provider and fence expectedUpdatedAt. Alias ownership/canonical collision checks happen before changes. Existing UUID/publicId/slug/canonicalName/status/trust/connector/lastVerifiedAt are unchanged. Alias/domain updates and removals share the business/audit/outbox transaction; unchanged alias IDs/provenance remain. Unique races become conflicts. |
| Application `CourseProviderContinuationUseCases.ts` and provider persistence | Existing health approval/drift writes now pass the snapshot timestamp and use a locked transaction. A stale health snapshot cannot restore removed aliases/domains or overwrite a reviewed display name. Health approval/connector policy is unchanged; this page does not approve a provider or claim live source health. |
| API `CourseProviderRegistryRouter.ts`, app mount and DI | GET list/detail, PUT reviewed mapping and POST read-only label resolution under `/admin/courses/providers`, mounted before generic course IDs. Existing admin:courses:manage, global admin/session guard, CSRF and idempotency apply. Strict payloads reject actor/status/identity/verification timestamp injection; stale/ownership errors return 409. No unaudited write fallback. |
| Admin `courseProviders.ts`, `CourseProviderRegistryPage.tsx`, App/CourseListPage | Route `/courses/providers` and a Courses link. Bounded searchable/status-filtered pages, existing-identity detail, display/website/alias/domain edits, explicit reason/evidence/review checkbox, conflict refresh and raw-label resolution. Disabled/archived identities are read-only. Requests use the administration client; session refresh retains the command body/key. No seed/import/connector buttons were introduced. |

## Executed verification

- Final targeted suite: **8 files / 91 tests PASS**. Includes registry application/Prisma/router/admin transport, existing continuation, import identity diff, client and seed-source contracts. Seed-source tests use mocks/source fixtures; no seed was executed against a database.
- Meaningful cases: preserved provider identity and status, old alias provenance, new review provenance, missing actor/transaction, unknown/unapproved label review, duplicate/foreign aliases, negative domains/websites, strict query/page/body validation, timestamp conflicts, stale health continuation, permission/anonymous denial, foreign-session/missing CSRF, missing idempotency key, replay/payload conflict and one 401 refresh with unchanged body/key.
- Actual AtomicAuditedOutboxMutationExecutor with an in-memory unit of work proves business/audit/outbox rollback on injected audit or outbox failure. Prisma mocks prove the calls/fences; they do not prove PostgreSQL locking.
- Initial new suite: 43/44 PASS. The one incorrect test expected conflicts not to be retained by idempotency. The existing middleware intentionally stores the 409 for replay; the assertion was corrected to require the stored PROVIDER_STALE response with status 409, retaining the conflict/no-success assertions. The security policy was not weakened.
- TypeScript build and Vercel TypeScript contexts PASS, zero diagnostics. Admin and API production builds PASS (existing bundle-size warning). The Web app was not changed and its clean full build is checked by GitHub CI.
- Source quality PASS, zero cycles/accessibility findings. Persistence ownership PASS: 246 models and zero direct cross-context ORM writes. Existing P9 contract 97/97 and W2 84/84 PASS. New-file scoped ESLint: zero errors/warnings. Secret scan and diff whitespace PASS.
- React checklist applied: typed state/props, labelled fields, explicit button types, request cleanup/stale result handling, permission wrapper and bounded owner API reads. Browser behavior was not tested locally.
- Exact-head GitHub CI must pass before main merge; the PR checks provide that external evidence. Historical migrations and checksums are unchanged.

## Connected acceptance — RUNTIME_UNTESTED

Follow the M10-07/M10-08 controlled schema activation order before starting the current main API. Use the already configured secrets inside the connected environment; never send connection URLs/passwords/tokens to chat. Do not restart M9 or run bulk imports for this acceptance.

| Case | Expected evidence |
|---|---|
| PROV-RT-01 read/save/reload | Authorized account selects an existing provider (including a later page), edits a display name/alias/domain with reason/evidence and reloads. Same provider UUID/publicId/slug/canonical name and approval/trust/connector state; real actor AuditRecord and outbox row commit once. Unchanged alias retains its ID/source. |
| PROV-RT-02 collisions | Duplicate normalized alias, another provider's canonical/alias name, stale timestamp or concurrent claim rejects. No partial mapping/audit/outbox success or duplicate provider identity. |
| PROV-RT-03 raw labels | Unknown/unapproved source label stays REVIEW_REQUIRED without a provider FK. A reviewed alias on an already approved provider resolves to the same existing ID; original source text remains intact. |
| PROV-RT-04 access/retry | Student/unauthorized staff and invalid session CSRF cannot read/write. Authorized save across real session refresh writes once with the same command key; replay returns the prior result and changed payload conflicts. Disabled/archived provider edits fail. |
| PROV-RT-05 concurrency | In two real DB sessions race registry edits with health approval/drift updates. Stale health update rejects and cannot restore removed mappings; two alias claims have one owner. No concurrent seed/import writer is authorized by this source task. |
| PROV-RT-06 rollback | Inject audit/outbox failure in an approved disposable transaction; mappings and audit/outbox revert together. Outbox delivery/consumer runtime proof belongs to the worker acceptance scope. |

Next source task: M10-10, targeted taxonomy/degree/major/test relationship actions needed for the first pilot; then M10-11 real governed Tests importer. Pilots, imports and M10 closure need their separate connected acceptance.
