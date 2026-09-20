# Database Migration Recovery Policy

Status: ACTIVE SOURCE AUTHORITY — MNT-AUD-0079

Every checked-in Prisma migration must be listed in `scripts/database/migration-recovery.manifest.json` and classified as exactly one of:

- `ROLLBACK_SQL`: a reviewed sibling `rollback.sql` exists and its hash is reported by the rollback-plan gate.
- `BACKUP_RESTORE_REQUIRED`: reverse SQL is not considered safe; shared/staging/production migration execution requires externally captured backup/restore evidence before mutation. For a brand-new disposable/greenfield database the recovery action is destroy-and-reprovision from the immutable migration chain.
- `FORWARD_FIX_ONLY`: only allowed when a migration-specific compatibility/recovery artifact is referenced and reviewed. This class is not currently used by the baseline manifest.

`npm run db:remediation:rollback-plan` validates every migration against the manifest and fails closed on missing classification/artifact. `npm run db:remediation:deploy` validates the same source plan before mutation. For staging/production `migrate` operations it also requires `DATABASE_RECOVERY_EVIDENCE_FILE` to reference a pre-existing, operator-supplied backup/restore evidence artifact; that file is hashed into the deployment preflight output.

After migration deployment the governed path runs Prisma migration status and target-schema parity against the canonical schema. Runtime backup restoration rehearsal remains a W6/DR acceptance requirement and is not claimed by this source policy.
