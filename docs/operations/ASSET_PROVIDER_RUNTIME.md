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
- `POST v1/assets/verify-upload` (server-owned observed bytes; never client-supplied proof)
- `POST v1/assets/delivery-grants`
- `POST v1/assets/move-to-clean` (conditional source digest; `expectedSha256` request and matching `verifiedSourceSha256` acknowledgment)
- `POST v1/assets/read`
- `POST v1/assets/archive`
- `POST v1/assets/restore`
- `DELETE v1/assets`
- `POST v1/assets/malware-scan`
- `POST v1/assets/sanitize`

Upload grants must target `QUARANTINE`. Delivery grants are accepted only for `ACTIVE` assets whose canonical locator is in `CLEAN`. Grant URLs must be HTTPS and short-lived. Credential-bearing response headers such as `Authorization`/cookies are rejected by the API boundary.

## Finalization and atomic promotion requirements

1. Quarantine upload grants do **not** imply the binary was uploaded. API `POST /admin/assets/:assetId/finalize-upload` calls provider `verify-upload` to confirm the actual file size, MIME/signature and SHA-256 before persisting evidence.
2. Validation and malware scanning reject non-finalized objects. Before scan, the provider re-verifies bytes against persisted SHA-256; sanitization output is verified and rescanned independently.
3. Promotion from QUARANTINE to CLEAN sends `expectedSha256`. The provider must compare the immutable source object version/digest **atomically** with promotion and return `verifiedSourceSha256`. An echo without atomic enforcement is insufficient.
4. On source-CAS rejection, the provider must not publish content. Provider-side immutable version or ETag fencing and post-move reconciliation remain **external runtime acceptance obligations**; HTTP adapter checks alone do not prove them.
5. Provider `archive`, `restore` and `delete` must be idempotent for retries. Archive domain state is committed before provider operation; failed provider archives must remain retryable and non-deliverable.

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

## Restore integrity and compensation (source contract)

- Before a DELETED asset becomes ACTIVE, the server calls provider `restore` and then **POST `v1/assets/verify-clean`**, requiring provider-observed digest, byte count, MIME and timestamp. The provider must independently rehash actual restored CLEAN bytes, not merely echo caller evidence. The source adapter rejects missing/contradictory proof.
- The DB remains DELETED during provider restoration and verification. On verification or DB CAS failure, the application attempts `archive` compensation; if that fails, `ASSET_RESTORE_COMPENSATION_FAILED` is surfaced and requires manual reconciliation.
- This compensation is **best effort**, not a cross-provider atomic transaction. Race-safe purge-vs-restore locking, immutable object versions and independent provider sandbox integration remain P0 acceptance dependencies.
