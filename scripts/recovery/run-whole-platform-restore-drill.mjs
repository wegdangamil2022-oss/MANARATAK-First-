#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { verificationRestoreList } from '../database/post28-backup-contract.mjs';
import { verifyDatabaseSnapshot } from './DatabaseSnapshot.mjs';
import { recoveryTlsRoot, recoveryPrismaUrl, recoveryLibpqEnvironment, RECOVERY_SENTINEL_SQL } from './RecoveryConnection.mjs';
import { localRecoveryTarget } from './LocalRecoveryTarget.mjs';
import { required, requireSha } from '../release/lib/ReleaseContracts.mjs';
import {
  recoveryTarget,
  databaseIdentity,
  recoveryInputs,
  databaseSentinel,
  restoreObjectives,
} from './RecoveryPreflight.mjs';
export async function executeRestore(
  input,
  { readSentinel, restoreDatabase, verifyDatabase, now = Date.now },
) {
  const startedAt = now();
  const { target, proof } = input.localCreationAssertion ? localRecoveryTarget(
    databaseIdentity(input.databaseUrl),input.assertion,input.publicKey,input.sha,
    input.localCreationAssertion,input.localCreationPublicKey,startedAt,
  ) : recoveryTarget(
    input.databaseUrl,
    input.assertion,
    input.publicKey,
    input.sha,
    startedAt,
  );
  const assets = await recoveryInputs({ ...input, proof }); // Full input preflight BEFORE SQL, including read-only sentinel query.
  databaseSentinel(await readSentinel(target), target, proof);
  const objective = restoreObjectives(
    {
      startedAt,
      completedAt: startedAt,
      backupCapturedAt: proof.backupCapturedAt,
      structuralRestorability: false,
    },
    input.objectives,
  );
  if (!objective.sloPassed) throw new Error('RECOVERY_BACKUP_RPO_PREFLIGHT_FAILED');
  await restoreDatabase(target, input.databaseBackup);
  const verified = await verifyDatabase(target, proof);
  if (verified?.snapshotId !== proof.snapshotId || verified?.assetReferencesMatched !== true)
    throw new Error('RECOVERY_DATABASE_SNAPSHOT_PARITY_INVALID');
  const post = await recoveryInputs({ ...input, proof }); // Resource snapshot/hash consistency after restore too.
  const completedAt = now(),
    result = restoreObjectives(
      {
        startedAt,
        completedAt,
        backupCapturedAt: proof.backupCapturedAt,
        structuralRestorability: post.snapshotId === assets.snapshotId,
      },
      input.objectives,
    );
  return {
    version: 2,
    kind: 'whole-platform-restore-drill',
    ...result,
    assetCount: assets.assetCount,
    snapshotId: assets.snapshotId,
    sha: input.sha,
    environment: 'DISPOSABLE',
    rpoMeasurementBasis: 'BACKUP_CAPTURE_TIMESTAMP_PROXY_NOT_RECOVERED_EVENT_WATERMARK',
    integratedServiceRtoMeasured: false,
    formalR10Acceptance: false,
    productionAcceptance: false,
    scope: proof.scope === 'LOCAL_SYNTHETIC_LOOPBACK' ? proof.scope : 'AUTHORIZED_DISPOSABLE',
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date(completedAt).toISOString(),
  };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.env.RECOVERY_DRILL_EXECUTION_AUTHORIZED !== 'true')
    throw new Error('RECOVERY_DRILL_NOT_AUTHORIZED');
  const input = {
    requireDatabaseSnapshot: true,
    requireTlsRoot: true,
    tlsRootCertificateFile: required('PGSSLROOTCERT'),
    databaseUrl: required('DATABASE_URL'),
    databaseBackup: required('RECOVERY_DATABASE_BACKUP_FILE'),
    assetDirectory: required('RECOVERY_ASSET_RESTORE_DIR'),
    assetManifest: required('RECOVERY_ASSET_MANIFEST'),
    assertion: JSON.parse(required('RECOVERY_DISPOSABLE_ASSERTION_JSON')),
    publicKey: required('RECOVERY_AUTHORITY_PUBLIC_KEY'),
    localCreationAssertion: process.env.RECOVERY_LOCAL_CREATION_ASSERTION_JSON ? JSON.parse(process.env.RECOVERY_LOCAL_CREATION_ASSERTION_JSON) : undefined,
    localCreationPublicKey: process.env.RECOVERY_LOCAL_CREATION_PUBLIC_KEY,
    sha: requireSha(required('SOURCE_SHA')),
    objectives: JSON.parse(
      fs.readFileSync('config/recovery/production-recovery-contract.json', 'utf8'),
    ).objectives,
  };
  const rootCertificate = () => recoveryTlsRoot(input.tlsRootCertificateFile,JSON.parse(input.assertion.payload).tlsRootCertificateSha256);
  const connection = (target) => recoveryLibpqEnvironment(target,rootCertificate());
  const run = (command, args, target, options = {}) =>
    childProcess.execFileSync(command, args, { env: connection(target), ...options });
  const result = await executeRestore(input, {
    readSentinel: async (target) =>
      JSON.parse(
        run(
          'psql',
          [
            '-X',
            '-At',
            '-v',
            'ON_ERROR_STOP=1',
            '-c',
            RECOVERY_SENTINEL_SQL,
          ],
          target,
          { encoding: 'utf8' },
        ),
      ),
    restoreDatabase: async (target, backup) => {
      if (!/\.(dump|backup)$/i.test(backup))
        throw new Error('RECOVERY_CUSTOM_FORMAT_BACKUP_REQUIRED');
      const list = verificationRestoreList(run('pg_restore',['--list',backup],target,{encoding:'utf8'}));
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'manaratak-restore-list-'));
      const listFile = path.join(temporary,'restore.list');
      fs.writeFileSync(listFile,list.text,{flag:'wx',mode:0o600});
      try { run(
        'pg_restore',
        [
          '--clean',
          '--if-exists',
          '--no-owner',
          '--no-acl',
          '--use-list',
          listFile,
          '--exit-on-error',
          '--dbname',
          target.database,
          backup,
        ],
        target,
        { stdio: 'inherit' },
      ); } finally { fs.rmSync(temporary,{recursive:true,force:true}); }
    },
    verifyDatabase: async (target, proof) => {
      const { PrismaClient } = await import('@prisma/client');
      const client = new PrismaClient({datasources:{db:{url:recoveryPrismaUrl(input.databaseUrl,rootCertificate())}},log:[],errorFormat:'minimal'});
      try {
        const manifest = JSON.parse(fs.readFileSync(input.assetManifest,'utf8'));
        const checked = await verifyDatabaseSnapshot(client,manifest.databaseSnapshot,manifest.files);
        // Recheck independently owned sentinel after pg_restore as well.
        const [guard] = await client.$queryRawUnsafe(RECOVERY_SENTINEL_SQL);
        databaseSentinel(guard?.value,target,proof);
        return {...checked,snapshotId:proof.snapshotId};
      } finally { await client.$disconnect(); }
    },
  });
  const out = process.env.RECOVERY_EVIDENCE_FILE || 'recovery-evidence/RESTORE_DRILL.json';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(`RECOVERY_RESTORE_DRILL=${result.status} RUNTIME_ATTESTATION=REQUIRED`);
  if (result.status !== 'PASS') process.exitCode = 1;
}
