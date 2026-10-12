import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
export const REPOSITORY = 'wegdangamil2022-oss/MANARATAK-First-';
export const SHA = /^[0-9a-f]{40}$/;
export const DIGEST = /^[0-9a-f]{64}$/;
export const READINESS_PATH = '/api/v1/monitoring/health/readiness';
export const GATES = [
  'source-ci',
  'database-parity',
  'built-browser',
  'cross-module-canary',
  'artifact-boot',
  'worker-effects',
  'security',
  'backup-restore',
  'load-slo',
  'rollback',
  'locale-indexing',
  'business-discovery',
];
export const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
export function requireSha(value) {
  if (!SHA.test(value ?? '')) throw new Error('RELEASE_SOURCE_SHA_INVALID');
  return value;
}
export function required(name, env = process.env) {
  if (!env[name]?.trim()) throw new Error(`${name}_REQUIRED`);
  return env[name].trim();
}
export function safeArtifactFile(directory, file) {
  if (typeof file !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/.test(file))
    throw new Error('RELEASE_ARTIFACT_PATH_INVALID');
  const root = fs.realpathSync(directory),
    candidate = path.join(root, file);
  if (
    fs.lstatSync(candidate).isSymbolicLink() ||
    !fs.statSync(candidate).isFile() ||
    path.dirname(fs.realpathSync(candidate)) !== root
  )
    throw new Error('RELEASE_ARTIFACT_PATH_INVALID');
  return candidate;
}
export function verifyReleaseManifest(directory, expectedSha, expectedRepository = REPOSITORY) {
  requireSha(expectedSha);
  const manifest = JSON.parse(
    fs.readFileSync(safeArtifactFile(directory, 'release-manifest.json'), 'utf8'),
  );
  if (
    manifest.version !== 2 ||
    manifest.kind !== 'MANARATAK_IMMUTABLE_RELEASE' ||
    manifest.sourceSha !== expectedSha ||
    manifest.provenance?.repository !== expectedRepository
  )
    throw new Error('RELEASE_SOURCE_IDENTITY_MISMATCH');
  if (
    !Array.isArray(manifest.artifacts) ||
    manifest.artifacts.length !== 3 ||
    new Set(manifest.artifacts.map((a) => a.unit)).size !== 3 ||
    manifest.artifacts.some((a) => !['api', 'web', 'admin'].includes(a.unit))
  )
    throw new Error('RELEASE_UNITS_INCOMPLETE');
  for (const artifact of [...manifest.artifacts, manifest.sbom]) {
    if (
      !artifact ||
      !DIGEST.test(artifact.sha256 ?? '') ||
      hash(fs.readFileSync(safeArtifactFile(directory, artifact.file))) !== artifact.sha256
    )
      throw new Error('RELEASE_ARTIFACT_DIGEST_MISMATCH');
    if (
      artifact.size !== undefined &&
      (!Number.isSafeInteger(artifact.size) ||
        artifact.size <= 0 ||
        fs.statSync(safeArtifactFile(directory, artifact.file)).size !== artifact.size)
    )
      throw new Error('RELEASE_ARTIFACT_SIZE_MISMATCH');
  }
  const runtime = manifest.runtimeRequirements;
  if (
    !DIGEST.test(runtime?.lockSha256 ?? '') ||
    !DIGEST.test(runtime.prismaSchemaSha256 ?? '') ||
    runtime.nodeMajor !== 22 ||
    runtime.generatedPrismaClientRequired !== true ||
    !Array.isArray(runtime.externalModules) ||
    !runtime.externalModules.includes('@prisma/client')
  )
    throw new Error('RELEASE_RUNTIME_REQUIREMENTS_INVALID');
  return manifest;
}
/** Trusted verification key comes from the environment/authority, never from the submitted envelope. */
export function verifySignedEvidence(
  envelope,
  publicKey,
  expectedSha,
  now = Date.now(),
  maximumAgeHours = 24,
) {
  requireSha(expectedSha);
  if (
    !publicKey ||
    envelope?.version !== 1 ||
    envelope.algorithm !== 'Ed25519' ||
    typeof envelope.payload !== 'string' ||
    Buffer.byteLength(envelope.payload) > 2_000_000 ||
    typeof envelope.signature !== 'string'
  )
    throw new Error('RELEASE_EVIDENCE_SIGNATURE_REQUIRED');
  const key = crypto.createPublicKey(publicKey);
  if (
    key.asymmetricKeyType !== 'ed25519' ||
    !/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature) ||
    !crypto.verify(
      null,
      Buffer.from(envelope.payload),
      key,
      Buffer.from(envelope.signature, 'base64'),
    )
  )
    throw new Error('RELEASE_EVIDENCE_SIGNATURE_INVALID');
  const proof = JSON.parse(envelope.payload),
    checkedAt = Date.parse(proof.checkedAt),
    expiresAt = Date.parse(proof.expiresAt);
  if (
    proof.sha !== expectedSha ||
    proof.repository !== REPOSITORY ||
    !Number.isFinite(checkedAt) ||
    !Number.isFinite(expiresAt) ||
    checkedAt > now + 30_000 ||
    checkedAt < now - maximumAgeHours * 3600_000 ||
    expiresAt <= now ||
    expiresAt < checkedAt
  )
    throw new Error('RELEASE_EVIDENCE_IDENTITY_OR_AGE_INVALID');
  return proof;
}
export function releaseVerdict(
  evidence,
  expectedSha,
  now = Date.now(),
  inventory = JSON.parse(
    fs.readFileSync(
      new URL('../../../config/release/section-task-inventory.json', import.meta.url),
      'utf8',
    ),
  ),
) {
  requireSha(expectedSha);
  const failures =
      inventory.coverageApproved === true ? [] : ['TASK_INVENTORY_OWNER_CURATING_PENDING'],
    gates = GATES.map((id) => {
      const matches = evidence.gates?.filter((row) => row.id === id) ?? [],
        row = matches[0];
      const age = now - Date.parse(row?.checkedAt);
      const valid =
        matches.length === 1 &&
        row.sha === expectedSha &&
        row.outcome === 'PASS' &&
        row.executed === true &&
        row.environment &&
        row.owner &&
        row.fixture &&
        row.suite &&
        /^https:\/\//.test(row.artifact ?? '') &&
        row.reviewer &&
        Number.isFinite(age) &&
        age >= -30_000 &&
        age <= (id === 'backup-restore' ? 168 : 24) * 3600_000;
      if (!valid) failures.push(id);
      return {
        id,
        status: valid
          ? 'VERIFIED'
          : !row
            ? 'MISSING'
            : row.executed !== true
              ? 'NOT_EXECUTED'
              : ['FAIL', 'SKIPPED'].includes(row.outcome)
                ? row.outcome
                : 'UNVERIFIED',
        executed: row?.executed === true,
      };
    });
  const blockers = evidence.sectionBlockers;
  if (
    !Array.isArray(blockers) ||
    blockers.length !== 27 ||
    new Set(blockers.map((row) => row.section)).size !== 27 ||
    blockers.some(
      (row) =>
        !Number.isInteger(row.section) ||
        row.section < 1 ||
        row.section > 27 ||
        row.sha !== expectedSha ||
        row.sourceDisposition !== 'CLOSED' ||
        !row.reviewedBy ||
        !Array.isArray(row.taskIds) ||
        !row.taskIds.length ||
        !row.regressionArtifact,
    )
  )
    failures.push('PRIOR_SECTION_BLOCKERS');
  for (const section of inventory.sections) {
    const row = blockers?.find((row) => row.section === section.section);
    if (
      !section.taskIds.length ||
      section.taskIds.some(
        (id) =>
          !row?.tasks?.some(
            (task) =>
              task.id === id &&
              task.status === 'SOURCE_CLOSED' &&
              task.reviewedBy &&
              task.regression?.sha === expectedSha &&
              task.regression?.outcome === 'PASS' &&
              task.regression?.executed === true &&
              task.regression?.suite &&
              /^https:\/\//.test(task.regression?.artifact ?? ''),
          ),
      )
    )
      failures.push(`SECTION_${section.section}_TASK_REVIEW_INCOMPLETE`);
  }
  if (
    !Array.isArray(evidence.authority?.approvedEnvironments) ||
    !Array.isArray(evidence.authority?.approvers) ||
    evidence.authority?.repository !== REPOSITORY ||
    !evidence.authority?.approvedEnvironments?.includes('production') ||
    new Set(evidence.authority?.approvers ?? []).size < 2 ||
    evidence.authority?.approvers?.some(
      (id) => typeof id !== 'string' || !id.trim() || id.length > 120,
    )
  )
    failures.push('RELEASE_AUTHORITY');
  const source = gates.find((row) => row.id === 'source-ci')?.status === 'VERIFIED';
  return {
    version: 1,
    sha: expectedSha,
    sourceStatus: source ? 'SOURCE_VERIFIED' : 'SOURCE_UNVERIFIED',
    runtimeStatus: gates
      .filter((row) => row.id !== 'source-ci')
      .every((row) => row.status === 'VERIFIED')
      ? 'RUNTIME_VERIFIED'
      : 'RUNTIME_UNVERIFIED',
    decision: failures.length ? 'BLOCKED' : 'GO',
    gates,
    failures,
  };
}
export function promotionState(result, manifest, environment) {
  if (
    !result ||
    result.environment !== environment ||
    result.sourceSha !== manifest.sourceSha ||
    !/^[A-Za-z0-9_-]{1,160}$/.test(result.deploymentId ?? '')
  )
    throw new Error('PROMOTION_RECONCILIATION_IDENTITY_INVALID');
  if (['FAILED', 'PARTIAL', 'CANCELLED'].includes(result.state))
    throw new Error('PROMOTION_RECONCILIATION_FAILED');
  if (!['ACCEPTED', 'PENDING', 'APPLYING', 'HEALTHY'].includes(result.state))
    throw new Error('PROMOTION_RECONCILIATION_STATE_INVALID');
  if (result.state !== 'HEALTHY') return 'PENDING';
  if (
    !Array.isArray(result.units) ||
    result.units.length !== 3 ||
    new Set(result.units.map((unit) => unit.unit)).size !== 3
  )
    throw new Error('PROMOTION_RECONCILIATION_UNITS_INVALID');
  for (const artifact of manifest.artifacts) {
    const unit = result.units.find((unit) => unit.unit === artifact.unit);
    if (
      !unit ||
      unit.state !== 'HEALTHY' ||
      unit.artifactSha256 !== artifact.sha256 ||
      unit.sourceSha !== manifest.sourceSha ||
      !unit.runtimeImageDigest?.match(/^sha256:[0-9a-f]{64}$/) ||
      !unit.endpoint?.startsWith('https://')
    )
      throw new Error('PROMOTION_RECONCILIATION_DIGEST_OR_HEALTH_INVALID');
  }
  return 'HEALTHY';
}
