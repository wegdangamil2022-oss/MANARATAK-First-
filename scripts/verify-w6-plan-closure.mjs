#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const requireAll = (source, markers) => markers.every((marker) => source.includes(marker));
const checks = [];
const check = (id, title, fn) => {
  try {
    const ok = Boolean(fn());
    checks.push({ id, title, ok, error: ok ? '' : 'required source contract is missing' });
  } catch (error) {
    checks.push({ id, title, ok: false, error: error?.message ?? String(error) });
  }
};

check('MNT-AUD-0009', 'translation quality gate uses behavioral contracts', () => {
  const source = read('scripts/verify-translation-quality-source.ts');
  const pkg = JSON.parse(read('package.json'));
  return requireAll(source, ['checkTranslationBehaviorContracts', 'translation:test']) &&
    !source.includes("const language: Language = 'ar'") &&
    !source.includes('localizedNames: _localizedNames') &&
    String(pkg.scripts?.['translation:ci'] ?? '').includes('translation:test');
});

check('MNT-AUD-0010', 'imported-course security gate follows canonical force re-analysis', () => {
  const runtime = read('scripts/wp-ic-10-runtime-lib.mjs');
  const operations = read('packages/application/src/courses/use-cases/CourseImportOperationsUseCases.ts');
  return requireAll(runtime, ['CourseImportOperationsUseCases.ts', 'providerReplayForceReanalysisInvariant']) &&
    requireAll(operations, ['options.force', 'force: true']);
});

check('MNT-AUD-0047', 'P16 verifier follows the current CMS composition', () => {
  const source = read('scripts/verify-phase16-source.mjs');
  return !source.includes('CmsContentDetail.tsx') && requireAll(source, [
    'CmsPublicRouter.ts',
    'PublicTemplateApp.tsx',
    'publicLiveDataSource.ts',
    'PrismaCmsRepository.ts',
  ]);
});

check('MNT-AUD-0048', 'canonical CI is manifest-driven and runtime-deferred explicitly', () => {
  const manifest = JSON.parse(read('scripts/ci/source-closure-manifest.json'));
  const ci = read('.github/workflows/ci.yml');
  const evidence = read('scripts/ci/write-source-ci-evidence.mjs');
  const gateNames = new Set((manifest.gates ?? []).map((gate) => gate.id));
  const runtime = (manifest.gates ?? []).filter((gate) => gate.classification === 'RUNTIME');
  return manifest.kind === 'MANARATAK_SOURCE_CLOSURE_MANIFEST' &&
    manifest.runtimePolicy === 'PENDING_NON_BLOCKING' &&
    typeof manifest.runtimePendingManifest === 'string' &&
    /^docs\/remediation\/W(?:6|7)_RUNTIME_PENDING_CHECKS\.md$/.test(manifest.runtimePendingManifest) &&
    exists(manifest.runtimePendingManifest) &&
    read(manifest.runtimePendingManifest).includes('PENDING_NON_BLOCKING') &&
    ['p15','p16','p17','p18','p19'].every((name) => gateNames.has(name)) &&
    runtime.length > 0 && runtime.every((gate) => gate.status === 'PENDING_NON_BLOCKING') &&
    ci.includes('npm run ci:closure:manifest') && evidence.includes('sourceClosureManifest');
});

check('MNT-AUD-0042', 'disposable PostgreSQL whole-platform integration harness is registered', () => {
  const config = read('vitest.database.config.ts');
  const suite = read('packages/infrastructure/tests/database/WholePlatformPersistence.integration.spec.ts');
  const harness = read('packages/infrastructure/tests/database/DisposablePostgresHarness.ts');
  return config.includes('WholePlatformPersistence.integration.spec.ts') &&
    Array.from({ length: 15 }, (_, i) => `P${String(i + 7).padStart(2, '0')}`).every((phase) => suite.includes(phase)) &&
    requireAll(suite, ['pg_constraint', 'pg_advisory_xact_lock', 'outbox', 'idempotency']) &&
    requireAll(harness, ['assertDisposableDatabaseUrl', 'MANARATAK_DATABASE_INTEGRATION_ENABLED']);
});

check('MNT-AUD-0078', 'production telemetry provider and HTTP/background instrumentation are wired', () => {
  const provider = read('packages/infrastructure/src/monitoring/OtlpHttpMonitoringProvider.ts');
  const middleware = read('apps/api/src/presentation/monitoring/MonitoringMiddleware.ts');
  const monitoringService = read('packages/infrastructure/src/monitoring/MonitoringService.ts');
  const app = read('apps/api/src/app.ts');
  const server = read('apps/api/src/server.ts');
  const cfg = read('packages/config/src/AppConfig.ts');
  return exists('config/monitoring/alert-rules.json') && exists('docs/operations/OBSERVABILITY_RUNBOOK.md') &&
    requireAll(provider, ['class OtlpHttpMonitoringProvider', 'forceFlush', 'startSpan', 'resourceMetrics', 'resourceSpans']) &&
    requireAll(middleware, ['http.server.request', 'status_class', 'inflight']) &&
    requireAll(monitoringService, ['this.provider?.startSpan?.', 'this.provider?.forceFlush?.', 'this.provider?.shutdown?.']) &&
    requireAll(app, ['OtlpHttpMonitoringProvider', 'telemetry-exporter']) &&
    requireAll(server, ['observeWorkerIteration', 'monitoringProvider']) &&
    cfg.includes('OTEL_EXPORTER_OTLP_ENDPOINT');
});

check('MNT-AUD-0066', 'provider-neutral DR contract, readiness and restore drill are source-complete', () => {
  const contract = JSON.parse(read('config/recovery/production-recovery-contract.json'));
  const verifier = read('scripts/recovery/verify-recovery-contract.mjs');
  const drill = read('scripts/recovery/run-whole-platform-restore-drill.mjs');
  const workflow = read('.github/workflows/recovery-restore-audit.yml');
  return contract.kind === 'MANARATAK_PRODUCTION_RECOVERY_CONTRACT' &&
    contract.runtimeEvidenceStatus === 'PENDING_NON_BLOCKING' &&
    exists('scripts/recovery/verify-runtime-backup-readiness.mjs') &&
    exists('docs/operations/PLATFORM_DISASTER_RECOVERY_RUNBOOK.md') &&
    requireAll(verifier, ['RECOVERY_SOURCE_CONTRACT=PASS', 'PENDING_NON_BLOCKING']) &&
    requireAll(drill, ['pg_restore', 'test:database', 'RESTORE_DRILL.json']) &&
    requireAll(workflow, ['schedule:', 'recovery:runtime:readiness', 'recovery:restore:drill']);
});

check('MNT-AUD-0008', 'operational scripts are governed by the architecture guard', () => {
  const core = read('scripts/architecture/source-architecture-guard-core.mjs');
  const policy = JSON.parse(read('scripts/architecture/operational-tooling-boundary.json'));
  return requireAll(core, ['collectOperationalToolingViolations', "walk(root, 'scripts')", 'operational-tooling-boundary.json']) &&
    Array.isArray(policy.classifiedDirectPrismaScripts) && Array.isArray(policy.classifiedPresentationImportScripts);
});

check('MNT-AUD-0087', 'all external GitHub Actions are immutable full-SHA pins', () => {
  if (!exists('.github/dependabot.yml')) return false;
  const workflowDir = path.join(root, '.github/workflows');
  const workflows = fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name));
  const bad = [];
  for (const name of workflows) {
    const source = fs.readFileSync(path.join(workflowDir, name), 'utf8');
    for (const match of source.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
      const use = match[1];
      if (use.startsWith('./')) continue;
      const at = use.lastIndexOf('@');
      const ref = at >= 0 ? use.slice(at + 1) : '';
      if (!/^[0-9a-f]{40}$/i.test(ref)) bad.push(`${name}:${use}`);
    }
  }
  return bad.length === 0 && read('scripts/security/verify-github-action-pins.mjs').includes('40');
});

check('MNT-AUD-0094', 'immutable artifact build and exact-artifact environment promotion are wired', () => {
  const build = read('scripts/release/build-immutable-artifacts.mjs');
  const verify = read('scripts/release/verify-release-artifacts.mjs');
  const promote = read('scripts/release/promote-environment.mjs');
  const smoke = read('scripts/release/post-deploy-smoke.mjs');
  const workflow = read('.github/workflows/release-promotion.yml');
  const ci = read('.github/workflows/ci.yml');
  return requireAll(build, ['CycloneDX', 'SHA256SUMS', '--sort=name', '--mtime=UTC 1970-01-01']) &&
    requireAll(verify, ['sha256', 'SBOM']) && requireAll(promote, ['validation', 'staging', 'production']) &&
    requireAll(smoke, ['API', 'WEB']) && requireAll(workflow, [
      'workflow_run:', 'needs: validation', 'needs: staging', 'immutable-release-$SOURCE_SHA', 'recovery:source:verify', 'release:smoke',
    ]) && ci.includes('manaratak-release-artifacts-${{ github.sha }}');
});

for (const result of checks) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.id} :: ${result.title}${result.error ? ` :: ${result.error}` : ''}`);
}
const failed = checks.filter((result) => !result.ok);
if (failed.length) {
  console.error(`W6_PLAN_SOURCE_VERIFIER=FAIL ${checks.length - failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`W6_PLAN_SOURCE_VERIFIER=PASS ${checks.length}/${checks.length}`);
console.log('W6_DATABASE_RUNTIME=PENDING_NON_BLOCKING');
console.log('W6_TELEMETRY_PROVIDER_RUNTIME=PENDING_NON_BLOCKING');
console.log('W6_RECOVERY_RESTORE_RUNTIME=PENDING_NON_BLOCKING');
console.log('W6_RELEASE_PROMOTION_RUNTIME=PENDING_NON_BLOCKING');
console.log('W6_BROWSER_E2E_RUNTIME=PENDING_NON_BLOCKING');
