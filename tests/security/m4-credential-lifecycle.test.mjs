import test from 'node:test';
import assert from 'node:assert/strict';
import { DisablePasswordCredentialUseCase, IdentityPrincipalAccessValidator } from '@manaratak/application';
import { PrismaPasswordCredentialRepository, PrismaCredentialVerifier } from '@manaratak/infrastructure';
import express from 'express';
import request from 'supertest';
import { AuthRouter } from '../../apps/api/dist/presentation/api/router/AuthRouter.js';

test('credential disable HTTP boundary authenticates actor, checks permission and enforces cookie CSRF', async () => {
  const writes = [];
  const access = { isAuthenticationAllowed: async () => true };
  const disable = new DisablePasswordCredentialUseCase({ disable: async (...args) => writes.push(args) }, access,
    { evaluatePermission: async actor => ({ isGranted: actor === 'admin' }) });
  const app = express(); app.use(express.json());
  app.use('/auth', AuthRouter.create({ authService: {}, identityRepository: {}, principalAccessValidator: access,
    tokenProvider: { verifyAccessToken: async token => ({ userId: token, sessionId: 'session' }) },
    sessionManager: { isSessionActive: async () => true }, disablePasswordCredentialUseCase: disable,
    securityService: { validateCsrfToken: token => token === 'valid-csrf' },
  }));
  assert.equal((await request(app).post('/auth/credentials/target/disable').send({ changeId: 'CHANGE-123' })).status, 401);
  assert.equal((await request(app).post('/auth/credentials/target/disable').set('Authorization', 'Bearer student').send({ changeId: 'CHANGE-123' })).status, 403);
  assert.equal((await request(app).post('/auth/credentials/target/disable').set('Cookie', 'manaratak_access=admin; manaratak_refresh=refresh').send({ changeId: 'CHANGE-123' })).status, 403);
  assert.equal(writes.length, 0);
  assert.equal((await request(app).post('/auth/credentials/target/disable').set('Cookie', 'manaratak_access=admin; manaratak_refresh=refresh')
    .set('X-CSRF-Token', 'valid-csrf').send({ changeId: 'CHANGE-123' })).status, 200);
  assert.deepEqual(writes, [['target', 'admin', 'CHANGE-123']]);
});

test('authorized disable retains credential and atomically records revocation and audit', async () => {
  const calls = [];
  const repository = new PrismaPasswordCredentialRepository({ $transaction: async (fn, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    return fn({ credentialRecord: { updateMany: async args => { calls.push(['credential', args]); return { count: 1 }; } },
      sessionRecord: { updateMany: async args => calls.push(['sessions', args]) },
      auditRecord: { create: async args => calls.push(['audit', args]) } });
  } });
  const operation = new DisablePasswordCredentialUseCase(repository, { isAuthenticationAllowed: async () => true }, {
    evaluatePermission: async (actor, permission) => { assert.equal(actor, 'admin'); assert.equal(permission, 'admin:credentials:manage'); return { isGranted: true }; },
  });
  await operation.execute('admin', 'target', 'CHANGE-123');
  assert.equal(calls[0][1].data.disabled, true);
  assert.equal(calls[1][1].where.identityId, 'target');
  assert.equal(calls[2][1].data.correlationReference, 'CHANGE-123');
});
test('unauthorized actor cannot disable another credential', async () => {
  const operation = new DisablePasswordCredentialUseCase({ disable: async () => assert.fail('must not mutate') },
    { isAuthenticationAllowed: async () => true }, { evaluatePermission: async () => ({ isGranted: false }) });
  await assert.rejects(operation.execute('student', 'victim', 'CHANGE-123'), /CREDENTIAL_PERMISSION_DENIED/);
});
test('inactive actor cannot disable credentials', async () => {
  const operation = new DisablePasswordCredentialUseCase({}, { isAuthenticationAllowed: async () => false }, {});
  await assert.rejects(operation.execute('admin', 'victim', 'CHANGE-123'), /CREDENTIAL_PERMISSION_DENIED/);
});
test('disabled credential denies session continuation', async () => {
  const access = new IdentityPrincipalAccessValidator({ findById: async () => ({ status: 'ACTIVE', account: { accessState: 'Active' }, user: { contactRegistry: { isEmailVerified: true } } }) },
    { find: async () => ({ disabled: true }) });
  assert.equal(await access.isAuthenticationAllowed('student'), false);
});
test('disabled credential cannot log in', async () => {
  const verifier = new PrismaCredentialVerifier({ identityRecord: { findUnique: async ({ include }) => {
    assert.equal(include.credentials.where.disabled, false);
    return { status: 'ACTIVE', account: { accessState: 'Active' }, user: { isEmailVerified: true }, credentials: [] };
  } } });
  assert.equal(await verifier.verify('student', 'Password123!'), false);
});
test('duplicate password credentials fail closed before schema constraint', async () => {
  const repository = new PrismaPasswordCredentialRepository({ credentialRecord: { findMany: async () => [{ id: 'a' }, { id: 'b' }] } });
  await assert.rejects(repository.find('student'), /DUPLICATE_PASSWORD_CREDENTIAL/);
});
