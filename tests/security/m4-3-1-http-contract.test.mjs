import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { AuthRouter } from '../../apps/api/dist/presentation/api/router/AuthRouter.js';
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
import { randomUUID } from 'node:crypto';

test('AuthRouter - POST /forgot-password & POST /reset-password HTTP Contract', async (t) => {
  const identityRepository = new InMemoryIdentityRepository();
  const passwordResetTokenRepository = new InMemoryPasswordResetTokenRepository();
  const emailDeliveryGateway = new CapturedEmailDeliveryGateway();

  const profile = new Profile({ displayName: 'Http User', preferredLanguage: 'en', timeZone: 'UTC' });
  const contactRegistry = new ContactRegistry({ primaryEmail: 'httpuser@example.com', isEmailVerified: false, isPhoneVerified: false });
  const user = new User({ profile, contactRegistry });
  const account = new Account({ identityId: randomUUID(), accessState: 'Active', storageQuotaBytes: 1024, rateLimitMax: 10, rateLimitWindowMs: 1000 });
  const identity = new Identity({ id: account.identityId, type: IdentityType.Human, status: LifeStatus.PROVISIONED, user, account, technicalMetadata: TechnicalMetadata.create('test') });
  await identityRepository.save(identity);

  const securityService = {
    getRateLimiter: () => ({
      consume: async () => ({ allowed: true, remaining: 10 }),
    }),
  };

  const cradle = {
    authService: {},
    identityRepository,
    securityService,
    principalAccessValidator: { isAuthenticationAllowed: async () => true },
    passwordResetTokenRepository,
    emailDeliveryGateway,
  };

  const router = AuthRouter.create(cradle);
  const app = express();
  app.use(express.json());
  app.use('/auth', router);

  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(() => {
    server.close();
  });

  let resetToken = null;

  await t.test('POST /auth/forgot-password with valid email returns 200 generic message', async () => {
    const res = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryEmail: '  HttpUser@Example.COM  ' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.message, 'If an account with this email exists, a password reset link has been sent.');
    assert.equal(body.data.identityId, undefined);

    const email = emailDeliveryGateway.getLastDispatchedResetEmail();
    assert.ok(email);
    assert.equal(email.email, 'httpuser@example.com');
    resetToken = email.token;
  });

  await t.test('POST /auth/forgot-password with non-existent email returns identical 200 generic message', async () => {
    const res = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryEmail: 'doesnotexist@example.com' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.message, 'If an account with this email exists, a password reset link has been sent.');
  });

  await t.test('POST /auth/reset-password with valid token returns 200', async () => {
    const res = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'BrandNewSecurePassword2026!',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.message, 'Password has been successfully reset. Please log in with your new password.');
  });

  await t.test('POST /auth/reset-password with replay token returns 400 RESET_TOKEN_ALREADY_USED', async () => {
    const res = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'BrandNewSecurePassword2026!',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'RESET_TOKEN_ALREADY_USED');
  });
});
