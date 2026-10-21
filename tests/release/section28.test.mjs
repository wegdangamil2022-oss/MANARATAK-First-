import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  REPOSITORY,
  GATES,
  READINESS_PATH,
  hash,
  verifyReleaseManifest,
  verifySignedEvidence,
  releaseVerdict,
  promotionState,
} from '../../scripts/release/lib/ReleaseContracts.mjs';
import { runSmoke, unitUrl } from '../../scripts/release/lib/SmokeContracts.mjs';
import { inspectStaticBuild } from '../../scripts/release/lib/StaticBuildPolicy.mjs';
import { reconcilePromotion } from '../../scripts/release/promote-environment.mjs';
import { verifyPromotionInputs } from '../../scripts/release/verify-release-evidence.mjs';
import {
  DOMAINS,
  acceptanceMatrix,
  businessCoverage,
  acceptanceDetails,
} from '../../scripts/release/lib/AcceptanceContracts.mjs';
import {
  databaseIdentity,
  recoveryTarget,
  recoveryInputs,
  databaseSentinel,
  restoreObjectives,
} from '../../scripts/recovery/RecoveryPreflight.mjs';
import { executeRestore } from '../../scripts/recovery/run-whole-platform-restore-drill.mjs';
import { backupEvidence } from '../../scripts/recovery/BackupEvidencePolicy.mjs';
const sha = 'a'.repeat(40),
  now = Date.now(),
  date = new Date(now).toISOString();
const keys = crypto.generateKeyPairSync('ed25519'),
  publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
const sign = (data, pair = keys) => {
  const payload = JSON.stringify({
    sha,
    repository: REPOSITORY,
    checkedAt: date,
    expiresAt: new Date(now + 3600000).toISOString(),
    ...data,
  });
  return {
    version: 1,
    algorithm: 'Ed25519',
    payload,
    signature: crypto.sign(null, Buffer.from(payload), pair.privateKey).toString('base64'),
  };
};
const fixture = () => fs.mkdtempSync(path.join(os.tmpdir(), 'manaratak-section28-'));
const roots = [];
const temp = () => {
  const root = fixture();
  roots.push(root);
  return root;
};
process.on('exit', () =>
  roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })),
);
function artifacts() {
  const root = temp(),
    units = ['api', 'web', 'admin'].map((unit) => {
      const file = `${unit}.tar`,
        body = Buffer.from(`${unit}:isolated hash fixture, not a deployable tar`);
      fs.writeFileSync(path.join(root, file), body);
      return { unit, file, sha256: hash(body), size: body.length };
    });
  const sbom = { file: 'sbom.json', sha256: hash('{}') };
  fs.writeFileSync(path.join(root, sbom.file), '{}');
  const manifest = {
    version: 2,
    kind: 'MANARATAK_IMMUTABLE_RELEASE',
    sourceSha: sha,
    provenance: { repository: REPOSITORY },
    artifacts: units,
    sbom,
    sourceLedger: { section27Closed: false },
    runtimeRequirements: {
      nodeMajor: 22,
      lockSha256: 'b'.repeat(64),
      prismaSchemaSha256: 'c'.repeat(64),
      generatedPrismaClientRequired: true,
      externalModules: ['@prisma/client'],
    },
  };
  fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify(manifest));
  return { root, manifest };
}
const inventory = {
  coverageApproved: true,
  sections: Array.from({ length: 27 }, (_, index) => ({
    section: index + 1,
    taskIds: [`task-${index + 1}`],
  })),
};
const proof = () => ({
  gates: GATES.map((id) => ({
    id,
    sha,
    outcome: 'PASS',
    executed: true,
    environment: 'DISPOSABLE',
    owner: 'Owner',
    fixture: 'Fixture',
    suite: 'Suite',
    checkedAt: date,
    artifact: 'https://ci.example/artifact',
    reviewer: 'Reviewer',
  })),
  sectionBlockers: inventory.sections.map((section) => ({
    ...section,
    sha,
    sourceDisposition: 'CLOSED',
    reviewedBy: 'reviewer',
    regressionArtifact: 'https://ci.example/regression',
    tasks: section.taskIds.map((id) => ({
      id,
      status: 'SOURCE_CLOSED',
      reviewedBy: 'owner',
      regression: {
        sha,
        outcome: 'PASS',
        executed: true,
        suite: 'isolated',
        artifact: 'https://ci.example/regression',
      },
    })),
  })),
  authority: {
    repository: REPOSITORY,
    approvers: ['owner', 'release-reviewer'],
    approvedEnvironments: ['production'],
  },
});
test('FSA003 readiness path matches actual public monitoring mount/route', () => {
  assert.equal(READINESS_PATH, '/api/v1/monitoring/health/readiness');
  assert.match(
    fs.readFileSync('apps/api/src/presentation/api/router/MonitoringRouter.ts', 'utf8'),
    /publicProbe\('\/health\/readiness'/,
  );
  const appSource = fs.readFileSync('apps/api/src/app.ts', 'utf8');
  const apiRouterSource = fs.readFileSync('apps/api/src/presentation/api/router/ApiRouter.ts', 'utf8');
  assert.match(appSource, /app\.use\(\s*'\/api'\s*,\s*apiRouter\.getRouter\(\)\s*\)/);
  assert.match(appSource, /apiRouter\.registerVersion\(\s*'v1'\s*,\s*v1Router\s*\)/);
  assert.match(apiRouterSource, /this\.router\.use\(\s*`\/\$\{version\}`\s*,\s*versionRouter\s*\)/);
  assert.match(appSource, /v1Router\.use\(\s*'\/monitoring'\s*,\s*MonitoringRouter\.create\(/);
});
test('FSA003 API base composition does not duplicate api/v1', () => {
  assert.equal(
    unitUrl('https://api.example/api/v1', READINESS_PATH),
    'https://api.example' + READINESS_PATH,
  );
  assert.throws(() => unitUrl('https://api.example/unknown', READINESS_PATH), /BASE_PATH/);
});
function healthyFetch(overrides = {}) {
  return async (url) => {
    if (url.includes('/api/v1/monitoring'))
      return new Response(
        JSON.stringify({
          protocolVersion: 2,
          status: 'UP',
          code: 'AVAILABLE',
          timestamp: new Date().toISOString(),
          ...overrides.body,
        }),
        {
          status: overrides.status ?? 200,
          headers: {
            'content-type': overrides.contentType ?? 'application/json',
            'x-manaratak-source-sha': overrides.revision ?? sha,
          },
        },
      );
    if(new URL(url).pathname.endsWith('.js'))return new Response('export {};',{headers:{'content-type':'application/javascript'}});
    const unit = url.includes('admin') ? 'admin' : 'web';
    if (url.endsWith('/health/build'))
      return new Response(
        JSON.stringify({ version: 1, status: 'BUILT', unit, sourceSha: overrides.buildSha ?? sha }),
        { headers: { 'content-type': 'application/json' } },
      );
    return new Response(
      overrides.html ??
        `<html><head><meta name="manaratak-build-sha" content="${sha}"></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>`,
      { headers: { 'content-type': 'text/html' } },
    );
  };
}
const smoke = {
  api: 'https://api.example',
  web: 'https://web.example',
  admin: 'https://admin.example',
  sha,
};
test('FSA007 smoke accepts exact ready revision and built three-unit contracts', async () =>
  assert.equal((await runSmoke(smoke, healthyFetch())).status, 'PASS'));
for (const status of [301, 302, 307, 308, 404, 503])
  test(`FSA007 smoke rejects HTTP ${status}`, async () =>
    assert.rejects(() => runSmoke(smoke, healthyFetch({ status })), /HTTP_OR_REDIRECT/));
for (const invalid of [
  { body: { status: 'DOWN' } },
  { body: { protocolVersion: 1 } },
  { body: { code: 'UNKNOWN' } },
  { body: { timestamp: 'invalid' } },
  { contentType: 'text/html' },
  { revision: 'b'.repeat(40) },
])
  test(`FSA007 rejects health ${JSON.stringify(invalid)}`, async () =>
    assert.rejects(() => runSmoke(smoke, healthyFetch(invalid))));
test('FSA008 smoke rejects placeholder/unbuilt html', async () =>
  assert.rejects(
    () =>
      runSmoke(
        smoke,
        healthyFetch({ html: 'MANARATAK Platform is initializing. Please build web assets.' }),
      ),
    /BUILT_HTML/,
  ));
test('FSA008 smoke rejects another static build', async () =>
  assert.rejects(
    () => runSmoke(smoke, healthyFetch({ buildSha: 'b'.repeat(40) })),
    /BUILD_REVISION/,
  ));
test('FSA008 missing static artifact is UNBUILT and server serves503', () => {
  assert.equal(inspectStaticBuild(temp(), 'web', sha).status, 'UNBUILT');
  assert.match(fs.readFileSync('server.js', 'utf8'), /status\(503\).*WEB_BUILD_UNAVAILABLE/);
});
test('FSA008 stamp matches exact static unit and source', () => {
  const root = temp();
  fs.writeFileSync(
    path.join(root, 'index.html'),
    `<meta name="manaratak-build-sha" content="${sha}"><div id="root"></div><script src="/assets/app.js"></script>`,
  );
  fs.writeFileSync(
    path.join(root, 'manaratak-build.json'),
    JSON.stringify({ version: 1, unit: 'web', sourceSha: sha }),
  );
  fs.mkdirSync(path.join(root,'assets'));
  fs.writeFileSync(path.join(root,'assets/app.js'),'export {};');
  assert.equal(inspectStaticBuild(root, 'web', sha).status, 'BUILT');
  assert.equal(inspectStaticBuild(root, 'admin', sha).status, 'UNBUILT');
  assert.equal(inspectStaticBuild(root, 'web', 'b'.repeat(40)).status, 'UNBUILT');
});
test('FSA009 rejects nonTLS/user-info origins', () => {
  assert.throws(() => unitUrl('http://api.example'), /ORIGIN/);
  assert.throws(() => unitUrl('https://secret@example.com'), /ORIGIN/);
});
test('FSA010/011 source manifest exact three units/digests runtime requirement descriptor', () => {
  const { root } = artifacts();
  assert.equal(verifyReleaseManifest(root, sha).artifacts.length, 3);
});
test('FSA011 missing or wrong expected source fails', () => {
  const { root } = artifacts();
  assert.throws(() => verifyReleaseManifest(root, ''), /SHA_INVALID/);
  assert.throws(() => verifyReleaseManifest(root, 'b'.repeat(40)), /IDENTITY/);
});
test('FSA011 empty unit inventory never verifies', () => {
  const { root, manifest } = artifacts();
  manifest.artifacts = [];
  fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify(manifest));
  assert.throws(() => verifyReleaseManifest(root, sha), /UNITS/);
});
test('FSA011 digest tampering rejected', () => {
  const { root } = artifacts();
  fs.writeFileSync(path.join(root, 'api.tar'), 'tampered');
  assert.throws(() => verifyReleaseManifest(root, sha), /DIGEST/);
});
test('FSA011 artifact traversal cannot read out of boundary', () => {
  const { root, manifest } = artifacts();
  manifest.artifacts[0].file = '../secret';
  fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify(manifest));
  assert.throws(() => verifyReleaseManifest(root, sha), /PATH_INVALID/);
});
test('FSA011 symlink artifact rejected', () => {
  const { root } = artifacts();
  fs.rmSync(path.join(root, 'api.tar'));
  fs.symlinkSync(path.join(root, 'web.tar'), path.join(root, 'api.tar'));
  assert.throws(() => verifyReleaseManifest(root, sha), /PATH_INVALID/);
});
test('FSA011 signed proof checked against independently supplied key', () => {
  assert.equal(
    verifySignedEvidence(sign({ kind: 'fixture' }), publicKey, sha, now).kind,
    'fixture',
  );
  assert.throws(
    () =>
      verifySignedEvidence(
        sign({}),
        crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }),
        sha,
        now,
      ),
    /SIGNATURE_INVALID/,
  );
});
test('FSA011 signed stale/another-sha proof rejected', () => {
  assert.throws(
    () =>
      verifySignedEvidence(
        sign({ checkedAt: new Date(now - 25 * 3600000).toISOString() }),
        publicKey,
        sha,
        now,
      ),
    /AGE/,
  );
  assert.throws(
    () => verifySignedEvidence(sign({ sha: 'b'.repeat(40) }), publicKey, sha, now),
    /IDENTITY/,
  );
});
test('FSA022 source/runtime require different trust keys before verdict', () => {
  const { root } = artifacts();
  assert.throws(
    () =>
      verifyPromotionInputs({
        SOURCE_SHA: sha,
        RELEASE_ARTIFACT_DIRECTORY: root,
        RELEASE_EVIDENCE_BUNDLE_JSON: JSON.stringify({ version: 2 }),
        RELEASE_SOURCE_EVIDENCE_PUBLIC_KEY: publicKey,
        RELEASE_RUNTIME_EVIDENCE_PUBLIC_KEY: publicKey,
      }),
    /TRUST_SEPARATION/,
  );
});
test('FSA012 accepted response is PENDING, not completed deployment', () => {
  const { manifest } = artifacts();
  assert.equal(
    promotionState(
      { deploymentId: 'id', environment: 'staging', sourceSha: sha, state: 'ACCEPTED' },
      manifest,
      'staging',
    ),
    'PENDING',
  );
});
const terminal = (manifest) => ({
  deploymentId: 'deployment',
  environment: 'staging',
  sourceSha: sha,
  state: 'HEALTHY',
  units: manifest.artifacts.map((a) => ({
    unit: a.unit,
    state: 'HEALTHY',
    sourceSha: sha,
    artifactSha256: a.sha256,
    runtimeImageDigest: 'sha256:' + 'd'.repeat(64),
    endpoint: `https://${a.unit}.example`,
  })),
});
test('FSA012 exact terminal unit/digest facts accepted', () => {
  const { manifest } = artifacts();
  assert.equal(promotionState(terminal(manifest), manifest, 'staging'), 'HEALTHY');
});
test('FSA012 partial/failed/wrong digest rejected', () => {
  const { manifest } = artifacts();
  assert.throws(
    () => promotionState({ ...terminal(manifest), state: 'PARTIAL' }, manifest, 'staging'),
    /FAILED/,
  );
  const result = terminal(manifest);
  result.units[0].artifactSha256 = '0'.repeat(64);
  assert.throws(() => promotionState(result, manifest, 'staging'), /DIGEST_OR_HEALTH/);
});
test('FSA012 bounded reconcile polls accepted until terminal', async () => {
  const { manifest } = artifacts();
  let calls = 0;
  const result = await reconcilePromotion(
    {
      endpoint: 'https://control.example',
      token: 'fixture-only',
      environment: 'staging',
      manifest,
      evidence: {},
    },
    async () =>
      new Response(
        JSON.stringify(
          ++calls === 1
            ? {
                deploymentId: 'deployment',
                environment: 'staging',
                sourceSha: sha,
                state: 'ACCEPTED',
              }
            : terminal(manifest),
        ),
        { headers: { 'content-type': 'application/json' } },
      ),
    { maximumPolls: 1, wait: async () => {} },
  );
  assert.equal(result.state, 'HEALTHY');
  assert.equal(calls, 2);
});
test('FSA012 accepted forever times out, never emits healthy evidence', async () => {
  const { manifest } = artifacts();
  await assert.rejects(
    () =>
      reconcilePromotion(
        {
          endpoint: 'https://control.example',
          token: 'fixture-only',
          environment: 'staging',
          manifest,
          evidence: {},
        },
        async () =>
          new Response(
            JSON.stringify({
              deploymentId: 'deployment',
              environment: 'staging',
              sourceSha: sha,
              state: 'PENDING',
            }),
            { headers: { 'content-type': 'application/json' } },
          ),
        { maximumPolls: 0, wait: async () => {} },
      ),
    /TIMEOUT/,
  );
});
test('FSA004/005/006/016/019/020/021 mandatory runtime skip stays BLOCKED', () => {
  const data = proof();
  data.gates.find((gate) => gate.id === 'built-browser').outcome = 'SKIPPED';
  const result = releaseVerdict(data, sha, now, inventory);
  assert.equal(result.sourceStatus, 'SOURCE_VERIFIED');
  assert.equal(result.runtimeStatus, 'RUNTIME_UNVERIFIED');
  assert.equal(result.decision, 'BLOCKED');
});
test('FSA022 independent logical source/runtime states accept complete fixture only', () => {
  const result = releaseVerdict(proof(), sha, now, inventory);
  assert.equal(result.decision, 'GO');
  assert.equal(result.runtimeStatus, 'RUNTIME_VERIFIED');
});
test('FSA023 missing one source task reviewer cannot close section', () => {
  const data = proof();
  data.sectionBlockers[0].tasks = [];
  assert.equal(releaseVerdict(data, sha, now, inventory).decision, 'BLOCKED');
});
test('FSA023 actual owner-curation-pending inventory blocks even all claimed pass', () =>
  assert.equal(releaseVerdict(proof(), sha, now).decision, 'BLOCKED'));
test('FSA023 stale evidence and duplicate gate not PASS', () => {
  const data = proof();
  data.gates[0].checkedAt = new Date(now - 25 * 3600000).toISOString();
  assert.equal(releaseVerdict(data, sha, now, inventory).decision, 'BLOCKED');
  data.gates.push({ ...data.gates[1] });
  assert.equal(releaseVerdict(data, sha, now, inventory).decision, 'BLOCKED');
});
test('FSA004…021 mere PASS booleans lack required execution details', () =>
  assert.ok(acceptanceDetails(proof(), sha).length > 0));

test('R11 rejects absent or nonnumeric measurement duration and empty dataset identity', () => {
  const row = {
    id: 'public-search', p95Ms: 10, p99Ms: 20, maximumP99Ms: 100,
    durationSeconds: 60, fixture: 'synthetic-catalog-v1', errorBudgetPassed: true,
    poolSaturationSafe: true, rateLimitSafe: true, queueLagSafe: true,
  };
  const failures = (categories) => acceptanceDetails({ gates: [{ id: 'load-slo', categories }] }, sha);
  assert.equal(failures([row]).includes('public-search:SLO_UNVERIFIED'), false);
  for (const durationSeconds of [undefined, null, NaN, Infinity, '60', 59]) {
    assert.equal(failures([{ ...row, durationSeconds }]).includes('public-search:SLO_UNVERIFIED'), true);
  }
  for (const fixture of [' ', true, {}]) {
    assert.equal(failures([{ ...row, fixture }]).includes('public-search:SLO_UNVERIFIED'), true);
  }
});

test('R11 conflicting duplicate category cannot hide a failing load observation', () => {
  const row = {
    id: 'public-search', p95Ms: 10, p99Ms: 20, maximumP99Ms: 100,
    durationSeconds: 60, fixture: 'synthetic-catalog-v1', errorBudgetPassed: true,
    poolSaturationSafe: true, rateLimitSafe: true, queueLagSafe: true,
  };
  const failures = acceptanceDetails({ gates: [{ id: 'load-slo', categories: [row, { ...row, p99Ms: 1000 }] }] }, sha);
  assert.ok(failures.includes('public-search:SLO_UNVERIFIED'));
});
test('FSA006 26-domain fixture matrix cannot use page-load-only evidence', () => {
  const rows = DOMAINS.map((owner) => ({
    owner,
    sha,
    environment: 'DISPOSABLE',
    providerMode: 'STUB_OR_SANDBOX',
    fixtureId: 'fixture',
    traceArtifact: 'https://ci.example/trace',
    assertions: {},
  }));
  assert.equal(
    acceptanceMatrix(rows, sha).every((row) => row.status === 'UNVERIFIED'),
    true,
  );
});
test('FSA006 full attributable matrix assertions accepted without any live execution', () => {
  const rows = DOMAINS.map((owner) => ({
    owner,
    sha,
    environment: 'DISPOSABLE',
    providerMode: 'STUB_OR_SANDBOX',
    fixtureId: 'fixture',
    traceArtifact: 'https://ci.example/trace',
    assertions: Object.fromEntries(
      ['public-truth', 'permission-denial', 'owner-isolation', 'lifecycle', 'locale'].map((key) => [
        key,
        { executed: true, outcome: 'PASS' },
      ]),
    ),
  }));
  assert.equal(
    acceptanceMatrix(rows, sha).every((row) => row.status === 'VERIFIED'),
    true,
  );
});
const db =
  'postgresql://manaratak_restore_runner:fixture@isolated.example/manaratak_restore_' +
  '1'.repeat(32);
function recoveryFixture(overrides = {}) {
  const root = temp(),
    databaseBackup = path.join(root, 'db.dump'),
    assetDirectory = path.join(root, 'assets'),
    assetManifest = path.join(root, 'assets.json');
  fs.mkdirSync(assetDirectory);
  fs.writeFileSync(databaseBackup, 'ISOLATED BACKUP HASH FIXTURE NOT REAL DATABASE');
  fs.writeFileSync(path.join(assetDirectory, 'a.txt'), 'asset');
  const manifest = {
    version: 1,
    snapshotId: 'snapshot_' + '2'.repeat(32),
    files: [{ path: 'a.txt', sha256: hash('asset') }],
  };
  fs.writeFileSync(assetManifest, JSON.stringify(manifest));
  const data = {
    kind: 'MANARATAK_DISPOSABLE_RESTORE_AUTHORIZATION',
    environment: 'DISPOSABLE',
    productionHosts: ['production.example'], targetServerIdentity: '111111111111', productionServerIdentity: '222222222222',
    targetFingerprint: databaseIdentity(db).fingerprint,
    sourceDatabaseFingerprint: '3'.repeat(64),
    productionDatabaseFingerprint: '4'.repeat(64),
    approvers: ['sre', 'reviewer'],
    disposableInstanceId: '11111111-1111-1111-1111-111111111111',
    allowedHosts: ['isolated.example'],
    databaseBackupSha256: hash(fs.readFileSync(databaseBackup)),
    assetManifestSha256: hash(fs.readFileSync(assetManifest)),
    snapshotId: manifest.snapshotId,
    assetCount: 1,
    backupCapturedAt: new Date(now - 60000).toISOString(),
    ...overrides,
  };
  const assertion = sign(data);
  return {
    databaseUrl: db,
    databaseBackup,
    assetDirectory,
    assetManifest,
    assertion,
    publicKey,
    sha,
    objectives: { regionalLossRpoMinutes: 5, regionalLossRtoMinutes: 60 },
    data,
    manifest,
  };
}
const sentinel = (target, proof) => ({
  serverIdentity: proof.targetServerIdentity,
  database: target.database,
  role: target.role,
  superuser: false,
  createRole: false,
  createDatabase: false,
  replication: false,
  bypassRls: false,
  unsafeRoleMembership: false,
  canConnectOtherDatabase: false,
  targetFingerprint: target.fingerprint,
  disposableInstanceId: proof.disposableInstanceId,
  sentinelOwnedByRestoreRole: false,
  sentinelWritableByRestoreRole: false,
});
test('FSA014 independently signed literal isolated target accepted', () => {
  const input = recoveryFixture();
  assert.equal(
    recoveryTarget(db, input.assertion, publicKey, sha, now).target.role,
    'manaratak_restore_runner',
  );
});
for (const url of [
  'postgresql://manaratak_restore_runner:x@localhost/production',
  'postgresql://manaratak_restore_runner:x@remote/test-production',
  'postgresql://postgres:x@isolated.example/manaratak_restore_' + '1'.repeat(32),
])
  test(`FSA014 reject ${new URL(url).pathname} before mutating`, () => {
    const input = recoveryFixture({
      targetFingerprint: databaseIdentity(url).fingerprint,
      allowedHosts: [new URL(url).hostname],
    });
    assert.throws(
      () => recoveryTarget(url, input.assertion, publicKey, sha, now),
      /NOT_AUTHORIZED/,
    );
  });
test('FSA014 same source/target, missing second party denied', () => {
  const input = recoveryFixture({ sourceDatabaseFingerprint: databaseIdentity(db).fingerprint });
  assert.throws(() => recoveryTarget(db, input.assertion, publicKey, sha, now), /NOT_AUTHORIZED/);
  const single = recoveryFixture({ approvers: ['sre'] });
  assert.throws(() => recoveryTarget(db, single.assertion, publicKey, sha, now), /NOT_AUTHORIZED/);
});
test('FSA014 production fingerprint target denied', () => {
  const input = recoveryFixture({
    productionDatabaseFingerprint: databaseIdentity(db).fingerprint,
  });
  assert.throws(() => recoveryTarget(db, input.assertion, publicKey, sha, now), /NOT_AUTHORIZED/);
});
test('FSA014 DB sentinel privileges/instance independently rechecked', () => {
  const input = recoveryFixture(),
    { target, proof } = recoveryTarget(db, input.assertion, publicKey, sha, now);
  databaseSentinel(sentinel(target, proof), target, proof);
  assert.throws(
    () => databaseSentinel({ ...sentinel(target, proof), superuser: true }, target, proof),
    /SENTINEL/,
  );
  assert.throws(
    () =>
      databaseSentinel(
        { ...sentinel(target, proof), sentinelWritableByRestoreRole: true },
        target,
        proof,
      ),
    /SENTINEL/,
  );
});
test('FSA018 corrupted backup aborts before even sentinel SQL', async () => {
  const input = recoveryFixture();
  fs.writeFileSync(input.databaseBackup, 'corrupt');
  let calls = 0;
  await assert.rejects(
    () =>
      executeRestore(input, {
        readSentinel: async () => {
          calls++;
        },
        restoreDatabase: async () => {
          calls++;
        },
        verifyDatabase: async () => {
          calls++;
        },
        now: () => now,
      }),
    /BACKUP_HASH/,
  );
  assert.equal(calls, 0);
});
test('FSA018 runtime requires a data-derived database snapshot before sentinel SQL', async () => {
  const input = {...recoveryFixture(), requireDatabaseSnapshot: true};
  let calls = 0;
  const forbidden = async () => { calls++; throw Error('UNEXPECTED_SQL'); };
  await assert.rejects(() => executeRestore(input, {readSentinel:forbidden,restoreDatabase:forbidden,verifyDatabase:forbidden,now:()=>now}), /RECOVERY_DATABASE_SNAPSHOT_INVALID/);
  assert.equal(calls, 0);
});
test('FSA018 corrupt asset aborts before all SQL', async () => {
  const input = recoveryFixture();
  fs.writeFileSync(path.join(input.assetDirectory, 'a.txt'), 'corrupt');
  let calls = 0;
  await assert.rejects(
    () =>
      executeRestore(input, {
        readSentinel: async () => {
          calls++;
        },
        restoreDatabase: async () => {
          calls++;
        },
        verifyDatabase: async () => {
          calls++;
        },
        now: () => now,
      }),
    /ASSET_HASH/,
  );
  assert.equal(calls, 0);
});
test('FSA018 traversal asset aborts before all SQL', async () => {
  const input = recoveryFixture();
  input.manifest.files[0].path = '../a.txt';
  fs.writeFileSync(input.assetManifest, JSON.stringify(input.manifest));
  const data = { ...input.data, assetManifestSha256: hash(fs.readFileSync(input.assetManifest)) };
  input.assertion = sign(data);
  let calls = 0;
  await assert.rejects(
    () =>
      executeRestore(input, {
        readSentinel: async () => {
          calls++;
        },
        restoreDatabase: async () => {
          calls++;
        },
        verifyDatabase: async () => {
          calls++;
        },
        now: () => now,
      }),
    /PATH_INVALID/,
  );
  assert.equal(calls, 0);
});
test('FSA018 symlink asset rejected', async () => {
  const input = recoveryFixture();
  fs.rmSync(path.join(input.assetDirectory, 'a.txt'));
  fs.symlinkSync(input.databaseBackup, path.join(input.assetDirectory, 'a.txt'));
  await assert.rejects(() => recoveryInputs({ ...input, proof: input.data }), /SYMLINK/);
});
test('FSA017 measured >60min restore fails even structural success', () => {
  const result = restoreObjectives(
    {
      startedAt: now,
      completedAt: now + 61 * 60000,
      backupCapturedAt: new Date(now - 60000).toISOString(),
      structuralRestorability: true,
    },
    { regionalLossRtoMinutes: 60, regionalLossRpoMinutes: 5 },
  );
  assert.equal(result.status, 'FAIL');
  assert.equal(result.structuralRestorability, true);
});
test('FSA017 >5min backup currency fails', () =>
  assert.equal(
    restoreObjectives(
      {
        startedAt: now,
        completedAt: now + 1000,
        backupCapturedAt: new Date(now - 6 * 60000).toISOString(),
        structuralRestorability: true,
      },
      { regionalLossRtoMinutes: 60, regionalLossRpoMinutes: 5 },
    ).status,
    'FAIL',
  ));
test('FSA014/017/018 full fake restore ordering and objective result without commands', async () => {
  const input = recoveryFixture(),
    calls = [];
  const { proof } = recoveryTarget(db, input.assertion, publicKey, sha, now);
  const result = await executeRestore(input, {
    now: () => now,
    readSentinel: async (target) => {
      calls.push('sentinel');
      return sentinel(target, proof);
    },
    restoreDatabase: async () => {
      calls.push('restore-stub');
    },
    verifyDatabase: async () => {
      calls.push('verify-stub');
      return { snapshotId: proof.snapshotId, assetReferencesMatched: true };
    },
  });
  assert.deepEqual(calls, ['sentinel', 'restore-stub', 'verify-stub']);
  assert.equal(result.status, 'PASS');
});
test('FSA015 unsigned/stale backup readiness cannot pass', () => {
  assert.throws(() => backupEvidence({}, {}, publicKey, sha, now), /SIGNATURE/);
  const pg = sign({
    kind: 'POSTGRES_BACKUP_READINESS',
    snapshotId: 'snap',
    pitrEnabled: true,
    pitrWindowDays: 30,
    encrypted: true,
    immutableCopy: true,
    accessAudited: true,
    latestRecoverableAt: new Date(now - 6 * 60000).toISOString(),
  });
  const assets = sign({
    kind: 'ASSET_BACKUP_READINESS',
    snapshotId: 'snap',
    versioningEnabled: true,
    crossRegionCopy: true,
    encrypted: true,
    immutableCopy: true,
    accessAudited: true,
    hashParityVerified: true,
  });
  assert.equal(backupEvidence(pg, assets, publicKey, sha, now).status, 'FAIL');
});
test('FSA015 missing numeric PITR proof cannot be mistaken for pass', () => {
  const pg = sign({
    kind: 'POSTGRES_BACKUP_READINESS',
    snapshotId: 'snap',
    pitrEnabled: true,
    encrypted: true,
    immutableCopy: true,
    accessAudited: true,
    latestRecoverableAt: date,
  });
  const assets = sign({
    kind: 'ASSET_BACKUP_READINESS',
    snapshotId: 'snap',
    versioningEnabled: true,
    crossRegionCopy: true,
    encrypted: true,
    immutableCopy: true,
    accessAudited: true,
    hashParityVerified: true,
  });
  assert.equal(backupEvidence(pg, assets, publicKey, sha, now).status, 'FAIL');
});
const market = {
  id: 'market',
  countryId: 'country',
  degreeLevelId: 'bachelor',
  teachingLanguageId: 'en',
  mandatory: true,
};
const content = {
  marketId: 'market',
  countryId: 'country',
  degreeLevelId: 'bachelor',
  teachingLanguageId: 'en',
  sha,
  checkedAt: date,
  scope: 'COMPLETE',
  provenance: 'PERMISSIONED_COMPLETE_OWNER_QUERY',
  total: 1,
  supported: true,
  universityPublished: true,
  programActive: true,
  majorProfilePublished: true,
  canonicalTeachingLanguage: true,
  scholarshipPublishedVerified: true,
  programParentMatched: true,
  sourceEvidenceVerified: true,
};
test('FSA-FG024 typed mandatory market owner chain is available', () =>
  assert.equal(businessCoverage([market], [content], sha).rows[0].state, 'AVAILABLE'));
test('FSA-FG024 draft-only chain incomplete; zero distinct; partial unavailable', () => {
  assert.equal(
    businessCoverage([market], [{ ...content, programActive: false }], sha).rows[0].state,
    'INCOMPLETE',
  );
  assert.equal(businessCoverage([market], [{ ...content, total: 0 }], sha).rows[0].state, 'ZERO');
  assert.equal(
    businessCoverage([market], [{ ...content, scope: 'PARTIAL' }], sha).rows[0].state,
    'UNAVAILABLE',
  );
});
test('FSA-FG024 optional zero market does not block mandatory scope, no production claim', () => {
  const report = businessCoverage(
    [{ ...market, mandatory: false }],
    [{ ...content, total: 0 }],
    sha,
  );
  assert.equal(report.mandatoryReady, true);
  assert.equal(report.productionDecision, 'UNVERIFIED');
});
test('FSA001 source evidence writer preserves skipped gate and never declares runtime pass', () => {
  const root = temp();
  const result = spawnSync(
    process.execPath,
    [path.resolve('scripts/ci/write-source-ci-evidence.mjs')],
    {
      cwd: root,
      env: {
        ...process.env,
        GITHUB_SHA: sha,
        SOURCE_CI_STEPS_JSON: '{}',
        SOURCE_EVIDENCE_SIGNING_KEY: '',
      },
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, 0);
  const report = JSON.parse(
    fs.readFileSync(path.join(root, 'p12-ci-evidence/SOURCE_CI_CLOSURE.json')),
  );
  assert.equal(report.pass, false);
  assert.equal(report.runtimeStatus, 'UNVERIFIED');
  assert.equal(report.productionDecision, 'BLOCKED');
  const manifestBytes = fs.readFileSync('scripts/ci/source-closure-manifest.json');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(report.sourceClosureManifest.sha256, hash(manifestBytes));
  assert.deepEqual(report.sourceClosureManifest.sourceGateIds, manifest.gates.filter(gate => gate.classification === 'SOURCE').map(gate => gate.id));
  assert.equal(report.runtimePendingManifest, manifest.runtimePendingManifest);
  assert.equal(report.unitCommand, JSON.parse(fs.readFileSync('package.json')).scripts['test:unit']);
});
test('FSA002/013 corrected repository while deployment/recovery remain explicit opt-in', () => {
  const release = fs.readFileSync('.github/workflows/release-promotion.yml', 'utf8'),
    recovery = fs.readFileSync('.github/workflows/recovery-restore-audit.yml', 'utf8');
  assert.equal(release.includes('MANARATAK_FINAL'), false);
  assert.equal(recovery.includes('MANARATAK_FINAL'), false);
  assert.ok(release.includes("vars.MANARATAK_RELEASE_ENABLED == 'true'"));
  assert.ok(recovery.includes("vars.MANARATAK_RECOVERY_AUDIT_ENABLED == 'true'"));
  assert.ok(release.includes('environment: production'));
  assert.ok(recovery.includes('environment: recovery-audit'));
  assert.ok(release.includes('verify-release-evidence.mjs'));
});
