# Section 17 — source gates and deferred runtime verification

**Current source verdict: INCOMPLETE / REVIEW REQUIRED.**
**Current runtime verdict: NOT_EXECUTED — DEFERRED UNTIL AFTER SECTION 28.**
**Release verdict: NO-GO.**

Base is `main@4571ec9c3e4362470d03a2ed2706664cd8ee09c0`; changes are on `feat/section-17-enterprise-ai-platform`.
No migration was applied, no database connection used, no worker started and no live/paid LLM call executed.

| Gate | Present source evidence | Actual result in this review | Closure standard |
| --- | --- | --- | --- |
| G1: source plan coverage | Section 18 P17 30 task rows + 2 functional annex rows in implementation report | REVIEWED; many OPEN | All non-runtime P0/P1/P2 source tasks closed with precise code/test mapping |
| G2: prompt author/reviewer/deployer separation | Repository transactional checks, granular API permissions, focused regression source | PATCHED / TEST NOT EXECUTED | Negative self-approval/deploy, positive independent reviewer+deployer, break-glass audit |
| G3: evaluation immutable gate | Definition checksum, result checksum, submitter/executor, reviewer CAS | PARTIAL / TEST NOT EXECUTED | Frozen approved dataset/gate, concurrent drift, transactional deploy-time match |
| G4: async cost-once guarantees | job-derived execution idempotency and DB-side due scan | PARTIAL / TEST NOT EXECUTED | Provider accepted/lost response, worker crash, lease heartbeat, quota held/reconciled with at-most-one billed execution |
| G5: AI operations RBAC | `admin:ai:*` evaluated per Admin route; operator aliases execute-only; viewer navigation | PATCHED / TEST NOT EXECUTED | Exact active role/permission provisioning, 401/403 matrix for each route and legacy alias |
| G6: data privacy and trusted ingestion | Nonpublic previews suppressed for new records; unverified manually submitted knowledge blocked | MITIGATED / NOT CLOSED | Typed canonical source verification, consent/retention/encryption/tombstone, verified owner provenance, historical cleanup |
| G7: registry writes and UX | Existing Admin editor sends expectedUpdatedAt; repository now requires it for updates; facet filters/deeplink added | PATCHED / TEST NOT EXECUTED | Concurrent save 409 mapped correctly; AR/EN and permission-aware UI; page/total/refresh/empty/error tests |
| G8: TypeScript, formatting, lint, build | Source changes and tests committed | NOT EXECUTED | Successful exact-commit `npm run typecheck`, `npm run lint`, `npm run build`, source quality |
| G9: targeted unit tests | AI infra / application / route regression specs added/expanded | NOT EXECUTED | Targeted Vitest pass at exact SHA and no regression |
| G10: security CI | Default PR workflows include CodeQL and source checks | PENDING NEW PR SHA | Exact-SHA checks green, not old `main` status |
| G11: runtime and migration | Prisma source schema and migration exist from previous P17 work | DEFERRED POST-28 | Disposable DB migration/revert, providers mocked or sandbox-only, replay/failure injection, complete audit/outbox |
| G12: production readiness | Historical Phase 17 source-only runbook available | NOT AUTHORIZED | Separate explicit runtime/production approval after source closure and post-28 |

## Lightweight commands for isolated source checkout

Use Node 22 and exact PR head commit, no DATABASE_URL, secrets, or external providers:

```sh
npm ci
npm run quality:source
npm run db:source:verify
npm run typecheck
npm run lint
npx --no-install vitest run packages/infrastructure/tests/ai-platform/PrismaAIPlatformRepository.spec.ts packages/infrastructure/tests/ai-platform/ProviderAdapters.spec.ts packages/application/tests/ai-platform/AIPlatformGovernance.spec.ts packages/application/tests/ai-platform/AIAsyncExecution.spec.ts apps/api/tests/presentation/api/router/AIAdminRouter.spec.ts apps/api/tests/presentation/api/router/AIGatewayRouter.spec.ts
```

These are **prescribed future commands**, not commands recorded as executed here. The CI workflow may automatically run larger existing source suites on the Draft PR; review its exact SHA and exclude/mark any skipped checks rather than declaring PASS.

## Post-28 disposable verification matrix

| Runtime scenario | Expected invariant |
| --- | --- |
| Prompt review/deploy plus two competing admins | Independent author, reviewer, deployer; exact approved immutable checksum; failed release leaves production binding intact |
| Active evaluation definition changes mid-run | Old passing run cannot satisfy changed dataset/evaluator/gate; independent single-use reviewer; no stale deployment |
| Two workers with expired lease, slow provider ACK then response loss | One durable billable execution identity and one terminal requester state; UNKNOWN held for reconciliation |
| Crash with RESERVED quota before and after provider acknowledgement | Reconcile without silently erasing known/unknown cost or charging twice |
| Requester privacy and cross-tenant read, job output, student tools | 404/403 for wrong principal, approved protected artifacts only, complete trace without sensitive previews |
| Canonical owner source published/unpublished/revoked | Only verified current owner revision searchable, atomic deindex and encrypted retention appropriate to class |
| Concurrent registry edits / routing changes | Conditional update conflict, pinned approved routing and coherent audit/outbox |
| UI AR and EN / reader-operator-reviewer personas | Status, labels and direction localized; hidden or denied privileged operations; correct page/total/facet behavior |
| Incident lifecycle, cost/pricing and cancellation | Valid transitions and reviewer authority, unknown cost honest, abort/unknown billing state accurate |
| Full provider/web/database/worker E2E and migrations | Performed only in approved disposable setup after section 28; never run against production in this PR |

## Operator constraints

- No DB mutations, Prisma deploy/push/reset, historical migration edits, backfill, seed, provider-secret injection, paid requests, worker startup, GitHub `main` merge, or deployment.
- Never treat application source, old Phase 17 source report or a green unrelated CI run as evidence that current runtime tests executed.
- Draft PR remains explicitly **not merge-ready** until a separate reviewer confirms each source blocker with fresh evidence.
