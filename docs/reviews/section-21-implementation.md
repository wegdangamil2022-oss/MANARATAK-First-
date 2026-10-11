# Section 21 / P20 — Services implementation

Branch: `fix/codex-section-21-services`. Base: `main` merge `d398be07`.
Scope: source changes only; no database migration applied, provider calls, deployment, heavy integration or browser suites.

The user's rule is binding: run a lightweight check once, repair any reported error, and do not repeat that check. Initial targeted unit/API tests passed (29 tests, 6 files, 6.03 seconds). Initial core compilation reported `InvoiceStatus.VOID`; it was corrected to `VOIDED`. Initial admin compilation exposed misplaced form initialization; that block was removed. Neither compilation was repeated. Initial ESLint: no errors, 69 warnings. Subsequent source completion and repairs have **not** been revalidated; saved logs describe the tested revision, not a final clean build certification.

## Implemented changes

| Plan items | Source implementation |
| --- | --- |
| SVC-ADM-001 | FREE / CHARGEABLE / QUOTE_REQUIRED policy; immutable request policy snapshot; clearance for every execution/completion path, with request origin and student binding; credited/refunded obligations do not provide service clearance. Legacy requests default to quote required. |
| 002 | Server intersects request-fulfillment and the existing `admin:finance:invoice:manage` capability; client visibility uses the same capability. |
| 003 | Persisted immutable invoice intent and LINK_PENDING before Finance handoff. Retry reuses the original Finance actor, request key and price, and relinks one invoice; concurrent changes retain a recoverable pending intent. |
| 004 | Finance invoice amounts come from active P20 pricing, match the request's reviewed pricing identity, and use exact bounded minor units. Supplied amount/currency/scale/quantity mismatches are rejected; UI no longer owns the price. |
| 005 | Principal-scoped deterministic student request identity, stable browser intent key across uncertain retries and login continuation, payload fingerprint, durable unique public ID and concurrent replay handling. |
| 006 | Typed, bounded, allowlisted service input fields; explicit consent; trusted owner-bound EAP asset references; 180-day input visibility limit, terminal request input erasure endpoint and erasure outbox event. |
| 007–009 | Separate review/publish capabilities; independent revision maker/checker, six required review checklist decisions, reason and revision evidence; hard readiness gates; published snapshot preserves public content while working changes are reviewed. Existing requests retain their original service terms. |
| 010 | Qualified provider registry, accreditation expiry and service/country compatibility; serializable assignment capacity check, request CAS and audit/outbox. |
| 011 | Operations DI, bounded protected REST surfaces and Admin operations workspace for providers, packages, pricing, promotions, availability, bookings and workflow definitions. Student availability and temporary booking panel use authenticated owner-derived identity. |
| 012 | Unique canonical request/booking relation; stable booking replay identity; exact immutable price snapshot; Finance clearance required for confirmation and execution. |
| 013–015 | Mandatory actor/reason/correlation and transactional advanced-operation outbox; independent qualification/activation; trusted accreditation assets; serializable price activation and conservative DB indexes allowing one ACTIVE price per owner. |
| 016–017 | Three bounded serialization attempts, 15-minute booking holds, atomic expiration/cancellation and reserved coupon release; provider overlap and slot capacity checks; confirmation commits coupon reservation. |
| 018 | Unique workflow claim per booking, repeated start recovery, canonical booking clearance, bound workflow/booking/step/artifact evidence, trusted booking-owned EAP deliverables, versioned step progression and required delivery checks. |
| 019 | Cancellation stays pending in the source request and emits a durable Finance-review event until Finance proves cancellation clearance; repeated pending cancellation does not emit another request. No P20 ledger/refund duplication. |
| 020 | Dedicated request view/PII/fulfill/assign/all capabilities; assigned-case reads and mutations, minimal unassigned queue, atomic staff claim, scoped advanced bookings/workflows and reduced student projection. |
| 021 | Reviewed typed price snapshot and Finance-review cancellation policy projection; arbitrary public metadata cannot supply financial prices, packages or cancellation terms. |
| 022 | Staff assignment queue, persisted deadline, server overdue filter, bounded case timeline and cancellation pending status. |
| 023 | Removed all eight unused legacy student/general service client methods after caller search; marked historical preview document as superseded. |
| 024 | Reviewed AR/EN catalog fields, locale public contract, bilingual Admin service catalog/request copy and operation forms. |
| 025 | Finite errors, safe 401/403/404/409/422/500 responses, masked unexpected diagnostics and generated correlation IDs. |
| 026 | Server search, stable cursor, bounded initial service loading and progressive browser pages, debounced search and stale-response protection. |
| 027 | Expected version required by advanced mutations, serializable CAS and terminal-state guards; unique workflow execution claim. |
| 028 | Lightweight negative unit/API cases and preserved initial results; runtime acceptance remains deferred. |
| SVC-FG-029–030 | Student/service request filters and fulfillment/completeness catalog filters reach owner API before pagination. |

## Release limits and remaining acceptance

This is **not a CLOSED / production-ready declaration**. Deployment must remain blocked until the actual schema and IAM changes are deployed and the final build/runtime checks are completed under the user's agreed policy.

After section 28, validate real Prisma CAS/unique constraints/outbox rollback, parallel capacity/coupon claims, intent recovery, payment/refund/void transitions, EAP delivery grants, browser journeys, locale parity and audience/filter facets. Finance must consume and resolve the cancellation-review outbox rather than treating PENDING_FINANCE as a completed refund. Notifications/escalation consumers belong to the following notification section.

Additional operational work that is not certified by this source batch: automated retention purge scheduling (expired inputs are hidden and terminal self-erasure exists), accreditation authority/legal evidence review, package orders spanning multiple underlying requests, availability covering all matching pages, and deployed EAP delivery grants. Public search over a draft revision's snapshot and full source localization should be included in final acceptance. The source snapshot and scope protections must not be mistaken for a live cross-owner atomic payment lease.
