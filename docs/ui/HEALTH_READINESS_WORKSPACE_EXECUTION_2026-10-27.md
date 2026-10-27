# Health/readiness workspace delivery

Date: 2026-10-27. Branch: `feat/health-readiness-workspace-20261027`.
Presentation model commit: `2e938710`.
UI implementation commit: `982b5c28`.
Base: `1146f63497e81a4850df1d4b7e560e18f9cd9e69`, including the preceding local
certificate work. This delivery does not merge or push either branch to main.

## Product review

Accepted the supplied plan's five destinations and read-only operating model.
The review and scope amendments are in
`HEALTH_READINESS_APPROVED_SCOPE_2026-10-27.md`.

The workspace answers: what was observed, how recent is it, what needs
attention, what evidence supports the decision, and where can an authorized
operator investigate? Runtime status, release policy and evidence freshness
are separate. An optional failure remains visible even if required services
pass. A missing probe is not presented as an outage. Stale observations never
present a current green release verdict.

The layout reuses Reference Data's workspace, hero and content-card classes,
with scoped CSS, explicit Cairo controls, navy/teal/gold and RTL/LTR support.
No global stylesheet or unrelated workspace was changed.

## Source and delivery matrix

| Capability                                                            | Classification             | Result / implementation                                                                                                                                                           |
| --------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protocol v2, overview, canonical release gates                        | Source Existing            | Preserved; no backend policy changes. Overview parser formatting only.                                                                                                            |
| Public liveness/readiness and diagnostic sanitization                 | Source Existing            | Preserved; authenticated diagnostics and compact public responses remain distinct.                                                                                                |
| Five URL destinations and legacy view aliases                         | Added UI                   | `AdminHealthReadinessPage.tsx`, `healthPresentation.ts`; browser history and shareable local links.                                                                               |
| Overview, clickable metrics and priority findings                     | Added UI                   | `HealthSummary.tsx`; no inferred user impact or availability percentage.                                                                                                          |
| Service grouping, filters, evidence details, previous/next            | Added UI                   | `HealthServices.tsx`; missing probe details, safe reference copy, per-service history link.                                                                                       |
| Source-qualified issues, filters and drill-down                       | Added UI                   | `HealthIssues.tsx`; configuration, probe and coverage findings retain independent references. Filter context survives details/back.                                               |
| Owner routes                                                          | Source Existing + Added UI | Explicit allowlist and separate owner permission; unavailable routes explain why there is no link.                                                                                |
| Release gate explanation                                              | Added UI                   | Existing four booleans, configuration report time and diagnostic context; no deploy or override.                                                                                  |
| Process-local history and cursor                                      | Source Existing + Added UI | Existing API; optional metadata validation in `HealthHistoryContract.ts`, page deduplication, session mismatch replacement and 1,000-sample client cap.                           |
| Coverage, missing and extra probes                                    | Added UI                   | `HealthReports.tsx`; union of expected/extra probes, with links and no fabricated operational rows.                                                                               |
| Human report, JSON download, copy feedback                            | Added UI                   | Known sanitized envelope, separate observation/export timestamps, stale marker. Clipboard/download errors do not alter health.                                                    |
| Session loss and late responses                                       | Added UI                   | `useHealthSnapshot.ts`; overview/history 401/403 clear all protected diagnostics and invalidate pending overview requests. Transport failures preserve explicitly stale evidence. |
| Continuous availability, RED, SLO/error budgets                       | Needs Backend              | No connected time-series/user-SLI source; explicitly unconnected, no fabricated charts or values.                                                                                 |
| Persistent incidents, acknowledgment, assignment, resolution          | Needs Backend              | No incident owner/backend; current issues remain diagnostic findings.                                                                                                             |
| Cross-environment/deployment comparison                               | Deferred                   | Requires attested environment/release observations and deployment audit. No inferred revision labels.                                                                             |
| Restarts, configuration writes, release override, provider activation | Not Applicable             | Excluded from this read-only workspace.                                                                                                                                           |

## Validation

Executed with Node 22.16.0 and the repository's installed dependencies:

- `npx vitest run --config .section25-health-ui-vitest.config.ts`: **24 PASS**.
  Covers freshness/future clock, optional failure truth, source identity,
  history provenance/deduplication/cap, safe export, legacy links, stale retry,
  incompatible schema, authorization loss, late response suppression,
  pagination, owner permission, missing probes, filter context and clipboard
  failure/language switching.
- `node scripts/verify-health-readiness-source-closure.mjs`: **81 PASS** across
  source/security, configuration policy, router and monitoring regressions.
- `npx tsc -b apps/admin --pretty false`: **PASS**.
- Scoped ESLint: **PASS, zero warnings**.
- Vite production build using `apps/admin/vite.config.ts`: **PASS**. Its shared
  application bundle still produces the existing >500 kB size advisory;
  application-wide code splitting was outside this section's scope.
- `node scripts/quality/verify-source-quality.mjs`: **PASS**, zero package/file
  cycles and zero reported accessibility findings.
- `node scripts/security/scan-secrets.mjs`: **PASS**, 9,702 tracked files.
- `git diff --cached --check`: **PASS** before the implementation commit.

These checks establish section behavior and source regressions, not production
availability or complete end-to-end coverage of every platform workspace.

## Actual isolated runtime and browser evidence

Preview: `http://127.0.0.2:3171/admin/health-readiness`.
Separate from the original app on port 3000 and the certificate preview on 3170.
The page visibly identifies isolated synthetic data. The private server uses
the existing attested disposable PostgreSQL 16 lab and canonical fixture MFA
login; its local helpers and credentials are not product routes or committed
source. Only disposable synthetic roles received the health permission.

Actual authenticated API observations:

- v2 overview with 16 components; runtime UP with 10 optional problems.
- Release ready **false** and environment eligible **false** in the test runtime.
- All three history windows parse successfully with process-session metadata.
- Overview/history use `Cache-Control: no-store`.
- Unauthenticated diagnostic read returns 401.
- Public liveness contains only protocolVersion, status, timestamp and code.

Browser actions verified Arabic and English, manual refresh, search, service
details, filter retention, source details, reference copy, per-service history,
history window selection, coverage, release gates, and actual text/JSON
downloads. The downloaded JSON preserves the observation timestamp and marks
stale evidence separately from export time. No warn/error entries were observed
in the captured browser log during the reviewed flow.

Responsive checks covered 320, 390, 768, 1024 and 1440 CSS-pixel widths; scoped
content was rechecked after layout settled. At 390, workspace overflow was zero,
direction RTL and computed button font Cairo. The shared mobile navigation
retains its existing horizontal scrolling behavior. Screenshots use 800-pixel
and 390-pixel views because this host's native capture clips larger emulated
viewports; desktop checks also used DOM geometry.

User-facing artifacts are in this chat's `outputs` directory:
`health-overview-ar.png`, `health-mobile-ar.png`, `health-release-en.png`,
`health-runtime-evidence.json`, and `health-readiness-review.md`.

No original database writes, migrations, seeding, account changes, MFA bypass,
production secret changes or external delivery activation were performed.
This is an implemented and tested read-only diagnostic workspace. Continuous
monitoring and incident management remain separate backend work; this delivery
does not certify production launch readiness.

## Research applied

[Google SRE monitoring](https://sre.google/workbook/monitoring/) informed the
separation between internal evidence and user-visible behavior.
[Grafana dashboard practices](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/)
informed the question-led hierarchy and drill-down.
[Google SRE SLO alerting](https://sre.google/workbook/alerting-on-slos/) informed
the decision to defer SLO/availability claims until real user reliability
measurements exist. These are design inferences, not certification by either
organization.
