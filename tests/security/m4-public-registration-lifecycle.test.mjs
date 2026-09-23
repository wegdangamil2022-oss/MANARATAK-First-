import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import {
  RegisterUserUseCase,
  VerifyEmailUseCase,
  ResendVerificationUseCase,
  ActivateIdentityUseCase,
  IdentityPrincipalAccessValidator,
} from '../../packages/application/dist/index.js';
import {
  InMemoryIdentityRepository,
  InMemoryEmailVerificationTokenRepository,
  CapturedEmailDeliveryGateway,
  PasswordHasher,
  PrismaCredentialVerifier,
} from '../../packages/infrastructure/dist/index.js';
import {
  Account,
  AccountAccessState,
  ContactRegistry,
  Identity,
  IdentityType,
  LifeStatus,
  Profile,
  TechnicalMetadata,
  User,
} from '../../packages/domain/dist/index.js';

test('M4.2 — Public Registration, Email Verification & Account Lifecycle', async (t) => {
  let identityRepo;
  let tokenRepo;
  let emailGateway;
  let registerUseCase;
  let verifyUseCase;
  let resendUseCase;
  let activateUseCase;
  let accessValidator;

  const setup = () => {
    identityRepo = new InMemoryIdentityRepository();
    tokenRepo = new InMemoryEmailVerificationTokenRepository();
    emailGateway = new CapturedEmailDeliveryGateway();

    registerUseCase = new RegisterUserUseCase({
      identityRepository: identityRepo,
      tokenRepository: tokenRepo,
      emailDeliveryGateway: emailGateway,
      passwordHasher: {
        hash: (pw) => PasswordHasher.hash(pw),
      },
    });

    verifyUseCase = new VerifyEmailUseCase(identityRepo, tokenRepo);
    resendUseCase = new ResendVerificationUseCase(identityRepo, tokenRepo, emailGateway);
    activateUseCase = new ActivateIdentityUseCase(identityRepo);
    accessValidator = new IdentityPrincipalAccessValidator(identityRepo);
  };

  await t.test('1. Register valid user provisions new identity and dispatches verification email', async () => {
    setup();

    const output = await registerUseCase.execute({
      displayName: 'Wegdan Gamil',
      primaryEmail: 'wegdan@example.com',
      password: 'StrongPassword123!',
      preferredLanguage: 'ar',
    });

    assert.ok(output.identityId);
    assert.equal(output.email, 'wegdan@example.com');
    assert.equal(output.status, LifeStatus.PROVISIONED);
    assert.equal(output.isEmailVerified, false);

    const savedIdentity = await identityRepo.findById(output.identityId);
    assert.ok(savedIdentity);
    assert.equal(savedIdentity.status, LifeStatus.PROVISIONED);
    assert.equal(savedIdentity.user.contactRegistry.isEmailVerified, false);

    const dispatched = emailGateway.getLastDispatchedEmail();
    assert.ok(dispatched);
    assert.equal(dispatched.email, 'wegdan@example.com');
    assert.ok(dispatched.token);
  });

  await t.test('2. Duplicate registration with same email (even with mixed case/spaces) is rejected', async () => {
    setup();

    await registerUseCase.execute({
      displayName: 'User One',
      primaryEmail: 'student@example.com',
      password: 'StrongPassword123!',
    });

    await assert.rejects(
      async () => {
        await registerUseCase.execute({
          displayName: 'User Two',
          primaryEmail: '  STUDENT@example.com ',
          password: 'AnotherPassword456!',
        });
      },
      (err) => {
        assert.equal(err.code, 'EMAIL_ALREADY_EXISTS');
        return true;
      }
    );
  });

  await t.test('3. Password is encrypted using timing-safe scrypt with parameters', async () => {
    const rawPassword = 'SecureSecretPassword789!';
    const hash = await PasswordHasher.hash(rawPassword);
    assert.match(hash, /^scrypt:16384:8:1:[0-9a-f]{32}:[0-9a-f]{128}$/);

    const isMatch = await PasswordHasher.verify(rawPassword, hash);
    assert.equal(isMatch, true);

    const isBadMatch = await PasswordHasher.verify('WrongPassword!', hash);
    assert.equal(isBadMatch, false);
  });

  await t.test('4 & 5. New identity is in PROVISIONED lifecycle and email is unverified', async () => {
    setup();

    const output = await registerUseCase.execute({
      displayName: 'Ahmad Salem',
      primaryEmail: 'ahmad@example.com',
      password: 'Password999!',
    });

    const identity = await identityRepo.findById(output.identityId);
    assert.equal(identity.status, LifeStatus.PROVISIONED);
    assert.equal(identity.user.contactRegistry.isEmailVerified, false);
  });

  await t.test('6. Login is strictly DENIED for PROVISIONED or unverified identity', async () => {
    setup();

    const output = await registerUseCase.execute({
      displayName: 'Fatima Ali',
      primaryEmail: 'fatima@example.com',
      password: 'Password999!',
    });

    // Test IdentityPrincipalAccessValidator
    const isAllowed = await accessValidator.isAuthenticationAllowed(output.identityId);
    assert.equal(isAllowed, false, 'PROVISIONED + unverified identity must not be allowed to authenticate');

    // Test PrismaCredentialVerifier eligibility guard
    const mockPrisma = {
      identityRecord: {
        findUnique: async () => ({
          id: output.identityId,
          status: LifeStatus.PROVISIONED,
          user: { isEmailVerified: false },
          account: { accessState: AccountAccessState.ACTIVE },
          credentials: [{ type: 'password', passwordHash: 'dummy', disabled: false }],
        }),
      },
    };
    const credVerifier = new PrismaCredentialVerifier(mockPrisma);
    const verifyResult = await credVerifier.verify(output.identityId, 'Password999!');
    assert.equal(verifyResult, false, 'PrismaCredentialVerifier must reject PROVISIONED / unverified identity');
  });

  await t.test('7 & 8. Valid verification token activates identity and marks email as verified', async () => {
    setup();

    const reg = await registerUseCase.execute({
      displayName: 'Khaled Omar',
      primaryEmail: 'khaled@example.com',
      password: 'Password999!',
    });

    const dispatched = emailGateway.getLastDispatchedEmail();
    assert.ok(dispatched);

    const verifyResult = await verifyUseCase.execute({ token: dispatched.token });
    assert.equal(verifyResult.success, true);
    assert.equal(verifyResult.status, LifeStatus.ACTIVE);
    assert.equal(verifyResult.isEmailVerified, true);

    const updatedIdentity = await identityRepo.findById(reg.identityId);
    assert.equal(updatedIdentity.status, LifeStatus.ACTIVE);
    assert.equal(updatedIdentity.user.contactRegistry.isEmailVerified, true);
  });

  await t.test('9. Reused verification token is rejected', async () => {
    setup();

    await registerUseCase.execute({
      displayName: 'Replay User',
      primaryEmail: 'replay@example.com',
      password: 'Password999!',
    });

    const token = emailGateway.getLastDispatchedEmail().token;

    // First use succeeds
    await verifyUseCase.execute({ token });

    // Second use must fail
    await assert.rejects(
      async () => {
        await verifyUseCase.execute({ token });
      },
      (err) => {
        assert.equal(err.code, 'VERIFICATION_TOKEN_ALREADY_USED');
        return true;
      }
    );
  });

  await t.test('10. Expired verification token is rejected', async () => {
    setup();

    await registerUseCase.execute({
      displayName: 'Expired Token User',
      primaryEmail: 'expired@example.com',
      password: 'Password999!',
    });

    const rawToken = emailGateway.getLastDispatchedEmail().token;
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    // Manually expire the token in repository
    const stored = await tokenRepo.findByTokenHash(tokenHash);
    stored.expiresAt = new Date(Date.now() - 1000);
    await tokenRepo.save(stored);

    await assert.rejects(
      async () => {
        await verifyUseCase.execute({ token: rawToken });
      },
      (err) => {
        assert.equal(err.code, 'VERIFICATION_TOKEN_EXPIRED');
        return true;
      }
    );
  });

  await t.test('11. Invalid verification token is rejected', async () => {
    setup();

    await assert.rejects(
      async () => {
        await verifyUseCase.execute({ token: 'completely-bogus-token-12345' });
      },
      (err) => {
        assert.equal(err.code, 'VERIFICATION_TOKEN_INVALID');
        return true;
      }
    );
  });

  await t.test('12. Resend verification issues a new token and invalidates the previous pending token', async () => {
    setup();

    await registerUseCase.execute({
      displayName: 'Resend User',
      primaryEmail: 'resend@example.com',
      password: 'Password999!',
    });

    const firstToken = emailGateway.getLastDispatchedEmail().token;
    const firstHash = createHash('sha256').update(firstToken).digest('hex');

    // Resend
    const resendResult = await resendUseCase.execute({ email: 'resend@example.com' });
    assert.equal(resendResult.success, true);

    const secondToken = emailGateway.getLastDispatchedEmail().token;
    assert.notEqual(firstToken, secondToken, 'New token must differ from first token');

    // Old token should now be consumed/invalidated
    const oldRecord = await tokenRepo.findByTokenHash(firstHash);
    assert.ok(oldRecord.consumedAt, 'Old token must be marked consumed/invalidated');

    await assert.rejects(
      async () => {
        await verifyUseCase.execute({ token: firstToken });
      },
      (err) => {
        assert.equal(err.code, 'VERIFICATION_TOKEN_ALREADY_USED');
        return true;
      }
    );

    // New token works
    const secondVerify = await verifyUseCase.execute({ token: secondToken });
    assert.equal(secondVerify.success, true);
  });

  await t.test('13. Authenticated login allowed once identity is ACTIVE and verified', async () => {
    setup();

    const reg = await registerUseCase.execute({
      displayName: 'Active Login User',
      primaryEmail: 'activelogin@example.com',
      password: 'Password999!',
    });

    const token = emailGateway.getLastDispatchedEmail().token;
    await verifyUseCase.execute({ token });

    const isAllowed = await accessValidator.isAuthenticationAllowed(reg.identityId);
    assert.equal(isAllowed, true, 'ACTIVE + verified identity must be allowed to authenticate');
  });

  await t.test('14. ActivateIdentityUseCase cannot self-verify email without proof (fails if unverified)', async () => {
    setup();

    const identity = new Identity({
      type: IdentityType.Human,
      status: LifeStatus.PROVISIONED,
      user: new User({
        profile: new Profile({ displayName: 'Unverified Human' }),
        contactRegistry: new ContactRegistry({
          primaryEmail: 'unverified@example.com',
          isEmailVerified: false,
        }),
      }),
      account: new Account({
        identityId: 'id-unverified',
        accessState: 'Active',
      }),
      technicalMetadata: TechnicalMetadata.create('test'),
    });
    await identityRepo.save(identity);

    // Try calling ActivateIdentityUseCase directly
    const result = await activateUseCase.execute(identity.id.toString());
    assert.equal(result.isFailure, true, 'ActivateIdentityUseCase must fail if email is unverified');
    const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message;
    assert.match(
      errorMessage,
      /Cannot activate user without verifying at least one primary contact channel/,
      'Must refuse activation without proof'
    );

    const reloaded = await identityRepo.findById(identity.id.toString());
    assert.equal(reloaded.status, LifeStatus.PROVISIONED, 'Status must remain PROVISIONED');
    assert.equal(reloaded.user.contactRegistry.isEmailVerified, false, 'Email must remain unverified');
  });

  await t.test('15. AuthRouter HTTP endpoints enforce strict input validation, prevent privilege injection, and handle registration', async () => {
    setup();

    const express = (await import('express')).default;
    const request = (await import('supertest')).default;
    const { AuthRouter } = await import('../../apps/api/dist/presentation/api/router/AuthRouter.js');

    const app = express();
    app.use(express.json());

    const mockSecurityService = {
      getRateLimiter: () => ({
        consume: async () => ({ allowed: true, remaining: 100 }),
      }),
    };

    const router = AuthRouter.create({
      authService: {},
      identityRepository: identityRepo,
      securityService: mockSecurityService,
      principalAccessValidator: accessValidator,
      emailVerificationTokenRepository: tokenRepo,
      emailDeliveryGateway: emailGateway,
      registerUserUseCase: registerUseCase,
      verifyEmailUseCase: verifyUseCase,
      resendVerificationUseCase: resendUseCase,
    });
    app.use('/auth', router);

    // A. Injection attempt (sending forbidden privileged fields)
    const injectionRes = await request(app)
      .post('/auth/register')
      .send({
        displayName: 'Attacker',
        primaryEmail: 'attacker@example.com',
        password: 'ValidPassword123!',
        role: 'admin',
        isEmailVerified: true,
      });
    assert.equal(injectionRes.status, 400, 'Must reject unknown/privileged fields due to strict schema');
    assert.equal(injectionRes.body.error.code, 'VALIDATION_ERROR');

    // B. Successful registration
    const validRes = await request(app)
      .post('/auth/register')
      .send({
        displayName: 'Legitimate Student',
        primaryEmail: 'student.legit@example.com',
        password: 'LegitPassword123!',
      });
    assert.equal(validRes.status, 201);
    assert.equal(validRes.body.data.status, 'PROVISIONED');
    assert.equal(validRes.body.data.isEmailVerified, false);

    // C. Duplicate registration
    const duplicateRes = await request(app)
      .post('/auth/register')
      .send({
        displayName: 'Duplicate Student',
        primaryEmail: 'student.legit@example.com',
        password: 'AnotherPassword123!',
      });
    assert.equal(duplicateRes.status, 409);
    assert.equal(duplicateRes.body.error.code, 'EMAIL_ALREADY_EXISTS');

    // D. Email verification via HTTP
    const dispatched = emailGateway.getLastDispatchedEmail();
    assert.ok(dispatched);

    const verifyRes = await request(app)
      .post('/auth/verify-email')
      .send({ token: dispatched.token });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.data.verified, true);
    assert.equal(verifyRes.body.data.status, 'ACTIVE');

    // E. Re-verification fails via HTTP
    const reVerifyRes = await request(app)
      .post('/auth/verify-email')
      .send({ token: dispatched.token });
    assert.equal(reVerifyRes.status, 400);
    assert.equal(reVerifyRes.body.error.code, 'VERIFICATION_TOKEN_ALREADY_USED');

    // F. Resend verification via HTTP returns generic 200
    const resendRes = await request(app)
      .post('/auth/resend-verification')
      .send({ email: 'nonexistent@example.com' });
    assert.equal(resendRes.status, 200);
    assert.match(resendRes.body.data.message, /If this account requires verification/);
  });
});
