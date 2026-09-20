# Import Raw Snapshot Provider Runtime Contract — W3 / MNT-AUD-0012

## Source authority
Production/staging raw import provenance uses `HttpImportRawSnapshotStore` over the same signed provider boundary as the Enterprise Asset Platform. `LocalImportRawSnapshotStore` is development-only and the in-memory implementation is test-only.

The application computes two distinct immutable identifiers:
- `contentHash`: SHA-256 of the exact acquired bytes.
- `artifactId`: SHA-256-derived identity over content hash plus acquisition provenance (source, connector/version, fetch time, requested/final URL). Identical bytes acquired under different provenance therefore do not silently overwrite or inherit another acquisition's metadata.

## Provider contract
The configured provider must implement:
- `PUT /v1/import-raw-snapshots/{artifactId}` — create-or-return the immutable snapshot. Reusing an artifact id with different bytes/metadata is a contract violation.
- `POST /v1/import-raw-snapshots/lookup` — return `{ snapshot: null }` or immutable metadata.
- `POST /v1/import-raw-snapshots/read` — return the exact bytes as canonical Base64 plus their SHA-256 content hash.

Every request is protected by the HMAC request protocol documented in `ASSET_PROVIDER_RUNTIME.md`; write requests carry a stable idempotency key. Provider references must be durable/opaque and may not be `file:` or `memory:` locations.

## Retention
`MANARATAK_IMPORT_RAW_RETENTION_DAYS` is mandatory in production/staging. The adapter sends an explicit `IMPORT_RAW_PROVENANCE` retention class and absolute expiry derived from the acquisition timestamp. The provider must keep bytes immutable until governed expiry, purge content according to the retention policy, and preserve the provider-side evidence/tombstone required for forensic traceability.

## Runtime closure evidence
Source implementation and provider-contract tests do not prove a deployed provider. Before production closure, execute against an authorized sandbox and record:
1. write/read byte equality and SHA-256 equality;
2. idempotent replay of one acquisition;
3. same bytes under distinct provenance remain distinct snapshot identities;
4. overwrite attempt under an existing artifact id is rejected;
5. retention expiry/tombstone behavior;
6. timeout, auth/signature failure, oversized response and unavailable-provider behavior.

Until that evidence exists, status is `SOURCE_VERIFIED / PROVIDER_RUNTIME_PENDING`.
