import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { ChangePasswordUseCase, IdentityPrincipalAccessValidator, InMemorySessionManager } from '@manaratak/application';
import { PasswordHasher, PrismaPasswordCredentialRepository } from '@manaratak/infrastructure';
import { AuthRouter } from '../../apps/api/dist/presentation/api/router/AuthRouter.js';

async function harness() {
  const identity = { status: 'ACTIVE', account: { accessState: 'Active' }, user: { contactRegistry: { isEmailVerified: true } }, roles: ['student'] };
  const credential = { id: 'credential', disabled: false, passwordHash: await PasswordHasher.hash('OldPassword123!') };
  const sessions = new InMemorySessionManager();
  await sessions.createSession('student', 'refresh', 'session');
  await sessions.createSession('student', 'other-refresh', 'other-session');
  const prisma = {
    credentialRecord: { findMany: async () => [credential] },
    $transaction: async callback => callback({
      identityRecord: { findUnique: async () => ({ ...identity, user: { isEmailVerified: identity.user.contactRegistry.isEmailVerified } }) },
      credentialRecord: { updateMany: async ({ where, data }) => {
        if (credential.disabled || where.passwordHash !== credential.passwordHash) return { count: 0 };
        Object.assign(credential, data); return { count: 1 };
      } },
      sessionRecord: { updateMany: async () => { await sessions.revokeAllSessions('student'); return { count: 2 }; } },
      auditRecord: { create: async () => {} },
    }),
  };
  const access = new IdentityPrincipalAccessValidator({ findById: async () => identity });
  const change = new ChangePasswordUseCase(new PrismaPasswordCredentialRepository(prisma), access, PasswordHasher);
  let limited = false;
  const securityService = {
    validateCsrfToken: (token, secret) => token === 'valid-csrf' && secret === 'refresh',
    getRateLimiter: () => ({ consume: async () => ({ allowed: !limited }) }),
  };
  const app = express(); app.use(express.json());
  app.use('/auth', AuthRouter.create({ authService: {}, identityRepository: {}, securityService,
    tokenProvider: { verifyAccessToken: async () => ({ userId: 'student', sessionId: 'session' }) },
    sessionManager: sessions, principalAccessValidator: access, changePasswordUseCase: change,
  }));
  const send = (body = {}, csrf = true, authenticated = true, cookie = 'manaratak_access=access; manaratak_refresh=refresh') => {
    const call = request(app).post('/auth/change-password');
    if (authenticated) call.set('Cookie', cookie);
    if (csrf) call.set('X-CSRF-Token', 'valid-csrf');
    return call.send({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!', ...body });
  };
  return { identity, credential, sessions, send, limit: () => { limited = true; } };
}

test('change password hashes credentials, revokes all sessions and preserves identity/persona', async () => {
  const h = await harness(); const before = structuredClone(h.identity);
  assert.equal((await h.send()).status, 200);
  assert.match(h.credential.passwordHash, /^scrypt:/);
  assert.equal(await PasswordHasher.verify('OldPassword123!', h.credential.passwordHash), false);
  assert.equal(await PasswordHasher.verify('NewPassword123!', h.credential.passwordHash), true);
  assert.equal(await h.sessions.isSessionActive('student', 'session'), false);
  assert.equal(await h.sessions.isSessionActive('student', 'other-session'), false);
  assert.equal(await h.sessions.consumeAndRotateRefreshSession('refresh', 'next', 'next-session'), null);
  assert.deepEqual(h.identity, before);
});
test('access cookie alone cannot bypass CSRF by omitting the refresh cookie', async () => {
  const h = await harness();
  assert.equal((await h.send({}, true, true, 'manaratak_access=access')).status, 403);
});
for (const [name, mutate, body, csrf, authenticated, expected] of [
  ['wrong current password', () => {}, { currentPassword: 'WrongPassword' }, true, true, 400],
  ['unauthenticated', () => {}, {}, true, false, 401],
  ['unverified', h => { h.identity.user.contactRegistry.isEmailVerified = false; }, {}, true, true, 401],
  ['inactive', h => { h.identity.status = 'SUSPENDED'; }, {}, true, true, 401],
  ['locked account', h => { h.identity.account.accessState = 'Locked'; }, {}, true, true, 401],
  ['disabled credential', h => { h.credential.disabled = true; }, {}, true, true, 400],
  ['short password', () => {}, { newPassword: 'short' }, true, true, 400],
  ['long password', () => {}, { newPassword: 'x'.repeat(129) }, true, true, 400],
  ['privilege injection', () => {}, { identityId: 'victim' }, true, true, 400],
  ['missing CSRF', () => {}, {}, false, true, 403],
  ['rate limited', h => h.limit(), {}, true, true, 429],
]) test(`change password denies ${name}`, async () => {
  const h = await harness(); mutate(h); const originalHash = h.credential.passwordHash;
  assert.equal((await h.send(body, csrf, authenticated)).status, expected);
  assert.equal(h.credential.passwordHash, originalHash);
});
