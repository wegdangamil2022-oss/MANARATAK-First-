import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const read=(p)=>fs.readFileSync(p,'utf8');

test('database integration config registers a disposable P07-P21 persistence contract',()=>{
  const config=read('vitest.database.config.ts'), suite=read('packages/infrastructure/tests/database/WholePlatformPersistence.integration.spec.ts');
  assert.match(config,/WholePlatformPersistence\.integration\.spec\.ts/);
  for(let phase=7; phase<=21; phase++) assert.ok(suite.includes(`'P${String(phase).padStart(2,'0')}'`),`P${phase}`);
  assert.ok(suite.includes('pg_constraint'));
  assert.ok(suite.includes('pg_advisory_xact_lock'));
  assert.ok(read('packages/infrastructure/tests/database/DisposablePostgresHarness.ts').includes('DATABASE_INTEGRATION_REQUIRES_DISPOSABLE_TARGET'));
});

test('production monitoring is provider-backed and covers HTTP plus workers',()=>{
  const provider=read('packages/infrastructure/src/monitoring/OtlpHttpMonitoringProvider.ts');
  for(const marker of ['v1/metrics','v1/traces','resourceMetrics','resourceSpans','scopeMetrics','scopeSpans']) assert.ok(provider.includes(marker),marker);
  const service=read('packages/infrastructure/src/monitoring/MonitoringService.ts');
  for(const marker of ['startSpan(name','this.provider?.startSpan?.','this.provider?.forceFlush?.','this.provider?.shutdown?.']) assert.ok(service.includes(marker),marker);
  const middleware=read('apps/api/src/presentation/monitoring/MonitoringMiddleware.ts');
  for(const marker of ['http.server.requests','http.server.duration_ms','http.server.inflight','startSpan']) assert.ok(middleware.includes(marker));
  const server=read('apps/api/src/server.ts');
  for(const marker of ['worker.iterations','worker.iteration.duration_ms','observeWorkerIteration']) assert.ok(server.includes(marker));
  const config=read('packages/config/src/AppConfig.ts'); assert.ok(config.includes('OTEL_EXPORTER_OTLP_ENDPOINT'));
  assert.ok(read('docs/operations/OBSERVABILITY_RUNBOOK.md').includes('PENDING_NON_BLOCKING'));
});

test('DR contract includes PITR, immutable backups, provider readiness and weekly restore drill',()=>{
  const contract=JSON.parse(read('config/recovery/production-recovery-contract.json'));
  assert.ok(contract.objectives.regionalLossRpoMinutes<=5);
  assert.ok(contract.objectives.regionalLossRtoMinutes<=60);
  assert.match(contract.postgresql.immutableCopy,/WORM/);
  assert.ok(read('.github/workflows/recovery-restore-audit.yml').includes('recovery:runtime:readiness'));
  assert.ok(read('scripts/recovery/run-whole-platform-restore-drill.mjs').includes('test:database'));
});

test('release promotion consumes one immutable artifact set across validation staging and production',()=>{
  const workflow=read('.github/workflows/release-promotion.yml');
  for(const marker of ['workflow_run','manaratak-release-artifacts-$SOURCE_SHA','immutable-release-$SOURCE_SHA','needs: validation','needs: staging','release:verify','environment: production']) assert.ok(workflow.includes(marker),marker);
  const builder=read('scripts/release/build-immutable-artifacts.mjs');
  for(const marker of ['release-sbom.cdx.json','SHA256SUMS','--sort=name','--mtime=UTC 1970-01-01']) assert.ok(builder.includes(marker),marker);
});
