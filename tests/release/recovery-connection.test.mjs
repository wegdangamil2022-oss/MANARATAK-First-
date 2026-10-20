import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recoveryLibpqEnvironment,
  recoveryPrismaUrl,
  RECOVERY_SENTINEL_SQL,
} from '../../scripts/recovery/RecoveryConnection.mjs';
test('libpq target cannot be redirected by inherited PGHOSTADDR service or option overrides', () => {
  const target = {
    host: '127.0.0.1',
    port: '1234',
    database: 'disposable',
    role: 'restore',
    password: 'synthetic',
  };
  const env = recoveryLibpqEnvironment(target, 'C:/synthetic/root.pem', {
    PATH: 'path',
    PGHOSTADDR: 'external',
    PGSERVICE: 'external',
    PGOPTIONS: 'unsafe',
    PGSSLMODE: 'disable',
  });
  assert.equal(env.PGHOSTADDR, undefined);
  assert.equal(env.PGSERVICE, undefined);
  assert.equal(env.PGOPTIONS, undefined);
  assert.equal(env.PGSSLMODE, 'verify-full');
  assert.equal(env.PGSSLROOTCERT, 'C:/synthetic/root.pem');
  assert.equal(env.PGHOST, target.host);
});
test('Prisma uses its own explicit strict TLS parameters and the same trust root', () => {
  const url = new URL(
    recoveryPrismaUrl('postgresql://synthetic@127.0.0.1:1234/disposable', 'C:/synthetic/root.pem'),
  );
  assert.equal(url.searchParams.get('sslmode'), 'require');
  assert.equal(url.searchParams.get('sslaccept'), 'strict');
  assert.equal(url.searchParams.get('sslcert'), 'C:/synthetic/root.pem');
  assert.equal(url.hostname, '127.0.0.1');
  assert.throws(
    () =>
      recoveryPrismaUrl(
        'postgresql://synthetic@127.0.0.1/disposable?sslaccept=accept_invalid_certs',
        'root.pem',
      ),
    /URL_INVALID/,
  );
});
test('sentinel SQL checks membership replication bypass RLS and every destructive sentinel privilege', () => {
  for (const required of [
    'rolreplication',
    'rolbypassrls',
    "'MEMBER'",
    'TRUNCATE',
    'TRIGGER',
    'REFERENCES',
    "'manaratak_recovery_control','CREATE'",
  ])
    assert.ok(RECOVERY_SENTINEL_SQL.includes(required));
});
