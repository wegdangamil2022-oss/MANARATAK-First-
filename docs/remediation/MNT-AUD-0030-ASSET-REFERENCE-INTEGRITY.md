# MNT-AUD-0030 — Asset Reference Integrity Remediation Evidence

- Status: `SOURCE_VERIFIED / DB_INTEGRATION_PENDING`
- Wave: W2
- Authority: `docs/architecture/persistence/asset-reference-ownership.manifest.json`

Implemented:
- Canonical `AssetReferencePolicy` resolves every authoring reference through P05.
- Default acceptance requires ACTIVE lifecycle and PUBLIC/INTERNAL classification; raw URL/path references fail closed.
- Optional owner/owner-type constraints are part of the policy contract.
- Weak consumers now compose the P05 policy: Student Workspace, CMS, University, International Tests, Reference Country flags, Study Destinations, Student Tools, Services, Career, and Course thumbnail authoring.
- Existing Course curriculum and Certificate paths retain their direct P05 resolution checks.
- Source manifest covers all 25 direct Prisma AssetId fields plus 4 CMS JSON references.

Evidence:
- `node scripts/architecture/verify-asset-reference-integrity.mjs` => PASS (`direct=25 json=4`).
- `node scripts/verify-w2-source.mjs` => PASS including MNT-AUD-0030 checks.

Not claimed:
- No PostgreSQL integration run has been executed in this working environment.
- Runtime/browser/object-storage provider evidence remains pending W6.
