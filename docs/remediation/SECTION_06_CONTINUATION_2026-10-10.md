# Section 06 / P7 — continuation, 2026-10-10

Branch: codex/section-01-iam-rbac. Starting checkpoint: e4fc7c50730c714556e571d5d3605504be7598d9. Status: PARTIAL; NOT CODE_CLOSED.

## New source implementation

- P6→P7 universal screening-only consumer registered with generic screening receipts. Explicit reference entity type required; failed validation stays INVALID. No canonical data writes from the consumer.
- Removed automatic seed READY_TO_APPLY. Seed identity keys delegate to P7 domain validation; all intra-batch duplicate canonical keys are quarantined. The old direct ReferenceDataSeedApplyService now always refuses promotion without durable owner approval.
- Four owner tabs have on-demand aliases, provider mappings, historical versions, replacement relationships, DEPRECATED transition and dependency impact inspection. Explicit provider-key transfer has a dedicated target search, required reason and stable request identifier.
- Provider mapping reconciliation in the owner repository takes ordered row locks, checks both optimistic versions, enforces city same-country scoping, writes both temporal history versions, and executes with atomic Audit+Outbox. Replays are intercepted before duplicate events.
- Actual owner counts for per-country cities, missing canonical region, timezone, identity and country links, and inconsistent country/region relationships. Non-FK consumers and authoritative data coverage remain unknown.
- ISO639 alpha2/alpha3 language codes separated from BCP47 locale tags. Standard snapshot contracts cover source authority/version/hash/reviewer for ISO3166/ISO4217/ISO639/UN M49/IANA TZ/CLDR but no reviewed snapshots are persisted.
- Country source preview maps Arabic canonical name to nameAr and disallows source review statuses becoming live lifecycle commands.

## Still functionally incomplete

- Durable P7 operator approval + transactional apply owner inbox, including idempotent source checksum receipt. Screening is **not** apply.
- Verified authority source snapshots and persistent multilingual locale/CLDR/IANA operational coverage.
- Complete downstream non-FK dependency impacts before terminal lifecycle transitions; full metadata UX parity.
- Full DB-backed historical city/alias duplicate reconciliation and university/city inventory. The earlier 2052 review-only unmatched scoped cities have not been inserted.
- Targeted TypeScript and unit/contract/security tests remain **NOT RUN** in this environment. Test specs are not proof of PASS.

## Exclusions

No database queries or data modification, migrations, seed/backfill, live imports, browser/E2E/performance/provider tests, CI, deployment or branch merge. Existing source city CSVs and university review artifacts remain unchanged. Read SECTION_06_ITEM_MATRIX.md and SECTION_06_CHECK_LOG.md for exact statuses.
