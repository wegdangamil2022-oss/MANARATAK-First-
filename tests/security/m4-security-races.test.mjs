import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AuthService, InMemorySessionManager, ResetPasswordUseCase } from '@manaratak/application';

test('login credential change during session creation revokes the new session before returning tokens', async () => {
  const sessions = new InMemorySessionManager();
  let valid = true;
  const original = sessions.createSession.bind(sessions);
  sessions.createSession = async (...args) => { await original(...args); valid = false; };
  const service = new AuthService({ generateTokens: async () => ({ accessToken: 'access', refreshToken: 'refresh' }) }, sessions,
    { isAuthenticationAllowed: async () => true }, { verify: async () => valid });
  await assert.rejects(service.login('user', 'OldPassword123!'), /Authentication not permitted/);
  assert.equal(await sessions.findRefreshSession('refresh'), null);
});

test('two reset attempts that both read an unused token permit only one credential update', async () => {
  let claimed = false; let updates = 0;
  const token = { id: 'token', identityId: 'user', consumedAt: null, expiresAt: new Date(Date.now() + 60_000) };
  const reset = new ResetPasswordUseCase({ identityRepository: { findById: async () => ({}) },
    tokenRepository: { findByTokenHash: async () => ({ ...token }) }, passwordHasher: { hash: async value => `hashed:${value}` },
    prismaClient: { $transaction: async (fn, options) => {
      assert.equal(options.isolationLevel, 'Serializable');
      return fn({ passwordResetTokenRecord: { updateMany: async ({ where }) => {
        assert.equal(where.consumedAt, null); assert.ok(where.expiresAt.gt instanceof Date);
        if (claimed) return { count: 0 }; claimed = true; return { count: 1 };
      } }, credentialRecord: { updateMany: async ({ data }) => {
        assert.equal(data.disabled, undefined, 'reset must not re-enable a disabled credential'); updates++; return { count: 1 };
      } }, sessionRecord: { updateMany: async () => ({ count: 1 }) } });
    } } });
  const result = await Promise.allSettled([reset.execute({ token: 'raw', newPassword: 'NewPassword123!' }), reset.execute({ token: 'raw', newPassword: 'OtherPassword123!' })]);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(updates, 1);
});

test('IAM schema declares uniqueness and restrictive security relations without plaintext token columns', () => {
  const schema = fs.readFileSync('packages/infrastructure/prisma/schema.prisma', 'utf8');
  const model = name => schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))[1];
  assert.match(model('UserRecord'), /primaryEmail\s+String\s+@unique/);
  assert.match(model('CredentialRecord'), /@@unique\(\[identityId, type\]\)/);
  assert.match(model('RoleAssignmentRecord'), /@@unique\(\[identityId, roleId\]\)/);
  assert.equal((model('RoleAssignmentRecord').match(/onDelete: Restrict/g) ?? []).length, 2);
  for (const name of ['PasswordResetTokenRecord', 'EmailVerificationTokenRecord']) {
    assert.match(model(name), /tokenHash\s+String\s+@unique/);
    assert.match(model(name), /onDelete: Restrict/);
    assert.doesNotMatch(model(name), /^\s*(rawToken|token)\s+String/m);
  }
  assert.match(model('SessionRecord'), /refreshTokenHash\s+String\s+@unique/);
});
test('Admin application delegates login to the unified public surface and retains permission gating', () => {
  const app = fs.readFileSync('apps/admin/src/App.tsx', 'utf8');
  assert.match(app, /window\.location\.replace\(unifiedLoginUrl\(\)\)/);
  assert.match(app, /\/auth\/me/);
  assert.doesNotMatch(app, /\/auth\/login|type="password"/);
  assert.match(app, /permissions\.some/);
  assert.match(app, /RequireAdminPermission/);
});
