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
| G4: async cost-once guarantees | Job-derived identity, requester-scoped queue replay, fenced heartbeat and database-side due scan | PARTIAL / LATEST SOURCE CHECK PENDING | Provider ACK loss, crash reconciliation, worst-case at-most-one billed execution with competing worker fault tests |
| G5: AI operations RBAC | `admin:ai:*` evaluated per Admin route; operator aliases execute-only; viewer navigation | PATCHED / TEST NOT EXECUTED | Exact active role/permission provisioning, 401/403 matrix for each route and legacy alias |
| G6: data privacy and trusted ingestion | Nonpublic previews suppressed; unverified knowledge quarantined; new workflow step checkpoints AES-GCM encrypted with 24-hour TTL and conservative classification | MITIGATED / NOT CLOSED | Typed owner verification, workflow principal scoping/consent, protected deindex lifecycle, historical cleanup and full per-step policy |
| G7: registry writes and UX | Existing Admin editor sends expectedUpdatedAt; repository now requires it for updates; facet filters/deeplink added | PATCHED / TEST NOT EXECUTED | Concurrent save 409 mapped correctly; AR/EN and permission-aware UI; page/total/refresh/empty/error tests |
| G8: TypeScript, formatting, lint, build | Source changes and tests committed | NOT EXECUTED | Successful exact-commit `npm run typecheck`, `npm run lint`, `npm run build`, source quality |
| G9: targeted unit tests | AI infra / application / route specs, encrypted workflow snapshots, cancellation race, lease renewal and queue replay now included in P17 workflow | PRIOR HEAD GREEN; CURRENT SHA PENDING | All relevant isolated Vitest contracts green at exact final head with no regression |
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


## Continuation verification notes — 11 October 2026

- A previous P17 commit `7836a0b28c8a0cfd69e4d32ad0a81bd4b864afe2` received a successful isolated P17 source/mock check, translation, architecture, dependency audit, secret scan, Google AI Studio preview and CodeQL. **These successes are not transferable to subsequent commits.**
- Later feature-branch edits add requester-scoped durable queue idempotency, worker lease renewal, pre-provider cancellation CAS with refundable pre-dispatch reservation, and AES-GCM workflow checkpoint envelopes. Their source tests are in `AIAsyncExecution.spec.ts`, `PrismaAIPlatformRepository.spec.ts`, `AIGatewayRouter.spec.ts` and `AIWorkflowPrivacy.spec.ts`.
- The final P17 Draft PR must remain nonmergeable by policy until exact-head source checks complete and the full open-plan matrix is remediated; actual PostgreSQL concurrency, worker restart, provider billing, transport abort, source owner discovery and E2E are deferred until **after section 28** per instruction.
