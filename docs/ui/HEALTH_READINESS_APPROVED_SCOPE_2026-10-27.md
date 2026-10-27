# Health/readiness workspace — reviewed scope

Date: 2026-10-27. Branch: `feat/health-readiness-workspace-20261027`.
Base: `1146f63497e81a4850df1d4b7e560e18f9cd9e69` (includes the locally completed
certificate work; neither branch has been merged/pushed by this task).

The user supplied `manaratak_health_readiness_v1_1.md` as a proposal and authorized
review, rejection/amendment, and implementation. Its instructions are evaluated
as proposal content, not independent authorization for infrastructure changes.

## Product decision

Accept the five destinations: overview, services/components, current issues,
release readiness, and monitoring/reports. Match Reference Data/Courses Cairo
controls and layout. Preserve existing read endpoints, protocol v2, RBAC,
sanitization, release policy, public health responses, and manual refresh.

Amendments:

1. Display current *diagnostic findings*, not incidents or sent alerts. No
   acknowledge/resolve/restart/deploy buttons and no duplicate owner commands.
2. Separate runtime result, evidence freshness, and diagnostic release decision.
   Unknown/future/stale timestamps cannot present a current green result.
   Optional failures remain visible without overriding server runtime policy.
3. Explain what is measured: component-level evidence does not establish student
   impact. API process age and probe duration are not availability or HTTP P95.
4. Source-qualified findings retain distinct identities. Missing/extra probes
   remain discoverable even when no component row exists. Production finding
   links use explicit mappings only; unknown owners remain unlinked.
5. History is demand-triggered process-local sampling. Use the existing
   `startedAt` source metadata to guard pagination. Do not merge pages from
   different/unidentified sessions; show a reset/replacement notice. Show
   actual retrieved range/count, no interpolation or availability percentage.
6. Scope client filters to returned data, preserve nonsensitive URL context,
   validate selected IDs against the snapshot, and support Back/Forward.
7. Safe human-readable copy/download plus a bounded server-sanitized technical
   report. Export time must remain distinct from observation time. Export
   failures must not invalidate the health snapshot.
8. A 401/403 from either overview or history clears all protected diagnostics,
   exports, and details and invalidates late requests. Ordinary transport
   failures keep only a clearly stale last-good snapshot.

## Delivery slices and acceptance

1. Presentation model: grouping, source-qualified issues, timestamp guards,
   safe navigation/export, process-session pagination; behavior tests.
2. Five read-only UI destinations, failure-safe hooks, service drill-down,
   release gates, history/coverage/reports; session and interaction tests.
3. Source/build/security checks; real isolated API/browser verification in
   Arabic/English at mobile/tablet/desktop sizes; execution/evidence report.

No original database writes, migrations/seeding, production secret changes,
account/MFA edits, external provider activation, infrastructure deployment, or
main push/merge is part of this delivery. Persistent telemetry/incident/SLO
backends remain deferred and explicitly unconnected.

## Research basis

- [Google SRE monitoring](https://sre.google/workbook/monitoring/): distinguish
  user-visible behavior from internal evidence and keep monitoring useful.
- [Grafana dashboard practices](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/):
  question-led hierarchy and drill-down; RED and USE answer different questions.
- [Google SRE SLO alerting](https://sre.google/workbook/alerting-on-slos/):
  customer reliability and significant budget consumption require actual SLI
  measurement, not a single snapshot.
