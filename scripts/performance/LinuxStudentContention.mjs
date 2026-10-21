import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';

export function dockerResourceSample(row) {
  const cpuPercent = Number(String(row.CPUPerc).replace(/%$/, ''));
  const match = /^([\d.]+)(B|KiB|MiB|GiB)\s*\//.exec(row.MemUsage ?? '');
  const factors = {B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3};
  const residentMemoryBytes = match ? Number(match[1]) * factors[match[2]] : NaN;
  assert(Number.isFinite(cpuPercent) && cpuPercent >= 0 && Number.isFinite(residentMemoryBytes) && residentMemoryBytes >= 0, 'R11_RESOURCE_FORMAT');
  return {cpuPercent, residentMemoryBytes};
}

export function assertContentionOutcome(responses, current, previousVersion) {
  assert.equal(responses.length, 2, 'R11_CONTENTION_RESPONSE_COUNT');
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409], 'R11_CONTENTION_ONE_WINNER_REQUIRED');
  const winner = responses.find(r => r.status === 200);
  const loser = responses.find(r => r.status === 409);
  // API v1 converts router errors to canonical Problem Details before they reach the browser.
  assert.equal(loser.body.code, 'STUDENT_WORKSPACE_VERSION_CONFLICT', 'R11_EXPECTED_VERSION_CONFLICT');
  assert.equal(loser.body.status, 409, 'R11_CONFLICT_PROBLEM_STATUS');
  assert.equal(winner.body.version, previousVersion + 1, 'R11_WINNER_VERSION');
  assert.equal(current.version, previousVersion + 1, 'R11_PERSISTED_VERSION');
  assert.equal(current.theme, winner.body.theme, 'R11_PERSISTED_WINNER');
  return winner;
}

// A separate diagnostic contract: the conflict is expected, not hidden as a successful write.
export async function runLinuxStudentContention({origin, sourceSha, fixtureId, email, password, request, db, sampleResources, record}) {
  const target = new URL(origin);
  assert.equal(target.protocol, 'https:'); assert.equal(target.hostname, '127.0.0.1');
  assert(!target.username && !target.password && target.pathname === '/' && !target.search && !target.hash);
  assert.match(sourceSha, /^[a-f0-9]{40}$/);
  const report = {kind: 'R11_LINUX_STUDENT_CONTENTION_DIAGNOSTIC', sourceSha, status: 'RUNNING',
    platform: process.platform, pairs: [], resources: [], durationSeconds: 60, maximumPairs: 10,
    maximumConcurrentMutations: 2, expectedConflicts: 0, unexpectedErrors: 0,
    poolWaitMs: null, poolWaitReason: 'No driver pool checkout timing hook; query round trip is recorded separately',
    representativeLaunchDataset: false, sloAcceptance: false, productionAcceptance: false};
  let csrf, loggedIn = false;
  const send = input => request({...input, ...(csrf ? {csrf} : {})});
  const statistics = () => db.$queryRawUnsafe(`SELECT numbackends,xact_commit::text,xact_rollback::text,blks_read::text,blks_hit::text,tup_returned::text,deadlocks::text,conflicts::text FROM pg_stat_database WHERE datname=current_database()`);
  const resourceGuard = async () => {
    const sample = await sampleResources();
    for (const key of ['api', 'postgres']) {
      assert(Number.isFinite(sample[key]?.cpuPercent) && sample[key].cpuPercent >= 0 && sample[key].cpuPercent <= 80, 'R11_CPU_BUDGET');
      assert(Number.isFinite(sample[key].residentMemoryBytes) && sample[key].residentMemoryBytes >= 0 && sample[key].residentMemoryBytes <= (key === 'api' ? 768 : 1024) * 1024 ** 2, 'R11_MEMORY_BUDGET');
    }
    assert(Number.isSafeInteger(sample.applicationConnections) && sample.applicationConnections >= 1 && sample.applicationConnections <= 10, 'R11_CONNECTION_BUDGET');
    report.resources.push(sample);
  };
  try {
    // Check budgets and exact API identity before issuing any mutation.
    await resourceGuard();
    const ready = await send({method: 'GET', path: '/api/v1/monitoring/health/readiness'});
    assert.equal(ready.status, 200); assert.equal(ready.sourceSha, sourceSha); assert.equal(ready.body.code, 'AVAILABLE');
    const login = await send({method: 'POST', path: '/api/v1/auth/login', body: {email, password}});
    assert.equal(login.status, 200); loggedIn = true;
    const token = await send({method: 'GET', path: '/api/v1/auth/csrf-token'});
    assert.equal(token.status, 200); csrf = token.csrf; assert(csrf);
    report.databaseBefore = await statistics();
    report.explain = await db.$queryRawUnsafe('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT version,theme FROM public."StudentWorkspace" WHERE "studentReferenceId"=$1 LIMIT 1', fixtureId);
    let workspace = await db.studentWorkspace.findUniqueOrThrow({where: {studentReferenceId: fixtureId}});
    report.initialVersion = workspace.version;
    const started = performance.now();
    for (let index = 0; index < 10; index++) {
      const due = started + index * 6000;
      if (performance.now() < due) await new Promise(resolve => setTimeout(resolve, due - performance.now()));
      await resourceGuard();
      assert(performance.now() - started < 60000, 'R11_MEASUREMENT_DEADLINE');
      const before = workspace.version, keys = [randomUUID(), randomUUID()];
      const bodies = ['LIGHT', 'DARK'].map(theme => ({expectedVersion: before, theme}));
      const at = performance.now();
      // Await both outcomes; never leave a mutation running while the next pair starts.
      const settled = await Promise.allSettled(bodies.map((body, i) => send({method: 'PUT', path: '/api/v1/student/workspace', body, key: keys[i]})));
      assert(settled.every(r => r.status === 'fulfilled'), 'R11_CONTENTION_REQUEST_FAILED');
      const responses = settled.map(r => r.value), latencyMs = performance.now() - at;
      workspace = await db.studentWorkspace.findUniqueOrThrow({where: {studentReferenceId: fixtureId}});
      const winner = assertContentionOutcome(responses, workspace, before), winnerIndex = responses.indexOf(winner);
      const replay = await send({method: 'PUT', path: '/api/v1/student/workspace', body: bodies[winnerIndex], key: keys[winnerIndex]});
      assert.equal(replay.status, 200); assert.deepEqual(replay.body, winner.body);
      assert.equal((await db.studentWorkspace.findUniqueOrThrow({where: {studentReferenceId: fixtureId}})).version, before + 1);
      const probe = performance.now(); await db.$queryRawUnsafe('SELECT 1');
      report.pairs.push({index, latencyMs, successfulWrites: 1, expectedConflicts: 1, replayNoNewVersion: true, queryRoundTripMs: performance.now() - probe});
      report.expectedConflicts++;
    }
    const remaining = 60000 - (performance.now() - started);
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
    report.elapsedSeconds = (performance.now() - started) / 1000;
    report.databaseAfter = await statistics();
    report.finalVersion = workspace.version;
    assert.equal(report.finalVersion, report.initialVersion + 10);
    const values = report.pairs.map(p => p.latencyMs).sort((a, b) => a - b);
    report.p50Ms = values[4]; report.p95Ms = values[9]; report.p99Ms = values[9];
    report.pairThroughput = 10 / report.elapsedSeconds;
    report.status = 'COMPLETED_DIAGNOSTIC';
  } catch (error) {
    report.status = 'ABORTED'; report.unexpectedErrors++;
    // Only a fixed diagnostic label is retained; never retain arbitrary HTTP or database error text.
    report.failure = /^R11_[A-Z_]+$/.test(error?.message ?? '') ? error.message : 'R11_CONTENTION_INVARIANT_OR_DEPENDENCY_FAILED';
    throw Error(report.failure);
  } finally {
    if (loggedIn && csrf) {
      try {
        report.logoutStatus = (await send({method: 'POST', path: '/api/v1/auth/logout'})).status;
        report.activeSessionsAfterLogout = await db.sessionRecord.count({where: {identityId: fixtureId, revokedAt: null}});
      }
      catch { report.logoutStatus = null; }
      if (report.logoutStatus !== 200 || report.activeSessionsAfterLogout !== 0) {
        report.status = 'ABORTED'; report.failure ??= 'R11_LOGOUT_NOT_CONFIRMED'; report.unexpectedErrors++;
      }
    }
    await record(report);
  }
  if (report.status !== 'COMPLETED_DIAGNOSTIC') throw Error(report.failure);
  return report;
}
