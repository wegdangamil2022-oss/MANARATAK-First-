# Careers admin workspace refinement — 2026-10-27

The working implementation is `apps/admin/src/pages/CareerAdminPage.tsx` and
`apps/admin/src/features/careers`. The older Phase 21 preview report describes
historical preview screens; it is not a statement of current API capabilities.

## Delivered behavior

- Four permission-aware sections: opportunities, employers, applications, and
  alumni visibility. Opportunity stages expose review, ready to publish,
  published and expired queues using the existing list filters.
- Shared reference workspace styling, Cairo, navy selected controls with gold
  icons, consistent compact typography, responsive navigation, labelled fields,
  keyboard focus, and focus transfer to opened details/editors.
- Readable tables, translated status/type labels, refresh/retry, empty states,
  filter reset, pagination retaining filters, review-queue search continuity,
  and expandable employer/geography filters.
- Opportunity details link to scoped applications; employer details link to
  their opportunities. No unsupported dashboard totals or analytics endpoints.
- Record-specific confirmation, reason, version, independent-review checklist,
  verification source/expiry and application decision/message/interview fields.
  Checks and reasons do not carry to another record. Backend permissions and
  maker/checker controls remain authoritative.
- Applications without all-scope access require a job filter. Reviewing status
  without PII permission does not request private details. CV delivery still uses
  the existing short-lived, permission- and consent-checked grant endpoint.
  Late details/grants are discarded after leaving their scope.
- Grouped job/employer editors, education and language requirements, explicit
  remote-work flag, salary bounds validation, paired English fields and safe
  source/application URLs. Existing supported public metadata, remote flag and
  unchanged deadline precision are retained; governance is not client-authored.
- Unsaved-change guard, duplicate-click prevention, and an idempotency key reused
  for retrying an unchanged command. Saving opportunities returns them to review
  through the existing backend; it does not publish automatically.
- Alumni remains a minimal read-only visibility projection. No names, contact
  information, consent overrides, or fabricated consent verification are added.

## Validation and limits

- Node 22: 68 passing tests in 8 suites covering admin interactions and existing
  career application, privacy, employer governance and public router boundaries.
  The admin suite contains 19 interaction cases.
- Admin TypeScript build and ESLint: passed, no lint errors or warnings.
- Vite admin production build: passed; existing large-chunk warning remains.
- No schema, migration, seeding, original-data acceptance writes, account changes,
  authentication bypass, external sending, or analytics activation is required.
- Authenticated visual acceptance is **not verified**: Windows Computer Use
  reported an unavailable native pipe. Component tests and static asset/route
  checks do not replace a logged-in visual check.
- Advanced aggregate analytics, bulk import/export and employer self-service are
  not supplied by these existing admin contracts and are not presented as working
  features by this refinement.

Runtime verification evidence is kept outside Git with the local sealed runtime.
The restart must match the committed source SHA and the original database identity
before replacing the current local server. This work does not merge or push main.
