# Dashboard v2.1 execution register — 2026-10-24

Baseline: main 10179ab97eddba9b236238714dea1d68859f469e. Work branch: feat/executive-dashboard-20261024. The user authorized section 01 only; sections 02/03 in the supplied reference are not implementation instructions for this branch.

| Metric | Baseline evidence | Implementation/source | Definition and boundary |
|---|---|---|---|
| Registered users | Human identities existed, but not a valid registered-user aggregate | New dedicated /admin/dashboard/users aggregate | Verified human UserRecord + AccountRecord, non-deleted IdentityRecord ACTIVE/SUSPENDED; locked/suspended accounts remain registered. Excludes provisioned, archived, purged, service/system identities. No attempted person-level deduplication. |
| Registered students | Canonical role assignment student exists | Same snapshot query, EXISTS on roleId=student | Unique eligible accounts, all-time headline; not all identities or workspaces. |
| Registration growth | Creation timestamps available | Current eligible cohorts grouped by UTC creation day | Equal 7/30/90/365-day windows; zero baseline has no percentage. Past cohorts reflect current eligibility, not historic verification-time assertions. |
| Universities, scholarships, major profiles, courses, tests, careers, CMS | Existing DashboardSources/owner counts | Reused seven count sources | Independent owner reads, not published-only counts or a cross-owner atomic snapshot. |
| Page views, visitors, outbound clicks | No existing event store; NOT_MEASURED contract | New consent/event tables and public event endpoints | Explicit versioned opt-in only; random browser identifiers, known bot filtering, DNT/GPC; no IP/UA/email/search/URL stored. Visitors are browser identifiers, not all humans. |
| Managed service receipts | Existing StudentServiceRequestUseCases and consent/private uploads | Extended existing reviewed service with managedApplication flag + published scholarship reference | Only explicit service submissions count. Draft or upload is not a request. No parallel application system. |
| Actual university submission/outcome | No suitable trusted event contract | Append-only service evidence with private asset digest, scoped staff, separate verification permission, audit + outbox | Neither payment, receipt, nor StudentApplicationTracker implies submission or admission. |
| Direct self-report | Missing | Separate owned student report with bounded retention | Explicit unverified report, unique student/opportunity; not a university decision or managed-service event. |
| Attention | Existing import/finance/health sources | At most five action rows | Review totals are not summed across overlapping signals. Missing is not zero. |
| Recent activity | Existing permissioned audit projection | Eagerly loaded five most recent permitted events | No private actor/target IDs or raw event metadata in Dashboard. |

## Privacy and rollout gates

Collection defaults OFF. Activating requires explicit PUBLIC_ANALYTICS_ENABLED=true and PUBLIC_ANALYTICS_POLICY_VERSION=public-analytics-v1-2026-10-24, a running durable background worker and the retention schedule. This configuration is a deployment control, not a fabricated legal approval. Review the opt-in wording and jurisdictional privacy requirements before public activation.

Visitor consent lasts 30 days, raw anonymous events 90 days. Explicit withdrawal stops local collection immediately and deletes the token-linked events; failed deletion remains retryable. Student self-reports and service attestations have up to 180-day retention, with existing legal holds preserved for service evidence. No previous student consent is rewritten or reused as blanket analytics permission.

Additive migration 20261024000100_executive_dashboard_analytics adds indexes and missing event contracts; it must be reviewed and tested on a new isolated PostgreSQL 16 cluster. No production/Neon migration is authorized or performed by this work. No historical migrations are edited.

The dashboard UI uses scoped styles and no chart library dependency. Other catalog/review designs remain untouched; service/public components receive only the functional additions necessary for the two application channels.

Verification status is recorded in the delivery evidence after execution. Code existence alone is not a PASS.