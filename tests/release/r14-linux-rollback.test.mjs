import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRollbackPair, R14_PREVIOUS_RELEASE } from '../../scripts/release/lib/R14RollbackContracts.mjs';
import { linuxApiSwitcher, verifyRollbackRevision } from '../../scripts/release/lib/R14LinuxRollback.mjs';
import { provisionMigrationObserver } from '../../scripts/release/lib/R14MigrationObserver.mjs';

test('rollback checks the documented readiness identity and rejects missing, wrong or unhealthy revisions', async () => {
  const sha = 'a'.repeat(40), response = { status: 200, sourceSha: sha, body: { protocolVersion: 2, code: 'AVAILABLE', status: 'UP' } };
  const request = async (method, route) => { assert.equal(method, 'GET'); assert.equal(route, '/api/v1/monitoring/health/readiness'); return response; };
  await verifyRollbackRevision(request, sha);
  for (const altered of [{ ...response, sourceSha: null }, { ...response, sourceSha: 'b'.repeat(40) }, { ...response, status: 503 }, { ...response, body: { ...response.body, status: 'DOWN' } }]) await assert.rejects(() => verifyRollbackRevision(async () => altered, sha));
});

test('migration observer provisioning refuses any PostgreSQL container outside its disposable lab', async () => {
  for (const labels of [{ 'codex.post28.run': 'other', 'codex.post28.scope': 'DISPOSABLE' }, { 'codex.post28.run': 'owned', 'codex.post28.scope': 'PRODUCTION' }]) {
    const commands = [];
    const docker = args => { commands.push(args); return JSON.stringify([{ Config: { Labels: labels } }]); };
    await assert.rejects(() => provisionMigrationObserver({ docker, state: { containerId: 'pg', runId: 'owned' } }));
    assert.deepEqual(commands, [['inspect', 'pg']]);
  }
});

test('rollback rejects unverified provenance and runtime/schema changes before creating a lab', () => {
  const runtimeRequirements = { lockSha256: 'a'.repeat(64), prismaSchemaSha256: 'b'.repeat(64), externalModules: ['@prisma/client'] };
  const current = { sourceSha: 'c'.repeat(40), runtimeRequirements };
  const previous = { sourceSha: R14_PREVIOUS_RELEASE.sourceSha, runtimeRequirements };
  const proof = { previousManifestSha256: R14_PREVIOUS_RELEASE.manifestSha256, ancestorVerified: true, runtimeChanged: false };
  assert.equal(assertRollbackPair(current, previous, proof).differentApiImplementationDemonstrated, false);
  for (const altered of [{ ...proof, previousManifestSha256: 'd'.repeat(64) }, { ...proof, ancestorVerified: false }, { ...proof, runtimeChanged: true }]) {
    assert.throws(() => assertRollbackPair(current, previous, altered));
  }
  assert.throws(() => assertRollbackPair(previous, previous, proof));
  assert.throws(() => assertRollbackPair(current, { ...previous, runtimeRequirements: { ...runtimeRequirements, prismaSchemaSha256: 'e'.repeat(64) } }, proof));
  assert.throws(() => assertRollbackPair(current, { ...previous, runtimeRequirements: { ...runtimeRequirements, lockSha256: 'e'.repeat(64) } }, proof));
});

test('API switch refuses resources owned by another lab and never starts a replacement after a failed drain', async () => {
  for (const wrongOwner of [true, false]) {
    const commands = [];
    const docker = args => {
      commands.push(args);
      if (args[0] === 'inspect') return JSON.stringify([{ Config: { Labels: { 'codex.post28.run': wrongOwner ? 'other' : 'owned' } }, State: { Running: false, ExitCode: 137 } }]);
      if (args[0] === 'stop') return 'current';
      throw Error('Unexpected Docker mutation');
    };
    const switcher = linuxApiSwitcher({ docker, state: { runId: 'owned' }, initialId: 'current' });
    await assert.rejects(() => switcher.switchTo({ sourceSha: 'c'.repeat(40), imageId: 'previous' }));
    assert.equal(commands.some(args => args[0] === 'run'), false);
    assert.equal(commands.some(args => args[0] === 'rm'), false);
    if (wrongOwner) assert.equal(commands.some(args => args[0] === 'stop'), false);
  }
});
