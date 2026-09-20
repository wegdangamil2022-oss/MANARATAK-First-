# MANARATAK Finance — Final Source Closure — 2026-09-05

## Scope and authority

Finance is the authoritative bounded context for invoices, payment attempts and provider evidence, refunds, immutable ledger postings/reversals, wallet accounting, transfers, FX snapshots, approvals, reconciliation and finance reporting. Course, Service, Student and other domains remain owners of their own business records. Finance stores only stable origin references and exposes/read-consumes clearance through boundaries instead of duplicating owner-domain state.

This closure is source-only. No database connection, migration execution, backfill, Cloud SQL mutation, provider payment call or production write was performed.

## Key source decisions

- Existing Phase 19 financial core was retained: exact minor-unit money, double-entry ledger, serializable writes, reversal transactions, maker/checker, reconciliation and provider-neutral adapters.
- Payment execution now persists the attempt before contacting a provider. The lifecycle is `PENDING -> AUTHORIZED -> CAPTURED/FAILED`; explicit provider declines/failures are persisted, while ambiguous transport exceptions remain fail-closed and must be retried/reconciled rather than fabricated as success or failure.
- Provider gateway evidence is bound to the prepared attempt. Duplicate authorization/capture references are rejected.
- Payment and bank gateway adapters expose `READY | RUNTIME_PENDING | NOT_CONFIGURED`. Environment secrets alone never produce `READY` in the current adapters because real transport is not implemented.
- Admin mutation commands require an idempotency key. Financial commands never silently share an empty idempotency key.
- The authenticated student payment-attempt API is server-side, validates student ownership before payment execution and returns service-unavailable semantics while the provider transport is not configured/ready. No frontend can mark a payment successful.
- The old admin route that represented a payment as “captured” from an admin command was removed. Capture is proven only by a real gateway result.
- Automatic FX ingestion is fail-closed. Admin can create only governed manual overrides; it cannot label a manually supplied rate as `AUTOMATIC_PROVIDER`.
- Inbound payment webhook processing, manual/offline payment review and automatic FX transport are explicitly runtime pending/not configured rather than simulated.

## Cross-domain boundaries

### Courses

Paid-course access remains owned by Course Domain, while Finance owns clearance truth. `Phase19CourseFinancialClearanceGateway` calls Finance application use cases instead of reading Finance Prisma tables directly. A stale historic paid invoice cannot mask a newer outstanding invoice for the same origin/student; all effective invoices must be cleared. Draft and void invoices never grant access.

### Services

Service fulfillment cannot resume from `AWAITING_PAYMENT` to `IN_PROGRESS` or `COMPLETED` without Finance-confirmed clearance. Services stores only the Finance invoice reference; it does not duplicate payment status. The Finance deep link now resolves a Service Request by internal ID or public ID and opens the actual request read model in Services Admin.

### Currency reference data

Finance reads canonical currency code/minor-unit scale through the Reference Data boundary. It does not create a second currency truth.

## Admin UX

The Finance workspace was rebuilt around real API-backed surfaces: overview, invoices, payment attempts, refunds, transfers, FX rates, approvals, commissions, reconciliation, reports and runtime readiness. Placeholder Wallets/Estimates/Settings tabs were removed from the control plane because no complete read/admin workflow backed them.

A real invoice detail route was added with line items, payment attempt history and deep links to the source owner domain. Fake Finance preview pages, local state “success” transitions, fictional invoice rows and demo Stripe/wallet wording were removed from the legacy web preview.

The page uses MANARATAK identity (`#044A37`, `#235D4E`, `#E3B04B`, `#FBFCFB`, Cairo, RTL) while preserving semantic red/amber/green states for risk, pending/degraded and successful states.

## Refund semantics

The existing Finance rule is preserved: a payment refund reverses collected cash and reopens the invoice obligation by the refunded amount. A business cancellation/price reduction must be represented separately through the credit-note mechanism; Finance does not infer cancellation from a refund reason. This avoids silently changing contractual receivables inside the payment gateway workflow.

## Runtime pending

The following are intentionally not presented as source-complete production integrations:

- Payment provider transport: `NOT_CONFIGURED` or `RUNTIME_PENDING` depending on environment configuration.
- Bank transfer provider transport: `NOT_CONFIGURED` or `RUNTIME_PENDING`.
- Inbound signed payment webhooks: `NOT_CONFIGURED`.
- Manual/offline payment review workflow: `NOT_ENABLED`.
- Automatic FX provider: `NOT_CONFIGURED`.
- Student browser tokenization/hosted checkout UI: not enabled until an approved production provider SDK/hosted checkout is selected. The server API exists and fails closed.

## Database and migration policy

- Prisma schema changed: **0**.
- Existing migrations changed: **0**.
- Migrations added: **0**.
- Migrations removed: **0**.
- Database executions: **0**.
- Migration executions: **0**.
- Backfill executions: **0**.

Runtime Prisma validation was not forced because project dependencies are not installed in this source bundle. No dependencies were downloaded merely to manufacture a validation result.

## Closure gate

`node scripts/verify-finance-source-closure.mjs` is the Finance source closure gate. It checks real source invariants across ledger integrity, payment lifecycle, duplicate protection, runtime truth, RBAC, refunds, reconciliation, Course/Service boundaries, student payment ownership, Admin UX/accessibility and removal of fake Finance surfaces.

## Final closure evidence

- `FINANCE SOURCE CLOSURE = 150/150 PASS`
- Modified TS/TSX parse-only syntax: **35/35 parser-syntax PASS** (0 TS1xxx parser diagnostics; dependency-backed type checking remains runtime-pending).
- Source Quality: **PASS**.
- Package cycles: **0**.
- File cycles: **0**.
- Accessibility findings: **0**.
- W2 regression: **23/23 PASS**.
- Phase 19 Finance source verifier: **PASS**.
- W4 source verifier: **22/22 PASS**.
- Universities P9 regression: **97/97 PASS**.
- Scholarships P12 source closure: **188/188 PASS**.
- Import Foundation regression: **PASS**.
- International Tests regression: **37/37 PASS**.
- Courses regression: **88/88 PASS**.
- Study Destinations regression: **90/90 PASS**.
- Certificates regression: **90/90 PASS**.
- Health & Readiness regression: **63/63 PASS**.
- P13 regression: **98/98 PASS**.

Dashboard, Review Queue, Scholarships and Universities protected source surfaces were compared against the adopted baseline and remain byte-for-byte unchanged by the Finance work. No unrelated closed section was reopened; only genuine cross-domain Finance boundary/regression integration was modified where required.

Dependency-backed full TypeScript execution and Prisma CLI runtime validation were not run because this archive does not carry installed project dependencies. No packages were downloaded to force these checks. The source parse, source gates, architecture guards and static regression verifiers above are the executed evidence for this source-only closure.

## Final source status

**FINANCE SOURCE CLOSURE = CLOSED — 150/150 PASS**

Production runtime remains intentionally fail-closed until real payment/bank transports, signed webhook handling, any approved offline-payment review workflow and automatic FX integration are configured and verified in the deployment environment.
