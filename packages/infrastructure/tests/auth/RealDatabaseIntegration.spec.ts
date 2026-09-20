import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaSessionManager } from '../../src/auth/PrismaSessionManager';
import { PrismaCredentialVerifier } from '../../src/auth/PrismaCredentialVerifier';
import { PasswordHasher } from '../../src/auth/PasswordHasher';
import { LifeStatus } from '@manaratak/domain';
import { AccountAccessState } from '@manaratak/domain';
import * as crypto from 'crypto';

function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || '';
  if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
    const { SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_DB_NAME } = process.env;
    if (SQL_USER && SQL_PASSWORD && SQL_HOST && SQL_DB_NAME) {
      const encodedPassword = encodeURIComponent(SQL_PASSWORD);
      url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
    }
  }
  return url;
}

const describeWithDatabase = process.env.RUN_DATABASE_INTEGRATION_TESTS === 'true' && getDatabaseUrl()
  ? describe
  : describe.skip;

describeWithDatabase('Real Database Integration Tests (Session & Credentials)', () => {
  let prisma: PrismaClient;
  let sessionManager: PrismaSessionManager;
  let credentialVerifier: PrismaCredentialVerifier;

  const testUser1 = `it-user-1-${Date.now()}`;
  const testUser2 = `it-user-2-${Date.now()}`;
  const passwordPlain = 'SecurePass123_WithEntropy!';
  let passwordHash: string;

  beforeAll(async () => {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      throw new Error('Database URL could not be resolved from environment configurations.');
    }

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });

    sessionManager = new PrismaSessionManager(prisma, 3600); // 1-hour session duration
    credentialVerifier = new PrismaCredentialVerifier(prisma);

    passwordHash = await PasswordHasher.hash(passwordPlain);

    // Idempotently clean up any pre-existing records
    await cleanup();

    // Create Temporary Identities with Associated Accounts
    await prisma.identityRecord.create({
      data: {
        id: testUser1,
        status: LifeStatus.PROVISIONED,
        type: 'Human',
        createdBy: 'system',
        account: {
          create: {
            accessState: AccountAccessState.ACTIVE,
            storageQuotaBytes: 1024 * 1024,
            rateLimitMax: 100,
            rateLimitWindowMs: 60000,
          },
        },
        credentials: {
          create: {
            type: 'password',
            passwordHash,
            disabled: false,
          },
        },
      },
    });

    await prisma.identityRecord.create({
      data: {
        id: testUser2,
        status: LifeStatus.PROVISIONED,
        type: 'Human',
        createdBy: 'system',
        account: {
          create: {
            accessState: AccountAccessState.ACTIVE,
            storageQuotaBytes: 1024 * 1024,
            rateLimitMax: 100,
            rateLimitWindowMs: 60000,
          },
        },
        credentials: {
          create: {
            type: 'password',
            passwordHash,
            disabled: false,
          },
        },
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await cleanup();
      await prisma.$disconnect();
    }
  });

  async function cleanup() {
    const users = [testUser1, testUser2];
    for (const userId of users) {
      await prisma.sessionRecord.deleteMany({ where: { identityId: userId } });
      await prisma.credentialRecord.deleteMany({ where: { identityId: userId } });
      await prisma.accountRecord.deleteMany({ where: { identityId: userId } });
      await prisma.identityRecord.deleteMany({ where: { id: userId } });
    }
  }

  describe('PrismaSessionManager Real DB Integration', () => {
    it('creates and validates a session correctly', async () => {
      const rawToken = 'my-secret-session-token-1';
      await sessionManager.createSession(testUser1, rawToken);

      // Verify validation succeeds with correct user/token
      const isValid = await sessionManager.isValidSession(testUser1, rawToken);
      expect(isValid).toBe(true);

      // Verify only the hashed token is persisted
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const record = await prisma.sessionRecord.findFirst({
        where: { identityId: testUser1 },
      });
      expect(record).toBeDefined();
      expect(record!.refreshTokenHash).toBe(expectedHash);
      expect(record!.refreshTokenHash).not.toBe(rawToken);
    });

    it('rejects wrong token or wrong user', async () => {
      const isWrongToken = await sessionManager.isValidSession(testUser1, 'wrong-session-token');
      expect(isWrongToken).toBe(false);

      const isWrongUser = await sessionManager.isValidSession(testUser2, 'my-secret-session-token-1');
      expect(isWrongUser).toBe(false);
    });

    it('rejects expired sessions', async () => {
      const shortLivedManager = new PrismaSessionManager(prisma, -10); // Negative TTL
      const rawToken = 'immediate-expire-token';
      await shortLivedManager.createSession(testUser1, rawToken);

      const isValid = await shortLivedManager.isValidSession(testUser1, rawToken);
      expect(isValid).toBe(false);
    });

    it('revokes an individual session cleanly', async () => {
      const rawToken = 'revokable-session-token';
      await sessionManager.createSession(testUser1, rawToken);

      let isValid = await sessionManager.isValidSession(testUser1, rawToken);
      expect(isValid).toBe(true);

      await sessionManager.revokeSession(testUser1, rawToken);

      isValid = await sessionManager.isValidSession(testUser1, rawToken);
      expect(isValid).toBe(false);
    });

    it('performs bulk revoke (revoke all) preserving identity isolation', async () => {
      const t1 = 'user1-token-a';
      const t2 = 'user1-token-b';
      const t3 = 'user2-token-c';

      await sessionManager.createSession(testUser1, t1);
      await sessionManager.createSession(testUser1, t2);
      await sessionManager.createSession(testUser2, t3);

      // Bulk revoke all sessions for testUser1
      await sessionManager.revokeAllSessions(testUser1);

      expect(await sessionManager.isValidSession(testUser1, t1)).toBe(false);
      expect(await sessionManager.isValidSession(testUser1, t2)).toBe(false);

      // Verify testUser2 session remains active (Isolation)
      expect(await sessionManager.isValidSession(testUser2, t3)).toBe(true);
    });
  });

  describe('PrismaCredentialVerifier Real DB Integration', () => {
    it('verifies valid credentials succeed and incorrect fail', async () => {
      const isValid = await credentialVerifier.verify(testUser1, passwordPlain);
      expect(isValid).toBe(true);

      const isInvalid = await credentialVerifier.verify(testUser1, 'IncorrectPlainPassword123');
      expect(isInvalid).toBe(false);
    });

    it('rejects verification when the credential is disabled', async () => {
      // Find and disable credential
      const credential = await prisma.credentialRecord.findFirst({
        where: { identityId: testUser1 },
      });
      expect(credential).toBeDefined();

      await prisma.credentialRecord.update({
        where: { id: credential!.id },
        data: { disabled: true },
      });

      const isValid = await credentialVerifier.verify(testUser1, passwordPlain);
      expect(isValid).toBe(false);

      // Re-enable
      await prisma.credentialRecord.update({
        where: { id: credential!.id },
        data: { disabled: false },
      });
    });

    it('rejects verification when the associated account is inactive', async () => {
      // Suspend account
      await prisma.accountRecord.update({
        where: { identityId: testUser1 },
        data: { accessState: AccountAccessState.SUSPENDED },
      });

      const isValid = await credentialVerifier.verify(testUser1, passwordPlain);
      expect(isValid).toBe(false);

      // Reactivate
      await prisma.accountRecord.update({
        where: { identityId: testUser1 },
        data: { accessState: AccountAccessState.ACTIVE },
      });
    });
  });
});
