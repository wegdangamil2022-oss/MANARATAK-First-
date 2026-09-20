# Finance Provider Runtime Contract

MNT-AUD-0018 source authority uses the provider-neutral signed HTTPS transport in `ProviderNeutralFinanceGateways.ts` for payments, FX and bank transfers. Production/staging require an HTTPS base URL, API key, HMAC signing secret and explicit provider keys. Requests use bounded timeout/retry and stable idempotency keys; provider payloads are strictly validated and telemetry is redacted.

Inbound provider webhooks must use `FinanceProviderWebhookVerifier` with a durable Redis replay store. Signature verification binds timestamp, nonce and SHA-256 of the exact raw body and rejects stale timestamps or replayed nonces.

The finance reconciliation background job is the recovery path for ambiguous payment and bank-transfer outcomes. It must remain enabled under the global durable worker runtime.

## Closure evidence

Source contract and negative tests may establish `SOURCE_VERIFIED`. Real authorize/capture/refund, FX, bank transfer, webhook replay, timeout/retry and reconciliation tests against an approved sandbox are still required for runtime closure.

Until those provider tests execute, MNT-AUD-0018 is `SOURCE_VERIFIED / PROVIDER_RUNTIME_PENDING`.
