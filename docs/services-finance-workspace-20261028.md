# Services and Finance workspace delivery — 2026-10-28

Baseline: 85f6d5b539b548c2fac9a1d090caa9d2fc352c2e.
Scope: the approved first release reorganizes existing capabilities and closes service-role access gaps. It does not declare the full accounting expansion complete.

Closeout corrections and verified release boundaries: [Arabic closeout record](services-finance-closeout-20261028.md). The closeout suite contains 200 passing tests; no image capture was run in that round at the user's request.

## Delivered structure

- Services: Requests & fulfillment, Service catalog, Operations. The default is the first section allowed by the operator's existing permissions.
- Requests: scoped queues (mine/all/unassigned/payment/overdue/completed), URL filters, a dedicated details route, and six detail sections: summary, requirements, execution, finance, delivery and timeline.
- Catalog: a seven-section editor, review/publishing actions inside it, a separate list, compact primary filters and expandable additional filters. Editing preserves typed input schemas, additional locales and SLA metadata.
- Operations: all ten existing units remain, grouped as providers; packages/pricing/discounts/promotions; slots/bookings; workflows/executions/deliveries. Forms open on demand; relationships use bounded canonical pickers where supported.
- Finance: seven primary groups over the fourteen previous tabs. Existing tab links remain valid. The new transaction register reads posted ledger transactions with pagination, date/currency/reference filters and links to the existing ledger owner.
- Cairo is explicit throughout these workspaces and finance details. Active navigation uses navy with gold icons. Empty states use normal 13px text. Layout adapts to narrow screens.

## Permission and data boundaries

| Operator capability | Section entry | Data and actions |
| --- | --- | --- |
| services:manage | Catalog | Existing catalog reads/writes; review and publishing retain their own checks |
| services:requests:view | Requests | Assigned scope unless view-all; summary list excludes PII by explicit server allowlist |
| services:requests:pii + view | Requests details | Existing per-request scope checks remain |
| services:operations:manage | Operations | Sensitive bookings/executions/deliveries still require PII; fulfillment writes retain their own permission |
| finance:manage | Finance | Existing finance policy remains; transaction register is read-only |

The common services route accepts the three entry capabilities without granting any of them to an account. Managed-application evidence retains its existing management guard. Authentication, session validation, MFA, maker/checker, optimistic versions and idempotent financial commands remain in place.

PII-derived request search/student/provider filters are rejected when the operator lacks PII permission, including count-based disclosure. The summary response contains only request identity, service, status, version and dates.

Ledger read totals use BigInt minor units and separate currencies. Invalid entry directions, scales, currencies, unbalanced postings and malformed amounts fail the read rather than produce misleading totals. This is a ledger register; it is not a cashbook, bank reconciliation, P&L or evidence of cash collection.

## Actual gaps and activation gates

The current database schema has no dedicated supplier-bill/AP document, expense document approval flow, physical cash/bank profile or offline receipt verification model. These views describe the unavailable capability and provide working links to existing records. They do not create fake receipts, mark invoices paid or post generic adjustments as purchases.

Before enabling these additions, an independent schema proposal must cover:

1. Accounting entity and base currency, posting periods, account mappings and currency rounding.
2. Separate payment channel, evidence source and verification state; approval/posting/payment states are independent.
3. Cash/bank profiles, receipt allocations, supplier bills and expense documents with immutable ledger references and maker/checker controls.
4. Line-level service entitlement, partial refund allocations and payout beneficiary-version binding.
5. Migration/backfill strategy and tests against an isolated database; explicit review before changing the original database.

The service amendment/change-order workflow and new line-level refund/entitlement capabilities are not implemented by this navigation release. Existing state transitions and financial clearance checks are preserved. Existing financial-account creation stays read-only; no artificial accounting zero values or new live providers are introduced.

## Verification

- TypeScript project build: admin, API, application and infrastructure.
- Targeted existing and new service/finance, authorization and ledger-read tests; no database acceptance writes.
- Admin production bundle.
- Isolated browser layout checks at 1366px and 390px using actual components and production CSS, with no original data or authentication.
- Original runtime separately verifies the preserved database identity, existing MFA key binding, source/assets and anonymous API protection before binding the existing local port.
- Isolated UI tests and anonymous HTTP checks are not an authenticated end-to-end acceptance of original records. Windows Computer Use is unavailable in this session; no MFA bypass or account replacement is permitted.

No Prisma schema change, migration, seed or deletion is part of this release. No main merge or remote push is part of this delivery.
