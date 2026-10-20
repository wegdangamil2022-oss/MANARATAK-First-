import fs from 'node:fs';
import path from 'node:path';
import { verifySignedEvidence, hash, DIGEST } from '../release/lib/ReleaseContracts.mjs';
// A separate local-only trust contract. It never supplies invented production deny identities.
export function localRecoveryTarget(
  target,
  assertion,
  publicKey,
  sha,
  creationAssertion,
  creationPublicKey,
  now = Date.now(),
) {
  const proof = verifySignedEvidence(assertion, publicKey, sha, now, 1),
    created = verifySignedEvidence(creationAssertion, creationPublicKey, sha, now, 1);
  const producer = new URL('../database/create-post28-native-lab.mjs', import.meta.url);
  if (
    proof.kind !== 'MANARATAK_LOCAL_SYNTHETIC_RESTORE_AUTHORIZATION' ||
    proof.scope !== 'LOCAL_SYNTHETIC_LOOPBACK' ||
    proof.environment !== 'DISPOSABLE' ||
    created.kind !== 'MANARATAK_NATIVE_LOCAL_CREATION_ATTESTATION' ||
    created.host !== '127.0.0.1' ||
    target.host !== '127.0.0.1' ||
    target.port !== String(created.port) ||
    target.role !== 'manaratak_restore_runner' ||
    !/^manaratak_restore_[0-9a-f]{32}$/.test(target.database) ||
    target.database !== created.targetDatabase ||
    target.fingerprint !== created.targetFingerprint ||
    target.fingerprint !== proof.targetFingerprint ||
    proof.sourceDatabaseFingerprint !== created.sourceDatabaseFingerprint ||
    !DIGEST.test(created.sourceDatabaseFingerprint ?? '') ||
    proof.sourceDatabaseFingerprint === target.fingerprint ||
    created.sourceDatabase === target.database ||
    created.sourceDatabase !== 'manaratak_post28_transactions_test' ||
    !/^[0-9]{1,24}$/.test(created.serverIdentity ?? '') ||
    proof.targetServerIdentity !== created.serverIdentity ||
    !/^[0-9a-f-]{36}$/.test(created.runId ?? '') ||
    proof.disposableInstanceId !== created.runId ||
    proof.creationAttestationSha256 !== hash(creationAssertion.payload) ||
    created.producerSha256 !== hash(fs.readFileSync(producer)) ||
    !DIGEST.test(created.tlsRootCertificateSha256 ?? '') ||
    proof.tlsRootCertificateSha256 !== created.tlsRootCertificateSha256 ||
    !Array.isArray(proof.approvals) ||
    proof.approvals.length !== 2 ||
    new Set(proof.approvals.map((a) => a.reviewerId)).size !== 2 ||
    !proof.approvals.some((a) => a.role === 'OWNER_DELEGATE') ||
    !proof.approvals.some((a) => a.role === 'INDEPENDENT_TECHNICAL_REVIEWER') ||
    proof.approvals.some(
      (a) =>
        typeof a.reviewerId !== 'string' ||
        !a.reviewerId.trim() ||
        !DIGEST.test(a.evidenceSha256 ?? '') ||
        a.decision !== 'APPROVE_LOCAL_SYNTHETIC_RESTORE',
    ) ||
    !Array.isArray(proof.allowedHosts) ||
    proof.allowedHosts.length !== 1 ||
    proof.allowedHosts[0] !== '127.0.0.1'
  )
    throw Error('RECOVERY_LOCAL_TARGET_NOT_AUTHORIZED');
  const stateFile = created.labStateFile;
  if (
    typeof stateFile !== 'string' ||
    !path.isAbsolute(stateFile) ||
    fs.lstatSync(stateFile).isSymbolicLink() ||
    hash(fs.readFileSync(stateFile)) !== created.labStateSha256
  )
    throw Error('RECOVERY_LOCAL_CREATION_IDENTITY_INVALID');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  if (
    state.kind !== 'POST28_NATIVE_LOCAL_LAB' ||
    state.scope !== 'DISPOSABLE' ||
    state.status !== 'EMPTY_TARGETS_VERIFIED' ||
    state.postgresMajor !== 16 ||
    state.sourceSha !== sha ||
    state.runId !== created.runId ||
    state.serverIdentity !== created.serverIdentity ||
    String(state.port) !== target.port ||
    hash(fs.realpathSync(state.dataDirectory)) !== created.dataDirectoryIdentitySha256 ||
    state.postgresBinarySha256 !== created.postgresBinarySha256 ||
    hash(fs.readFileSync(path.join(state.pgBin, 'postgres.exe'))) !== created.postgresBinarySha256
  )
    throw Error('RECOVERY_LOCAL_CREATION_IDENTITY_INVALID');
  return { target, proof, scope: 'LOCAL_SYNTHETIC_LOOPBACK', productionAcceptance: false };
}
