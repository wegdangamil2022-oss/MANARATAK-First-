#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { required, requireSha } from '../release/lib/ReleaseContracts.mjs';
import {
  recoveryTarget,
  recoveryInputs,
  databaseSentinel,
  restoreObjectives,
} from './RecoveryPreflight.mjs';
export async function executeRestore(
  input,
  { readSentinel, restoreDatabase, verifyDatabase, now = Date.now },
) {
  const startedAt = now();
  const { target, proof } = recoveryTarget(
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
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date(completedAt).toISOString(),
  };
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  if (process.env.RECOVERY_DRILL_EXECUTION_AUTHORIZED !== 'true')
    throw new Error('RECOVERY_DRILL_NOT_AUTHORIZED');
  const input = {
    databaseUrl: required('DATABASE_URL'),
    databaseBackup: required('RECOVERY_DATABASE_BACKUP_FILE'),
    assetDirectory: required('RECOVERY_ASSET_RESTORE_DIR'),
    assetManifest: required('RECOVERY_ASSET_MANIFEST'),
    assertion: JSON.parse(required('RECOVERY_DISPOSABLE_ASSERTION_JSON')),
    publicKey: required('RECOVERY_AUTHORITY_PUBLIC_KEY'),
    sha: requireSha(required('SOURCE_SHA')),
    objectives: JSON.parse(
      fs.readFileSync('config/recovery/production-recovery-contract.json', 'utf8'),
    ).objectives,
  };
  const connection = (target) => ({
    ...process.env,
    PGSSLMODE: 'verify-full',
    PGHOST: target.host,
    PGPORT: target.port,
    PGDATABASE: target.database,
    PGUSER: target.role,
    PGPASSWORD: target.password,
  });
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
            `SELECT json_build_object('serverIdentity',(SELECT system_identifier::text FROM pg_control_system()),'database',current_database(),'role',current_user,'superuser',r.rolsuper,'createRole',r.rolcreaterole,'createDatabase',r.rolcreatedb,'targetFingerprint',g.target_fingerprint,'disposableInstanceId',g.disposable_instance_id,'sentinelOwnedByRestoreRole',pg_get_userbyid(c.relowner)=current_user,'sentinelWritableByRestoreRole',has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE')) FROM pg_roles r JOIN manaratak_recovery_control.disposable_guard g ON g.guard_key='restore-target' JOIN pg_class c ON c.oid='manaratak_recovery_control.disposable_guard'::regclass WHERE r.rolname=current_user;`,
          ],
          target,
          { encoding: 'utf8' },
        ),
      ),
    restoreDatabase: async (target, backup) => {
      if (!/\.(dump|backup)$/i.test(backup))
        throw new Error('RECOVERY_CUSTOM_FORMAT_BACKUP_REQUIRED');
      run(
        'pg_restore',
        [
          '--clean',
          '--if-exists',
          '--no-owner',
          '--exit-on-error',
          '--dbname',
          target.database,
          backup,
        ],
        target,
        { stdio: 'inherit' },
      );
    },
    verifyDatabase: async (target, proof) => {
      run('npm', ['run', 'test:database'], target, {
        stdio: 'inherit',
        env: {
          ...connection(target),
          DATABASE_URL: input.databaseUrl,
          MANARATAK_DATABASE_INTEGRATION_ENABLED: 'true',
        },
      });
      const checked = JSON.parse(
        run(
          'psql',
          [
            '-X',
            '-At',
            '-v',
            'ON_ERROR_STOP=1',
            '-c',
            `SELECT json_build_object('snapshotId',snapshot_id,'assetReferencesMatched',asset_references_matched) FROM manaratak_recovery_snapshot WHERE snapshot_id='${proof.snapshotId}';`,
          ],
          target,
          { encoding: 'utf8' },
        ),
      );
      return checked;
    },
  });
  const out = process.env.RECOVERY_EVIDENCE_FILE || 'recovery-evidence/RESTORE_DRILL.json';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(`RECOVERY_RESTORE_DRILL=${result.status} RUNTIME_ATTESTATION=REQUIRED`);
  if (result.status !== 'PASS') process.exitCode = 1;
}
