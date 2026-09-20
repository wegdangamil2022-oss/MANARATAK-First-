import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { databaseTargetIdentity, requireDatabaseMutationGate } from './lib/database-mutation-gate.mjs';

const mode = process.argv[2] ?? 'plan';
const root = process.cwd();
const schemaPath = path.join(root, 'packages/infrastructure/prisma/schema.prisma');
const migrationsPath = path.join(root, 'packages/infrastructure/prisma/migrations');

const migrationInventory = () => fs.readdirSync(migrationsPath, { withFileTypes: true })
  .filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)).map(entry => {
    const directory = path.join(migrationsPath, entry.name);
    const migration = path.join(directory, 'migration.sql');
    const rollback = path.join(directory, 'rollback.sql');
    return {
      id: entry.name,
      migrationSha256: fs.existsSync(migration) ? sha256(migration) : null,
      rollback: fs.existsSync(rollback) ? { path: path.relative(root, rollback), sha256: sha256(rollback) } : null,
    };
  });

if (mode === 'plan' || mode === 'migration-dry-run' || mode === 'rollback-plan') {
  const migrations = migrationInventory();
  const output: Record<string, unknown> = {
    mode: mode.toUpperCase().replaceAll('-', '_'), schemaSha256: sha256(schemaPath), migrations,
    databaseConnectionAttempted: false, databaseWrites: 0,
  };
  if (mode === 'migration-dry-run') {
    output.status = 'SOURCE_VALIDATED_DATABASE_DIFF_PENDING';
    output.commandAfterProvisioningApproval = 'npm run db:remediation:status, then set the Greenfield Database Mutation Gate variables and run npm run db:remediation:deploy';
  }
  if (mode === 'rollback-plan') {
    const recovery = validateRecoveryPlanSource(migrations);
    output.recoveryPlan = recovery.entries;
    output.recoveryPlanIssues = recovery.issues;
    output.status = recovery.issues.length === 0 ? 'RECOVERY_PLAN_SOURCE_VALIDATED' : 'ROLLBACK_ARTIFACT_MISSING';
    output.automaticRollbackExecuted = false;
    if (recovery.issues.length > 0) process.exitCode = 1;
  }
  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

if (mode === 'status') {
  requireDatabaseUrl();
  runPrisma(['migrate', 'status', '--schema', schemaPath]);
  process.exit(0);
}

if (mode === 'baseline') {
  requireDatabaseUrl();
  const prisma = new PrismaClient();
  try {
    const manifest = readBaselineManifest();
    const migrations = await prisma.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>(
      'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at'
    );
    if (!Array.isArray(migrations)) throw new Error('MIGRATION_LEDGER_INVALID');

    const identityRows = await prisma.$queryRawUnsafe<Array<{ database_name: string; schema_name: string; server_version_num: string }>>(
      "SELECT current_database() AS database_name, current_schema() AS schema_name, current_setting('server_version_num') AS server_version_num"
    );
    const identity = identityRows[0];
    if (!identity?.database_name || !identity?.schema_name || !identity?.server_version_num) throw new Error('DATABASE_IDENTITY_UNAVAILABLE');

    const counts: Record<string, { owner: string; count: string }> = {};
    for (const [model, rule] of Object.entries(manifest.models)) {
      if (!rule.required) continue;
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(model)}`
      ).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`BASELINE_REQUIRED_COUNTER_UNAVAILABLE:${model}:${message}`);
      });
      if (!rows[0] || rows[0].count === undefined || rows[0].count === null) throw new Error(`BASELINE_REQUIRED_COUNTER_INVALID:${model}`);
      counts[model] = { owner: rule.owner, count: String(rows[0].count) };
    }

    const [invalidIndexRows, invalidConstraintRows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
        'SELECT COUNT(*) AS count FROM pg_index WHERE NOT indisvalid'
      ),
      prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
        "SELECT COUNT(*) AS count FROM pg_constraint WHERE NOT convalidated"
      ),
    ]);
    const invalidIndexes = Number(invalidIndexRows[0]?.count ?? NaN);
    const unvalidatedConstraints = Number(invalidConstraintRows[0]?.count ?? NaN);
    if (!Number.isFinite(invalidIndexes) || !Number.isFinite(unvalidatedConstraints)) throw new Error('BASELINE_CONSISTENCY_PROBE_INVALID');
    if (invalidIndexes !== manifest.consistencyProbes.invalidIndexes.expected) throw new Error(`INVALID_INDEXES_DETECTED:${invalidIndexes}`);
    if (unvalidatedConstraints !== manifest.consistencyProbes.unvalidatedConstraints.expected) throw new Error(`UNVALIDATED_CONSTRAINTS_DETECTED:${unvalidatedConstraints}`);

    const sourceMigrations = migrationInventory();
    const artifact = {
      mode: 'READ_ONLY_BASELINE',
      status: 'PASS',
      manifestVersion: manifest.version,
      capturedAt: new Date().toISOString(),
      database: {
        target: databaseTargetIdentity(process.env.DATABASE_URL!),
        name: identity.database_name,
        schema: identity.schema_name,
        serverVersionNum: identity.server_version_num,
      },
      source: {
        schemaSha256: sha256(schemaPath),
        migrationChainSha256: sha256Text(JSON.stringify(sourceMigrations)),
        commandVersion: 'database-baseline-v2',
        nodeVersion: process.version,
        git: gitMetadata(),
      },
      migrationLedger: {
        required: true,
        rowCount: migrations.length,
        rows: migrations.map(item => ({ name: item.migration_name, applied: Boolean(item.finished_at), rolledBack: Boolean(item.rolled_back_at) })),
      },
      counts,
      consistency: { invalidIndexes, unvalidatedConstraints },
      databaseWrites: 0,
    };
    const json = JSON.stringify(artifact, null, 2);
    const outputPath = process.env.DATABASE_BASELINE_OUTPUT?.trim();
    if (outputPath) fs.writeFileSync(path.resolve(root, outputPath), `${json}\n`, { flag: 'wx' });
    console.log(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ mode: 'READ_ONLY_BASELINE', status: 'UNAVAILABLE', error: message, databaseWrites: 0 }));
    process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
  process.exit();
}

if (mode === 'deploy') {
  requireDatabaseUrl();
  const recovery = validateRecoveryPlanSource(migrationInventory());
  if (recovery.issues.length > 0) throw new Error(`DATABASE_RECOVERY_PLAN_INVALID:${recovery.issues.join('|')}`);
  const gate = requireDatabaseMutationGate('db-remediation-deploy', { allowedPurposes: ['provision', 'migrate'] });
  let recoveryEvidence: { path: string; sha256: string } | null = null;
  if ((gate.environment === 'staging' || gate.environment === 'production') && gate.purpose === 'migrate') {
    const evidencePath = process.env.DATABASE_RECOVERY_EVIDENCE_FILE?.trim();
    if (!evidencePath) throw new Error('DATABASE_RECOVERY_EVIDENCE_FILE_REQUIRED');
    const absolute = path.resolve(root, evidencePath);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error('DATABASE_RECOVERY_EVIDENCE_FILE_NOT_FOUND');
    recoveryEvidence = { path: path.relative(root, absolute), sha256: sha256(absolute) };
  }
  console.log(JSON.stringify({
    mode: 'DATABASE_MUTATION_GATE_APPROVED',
    operation: gate.operation,
    purpose: gate.purpose,
    environment: gate.environment,
    target: gate.target,
    recoveryPlanSha256: sha256Text(JSON.stringify(recovery.entries)),
    recoveryEvidence,
  }));
  runPrisma(['migrate', 'deploy', '--schema', schemaPath]);
  runPrisma(['migrate', 'status', '--schema', schemaPath]);
  runPrisma(['migrate', 'diff', '--from-schema-datasource', schemaPath, '--to-schema-datamodel', schemaPath, '--exit-code']);
  process.exit(0);
}

throw new Error(`Unsupported mode: ${mode}`);


type RecoveryManifest = {
  version: number;
  migrations: Record<string, { recoveryClass: 'ROLLBACK_SQL' | 'BACKUP_RESTORE_REQUIRED' | 'FORWARD_FIX_ONLY'; artifact: string; decision: string }>;
};
function validateRecoveryPlanSource(migrations: ReturnType<typeof migrationInventory>) {
  const manifestPath = path.join(root, 'scripts/database/migration-recovery.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as RecoveryManifest;
  const issues: string[] = [];
  const entries = migrations.map((migration) => {
    const rule = manifest.migrations[migration.id];
    if (!rule) { issues.push(`RECOVERY_CLASS_MISSING:${migration.id}`); return { ...migration, recoveryClass: null, recoveryArtifact: null }; }
    const artifactPath = path.resolve(root, rule.artifact);
    if (!fs.existsSync(artifactPath) || !fs.statSync(artifactPath).isFile()) issues.push(`RECOVERY_ARTIFACT_MISSING:${migration.id}:${rule.artifact}`);
    if (rule.recoveryClass === 'ROLLBACK_SQL' && migration.rollback?.path !== rule.artifact) issues.push(`ROLLBACK_ARTIFACT_MISMATCH:${migration.id}`);
    if (!rule.decision?.trim()) issues.push(`RECOVERY_DECISION_MISSING:${migration.id}`);
    return { ...migration, recoveryClass: rule.recoveryClass, recoveryArtifact: fs.existsSync(artifactPath) ? { path: rule.artifact, sha256: sha256(artifactPath) } : null, decision: rule.decision };
  });
  for (const id of Object.keys(manifest.migrations)) if (!migrations.some((migration) => migration.id === id)) issues.push(`RECOVERY_MANIFEST_ORPHAN:${id}`);
  return { entries, issues };
}

type BaselineManifest = {
  version: number;
  models: Record<string, { owner: string; required: boolean }>;
  consistencyProbes: { invalidIndexes: { expected: number }; unvalidatedConstraints: { expected: number } };
};

function sha256(filePath: string): string { return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function sha256Text(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function requireDatabaseUrl(): void { if (!process.env.DATABASE_URL || /USER:PASSWORD|localhost:5432\/database/i.test(process.env.DATABASE_URL)) throw new Error('DATABASE_URL_NOT_CONFIGURED'); }
function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) throw new Error(`UNSAFE_DATABASE_IDENTIFIER:${identifier}`);
  return `"${identifier.replaceAll('"', '""')}"`;
}
function readBaselineManifest(): BaselineManifest {
  const manifestPath = path.join(root, 'scripts/database/database-baseline.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BaselineManifest;
  if (!manifest.version || !manifest.models || Object.keys(manifest.models).length === 0) throw new Error('DATABASE_BASELINE_MANIFEST_INVALID');
  return manifest;
}
function gitMetadata(): { commit: string | null; dirty: boolean | null } {
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  return {
    commit: commit.status === 0 ? commit.stdout.trim() || null : null,
    dirty: status.status === 0 ? status.stdout.trim().length > 0 : null,
  };
}
function runPrisma(args: string[]): void {
  const cli = path.join(root, 'node_modules/prisma/build/index.js');
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
