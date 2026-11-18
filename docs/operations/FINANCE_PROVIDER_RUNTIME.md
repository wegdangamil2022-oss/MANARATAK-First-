# Finance Provider Runtime Contract

MNT-AUD-0018 source authority uses the provider-neutral signed HTTPS transport in `ProviderNeutralFinanceGateways.ts` for payments, FX and bank transfers. Production/staging require an HTTPS base URL, API key, HMAC signing secret and explicit provider keys. Requests use bounded timeout/retry and stable idempotency keys; provider payloads are strictly validated and telemetry is redacted.

Inbound provider webhooks must use `FinanceProviderWebhookVerifier` with a durable Redis replay store. The HMAC-SHA-256 input is the UTF-8 encoding of `providerKey + "\n" + timestamp + "\n" + nonce + "\n" + lowercaseHex(SHA-256(exactRawBody))`. The provider key must be the identity selected by trusted routing/configuration. Verification binds that identity, timestamp, nonce and exact raw body, and rejects stale timestamps or replayed nonces. The signature is lowercase or uppercase hexadecimal.

This contract requires the provider identity in the signature; the former format without `providerKey` is rejected rather than accepted as a fallback. Update any prospective webhook sender to the new format before enabling the integration. No finance webhook ingress is currently mounted, and real provider interoperability remains subject to the sandbox tests below.

The finance reconciliation background job is the recovery path for ambiguous payment and bank-transfer outcomes. It must remain enabled under the global durable worker runtime.

## Closure evidence

Source contract and negative tests may establish `SOURCE_VERIFIED`. Real authorize/capture/refund, FX, bank transfer, webhook replay, timeout/retry and reconciliation tests against an approved sandbox are still required for runtime closure.

Until those provider tests execute, MNT-AUD-0018 is `SOURCE_VERIFIED / PROVIDER_RUNTIME_PENDING`.
