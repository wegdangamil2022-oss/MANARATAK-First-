import { verifySignedEvidence } from '../release/lib/ReleaseContracts.mjs';
export function backupEvidence(postgresEnvelope, assetEnvelope, publicKey, sha, now = Date.now()) {
  const pg = verifySignedEvidence(postgresEnvelope, publicKey, sha, now),
    assets = verifySignedEvidence(assetEnvelope, publicKey, sha, now);
  const failures = [];
  if (
    pg.kind !== 'POSTGRES_BACKUP_READINESS' ||
    assets.kind !== 'ASSET_BACKUP_READINESS' ||
    !pg.snapshotId ||
    pg.snapshotId !== assets.snapshotId
  )
    failures.push('BACKUP_SNAPSHOT_IDENTITY');
  if (
    pg.pitrEnabled !== true ||
    !Number.isFinite(pg.pitrWindowDays) ||
    pg.pitrWindowDays < 30 ||
    pg.encrypted !== true ||
    pg.immutableCopy !== true ||
    pg.accessAudited !== true
  )
    failures.push('POSTGRES_BACKUP_CONTROLS');
  if (
    assets.versioningEnabled !== true ||
    assets.crossRegionCopy !== true ||
    assets.encrypted !== true ||
    assets.immutableCopy !== true ||
    assets.accessAudited !== true
  )
    failures.push('ASSET_BACKUP_CONTROLS');
  const age = now - Date.parse(pg.latestRecoverableAt);
  if (!Number.isFinite(age) || age < 0 || age > 5 * 60000 || assets.hashParityVerified !== true)
    failures.push('BACKUP_CURRENCY_OR_ASSET_PARITY');
  return { sha, status: failures.length ? 'FAIL' : 'PASS', failures, snapshotId: pg.snapshotId };
}
