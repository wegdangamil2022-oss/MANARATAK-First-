import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { verifySignedEvidence, DIGEST, hash } from '../release/lib/ReleaseContracts.mjs';
export function databaseIdentity(databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash)
    throw new Error('RECOVERY_TARGET_URL_INVALID');
  const database = decodeURIComponent(url.pathname.slice(1)),
    role = decodeURIComponent(url.username);
  return {
    fingerprint: hash(
      JSON.stringify({
        host: url.hostname.toLowerCase(),
        port: url.port || '5432',
        database,
        role,
      }),
    ),
    host: url.hostname.toLowerCase(),
    port: url.port || '5432',
    database,
    role,
    password: decodeURIComponent(url.password),
  };
}
export function recoveryTarget(databaseUrl, assertion, publicKey, sha, now = Date.now()) {
  const target = databaseIdentity(databaseUrl),
    proof = verifySignedEvidence(assertion, publicKey, sha, now, 1);
  if (
    proof.kind !== 'ABSHEER_DISPOSABLE_RESTORE_AUTHORIZATION' ||
    proof.targetFingerprint !== target.fingerprint ||
    proof.sourceDatabaseFingerprint === target.fingerprint ||
    !DIGEST.test(proof.sourceDatabaseFingerprint ?? '') ||
    proof.targetFingerprint === proof.productionDatabaseFingerprint ||
    !DIGEST.test(proof.productionDatabaseFingerprint ?? '') ||
    !Array.isArray(proof.productionHosts) || !proof.productionHosts.length || proof.productionHosts.includes(target.host) ||
    !/^[0-9]{1,24}$/.test(proof.targetServerIdentity ?? '') || proof.targetServerIdentity === proof.productionServerIdentity || !/^[0-9]{1,24}$/.test(proof.productionServerIdentity ?? '') ||
    proof.environment !== 'DISPOSABLE' ||
    new Set(proof.approvers ?? []).size < 2 ||
    proof.approvers?.some((id) => typeof id !== 'string' || !id.trim() || id.length > 120) ||
    !proof.disposableInstanceId?.match(/^[0-9a-f-]{36}$/) ||
    target.role !== 'absheer_restore_runner' ||
    !/^absheer_restore_[0-9a-f]{32}$/.test(target.database) ||
    !Array.isArray(proof.allowedHosts) || !Array.isArray(proof.approvers) ||
    !proof.allowedHosts?.includes(target.host)
  )
    throw new Error('RECOVERY_TARGET_NOT_AUTHORIZED_DISPOSABLE');
  return { target, proof };
}
async function fileHash(file) {
  const digest = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}
function containedAsset(root, relative) {
  if (
    typeof relative !== 'string' ||
    relative.length > 1024 ||
    relative.includes('\\') ||
    relative.includes('\0') ||
    path.isAbsolute(relative) ||
    relative.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('RECOVERY_ASSET_PATH_INVALID');
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('RECOVERY_ASSET_SYMLINK_FORBIDDEN');
  }
  const real = fs.realpathSync(current);
  if (!real.startsWith(root + path.sep) || !fs.statSync(real).isFile())
    throw new Error('RECOVERY_ASSET_PATH_INVALID');
  return real;
}
export async function recoveryInputs({ databaseBackup, assetDirectory, assetManifest, proof }) {
  if (
    fs.lstatSync(databaseBackup).isSymbolicLink() ||
    !fs.statSync(databaseBackup).isFile() ||
    !DIGEST.test(proof.databaseBackupSha256 ?? '') ||
    (await fileHash(databaseBackup)) !== proof.databaseBackupSha256
  )
    throw new Error('RECOVERY_DATABASE_BACKUP_HASH_INVALID');
  if (
    fs.lstatSync(assetManifest).isSymbolicLink() ||
    hash(fs.readFileSync(assetManifest)) !== proof.assetManifestSha256
  )
    throw new Error('RECOVERY_ASSET_MANIFEST_HASH_INVALID');
  const manifest = JSON.parse(fs.readFileSync(assetManifest, 'utf8'));
  if (
    manifest.version !== 1 ||
    manifest.snapshotId !== proof.snapshotId ||
    !/^snapshot_[0-9a-f]{32}$/.test(manifest.snapshotId ?? '') ||
    !Number.isFinite(Date.parse(proof.backupCapturedAt)) ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== proof.assetCount ||
    manifest.files.length > 100000 ||
    new Set(manifest.files.map((file) => file.path)).size !== manifest.files.length
  )
    throw new Error('RECOVERY_SNAPSHOT_MANIFEST_INVALID');
  const root = fs.realpathSync(assetDirectory);
  if (!fs.statSync(root).isDirectory()) throw new Error('RECOVERY_ASSET_ROOT_INVALID');
  for (const asset of manifest.files) {
    if (
      !DIGEST.test(asset.sha256 ?? '') ||
      (await fileHash(containedAsset(root, asset.path))) !== asset.sha256
    )
      throw new Error('RECOVERY_ASSET_HASH_INVALID');
  }
  return { assetCount: manifest.files.length, snapshotId: manifest.snapshotId };
}
export function databaseSentinel(result, target, proof) {
  if (
    result.serverIdentity !== proof.targetServerIdentity ||
    result.database !== target.database ||
    result.role !== target.role ||
    result.superuser !== false ||
    result.createRole !== false ||
    result.createDatabase !== false ||
    result.targetFingerprint !== target.fingerprint ||
    result.disposableInstanceId !== proof.disposableInstanceId ||
    result.sentinelOwnedByRestoreRole !== false ||
    result.sentinelWritableByRestoreRole !== false
  )
    throw new Error('RECOVERY_DATABASE_SENTINEL_INVALID');
}
export function restoreObjectives(
  { startedAt, completedAt, backupCapturedAt, structuralRestorability },
  policy,
) {
  const rtoMinutes = (completedAt - startedAt) / 60000,
    rpoMinutes = (startedAt - Date.parse(backupCapturedAt)) / 60000;
  const sloPassed =
    Number.isFinite(rtoMinutes) &&
    Number.isFinite(rpoMinutes) &&
    rtoMinutes >= 0 &&
    rpoMinutes >= 0 &&
    rtoMinutes <= policy.regionalLossRtoMinutes &&
    rpoMinutes <= policy.regionalLossRpoMinutes;
  return {
    status: structuralRestorability && sloPassed ? 'PASS' : 'FAIL',
    structuralRestorability,
    sloPassed,
    rtoMinutes,
    rpoMinutes,
    objectives: policy,
  };
}
