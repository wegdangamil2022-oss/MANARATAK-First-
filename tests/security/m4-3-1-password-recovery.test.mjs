import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
} from '@manaratak/application';
import {
  InMemoryIdentityRepository,
  InMemoryPasswordResetTokenRepository,
  CapturedEmailDeliveryGateway,
  PasswordHasher,
} from '@manaratak/infrastructure';
import {
  Identity,
  User,
  Profile,
  ContactRegistry,
  Account,
  TechnicalMetadata,
  IdentityType,
  LifeStatus,
} from '@manaratak/domain';

// Helper to construct a test identity matching domain contracts
function createTestIdentity({ email, isEmailVerified = false, status = LifeStatus.PROVISIONED }) {
  const profile = new Profile({
    displayName: 'Test User',
    preferredLanguage: 'ar',
    timeZone: 'UTC',
  });
  const contactRegistry = new ContactRegistry({
    primaryEmail: email,
    isEmailVerified,
    isPhoneVerified: false,
  });
  const user = new User({ profile, contactRegistry });
  const technicalMetadata = TechnicalMetadata.create('test-recovery');
  const identityId = randomUUID();
  const account = new Account({
    identityId,
    accessState: 'Active',
    storageQuotaBytes: 5 * 1024 * 1024 * 1024,
    rateLimitMax: 100,
    rateLimitWindowMs: 60_000,
  });
  const identity = new Identity({
    id: identityId,
    type: IdentityType.Human,
    status,
    user,
    account,
    technicalMetadata,
  });
  return identity;
}

test('M4.3.1 - Password Recovery Targeted Test Suite', async (t) => {
  // Setup test harness
  const identityRepository = new InMemoryIdentityRepository();
  const tokenRepository = new InMemoryPasswordResetTokenRepository();
  const emailDeliveryGateway = new CapturedEmailDeliveryGateway();
  
  const activeSessions = new Map();
  const sessionManager = {
    createSession: async (userId, refreshToken) => {
      activeSessions.set(refreshToken, { userId, active: true });
    },
    findRefreshSession: async (refreshToken) => {
      const s = activeSessions.get(refreshToken);
      return s && s.active ? s : null;
    },
    revokeAllSessions: async (userId) => {
      for (const [k, v] of activeSessions.entries()) {
        if (v.userId === userId) {
          activeSessions.delete(k);
        }
      }
    },
  };

  // Mock credential store
  const credentialsByUserId = new Map();

  const forgotPasswordUseCase = new ForgotPasswordUseCase({
    identityRepository,
    tokenRepository,
    emailDeliveryGateway,
  });

  const resetPasswordUseCase = new ResetPasswordUseCase({
    identityRepository,
    tokenRepository,
    sessionManager,
    passwordHasher: {
      hash: async (pw) => PasswordHasher.hash(pw),
    },
    prismaClient: {
      $transaction: async (fn) => {
        const tx = {
          credentialRecord: {
            updateMany: async ({ where, data }) => {
              credentialsByUserId.set(where.identityId, data.passwordHash);
              return { count: 1 };
            },
          },
          passwordResetTokenRecord: {
            update: async ({ where, data }) => {
              await tokenRepository.consume(where.id, data.consumedAt);
              return { id: where.id, ...data };
            },
          },
          sessionRecord: {
            updateMany: async ({ where, data }) => {
              await sessionManager.revokeAllSessions(where.identityId);
              return { count: 1 };
            },
          },
        };
        return fn(tx);
      },
    },
  });

  // Seed an existing test user
  const existingEmail = 'student@example.edu';
  const initialPassword = 'InitialSecurePassword123!';
  const initialHash = await PasswordHasher.hash(initialPassword);
  const testIdentity = createTestIdentity({
    email: existingEmail,
    isEmailVerified: false,
    status: LifeStatus.PROVISIONED,
  });
  await identityRepository.save(testIdentity);
  credentialsByUserId.set(testIdentity.id.toString(), initialHash);

  let capturedRawToken = null;

  // 1. Forgot password لحساب موجود → generic response.
  await t.test('1. Forgot password for existing account returns generic anti-enumeration response', async () => {
    emailDeliveryGateway.clear();
    const result = await forgotPasswordUseCase.execute({ primaryEmail: existingEmail });
    assert.equal(result.success, true);
    assert.equal(
      result.message,
      'If an account with this email exists, a password reset link has been sent.'
    );
    assert.equal(result.identityId, undefined, 'Must not return identityId');

    const dispatched = emailDeliveryGateway.getLastDispatchedResetEmail();
    assert.ok(dispatched, 'An email must be dispatched');
    assert.equal(dispatched.email, existingEmail);
    assert.ok(dispatched.token, 'A raw token was dispatched');
    capturedRawToken = dispatched.token;
  });

  // 2. Forgot password لحساب غير موجود → نفس generic response.
  await t.test('2. Forgot password for non-existent account returns identical generic response without dispatching email', async () => {
    emailDeliveryGateway.clear();
    const result = await forgotPasswordUseCase.execute({ primaryEmail: 'nonexistent@example.com' });
    assert.equal(result.success, true);
    assert.equal(
      result.message,
      'If an account with this email exists, a password reset link has been sent.'
    );
    assert.equal(emailDeliveryGateway.getLastDispatchedResetEmail(), undefined, 'No email sent for non-existent user');
  });

  // 3. Reset token مخزن Hash فقط.
  await t.test('3. Reset token is stored ONLY as SHA-256 hash, never in plaintext', async () => {
    const rawTokenHash = createHash('sha256').update(capturedRawToken).digest('hex');
    const storedByRaw = await tokenRepository.findByTokenHash(capturedRawToken);
    assert.equal(storedByRaw, null, 'Plaintext token must NOT be found in token repository');

    const storedByHash = await tokenRepository.findByTokenHash(rawTokenHash);
    assert.ok(storedByHash, 'Token must be queryable by SHA-256 hash');
    assert.equal(storedByHash.tokenHash, rawTokenHash);
    assert.notEqual(storedByHash.tokenHash, capturedRawToken, 'Stored hash must differ from raw token');
  });

  // 4. Valid token → password updated.
  const newPassword = 'NewSecretPassword2026!';
  await t.test('4. Valid token successfully resets password', async () => {
    // Also establish an active session before reset to verify session revocation later
    await sessionManager.createSession(testIdentity.id.toString(), 'refresh-token-session-1');
    const sessionActiveBefore = await sessionManager.findRefreshSession('refresh-token-session-1');
    assert.ok(sessionActiveBefore, 'Session should be active before reset');

    const result = await resetPasswordUseCase.execute({
      token: capturedRawToken,
      newPassword,
    });
    assert.equal(result.success, true);
    assert.equal(
      result.message,
      'Password has been successfully reset. Please log in with your new password.'
    );
  });

  // 5. Invalid token → denied.
  await t.test('5. Invalid token is denied', async () => {
    await assert.rejects(
      async () => {
        await resetPasswordUseCase.execute({
          token: 'invalid-nonexistent-token-1234567890abcdef',
          newPassword: 'AnotherPassword999!',
        });
      },
      (err) => err.code === 'RESET_TOKEN_INVALID'
    );
  });

  // 6. Expired token → denied.
  await t.test('6. Expired token is denied', async () => {
    const expiredRawToken = 'expiredrawtokencsprng12345678901234567890123456789012345678901234';
    const expiredHash = createHash('sha256').update(expiredRawToken).digest('hex');
    await tokenRepository.save({
      id: randomUUID(),
      identityId: testIdentity.id.toString(),
      tokenHash: expiredHash,
      email: existingEmail,
      expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 minute ago
      consumedAt: null,
      createdAt: new Date(Date.now() - 1000 * 120),
    });

    await assert.rejects(
      async () => {
        await resetPasswordUseCase.execute({
          token: expiredRawToken,
          newPassword: 'AnotherPassword999!',
        });
      },
      (err) => err.code === 'RESET_TOKEN_EXPIRED'
    );
  });

  // 7. Used token → denied.
  await t.test('7. Used token is denied (Single-use enforcement)', async () => {
    await assert.rejects(
      async () => {
        await resetPasswordUseCase.execute({
          token: capturedRawToken,
          newPassword: 'AnotherPassword999!',
        });
      },
      (err) => err.code === 'RESET_TOKEN_ALREADY_USED'
    );
  });

  // 8. Replay token → denied.
  await t.test('8. Replay attempt with previously consumed token is strictly rejected', async () => {
    await assert.rejects(
      async () => {
        await resetPasswordUseCase.execute({
          token: capturedRawToken,
          newPassword: 'ReplayPasswordAttempt123!',
        });
      },
      (err) => err.code === 'RESET_TOKEN_ALREADY_USED'
    );
  });

  // 9. Old password no longer valid from credential perspective.
  await t.test('9. Old password is no longer valid', async () => {
    const currentStoredHash = credentialsByUserId.get(testIdentity.id.toString());
    const isOldValid = await PasswordHasher.verify(initialPassword, currentStoredHash);
    assert.equal(isOldValid, false, 'Old password must fail verification against current hash');
  });

  // 10. New password valid.
  await t.test('10. New password verifies correctly with scrypt PasswordHasher', async () => {
    const currentStoredHash = credentialsByUserId.get(testIdentity.id.toString());
    const isNewValid = await PasswordHasher.verify(newPassword, currentStoredHash);
    assert.equal(isNewValid, true, 'New password must verify successfully');
    assert.match(currentStoredHash, /^scrypt:16384:8:1:/, 'Must use standard scrypt format');
  });

  // 11. Existing sessions revoked after reset.
  await t.test('11. Existing sessions are revoked after reset', async () => {
    const sessionAfter = await sessionManager.findRefreshSession('refresh-token-session-1');
    assert.equal(sessionAfter, null, 'Previous session must be revoked');
  });

  // 12. Reset لا يفعّل email/account.
  await t.test('12. Reset does NOT activate account or change isEmailVerified status', async () => {
    const reloadedIdentity = await identityRepository.findById(testIdentity.id.toString());
    assert.ok(reloadedIdentity);
    assert.equal(
      reloadedIdentity.user.contactRegistry.isEmailVerified,
      false,
      'isEmailVerified must remain false'
    );
    assert.equal(
      reloadedIdentity.status,
      LifeStatus.PROVISIONED,
      'Identity LifeStatus must remain PROVISIONED'
    );
  });

  // 13. Multiple forgot requests invalidate/replace old pending token.
  await t.test('13. Multiple forgot requests invalidate/replace old pending token', async () => {
    emailDeliveryGateway.clear();
    // First request
    await forgotPasswordUseCase.execute({ primaryEmail: existingEmail });
    const firstDispatched = emailDeliveryGateway.getLastDispatchedResetEmail();
    const firstHash = createHash('sha256').update(firstDispatched.token).digest('hex');

    // Second request
    await forgotPasswordUseCase.execute({ primaryEmail: existingEmail });
    const secondDispatched = emailDeliveryGateway.getLastDispatchedResetEmail();
    const secondHash = createHash('sha256').update(secondDispatched.token).digest('hex');

    assert.notEqual(firstDispatched.token, secondDispatched.token, 'Tokens must be distinct');

    const firstRecord = await tokenRepository.findByTokenHash(firstHash);
    assert.ok(firstRecord.consumedAt, 'Old pending token must be invalidated (consumedAt set)');

    const secondRecord = await tokenRepository.findByTokenHash(secondHash);
    assert.equal(secondRecord.consumedAt, null, 'New token must be active and pending');

    // Attempting to reset using first token must fail
    await assert.rejects(
      async () => {
        await resetPasswordUseCase.execute({
          token: firstDispatched.token,
          newPassword: 'BrandNewPassword2026!',
        });
      },
      (err) => err.code === 'RESET_TOKEN_ALREADY_USED'
    );

    // Resetting with second token succeeds
    const secondResetResult = await resetPasswordUseCase.execute({
      token: secondDispatched.token,
      newPassword: 'BrandNewPassword2026!',
    });
    assert.equal(secondResetResult.success, true);
  });

  // 14. No plaintext password/token persisted or logged.
  await t.test('14. No plaintext password or token is persisted anywhere', async () => {
    const currentStoredHash = credentialsByUserId.get(testIdentity.id.toString());
    assert.ok(!currentStoredHash.includes(newPassword), 'Hash must never contain plaintext password');
    assert.ok(!currentStoredHash.includes(initialPassword), 'Hash must never contain old plaintext password');
    assert.ok(!currentStoredHash.includes('BrandNewPassword2026!'));

    // Check token repository records
    const allTokens = tokenRepository.tokens;
    for (const record of allTokens.values()) {
      assert.notEqual(record.tokenHash.length, 0);
      assert.equal(record.tokenHash.length, 64, 'Token hash must be SHA-256 (64 hex characters)');
      assert.equal(record.token, undefined, 'Plaintext token field must not exist on record');
    }
  });
});
