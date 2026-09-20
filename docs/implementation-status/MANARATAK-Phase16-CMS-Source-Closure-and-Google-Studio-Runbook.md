# Phase 16 — Enterprise CMS source closure and Google Studio runbook

Status: `SOURCE_COMPLETE_RUNTIME_PENDING`

Starting source baseline: `6cf40bb190b45caea44ced1e8115f1c8024bc673` (`Complete Phase 15 enterprise student platform`). Phase 15 is closed at source level and its own runtime proof remains governed by the Phase 15 runbook.

## Implemented source scope

- Arabic-first CMS content nodes for articles, news, static pages, guides, FAQs, checklists, announcements, landing pages, and reusable editorial blocks.
- Independent Arabic and English localized payloads with stable localized slugs.
- Draft → Review → Ready to Publish → Scheduled/Published → Archived lifecycle.
- Maker-checker approval, optimistic versions, immutable published identity, revisions, and restore-to-draft.
- Categories, tags, Phase 05 asset handles, attachments, SEO, canonical URLs, and public delivery snapshots.
- Real Prisma repository transactions containing content mutation, CMS editorial ledger, audit record, and transactional outbox event.
- Authenticated admin APIs, published-only public APIs with caching contracts, Arabic admin workspace, and public rendering.

## Google Studio runtime execution plan

Run these steps only in the approved runtime environment. They were intentionally not executed during source implementation.

1. Back up the target PostgreSQL database and record the deployed migration baseline.
2. Configure the API runtime secrets and URLs (`DATABASE_URL`, JWT/admin authentication, public web URL, Redis if enabled, and Phase 05 Asset Platform credentials).
3. Run `prisma migrate deploy` against the approved database. The source migration is `20260824213000_phase16_enterprise_cms`.
4. Run `prisma generate`, start API/Admin/Web, then map the operational roles `cms.editor`, `cms.reviewer`, and `cms.publisher` to the existing admin authorization layer. Use separate editor and publisher accounts for maker-checker proof.
5. Connect the media picker/resolver to Phase 05 Asset Platform. Store only Asset IDs in CMS; prove upload/select/resolve for featured, attachment, and Open Graph assets.
6. Start the transactional outbox relay. Route `CmsContentPublished` and `CmsContentArchived` to cache invalidation and, when the formal search consumer is enabled, its CMS index projection.
7. Start the scheduled-publishing worker with a service identity. It may publish only due `SCHEDULED` records that already hold an approved review; it must retry idempotently and must never approve content.
8. Configure CDN/API caching and invalidate the exact locale/slug keys on publish, republish, and archive.
9. Execute runtime smoke proof: create Arabic draft, save English overlay, select EAP assets, fail readiness, complete readiness, submit, prove same-user approval denial, approve with a second account, preview, publish, verify public Arabic/English canonical/hreflang/robots, edit into a new draft, inspect revision, archive, and verify public removal.
10. Capture database rows for CMS node/localization/review/revision/published projection, matching audit rows, outbox delivery, HTTP responses, browser screenshots, scheduler log, and search/cache evidence.

## Runtime acceptance gates

- Migration applies and rolls forward without manual schema edits.
- No CMS raw binary or raw file URL exists in the database.
- An editor cannot approve or publish their own authored content.
- Saving, previewing, approving, or scheduling never auto-publishes.
- Public APIs never return draft/review/scheduled/archived payloads.
- Published locale slug and canonical identity are not silently rewritten.
- Each material write has an audit row and outbox event from the same transaction.
- Arabic RTL and English rendering, SEO, assets, cache invalidation, and scheduler behavior are evidenced.

No PostgreSQL connection, migration execution, seed, live import, Google Studio process, scheduled worker, or real asset endpoint was used during source completion.
