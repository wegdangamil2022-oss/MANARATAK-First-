# Notifications workspace review — 2026-10-27

The notification workspace retains the existing transactional notification owner, permission checks, MFA, recipient eligibility, preferences and idempotency. It does not add broadcast campaigns or activate a provider.

| Area | Previously | Workspace |
| --- | --- | --- |
| Navigation | One large page with inline creation, templates and receipts | Direct log, templates and delivery tabs, with detail and creation routes |
| Log | Inline results and channel receipts; template list loaded broadly | Independent period summary and cursor-paged server search; deep links retain list context |
| Intent | Inline creation and receipt selection | Separate recipient/template/variables/preview flow and safe read-only detail with contextual retry/cancel |
| Templates | Inline authoring and saved-template actions | Server search/filters/cursor, bilingual creation, sample preview, separate immutable clone and guarded deactivation |
| Delivery | Status/receipts on the same long page | Failure-focused log, real channel/error aggregates and platform-health link |

## Read contracts and privacy

- `GET /notifications/intents/:id` uses an explicit safe projection and masks recipient and reference without `admin:notifications:recipients:pii`.
- `GET /notifications/templates/:id` also reads inactive records; saved text is returned only to template authors. Existing delivery lookups remain active-only.
- `GET /notifications/templates` supports bounded server search, active status, channel, language and stable cursor. Existing clients can continue using `limit` alone.
- A manual-intent operator with both create and recipient permissions may preview an active, non-system template; authors retain their existing preview access. Preview does not create an intent or invoke a provider.
- Creation remains individual and transactional. The server continues to enforce reserved owners, recipient eligibility, template variables, preference rules, encrypted payloads and idempotency. A network-uncertain command freezes its body and idempotency key during the current page session.
- Acceptance, delivery and reading remain distinct. Provider payloads, encrypted variables and unsafe error strings are not returned by the new detail. Receipts are a bounded record, not a complete timeline.

## Verification

- Full TypeScript project build passed; admin production build passed with the existing large bundle warning.
- Notification suite: 70 tests passed across five files, including permissions, safe projections, cursor filtering, stale responses and idempotency. ESLint reported no errors; test mocks and legacy API/repository code retain `any` warnings. Source quality and secret scans passed.
- Canonical API on attested, disposable PostgreSQL 16: independent MFA fixture sessions; create/read bilingual template, permission masking, SQL search/channel/locale filters, preview, independent clone, version conflict and deactivation, unauthorized authoring rejection, a synthetic eligible-student intent with repeated idempotency key, PII masking, cancellation and summary. No original database writes or external delivery.
- Browser walkthrough on the same isolated environment: log, template list, deep-link detail, structured preview, creation and cancellation of a synthetic intent. Mobile viewport 390 × 844: document width 375 px, table scrolls within its container, and Cairo is first in the computed font stack. Desktop visual inspection performed. Saved screenshot artifacts were not produced.

## Operational limitations

- The current owner contract does not supply a redacted rendered intent message or a complete state-transition timeline; the detail explicitly reports those limits rather than decrypting sensitive payloads.
- Provider/worker readiness remains in the health section. No production provider, background worker, production migration or real-recipient send was activated or tested.
- An uncertain command retains its key within the active page session; leaving or reloading that page loses the in-memory retry state. Operators should reconcile the record before manually creating a replacement after interruption.
- This feature branch is independent of other open admin work. Review and integration are required before deployment.
