#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';
import { requireDatabaseMutationGate, databaseTargetIdentity } from './lib/database-mutation-gate.mjs';

/**
 * Validates requirements for rotating the single application role password.
 * Strictly verifies the Database Mutation Gate with purpose 'maintenance'.
 */
export function validateRotateApplicationRoleRequest(env = process.env) {
  // Enforce mutation gate approval for 'maintenance' purpose
  requireDatabaseMutationGate('rotate-application-role', { allowedPurposes: ['maintenance'] }, env);

  const errors = [];

  const roleName = (env.DB_APPLICATION_ROLE || 'manaratak_application').trim();
  if (!roleName || !/^[a-z_][a-z0-9_]{0,62}$/.test(roleName)) {
    errors.push('DB_APPLICATION_ROLE must be a valid lowercase PostgreSQL identifier');
  }

  // Prevent touching privileged or system roles
  if (['postgres', 'manaratak_probe', 'manaratak_migration'].includes(roleName) || roleName.startsWith('pg_')) {
    errors.push(`Role ${roleName} is not permitted for single-role application rotation`);
  }

  const adminUrl = env.ORIGINAL_ADMIN_DIRECT_URL || env.DIRECT_URL;
  if (!adminUrl) {
    errors.push('Administrative direct connection (ORIGINAL_ADMIN_DIRECT_URL or DIRECT_URL) is required');
  } else {
    try {
      const targetAdmin = databaseTargetIdentity(adminUrl);
      const targetApp = databaseTargetIdentity(env.DATABASE_URL);
      if (targetAdmin !== targetApp) {
        errors.push(`Admin connection target (${targetAdmin}) does not match DATABASE_URL target (${targetApp})`);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (env.APPLICATION_ROLE_ROTATION_CONFIRM !== 'ROTATE_APPLICATION_ROLE_CREDENTIAL') {
    errors.push('APPLICATION_ROLE_ROTATION_CONFIRM must equal ROTATE_APPLICATION_ROLE_CREDENTIAL');
  }

  const isSoloOwner = env.PROJECT_OWNER_POLICY === 'SOLO_OWNER' || Boolean(env.ROTATION_OWNER_ID?.trim());
  let actorId = '';
  let approverId = '';
  let ownerId = null;

  if (isSoloOwner) {
    ownerId = (env.ROTATION_OWNER_ID || env.PROJECT_OWNER_ID || env.ROTATION_ACTOR_ID)?.trim();
    if (!ownerId) {
      errors.push('ROTATION_OWNER_ID or PROJECT_OWNER_ID is required for solo owner authorization');
    }
    actorId = ownerId || '';
    approverId = ownerId || '';
  } else {
    actorId = env.ROTATION_ACTOR_ID?.trim() || '';
    approverId = env.ROTATION_APPROVER_ID?.trim() || '';
    if (!actorId || !approverId) {
      errors.push('ROTATION_ACTOR_ID and ROTATION_APPROVER_ID are required');
    } else if (actorId === approverId) {
      errors.push('ROTATION_ACTOR_ID and ROTATION_APPROVER_ID must be distinct');
    }
  }

  if (errors.length > 0) {
    const err = new Error(`ROTATION_VALIDATION_FAILED: ${errors.join('; ')}`);
    err.errors = errors;
    throw err;
  }

  return {
    ok: true,
    roleName,
    adminUrl,
    actorId,
    approverId,
    ownerId: isSoloOwner ? ownerId : null,
    approvalPolicy: isSoloOwner ? 'SOLO_OWNER' : 'DUAL_CONTROL',
  };
}

/**
 * Generates a high-entropy URL-safe password without unsafe shell characters.
 * Length: 32 bytes base64url (~43 characters).
 */
export function generateApplicationPassword() {
  return randomBytes(32).toString('base64url');
}

/**
 * Constructs an updated DATABASE_URL preserving existing host, port, db name, and query params.
 */
export function buildApplicationDatabaseUrl(baseDatabaseUrl, roleName, password) {
  const parsed = new URL(baseDatabaseUrl);
  parsed.username = roleName;
  parsed.password = password;
  return parsed.toString();
}

/**
 * Updates or appends key-value pairs in an env file string safely.
 */
export function updateEnvContent(originalContent, updates) {
  const lines = originalContent ? originalContent.split('\n') : [];
  const updatedKeys = new Set();
  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return line;
    const key = line.slice(0, eqIdx).trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      updatedKeys.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${value}`);
    }
  }

  return newLines.join('\n');
}

/**
 * Redacts secrets from any error message or string before logging.
 * Also redacts any user:password embedded in URLs.
 */
export function redactSecret(text, secret) {
  if (!text || typeof text !== 'string') return '';
  let result = text;
  if (secret && typeof secret === 'string' && secret.length > 0) {
    result = result.replaceAll(secret, '[REDACTED_SECRET]');
  }
  // Also redact any embedded credentials in database URLs (postgres://user:pass@host)
  result = result.replace(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^:@\s]+):([^@\s]+)@/g, '$1$2:[REDACTED_SECRET]@');
  return result;
}

/**
 * Asserts that a target file path does not exist and is not a symbolic link.
 */
export function assertPathNotPreExisting(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`PRE_EXISTING_PATH_REJECTED: ${path.basename(filePath)} is a symbolic link`);
    }
    throw new Error(`PRE_EXISTING_PATH_REJECTED: ${path.basename(filePath)} already exists`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return; // Safe: path does not exist
    }
    throw err;
  }
}

/**
 * Writes a file exclusively (flag: 'wx') with strict mode 0600, failing if it already exists or is a symlink.
 */
export function writeExclusiveSecureFile(filePath, content) {
  assertPathNotPreExisting(filePath);
  fs.writeFileSync(filePath, content, { mode: 0o600, flag: 'wx' });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Ignore chmod failure if filesystem does not support POSIX chmod
  }
}

/**
 * Executes ALTER ROLE via psql using child_process spawnSync and stdin.
 * Distinguishes PRE_DISPATCH failure (e.g. psql missing / spawn error)
 * from POST_DISPATCH failure (e.g. timeout, connection severed, non-zero exit).
 */
export function executeAlterRoleWithPsql({ adminUrl, roleName, newPassword, execSync = spawnSync }) {
  const direct = new URL(adminUrl);
  const database = decodeURIComponent(direct.pathname.replace(/^\/+/, '')).trim();

  const childEnv = {
    ...process.env,
    PGHOST: direct.hostname,
    PGPORT: direct.port || '5432',
    PGDATABASE: database,
    PGUSER: decodeURIComponent(direct.username),
    PGPASSWORD: decodeURIComponent(direct.password),
    PGSSLMODE: direct.searchParams.get('sslmode') || 'prefer',
  };

  const escapedPassword = newPassword.replaceAll("'", "''");
  // Strictly ALTER ROLE ... WITH PASSWORD without touching any other grants or roles
  const sql = `ALTER ROLE "${roleName.replaceAll('"', '""')}" WITH PASSWORD '${escapedPassword}';\n`;

  let result;
  try {
    result = execSync('psql', ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--quiet'], {
      env: childEnv,
      input: sql,
      encoding: 'utf8',
      timeout: 30000,
    });
  } catch (spawnError) {
    // Failure in spawn itself before psql could process input
    const err = new Error(`PRE_DISPATCH_SPAWN_FAILED: ${spawnError.message}`);
    err.isPreDispatch = true;
    throw err;
  }

  // If node's child_process returned result with spawn error (e.g., ENOENT)
  if (result.error && result.error.code === 'ENOENT') {
    const err = new Error(`PRE_DISPATCH_PSQL_NOT_FOUND: psql binary not found`);
    err.isPreDispatch = true;
    throw err;
  }

  // Once spawned and input was supplied to stdin, any timeout, signal, or non-zero status
  // is treated as POST_DISPATCH (uncertain if server committed ALTER ROLE).
  if (result.error || result.status !== 0) {
    const rawError = (result.stderr || result.error?.message || 'psql execution failed').toString();
    const sanitizedError = redactSecret(rawError, newPassword);
    const err = new Error(`ALTER_ROLE_FAILED: ${sanitizedError}`);
    err.isPostDispatch = true;
    err.isTimeout = Boolean(result.error && result.error.code === 'ETIMEDOUT');
    throw err;
  }

  return { ok: true };
}

/**
 * Executes ALTER ROLE using an installed Node database driver (@prisma/client or injected driver).
 * Connects directly through Cloud SQL Unix socket or TCP without requiring an external psql binary.
 */
export async function executeAlterRoleWithNodeDriver({ adminUrl, roleName, newPassword, driver = null }) {
  const escapedPassword = newPassword.replaceAll("'", "''");
  const sql = `ALTER ROLE "${roleName.replaceAll('"', '""')}" WITH PASSWORD '${escapedPassword}';`;

  if (driver && typeof driver.execute === 'function') {
    try {
      await driver.execute(sql);
      return { ok: true };
    } catch (driverError) {
      const sanitizedError = redactSecret(driverError.message || String(driverError), newPassword);
      const err = new Error(`ALTER_ROLE_FAILED: ${sanitizedError}`);
      err.isPostDispatch = Boolean(driverError.isPostDispatch ?? true);
      err.isTimeout = Boolean(driverError.isTimeout || /timeout|etimedout/i.test(driverError.message || ''));
      throw err;
    }
  }

  let prisma;
  try {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient({
      datasources: { db: { url: adminUrl } },
    });
  } catch (importErr) {
    const err = new Error(`PRE_DISPATCH_DRIVER_INIT_FAILED: ${importErr.message}`);
    err.isPreDispatch = true;
    throw err;
  }

  try {
    await prisma.$executeRawUnsafe(sql);
    return { ok: true };
  } catch (queryErr) {
    const sanitizedError = redactSecret(queryErr.message || String(queryErr), newPassword);
    const err = new Error(`ALTER_ROLE_FAILED: ${sanitizedError}`);
    const isTimeout = /timeout|timed out|P2024|ECONNRESET|ETIMEDOUT|terminating/i.test(queryErr.message || '');
    err.isPostDispatch = true;
    err.isTimeout = isTimeout;
    throw err;
  } finally {
    if (prisma) {
      await prisma.$disconnect().catch(() => {});
    }
  }
}

/**
 * Universal ALTER ROLE dispatcher supporting psql CLI or Node database driver.
 */
export function executeAlterRolePassword({ adminUrl, roleName, newPassword, execSync = null, driver = null }) {
  if (execSync) {
    return executeAlterRoleWithPsql({ adminUrl, roleName, newPassword, execSync });
  }
  return executeAlterRoleWithNodeDriver({ adminUrl, roleName, newPassword, driver });
}

/**
 * Complete workflow orchestration with transactional rollback and recovery journaling.
 */
export async function runRotationWorkflow(options = {}) {
  const env = options.env || process.env;
  const rootDir = options.rootDir || process.cwd();
  const execSync = options.execSync || null;
  const driver = options.driver || null;
  const generatePassword = options.generatePassword || generateApplicationPassword;

  // 1. Verify gate & request validation (fails closed BEFORE any changes)
  const validation = validateRotateApplicationRoleRequest(env);

  // Determine secret persistence mode
  const hasSuppliedSecret = Boolean(env.DB_APPLICATION_PASSWORD?.trim());
  const isSecretHandoff = options.persistMode === 'secret' || options.secretHandoff === true || (hasSuppliedSecret && options.persistMode !== 'env' && env.ROTATION_PERSIST_ENV !== 'true');

  let newPassword;
  if (isSecretHandoff) {
    newPassword = env.DB_APPLICATION_PASSWORD?.trim();
    if (!newPassword) {
      throw new Error('APPLICATION_ROLE_ROTATION_VALIDATION_FAILED: DB_APPLICATION_PASSWORD is required for secret handoff');
    }
  } else {
    newPassword = generatePassword();
  }

  const envPath = path.join(rootDir, '.env');
  const backupPath = path.join(rootDir, '.env.backup.rotation');
  const tempPath = path.join(rootDir, '.env.tmp.rotation');
  const journalPath = path.join(rootDir, '.rotation.journal.json');
  const uncertainArtifactPath = path.join(rootDir, '.env.unconfirmed.rotation');

  // Verify that staging paths do NOT pre-exist or point to symlinks
  if (!isSecretHandoff) {
    assertPathNotPreExisting(tempPath);
    assertPathNotPreExisting(backupPath);
    assertPathNotPreExisting(uncertainArtifactPath);
  }

  // If a journal already exists from an interrupted run, refuse to proceed
  try {
    const journalStat = fs.lstatSync(journalPath);
    throw new Error(`PRE_EXISTING_JOURNAL: Found pre-existing journal at ${journalPath}. Resolve or remove manually before rotating.`);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (!isSecretHandoff) {
    // Verify ability to read local .env before modifying database (file mode only)
    let originalEnvContent = '';
    if (fs.existsSync(envPath)) {
      if (fs.lstatSync(envPath).isSymbolicLink()) {
        throw new Error('CONFIG_ERROR: .env is a symbolic link, which is rejected');
      }
      originalEnvContent = fs.readFileSync(envPath, 'utf8');
      writeExclusiveSecureFile(backupPath, originalEnvContent);
    }

    const updatedDatabaseUrl = buildApplicationDatabaseUrl(env.DATABASE_URL, validation.roleName, newPassword);
    const newEnvContent = updateEnvContent(originalEnvContent, {
      DATABASE_URL: updatedDatabaseUrl,
      DB_APPLICATION_PASSWORD: newPassword,
    });
    writeExclusiveSecureFile(tempPath, newEnvContent);
  }

  // Record pre-mutation journal marker exclusively with mode 0600
  writeExclusiveSecureFile(
    journalPath,
    JSON.stringify({
      stage: 'PRE_MUTATION',
      role: validation.roleName,
      timestamp: new Date().toISOString(),
      actorId: validation.actorId,
      approverId: validation.approverId,
      ownerId: validation.ownerId || undefined,
      approvalPolicy: validation.approvalPolicy,
      secretSource: isSecretHandoff ? 'DB_APPLICATION_PASSWORD' : 'GENERATED_EPHEMERAL',
      persistMode: isSecretHandoff ? 'SECRET_HANDOFF' : 'ENV_FILE',
    }, null, 2)
  );

  let dbAltered = false;
  let sqlDispatched = false;

  try {
    sqlDispatched = true;
    // 3. Execute ALTER ROLE via psql or Node database driver
    await executeAlterRolePassword({
      adminUrl: validation.adminUrl,
      roleName: validation.roleName,
      newPassword,
      execSync,
      driver,
    });
    dbAltered = true;

    // Record DB_ALTERED stage in journal
    fs.writeFileSync(
      journalPath,
      JSON.stringify({
        stage: 'DATABASE_ALTERED',
        role: validation.roleName,
        timestamp: new Date().toISOString(),
        secretSource: isSecretHandoff ? 'DB_APPLICATION_PASSWORD' : 'GENERATED_EPHEMERAL',
      }, null, 2),
      { mode: 0o600 }
    );

    if (isSecretHandoff) {
      // In secret handoff mode, secret is already persisted in Google AI Studio Secrets panel.
      // Clean up pre-mutation journal and do not write to an ephemeral .env or touch /app/.dev.env.json.
      if (fs.existsSync(journalPath)) {
        fs.unlinkSync(journalPath);
      }

      return {
        status: 'SUCCESS',
        role: validation.roleName,
        databaseMutated: true,
        configUpdated: false,
        secretHandoff: true,
        secretSource: 'DB_APPLICATION_PASSWORD',
      };
    }

    // 4. Atomically rename temp file to .env
    fs.renameSync(tempPath, envPath);
    try {
      fs.chmodSync(envPath, 0o600);
    } catch {
      // Ignore if chmod not supported on platform
    }

    // Record COMPLETED stage and clean up backup & journal
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    if (fs.existsSync(journalPath)) {
      fs.unlinkSync(journalPath);
    }

    return {
      status: 'SUCCESS',
      role: validation.roleName,
      databaseMutated: true,
      configUpdated: true,
    };
  } catch (error) {
    if (!sqlDispatched || error.isPreDispatch) {
      // Confirmed failure BEFORE SQL could be sent to server; clean up cleanly
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
      if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath);
      throw error;
    }

    if (!dbAltered) {
      // UNCERTAIN OUTCOME:
      // SQL was dispatched to psql, but process failed, timed out, or connection dropped.
      // PostgreSQL MAY have applied the ALTER ROLE.
      // PRESERVE recovery journal stage UNCERTAIN_MUTATION_STATE.
      // NEVER delete the only recoverable copy!
      if (isSecretHandoff) {
        fs.writeFileSync(
          journalPath,
          JSON.stringify({
            stage: 'UNCERTAIN_MUTATION_STATE',
            role: validation.roleName,
            timestamp: new Date().toISOString(),
            secretSource: 'DB_APPLICATION_PASSWORD',
            note: 'PostgreSQL may have committed the credential change. Do not discard candidate secret in DB_APPLICATION_PASSWORD.',
          }, null, 2),
          { mode: 0o600 }
        );
      } else {
        if (fs.existsSync(tempPath)) {
          fs.renameSync(tempPath, uncertainArtifactPath);
          try {
            fs.chmodSync(uncertainArtifactPath, 0o600);
          } catch {}
        }

        fs.writeFileSync(
          journalPath,
          JSON.stringify({
            stage: 'UNCERTAIN_MUTATION_STATE',
            role: validation.roleName,
            timestamp: new Date().toISOString(),
            recoveryArtifact: path.basename(uncertainArtifactPath),
            note: 'PostgreSQL may have committed the credential change. Do not discard recovery artifact.',
          }, null, 2),
          { mode: 0o600 }
        );
      }

      const sanitized = redactSecret(error instanceof Error ? error.message : String(error), newPassword);
      const uncertainError = new Error(
        `UNCERTAIN_MUTATION_STATE: SQL was dispatched but outcome could not be acknowledged. ` +
        (isSecretHandoff
          ? `Preserved journal at ${path.basename(journalPath)} (secret DB_APPLICATION_PASSWORD). `
          : `Recovery artifact preserved at ${path.basename(uncertainArtifactPath)} (mode 0600). Original .env NOT overwritten. `) +
        `Error: ${sanitized}`
      );
      uncertainError.stage = 'UNCERTAIN_MUTATION_STATE';
      if (!isSecretHandoff) {
        uncertainError.recoveryArtifact = uncertainArtifactPath;
      }
      throw uncertainError;
    } else {
      // Database was confirmed altered, but file rename / config activation failed!
      const sanitized = redactSecret(error instanceof Error ? error.message : String(error), newPassword);
      throw new Error(`CRITICAL_PARTIAL_FAILURE: Database password was updated but configuration update failed. Recovery files preserved: ${tempPath}. Error: ${sanitized}`);
    }
  }
}

async function main() {
  try {
    const result = await runRotationWorkflow();
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(`ROTATION_ERROR: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
