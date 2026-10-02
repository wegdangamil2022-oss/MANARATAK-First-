import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  validateRotateApplicationRoleRequest,
  generateApplicationPassword,
  buildApplicationDatabaseUrl,
  updateEnvContent,
  redactSecret,
  assertPathNotPreExisting,
  writeExclusiveSecureFile,
  executeAlterRolePassword,
  executeAlterRoleWithNodeDriver,
  runRotationWorkflow,
} from './rotate-application-role.mjs';

describe('Single-Role Credential Rotation Runner', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotate-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const validEnv = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://manaratak_probe:probepass@localhost:5432/cloud_sql_development_database',
    ORIGINAL_ADMIN_DIRECT_URL: 'postgresql://admin:adminpass@localhost:5432/cloud_sql_development_database',
    DATABASE_PROVISIONING_GATE: 'APPROVED',
    ALLOW_DATABASE_MUTATIONS: 'YES',
    DATABASE_MUTATION_ENVIRONMENT: 'development',
    DATABASE_MUTATION_PURPOSE: 'maintenance',
    DATABASE_MUTATION_TARGET: 'localhost:5432/cloud_sql_development_database',
    APPLICATION_ROLE_ROTATION_CONFIRM: 'ROTATE_APPLICATION_ROLE_CREDENTIAL',
    ROTATION_ACTOR_ID: 'lead-dev',
    ROTATION_APPROVER_ID: 'sec-lead',
  };

  it('generates high entropy URL-safe password >= 32 characters', () => {
    const pwd1 = generateApplicationPassword();
    const pwd2 = generateApplicationPassword();
    expect(pwd1.length).toBeGreaterThanOrEqual(32);
    expect(pwd2.length).toBeGreaterThanOrEqual(32);
    expect(pwd1).not.toBe(pwd2);
    expect(/^[A-Za-z0-9_-]+$/.test(pwd1)).toBe(true);
  });

  it('rejects execution when Database Mutation Gate purpose is not maintenance', () => {
    const invalidGateEnv = {
      ...validEnv,
      DATABASE_MUTATION_PURPOSE: 'provision',
    };
    expect(() => validateRotateApplicationRoleRequest(invalidGateEnv)).toThrow(
      /DATABASE_MUTATION_PURPOSE=provision is not allowed for rotate-application-role/
    );
  });

  it('rejects execution when gate approval flags are missing', () => {
    const missingGateEnv = {
      ...validEnv,
      DATABASE_PROVISIONING_GATE: 'PENDING',
    };
    expect(() => validateRotateApplicationRoleRequest(missingGateEnv)).toThrow(
      /DATABASE_PROVISIONING_GATE must equal APPROVED/
    );
  });

  it('rejects rotation for non-application roles (manaratak_migration, manaratak_probe, postgres)', () => {
    const badRoleEnv = {
      ...validEnv,
      DB_APPLICATION_ROLE: 'manaratak_migration',
    };
    expect(() => validateRotateApplicationRoleRequest(badRoleEnv)).toThrow(
      /Role manaratak_migration is not permitted/
    );
  });

  it('rejects identical actor and approver (enforces dual control)', () => {
    const samePersonEnv = {
      ...validEnv,
      ROTATION_ACTOR_ID: 'same-operator',
      ROTATION_APPROVER_ID: 'same-operator',
    };
    expect(() => validateRotateApplicationRoleRequest(samePersonEnv)).toThrow(
      /ROTATION_ACTOR_ID and ROTATION_APPROVER_ID must be distinct/
    );
  });

  it('accepts single identified owner under PROJECT_OWNER_POLICY=SOLO_OWNER', () => {
    const soloOwnerEnv = {
      ...validEnv,
      PROJECT_OWNER_POLICY: 'SOLO_OWNER',
      ROTATION_OWNER_ID: 'sole-project-owner-1',
      ROTATION_ACTOR_ID: undefined,
      ROTATION_APPROVER_ID: undefined,
    };
    const validated = validateRotateApplicationRoleRequest(soloOwnerEnv);
    expect(validated.ok).toBe(true);
    expect(validated.approvalPolicy).toBe('SOLO_OWNER');
    expect(validated.ownerId).toBe('sole-project-owner-1');
  });

  it('rejects solo project owner when ROTATION_OWNER_ID is missing or empty', () => {
    const missingOwnerEnv = {
      ...validEnv,
      PROJECT_OWNER_POLICY: 'SOLO_OWNER',
      ROTATION_OWNER_ID: '',
      ROTATION_ACTOR_ID: undefined,
      ROTATION_APPROVER_ID: undefined,
    };
    expect(() => validateRotateApplicationRoleRequest(missingOwnerEnv)).toThrow(
      /ROTATION_OWNER_ID or PROJECT_OWNER_ID is required for solo owner authorization/
    );
  });

  it('rejects mismatched database targets between admin and app URLs', () => {
    const mismatchEnv = {
      ...validEnv,
      ORIGINAL_ADMIN_DIRECT_URL: 'postgresql://admin:pass@remotehost:5432/other_db',
    };
    expect(() => validateRotateApplicationRoleRequest(mismatchEnv)).toThrow(
      /Admin connection target.*does not match DATABASE_URL target/
    );
  });

  it('builds application database URL without corrupting host/db/query', () => {
    const base = 'postgresql://probe:oldpass@127.0.0.1:5432/cloud_sql_development_database?sslmode=disable';
    const updated = buildApplicationDatabaseUrl(base, 'manaratak_application', 'new_secret_pwd');
    expect(updated).toBe('postgresql://manaratak_application:new_secret_pwd@127.0.0.1:5432/cloud_sql_development_database?sslmode=disable');
  });

  it('updates env content preserving other variables and comments', () => {
    const original = `# Initial config
NODE_ENV=development
DATABASE_URL=old_url
SOME_KEY=some_val`;
    const updated = updateEnvContent(original, {
      DATABASE_URL: 'new_url',
      DB_APPLICATION_PASSWORD: 'new_password',
    });
    expect(updated).toContain('# Initial config');
    expect(updated).toContain('SOME_KEY=some_val');
    expect(updated).toContain('DATABASE_URL=new_url');
    expect(updated).toContain('DB_APPLICATION_PASSWORD=new_password');
    expect(updated).not.toContain('DATABASE_URL=old_url');
  });

  it('redacts secret credentials and URLs from error messages', () => {
    const secret = 'super-secret-password-xyz';
    const rawMsg = `FATAL: password authentication failed for user manaratak_application with password super-secret-password-xyz at postgresql://user:mysecretpass@localhost:5432/db`;
    const redacted = redactSecret(rawMsg, secret);
    expect(redacted).not.toContain(secret);
    expect(redacted).not.toContain('mysecretpass');
    expect(redacted).toContain('[REDACTED_SECRET]');
  });

  it('rejects pre-existing staging paths', () => {
    const symlinkTarget = path.join(tmpDir, 'real_file.txt');
    fs.writeFileSync(symlinkTarget, 'hello');
    expect(() => writeExclusiveSecureFile(symlinkTarget, 'content')).toThrow(/already exists/);
  });

  it('rejects symbolic links when the host permits creating them', ({ skip }) => {
    const symlinkTarget = path.join(tmpDir, 'real_file.txt');
    fs.writeFileSync(symlinkTarget, 'hello');
    const linkPath = path.join(tmpDir, 'symlink.txt');
    try {
      fs.symlinkSync(symlinkTarget, linkPath);
    } catch (error) {
      if (process.platform === 'win32' && (error as NodeJS.ErrnoException).code === 'EPERM') {
        skip();
        return;
      }
      throw error;
    }

    expect(() => assertPathNotPreExisting(linkPath)).toThrow(/is a symbolic link/);
  });

  it('executes ALTER ROLE using stdin and redacts password on error', () => {
    const fakeExecSync = vi.fn().mockReturnValue({
      status: 1,
      stderr: 'psql error: secret-pass-123 failed',
    });

    expect(() =>
      executeAlterRolePassword({
        adminUrl: 'postgresql://admin:pass@localhost:5432/db',
        roleName: 'manaratak_application',
        newPassword: 'secret-pass-123',
        execSync: fakeExecSync,
      })
    ).toThrow(/ALTER_ROLE_FAILED: psql error: \[REDACTED_SECRET\] failed/);

    expect(fakeExecSync).toHaveBeenCalledWith(
      'psql',
      ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--quiet'],
      expect.objectContaining({
        input: expect.stringContaining('ALTER ROLE "manaratak_application" WITH PASSWORD \'secret-pass-123\';'),
      })
    );
  });

  it('simulates failure BEFORE SQL dispatch (spawning error, cleans up temp files cleanly)', async () => {
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'DATABASE_URL=old_url\n');

    const fakeExecSync = vi.fn().mockReturnValue({
      error: { code: 'ENOENT', message: 'spawn psql ENOENT' },
    });

    await expect(
      runRotationWorkflow({
        env: validEnv,
        rootDir: tmpDir,
        execSync: fakeExecSync,
      })
    ).rejects.toThrow(/PRE_DISPATCH_PSQL_NOT_FOUND/);

    // Staging and journal must be cleaned up because no SQL was ever sent to server
    expect(fs.existsSync(path.join(tmpDir, '.env.tmp.rotation'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.env.backup.rotation'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.rotation.journal.json'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.env.unconfirmed.rotation'))).toBe(false);
    // Original .env is untouched
    expect(fs.readFileSync(envFile, 'utf8')).toBe('DATABASE_URL=old_url\n');
  });

  it('simulates UNCERTAIN OUTCOME (server commit followed by lost acknowledgment / timeout)', async () => {
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'DATABASE_URL=old_url\n');

    // Simulate psql sending SQL, but network drop / timeout occurs before acknowledgment
    const fakeExecSync = vi.fn().mockReturnValue({
      status: 1,
      stderr: 'FATAL: terminating connection due to administrator command / server dropped connection',
    });

    await expect(
      runRotationWorkflow({
        env: validEnv,
        rootDir: tmpDir,
        execSync: fakeExecSync,
      })
    ).rejects.toThrow(/UNCERTAIN_MUTATION_STATE/);

    // CRITICAL: Must preserve the newly generated credential in recovery artifact
    const unconfirmedArtifact = path.join(tmpDir, '.env.unconfirmed.rotation');
    const journalFile = path.join(tmpDir, '.rotation.journal.json');

    expect(fs.existsSync(unconfirmedArtifact)).toBe(true);
    expect(fs.existsSync(journalFile)).toBe(true);

    const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8'));
    expect(journal.stage).toBe('UNCERTAIN_MUTATION_STATE');
    expect(journal.recoveryArtifact).toBe('.env.unconfirmed.rotation');

    // Original .env must NOT be overwritten while state is uncertain
    expect(fs.readFileSync(envFile, 'utf8')).toBe('DATABASE_URL=old_url\n');
    // Staged temporary file was moved to unconfirmed artifact
    expect(fs.existsSync(path.join(tmpDir, '.env.tmp.rotation'))).toBe(false);
  });

  it('simulates timeout during ALTER ROLE (preserves recovery artifact)', async () => {
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'DATABASE_URL=old_url\n');

    const fakeExecSync = vi.fn().mockReturnValue({
      error: { code: 'ETIMEDOUT', message: 'operation timed out' },
      status: null,
    });

    await expect(
      runRotationWorkflow({
        env: validEnv,
        rootDir: tmpDir,
        execSync: fakeExecSync,
      })
    ).rejects.toThrow(/UNCERTAIN_MUTATION_STATE/);

    expect(fs.existsSync(path.join(tmpDir, '.env.unconfirmed.rotation'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.rotation.journal.json'))).toBe(true);
  });

  it('rejects execution if a pre-existing unconfirmed artifact or journal exists', async () => {
    const journalFile = path.join(tmpDir, '.rotation.journal.json');
    fs.writeFileSync(journalFile, '{"stage":"UNCERTAIN_MUTATION_STATE"}');

    await expect(
      runRotationWorkflow({
        env: validEnv,
        rootDir: tmpDir,
      })
    ).rejects.toThrow(/PRE_EXISTING_JOURNAL/);
  });

  it('simulates crash AFTER confirmed database change but before rename (preserves recovery files)', async () => {
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'DATABASE_URL=old_url\n');

    const originalRename = fs.renameSync;
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('Simulated IO error during file rename');
    });

    const fakeExecSync = vi.fn().mockReturnValue({ status: 0, stdout: '' });

    await expect(
      runRotationWorkflow({
        env: validEnv,
        rootDir: tmpDir,
        execSync: fakeExecSync,
      })
    ).rejects.toThrow(/CRITICAL_PARTIAL_FAILURE/);

    // Temp file and journal MUST be preserved for operator recovery
    expect(fs.existsSync(path.join(tmpDir, '.env.tmp.rotation'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.rotation.journal.json'))).toBe(true);
    const journal = JSON.parse(fs.readFileSync(path.join(tmpDir, '.rotation.journal.json'), 'utf8'));
    expect(journal.stage).toBe('DATABASE_ALTERED');

    renameSpy.mockRestore();
  });

  it('completes successful rotation workflow atomically', async () => {
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'DATABASE_URL=postgresql://manaratak_probe:pass@localhost:5432/cloud_sql_development_database\n');

    const fakeExecSync = vi.fn().mockReturnValue({ status: 0, stdout: '' });
    const fixedPassword = 'generated-safe-token-for-test-32chars';

    const result = await runRotationWorkflow({
      env: validEnv,
      rootDir: tmpDir,
      execSync: fakeExecSync,
      generatePassword: () => fixedPassword,
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.databaseMutated).toBe(true);
    expect(result.configUpdated).toBe(true);

    const updatedContent = fs.readFileSync(envFile, 'utf8');
    expect(updatedContent).toContain(`DB_APPLICATION_PASSWORD=${fixedPassword}`);
    expect(updatedContent).toContain(
      `DATABASE_URL=postgresql://manaratak_application:${fixedPassword}@localhost:5432/cloud_sql_development_database`
    );

    // Intermediate artifacts removed
    expect(fs.existsSync(path.join(tmpDir, '.env.tmp.rotation'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.env.backup.rotation'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.rotation.journal.json'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.env.unconfirmed.rotation'))).toBe(false);
  });

  it('executes ALTER ROLE using Node database driver and redacts password on error', async () => {
    const fakeDriver = {
      execute: vi.fn().mockRejectedValue(new Error('connection timeout: secret-node-pass-456')),
    };

    await expect(
      executeAlterRoleWithNodeDriver({
        adminUrl: 'postgresql://admin:pass@localhost:5432/db',
        roleName: 'manaratak_application',
        newPassword: 'secret-node-pass-456',
        driver: fakeDriver,
      })
    ).rejects.toThrow(/ALTER_ROLE_FAILED: connection timeout: \[REDACTED_SECRET\]/);

    expect(fakeDriver.execute).toHaveBeenCalledWith(
      expect.stringContaining('ALTER ROLE "manaratak_application" WITH PASSWORD \'secret-node-pass-456\';')
    );
  });

  it('completes successful rotation workflow using Node database driver', async () => {
    const envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'DATABASE_URL=postgresql://manaratak_probe:pass@localhost:5432/cloud_sql_development_database\n');

    const fakeDriver = {
      execute: vi.fn().mockResolvedValue(true),
    };
    const fixedPassword = 'node-driver-token-for-test-32chars';

    const result = await runRotationWorkflow({
      env: validEnv,
      rootDir: tmpDir,
      driver: fakeDriver,
      generatePassword: () => fixedPassword,
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.databaseMutated).toBe(true);
    expect(result.configUpdated).toBe(true);

    const updatedContent = fs.readFileSync(envFile, 'utf8');
    expect(updatedContent).toContain(`DB_APPLICATION_PASSWORD=${fixedPassword}`);
    expect(updatedContent).toContain(
      `DATABASE_URL=postgresql://manaratak_application:${fixedPassword}@localhost:5432/cloud_sql_development_database`
    );
  });

  it('completes secret handoff without writing to .env or generating new password', async () => {
    const fakeDriver = {
      execute: vi.fn().mockResolvedValue(true),
    };
    const suppliedSecret = 'persistent-studio-secret-999xyz';
    const generateSpy = vi.fn();

    const secretEnv = {
      ...validEnv,
      PROJECT_OWNER_POLICY: 'SOLO_OWNER',
      ROTATION_OWNER_ID: 'solo-owner-real',
      DB_APPLICATION_PASSWORD: suppliedSecret,
    };

    const result = await runRotationWorkflow({
      env: secretEnv,
      rootDir: tmpDir,
      driver: fakeDriver,
      generatePassword: generateSpy,
      persistMode: 'secret',
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.databaseMutated).toBe(true);
    expect(result.configUpdated).toBe(false);
    expect(result.secretHandoff).toBe(true);
    expect(result.secretSource).toBe('DB_APPLICATION_PASSWORD');

    // Never generated an internal password
    expect(generateSpy).not.toHaveBeenCalled();

    // Dispatched the supplied secret directly
    expect(fakeDriver.execute).toHaveBeenCalledWith(
      expect.stringContaining(`ALTER ROLE "manaratak_application" WITH PASSWORD '${suppliedSecret}';`)
    );

    // Did NOT write ephemeral .env or recovery artifacts
    expect(fs.existsSync(path.join(tmpDir, '.env'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.env.tmp.rotation'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.rotation.journal.json'))).toBe(false);
  });

  it('preserves recovery journal on uncertain outcome in secret handoff mode without writing .env', async () => {
    const fakeDriver = {
      execute: vi.fn().mockRejectedValue(new Error('timeout waiting for response')),
    };
    const suppliedSecret = 'persistent-studio-secret-999xyz';

    const secretEnv = {
      ...validEnv,
      PROJECT_OWNER_POLICY: 'SOLO_OWNER',
      ROTATION_OWNER_ID: 'solo-owner-real',
      DB_APPLICATION_PASSWORD: suppliedSecret,
    };

    await expect(
      runRotationWorkflow({
        env: secretEnv,
        rootDir: tmpDir,
        driver: fakeDriver,
        persistMode: 'secret',
      })
    ).rejects.toThrow(/UNCERTAIN_MUTATION_STATE/);

    // .env and .env.unconfirmed.rotation were NOT created
    expect(fs.existsSync(path.join(tmpDir, '.env'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.env.unconfirmed.rotation'))).toBe(false);

    // Journal MUST be preserved with UNCERTAIN_MUTATION_STATE and secretSource: DB_APPLICATION_PASSWORD
    const journalPath = path.join(tmpDir, '.rotation.journal.json');
    expect(fs.existsSync(journalPath)).toBe(true);
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    expect(journal.stage).toBe('UNCERTAIN_MUTATION_STATE');
    expect(journal.secretSource).toBe('DB_APPLICATION_PASSWORD');
    expect(journal.role).toBe('manaratak_application');
  });

  it('rejects secret handoff if DB_APPLICATION_PASSWORD is empty', async () => {
    const secretEnv = {
      ...validEnv,
      PROJECT_OWNER_POLICY: 'SOLO_OWNER',
      ROTATION_OWNER_ID: 'solo-owner-real',
      DB_APPLICATION_PASSWORD: '   ',
    };

    await expect(
      runRotationWorkflow({
        env: secretEnv,
        rootDir: tmpDir,
        persistMode: 'secret',
      })
    ).rejects.toThrow(/DB_APPLICATION_PASSWORD is required for secret handoff/);
  });
});
