# MANARATAK Observability Runbook

Source authority: `config/monitoring/alert-rules.json`. Production/staging must configure `OTEL_EXPORTER_OTLP_ENDPOINT`; the API emits bounded-cardinality HTTP request metrics/traces and worker iteration metrics/traces through the same monitoring provider. Provider-side alert installation and live dashboards are `PENDING_NON_BLOCKING` until the telemetry backend is connected.

## OBS-HTTP-ERRORS
Check the failing normalized route, status class and correlation ID. Correlate the HTTP span with application logs. Roll back the immutable release if a release regression is confirmed.

## OBS-HTTP-LATENCY
Inspect p95/p99 route latency, in-flight gauge, database/Redis readiness and downstream provider health. Do not add unbounded identifiers to metric labels.

## OBS-EXPORTER
If the telemetry exporter is degraded, preserve application availability while restoring collector/gateway connectivity. A telemetry outage is not treated as successful observability evidence.

## OBS-WORKERS
Inspect `worker.iterations.failed`, polling-worker health, background-job lease/dead-letter state and outbox progress. Certificate, student-workspace, owner-domain and durable background schedulers share the same worker span/metric model.

## OBS-IMPORTS / OBS-FINANCE / OBS-NOTIFICATIONS
Use the corresponding readiness indicator plus HTTP/worker traces. Import and finance scheduled operations flow through durable background jobs; interactive control-plane requests flow through HTTP server spans. Do not expose provider secrets or raw sensitive payloads in telemetry attributes.
