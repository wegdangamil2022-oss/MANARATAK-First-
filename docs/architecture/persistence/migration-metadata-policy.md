# Historical migration metadata policy — M10-06

This policy supplements ADR-028. It does not establish whether any migration is
applied in a live database. Database application status remains RUNTIME_UNTESTED.

## Historical SQL is immutable

Do not add comments, reformat SQL, change line endings, edit statements, or repair
an applied migration in place. Prisma stores an applied SQL checksum; changing
that SQL merely to satisfy source metadata checks creates migration drift.

The existing 47-entry historical baseline remains unchanged. Three already
versioned M7 reconciliation migrations have individually named sidecar metadata
in `persistence-ownership.manifest.json`:

- `20260907030000_m7_batch_a2_structural_reconciliation`
- `20260907033000_m7_batch_b_index_reconciliation`
- `20260907040000_m7_batch_c_fk_reconciliation`

Each entry records SHA-256 over the exact committed SQL bytes, owner, permitted
scope, ADR-028 decision, reason, and review reference. The source verifier rejects
missing files, invalid names, unknown owners, incomplete metadata, and a changed
SQL hash. This recognizes historical metadata externally; it is not a statement
that the live database has applied these migrations.

## New migrations

Any migration outside the existing historical baseline and explicit sidecars must
contain the three inline ADR-028 ownership markers. The permitted scope is exactly
`owner_only` or `cross_context_approved`. Do not extend the historical baseline or
add a wildcard/date exemption to bypass this gate. New sidecars require individual
historical justification and review; their fingerprints must not be refreshed
after an unauthorized SQL edit.

Run the source-only gate from the repository root:

```powershell
node scripts/architecture/verify-persistence-boundaries.mjs
node --test tests/architecture/migration-metadata-policy.test.mjs
```

If a live reconciliation later requires structural repairs, use a newly reviewed
forward migration under the appropriate authorized work package. No migration,
seed, import, database query, or deployment is part of M10-A.
