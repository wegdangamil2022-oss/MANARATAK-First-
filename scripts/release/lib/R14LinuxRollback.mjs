import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export function linuxApiSwitcher({ docker, state, apiEnv, apiEnvFile, target, proof, redact, initialId, onStarted }) {
  let activeId = initialId, sequence = 0;
  const observations = [];
  return {
    observations,
    async switchTo(candidate) {
      const identity = JSON.parse(docker(['inspect', activeId]))[0];
      assert.equal(identity.Config.Labels['codex.post28.run'], state.runId);
      const start = Date.now(); docker(['stop', '--time', '20', activeId]);
      const stopped = JSON.parse(docker(['inspect', activeId]))[0];
      assert.equal(stopped.State.Running, false); assert.equal(stopped.State.ExitCode, 0, 'R14_GRACEFUL_STOP_REQUIRED');
      const log = redact(docker(['logs', activeId]));
      assert(log.includes('SIGTERM received') && log.includes('Graceful shutdown completed.'), 'R14_REAL_SIGNAL_LOG_REQUIRED');
      fs.writeFileSync(path.join(proof, 'rollback-stop-' + sequence++ + '.log'), log, { flag: 'wx' });
      observations.push({ stoppedImageId: identity.Image, apiExitCode: 0, sigtermObserved: true, drainMilliseconds: Date.now() - start, oldApiStoppedBeforeNewStart: true });
      docker(['rm', activeId]);
      fs.writeFileSync(apiEnvFile, Object.entries({ ...apiEnv, RELEASE_SOURCE_SHA: candidate.sourceSha, HEALTH_DEPLOYMENT_REVISION: candidate.sourceSha }).map(([key, value]) => key + '=' + value).join('\n') + '\n', { mode: 0o600 });
      activeId = docker(['run', '-d', '--label', 'codex.post28.run=' + state.runId, '--network', state.network, '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=768m', '--pids-limit=128', '--tmpfs', '/opt/manaratak/storage:rw,uid=1000,gid=1000,mode=0700,size=67108864', '--tmpfs', '/tmp:rw,nosuid,noexec,size=16777216', '--env-file', apiEnvFile, candidate.imageId]);
      onStarted(activeId);
      const fresh = JSON.parse(docker(['inspect', activeId]))[0];
      assert.equal(fresh.Config.Labels['codex.post28.run'], state.runId); assert.equal(fresh.Image, candidate.imageId);
      assert.equal(fresh.Config.User, 'node'); assert.equal(fresh.HostConfig.ReadonlyRootfs, true);
      const address = fresh.NetworkSettings.Networks[state.network].IPAddress; assert.equal(net.isIP(address), 4);
      target.host = address;
      const readyStart = Date.now(); let ready = false;
      while (Date.now() - readyStart < 15000) {
        try {
          const response = await fetch('http://' + address + ':3000/api/v1/monitoring/health/readiness', { signal: AbortSignal.timeout(1000) });
          if (response.status === 200 && response.headers.get('x-manaratak-source-sha') === candidate.sourceSha) { ready = true; break; }
        } catch { /* The new owned API may still be booting. */ }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert(ready, 'R14_SWITCHED_API_NOT_READY');
      observations.push({ startedImageId: fresh.Image, readinessSourceSha: candidate.sourceSha, readinessMilliseconds: Date.now() - readyStart, ordinaryContainerUser: fresh.Config.User });
    },
  };
}

export async function exerciseLinuxRollback({ page, origin, db, migrationObserver, email, password, fixtureId, current, previous, switcher }) {
  const protectedTables = ['_prisma_migrations', 'FinancialLedgerEntryRecord', 'FinanceInvoiceRecord', 'Certificate', 'StudentPrivacyConsentDecision', 'StudentApplicationDocumentBinding', 'CmsPublishedContent', 'AuditRecord', 'TransactionalOutboxRecord', 'ApiIdempotencyRecord'];
  const fingerprint = async () => {
    const result = {};
    for (const table of protectedTables) result[table] = table === '_prisma_migrations' ? await migrationObserver.fingerprint() : await db.$queryRawUnsafe('SELECT id, encode(sha256(convert_to(to_jsonb(t)::text,\'UTF8\')),\'hex\') AS sha256 FROM public."' + table + '" t ORDER BY id');
    return result;
  };
  const preserved = (before, after) => {
    for (const table of protectedTables) {
      const rows = new Map(after[table].map(row => [row.id, row.sha256]));
      for (const row of before[table]) assert.equal(rows.get(row.id), row.sha256, 'R14_HISTORICAL_ROW_CHANGED_' + table);
      if (!['AuditRecord', 'TransactionalOutboxRecord', 'ApiIdempotencyRecord'].includes(table)) assert.equal(after[table].length, before[table].length, 'R14_PROTECTED_COUNT_CHANGED_' + table);
    }
  };
  await page.goto(origin + '/health/build');
  const started = Date.now(), observations = []; let requests = 0;
  const request = async (method, route, body, csrf, key) => {
    assert(++requests <= 24, 'R14_CANARY_REQUEST_BOUND'); assert(Date.now() - started <= 60000, 'R14_CANARY_DEADLINE');
    const response = await page.evaluate(async ({ method, route, body, csrf, key }) => {
      const response = await fetch(route, { method, credentials: 'include', redirect: 'error', signal: AbortSignal.timeout(3000), headers: { 'content-type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}), ...(key ? { 'idempotency-key': key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json(), csrf: response.headers.get('x-csrf-token'), replayed: response.headers.get('idempotency-replayed'), sourceSha: response.headers.get('x-manaratak-source-sha') };
    }, { method, route, body, csrf, key });
    observations.push({ method, route, status: response.status, sourceSha: response.sourceSha, replayed: response.replayed });
    return response;
  };
  try {
    const before = await fingerprint();
    assert(before._prisma_migrations.length > 0, 'R14_MIGRATION_LEDGER_REQUIRED');
    assert.equal((await request('POST', '/api/v1/auth/login', { email, password })).status, 200);
    const token = await request('GET', '/api/v1/auth/csrf-token'); assert.equal(token.status, 200); assert(token.csrf);
    const workspace = await db.studentWorkspace.findUniqueOrThrow({ where: { studentReferenceId: fixtureId } });
    const key = randomUUID(), body = { theme: 'LIGHT', expectedVersion: workspace.version };
    const winner = await request('PUT', '/api/v1/student/workspace', body, token.csrf, key); assert.equal(winner.status, 200);
    assert.equal(winner.body.version, workspace.version + 1);
    const afterWrite = await fingerprint(), receipts = await db.apiIdempotencyRecord.count(); preserved(before, afterWrite);
    await switcher.switchTo(previous);
    assert.equal((await request('GET', '/api/v1/auth/me')).status, 200, 'R14_PREVIOUS_SESSION_LOST');
    const replay = await request('PUT', '/api/v1/student/workspace', body, token.csrf, key);
    assert.equal(replay.status, 200); assert.equal(replay.replayed, 'true'); assert.deepEqual(replay.body, winner.body); assert.equal(replay.sourceSha, previous.sourceSha);
    assert.equal((await request('PUT', '/api/v1/student/workspace', { theme: 'DARK', expectedVersion: workspace.version + 1 }, undefined, randomUUID())).status, 403);
    assert.equal((await request('GET', '/api/v1/admin/courses')).status, 403);
    await switcher.switchTo(current);
    assert.equal((await request('GET', '/api/v1/auth/me')).status, 200, 'R14_FORWARD_SESSION_LOST');
    const forwardReplay = await request('PUT', '/api/v1/student/workspace', body, token.csrf, key);
    assert.equal(forwardReplay.status, 200); assert.equal(forwardReplay.replayed, 'true'); assert.deepEqual(forwardReplay.body, winner.body); assert.equal(forwardReplay.sourceSha, current.sourceSha);
    const after = await fingerprint(); preserved(afterWrite, after);
    assert.equal(await db.apiIdempotencyRecord.count(), receipts);
    assert.equal((await db.studentWorkspace.findUniqueOrThrow({ where: { studentReferenceId: fixtureId } })).version, workspace.version + 1);
    assert.equal((await request('POST', '/api/v1/auth/logout', undefined, token.csrf)).status, 200);
    assert.equal(await db.sessionRecord.count({ where: { identityId: fixtureId, revokedAt: null } }), 0);
    assert(Date.now() - started <= 60000, 'R14_CANARY_DEADLINE');
    return { passed: true, currentSourceSha: current.sourceSha, previousSourceSha: previous.sourceSha, observations, switches: switcher.observations, requestCount: requests, elapsedMilliseconds: Date.now() - started, maximumRequests: 24, maximumConcurrency: 1, maximumSeconds: 60, protectedBefore: before, protectedAfter: after, historicalRowsPreserved: true, sessionAndCsrfPreserved: true, workspaceEffectAppliedOnce: true, allActorSessionsRevoked: true, workersEnabled: false, financialEffectOnceClaimed: false, differentApiImplementationDemonstrated: false, formalAcceptance: false, productionAcceptance: false };
  } finally {
    await db.sessionRecord.updateMany({ where: { identityId: fixtureId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
