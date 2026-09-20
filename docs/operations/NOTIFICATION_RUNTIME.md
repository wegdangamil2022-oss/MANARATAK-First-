# MANARATAK Notification Runtime

**Authority:** MNT-AUD-0034 / ADR-029  
**Source state:** SOURCE_VERIFIED / DB_PROVIDER_RUNTIME_PENDING

## Source contract

P05 Notifications owns typed notification templates, intents and delivery receipts. Prisma persistence is durable; student notification preferences are consumed through the P15-owned preference projection rather than duplicated. Approved owner-domain outbox events are transformed into notification intents by `NotificationOutboxDeliveryGateway` with the source outbox identity as the idempotency boundary.

Delivery re-checks P15 notification preferences per channel at claim time; partially opted-out templates send only through allowed channels and fully opted-out intents are durably finalized as `SUPPRESSED`. A durable per-recipient hourly cap (`NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR`) prevents outbound flood/abuse before provider invocation. Delivery is provider-neutral and executed by `notification.delivery.sweep` through the durable PostgreSQL background-job worker. Candidates are leased, delivered with a stable idempotency key, finalized with lease-aware compare-and-set, retried with bounded backoff, and moved to dead-letter state when attempts are exhausted. A stale lease holder cannot overwrite a reclaimed intent.

## Required production/staging configuration

- `BACKGROUND_WORKER_ENABLED=true`
- `BACKGROUND_NOTIFICATION_CRON=<5-field UTC cron>`
- `NOTIFICATION_PROVIDER_BASE_URL=https://...`
- `NOTIFICATION_PROVIDER_API_KEY=<secret>`
- `NOTIFICATION_PROVIDER_SIGNING_SECRET=<secret>`
- `NOTIFICATION_PROVIDER_TIMEOUT_MS=<bounded timeout>`
- `NOTIFICATION_PROVIDER_ALLOW_INSECURE_HTTP=false`
- `NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR=<bounded positive integer>`

Production/staging configuration fails closed when the notification provider or cadence is absent, and HTTP provider origins are rejected. Health/Readiness reports persistence, template/preference capability, provider capability, background-worker enablement and cadence.

## Operations plane

P23 exposes `/notifications` as the Notification Operations workspace. The governed API provides template/intents visibility and explicit retry for failed/dead-letter intents. It is mounted behind the control-plane guard, immutable mutation audit and `admin:platform:manage` authorization; provider secrets and raw PII are not surfaced.

## Runtime evidence still pending

Run only in an approved target/disposable environment: apply the notification migration, verify concurrent claim/reclaim and stale-owner rejection, send test deliveries through the configured provider, prove provider idempotency under retry, and confirm health transitions. Until those steps execute, record `DB_PROVIDER_RUNTIME_PENDING`; do not infer runtime closure from source tests.
