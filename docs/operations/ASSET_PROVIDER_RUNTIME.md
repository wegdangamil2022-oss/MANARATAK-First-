# Phase 05 Enterprise Asset Provider Runtime Contract

**Finding:** `MNT-AUD-0011`  
**Source status:** production-capable transport implemented; provider sandbox execution remains external-runtime evidence.

## Runtime authority

Production and staging compose the Phase 05 Enterprise Asset Platform through the signed HTTP provider adapters in:

- `packages/infrastructure/src/provider-http/SignedProviderHttpClient.ts`
- `packages/infrastructure/src/asset-platform/HttpAssetSecurityGateways.ts`
- `apps/api/src/infrastructure/di/RuntimeDependencyPolicy.ts`

`LocalAssetStorageGateway` and the Noop scanner/sanitizer remain development-only and cannot satisfy production readiness.

The three mandatory runtime settings are:

- `MANARATAK_ASSET_PROVIDER_BASE_URL`
- `MANARATAK_ASSET_PROVIDER_API_KEY`
- `MANARATAK_ASSET_PROVIDER_SIGNING_SECRET` (minimum 32 bytes)

Configuration is fail-closed. Partial provider configuration is rejected. Production/staging require HTTPS even if the development-only insecure-HTTP flag is supplied.

## Request authentication

Each provider request carries:

- provider key identifier;
- ISO timestamp;
- unique nonce;
- SHA-256 body digest;
- HMAC-SHA256 signature over method, path/query, timestamp, nonce and body digest;
- an idempotency key for lifecycle mutations where applicable.

The provider must reject stale timestamps, replayed nonces, invalid body digests/signatures and unauthorized key identifiers. Signing secrets must remain in secret management and must never be returned to browser clients or logs.

## Required provider endpoints

All paths are relative to the configured base path.

- `POST v1/assets/locators`
- `POST v1/assets/upload-grants`
- `POST v1/assets/delivery-grants`
- `POST v1/assets/move-to-clean`
- `POST v1/assets/read`
- `POST v1/assets/archive`
- `POST v1/assets/restore`
- `DELETE v1/assets`
- `POST v1/assets/malware-scan`
- `POST v1/assets/sanitize`

Upload grants must target `QUARANTINE`. Delivery grants are accepted only for `ACTIVE` assets whose canonical locator is in `CLEAN`. Grant URLs must be HTTPS and short-lived. Credential-bearing response headers such as `Authorization`/cookies are rejected by the API boundary.

## Lifecycle security rules

1. The browser/admin client cannot choose a clean storage bucket/path during activation.
2. Malware scanning runs against the canonical quarantine locator.
3. Sanitization output must remain in `QUARANTINE`; if the sanitizer returns a replacement locator, that locator becomes canonical before activation.
4. Only the storage provider moves the sanitized object to `CLEAN`.
5. Public/admin delivery uses a provider-issued temporary grant; raw physical paths are not a delivery mechanism.
6. Malware/sanitization provider output, not client-supplied metadata, is the lifecycle authority.

## Required runtime evidence before production closure

Source verification is not provider verification. Runtime closure still requires a disposable/sandbox provider environment proving:

- successful upload into quarantine and byte retrieval;
- positive and negative malware samples (including EICAR or provider-approved equivalent);
- metadata sanitization with a replacement quarantine locator;
- activation moves the sanitized object, not the original object, into clean storage;
- temporary delivery grant expiry and rejection after expiry;
- archive/restore/delete idempotency;
- timeout, non-2xx, invalid signature/replay and provider-unavailable behavior;
- redacted logs containing no signing secret, object credentials or presigned query material.

Until those tests are executed against a real configured provider, `MNT-AUD-0011` must remain `SOURCE_VERIFIED / PROVIDER_RUNTIME_PENDING` rather than production-closed.
