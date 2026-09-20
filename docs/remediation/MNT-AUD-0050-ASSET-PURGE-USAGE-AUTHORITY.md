# MNT-AUD-0050 — Asset Purge Usage Authority Remediation Evidence

- Status: `SOURCE_VERIFIED / DB_INTEGRATION_PENDING`
- Wave: W2

Implemented:
- Replaced production `assetUsageRegistryGateway = UNAVAILABLE` with `PrismaAssetUsageRegistryGateway`.
- Usage is derived from authoritative owner tables instead of a second writable registry.
- Registry covers direct AssetId columns, CMS published attachment JSON, and CMS `seoMetadata.openGraphAssetId` JSON references.
- `registerUsage/unregisterUsage` fail closed because the registry is intentionally derived/read-only.
- Purge obtains concrete usage references when available and rejects physical deletion while any authoritative consumer remains.
- Asset usage coverage is tied to `asset-reference-ownership.manifest.json`; schema drift fails the verifier.

Evidence:
- `node scripts/architecture/verify-asset-reference-integrity.mjs` => PASS.
- `node scripts/verify-w2-source.mjs` => PASS including MNT-AUD-0050 checks.

Not claimed:
- No destructive purge was run against a real database or storage provider.
- In-use/unused purge integration tests require disposable PostgreSQL + storage in W6.
