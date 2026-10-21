// Offline signature/identity fixtures only. These are never real restore approvals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { localRecoveryTarget } from '../../scripts/recovery/LocalRecoveryTarget.mjs';
import { databaseIdentity, databaseSentinel } from '../../scripts/recovery/RecoveryPreflight.mjs';
import { hash, REPOSITORY } from '../../scripts/release/lib/ReleaseContracts.mjs';
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r10-local-target-test-')),
    sha = 'f'.repeat(40),
    now = Date.now(),
    { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const sign = (data) => {
    const payload = JSON.stringify({
      repository: REPOSITORY,
      sha,
      checkedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 60000).toISOString(),
      ...data,
    });
    return {
      version: 1,
      algorithm: 'Ed25519',
      payload,
      signature: crypto.sign(null, Buffer.from(payload), privateKey).toString('base64'),
    };
  };
  fs.writeFileSync(path.join(dir, 'postgres.exe'), 'INERT_BINARY_IDENTITY_FIXTURE_NOT_EXECUTABLE');
  const binaryHash = hash(fs.readFileSync(path.join(dir, 'postgres.exe'))),
    runId = '11111111-1111-1111-1111-111111111111',
    target = databaseIdentity(
      'postgresql://manaratak_restore_runner@127.0.0.1:1234/manaratak_restore_11111111111111111111111111111111',
    );
  const state = {
      kind: 'POST28_NATIVE_LOCAL_LAB',
      scope: 'DISPOSABLE',
      status: 'EMPTY_TARGETS_VERIFIED',
      postgresMajor: 16,
      sourceSha: sha,
      runId,
      serverIdentity: '123456',
      port: 1234,
      dataDirectory: dir,
      pgBin: dir,
      postgresBinarySha256: binaryHash,
    },
    stateFile = path.join(dir, 'lab-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(state));
  const created = {
    kind: 'MANARATAK_NATIVE_LOCAL_CREATION_ATTESTATION',
    host: '127.0.0.1',
    port: 1234,
    targetDatabase: target.database,
    targetFingerprint: target.fingerprint,
    sourceDatabase: 'manaratak_post28_transactions_test',
    sourceDatabaseFingerprint: 'a'.repeat(64),
    serverIdentity: state.serverIdentity,
    runId,
    producerSha256: hash(
      fs.readFileSync(
        new URL('../../scripts/database/create-post28-native-lab.mjs', import.meta.url),
      ),
    ),
    labStateFile: stateFile,
    labStateSha256: hash(fs.readFileSync(stateFile)),
    dataDirectoryIdentitySha256: hash(fs.realpathSync(dir)),
    postgresBinarySha256: binaryHash,
    tlsRootCertificateSha256: 'b'.repeat(64),
  };
  const creation = sign(created),
    proof = {
      kind: 'MANARATAK_LOCAL_SYNTHETIC_RESTORE_AUTHORIZATION',
      scope: 'LOCAL_SYNTHETIC_LOOPBACK',
      environment: 'DISPOSABLE',
      targetFingerprint: target.fingerprint,
      sourceDatabaseFingerprint: created.sourceDatabaseFingerprint,
      targetServerIdentity: created.serverIdentity,
      disposableInstanceId: runId,
      creationAttestationSha256: hash(creation.payload),
      tlsRootCertificateSha256: created.tlsRootCertificateSha256,
      allowedHosts: ['127.0.0.1'],
      approvals: [
        {
          role: 'OWNER_DELEGATE',
          reviewerId: 'fixture-owner',
          evidenceSha256: 'c'.repeat(64),
          decision: 'APPROVE_LOCAL_SYNTHETIC_RESTORE',
        },
        {
          role: 'INDEPENDENT_TECHNICAL_REVIEWER',
          reviewerId: 'fixture-reviewer',
          evidenceSha256: 'd'.repeat(64),
          decision: 'APPROVE_LOCAL_SYNTHETIC_RESTORE',
        },
      ],
    };
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  const check = (override = {}, targetOverride = target, creationOverride) =>
    localRecoveryTarget(
      targetOverride,
      sign({ ...proof, ...override }),
      pem,
      sha,
      creationOverride ?? creation,
      pem,
      now,
    );
  return { dir, check, proof, created, sign, target, publicKey, sha, now, creation };
}
test('separately signed local creation admits only its exact loopback target without fabricated production identity', () => {
  const f = fixture();
  try {
    assert.equal(f.check().scope, 'LOCAL_SYNTHETIC_LOOPBACK');
    assert.equal(f.check().productionAcceptance, false);
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});
test('local target cannot be moved to a remote host or to the source database', () => {
  const f = fixture();
  try {
    assert.throws(() => f.check({}, { ...f.target, host: 'external.example' }), /LOCAL_TARGET/);
    assert.throws(
      () => f.check({ sourceDatabaseFingerprint: f.target.fingerprint }),
      /LOCAL_TARGET/,
    );
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});
test('missing independent approval or substituted creation signature cannot pass', () => {
  const f = fixture();
  try {
    assert.throws(() => f.check({ approvals: [f.proof.approvals[0]] }), /LOCAL_TARGET/);
    assert.throws(
      () =>
        f.check({}, f.target, { ...f.creation, signature: Buffer.alloc(64).toString('base64') }),
      /SIGNATURE_INVALID/,
    );
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});
test('changed creation file and binary cannot pass identity checks', () => {
  const f = fixture();
  try {
    fs.appendFileSync(path.join(f.dir, 'lab-state.json'), ' ');
    assert.throws(() => f.check(), /CREATION_IDENTITY/);
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});
test('sentinel rejects replication bypass RLS and escalatable membership', () => {
  const target = { database: 'target', role: 'restore', fingerprint: 'target-hash' },
    proof = { targetServerIdentity: '1', disposableInstanceId: 'run' },
    base = {
      serverIdentity: '1',
      database: 'target',
      role: 'restore',
      superuser: false,
      createRole: false,
      createDatabase: false,
      replication: false,
      bypassRls: false,
      unsafeRoleMembership: false,
      canConnectOtherDatabase: false,
      targetFingerprint: 'target-hash',
      disposableInstanceId: 'run',
      sentinelOwnedByRestoreRole: false,
      sentinelWritableByRestoreRole: false,
    };
  for (const key of [
    'replication',
    'bypassRls',
    'unsafeRoleMembership',
    'canConnectOtherDatabase',
    'sentinelWritableByRestoreRole',
  ])
    assert.throws(
      () => databaseSentinel({ ...base, [key]: true }, target, proof),
      /SENTINEL_INVALID/,
    );
});
