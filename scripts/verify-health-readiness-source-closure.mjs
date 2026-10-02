#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const router = read('apps/api/src/presentation/api/router/MonitoringRouter.ts');
const app = read('apps/api/src/app.ts');
const page = read('apps/admin/src/pages/AdminHealthReadinessPage.tsx');
const shell = read('apps/admin/src/App.tsx');
const nav = read('apps/admin/src/components/AdminNavigation.tsx');
const env = read('.env.example');
const tests = read('apps/api/tests/presentation/monitoring/HealthMonitoring.spec.ts');
const monitoringServiceSource = read('packages/infrastructure/src/monitoring/MonitoringService.ts');

check('admin page calls protected monitoring overview', page.includes("'/admin/monitoring/overview'"));
check('admin page does not call public diagnostic overview', !page.includes("request<HealthOverview>('/monitoring/overview')"));
check('diagnostic routes disabled by default', router.includes('diagnosticsEnabled = false'));
check('public router returns before diagnostic routes', router.includes('if (!diagnosticsEnabled)') && router.indexOf('if (!diagnosticsEnabled)') < router.indexOf("router.get('/production-readiness'"));
check('admin monitoring is RBAC protected', app.includes("v1Router.use('/admin/monitoring', requireAdminPermission('admin:platform:manage')"));
check('admin monitoring explicitly enables diagnostics', app.includes('diagnosticsEnabled: true'));
check('public monitoring still mounted', app.includes("v1Router.use('/monitoring', MonitoringRouter.create"));
check('public monitoring mount does not receive production report', /v1Router\.use\('\/monitoring',[\s\S]*?MonitoringRouter\.create\(\{[\s\S]*?monitoringService,[\s\S]*?runtimeMode:[\s\S]*?\}\)\);/.test(app));

for (const probe of ['database','redis','asset-platform','import-foundation','admin-auth','ai-providers','payment-gateway','notifications','background-jobs','student-tools-quota','database-schema','public-web']) {
  check(`expected probe ${probe}`, router.includes(`'${probe}'`));
  check(`registered probe ${probe}`, app.includes(`name: '${probe}'`));
}

check('database schema probe is read only migration-history inspection', app.includes('APPLIED_MIGRATION_HISTORY_ONLY') && app.includes('SELECT COUNT(*)::int AS "failedCount" FROM "_prisma_migrations"'));
check('database schema probe does not run prisma migrate', !/prisma\s+migrate|db\s+push/i.test(app));
check('public web probe is env-owned', app.includes('currentEnv.PUBLIC_WEB_URL || currentEnv.CORS_ORIGIN'));
check('public web probe is bounded', app.includes('setTimeout(() => controller.abort(), 2500)'));
check('public web probe does not chase redirects', app.includes("redirect: 'manual'"));
check('production public web requires https', app.includes("isProductionOrStaging && parsed.protocol !== 'https:'"));
check('public web url documented', env.includes('PUBLIC_WEB_URL=https://app.manaratak.org'));
check('readiness respects registered dependency criticality only', !monitoringServiceSource.includes("name === 'redis'") && !monitoringServiceSource.includes("name === 'cache'") && monitoringServiceSource.includes('indicator.isOptional === true'));
check('production Redis is registered required by composition', app.includes("name: 'redis'") && app.includes('isOptional: !isProductionOrStaging'));
check('required Redis regression exists in workspace tests', tests.includes('returns DOWN when Redis is explicitly required even though its indicator name is redis'));
try {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['--test', path.join(root, 'tests/runtime/monitoring-required-dependency-runtime.test.mjs')], { cwd: root, encoding: 'utf8' });
  check('required dependency runtime semantics execute', result.status === 0 && /# fail 0/.test(`${result.stdout || ''}\n${result.stderr || ''}`));
} catch {
  check('required dependency runtime semantics execute', false);
}

check('release gate includes configuration readiness', router.includes('configurationReady: production.ready'));
check('release gate includes runtime readiness', router.includes('runtimeReady: readiness.status === HealthStatus.UP'));
check('release gate includes monitoring coverage', router.includes('monitoringComplete: missingProbes.length === 0'));
check('release ready ANDs all three gates', router.includes('releaseGate.configurationReady') && router.includes('releaseGate.runtimeReady') && router.includes('releaseGate.monitoringComplete'));
check('admin UI renders three release gate checks', page.includes('overview.releaseGate.configurationReady') && page.includes('overview.releaseGate.runtimeReady') && page.includes('overview.releaseGate.monitoringComplete'));
check('missing probes become active blockers', page.includes("severity: 'BLOCKER' as const") && page.includes('Monitoring Coverage'));

check('diagnostic details sanitize secret-like keys', router.includes('/(secret|password|token|credential|connection|string|url)/i'));
check('diagnostic strings redact credentials', router.includes(".replace(/([a-z][a-z0-9+.-]*:\\/\\/)([^\\s/@:]+):([^\\s/@]+)@/gi, '$1***@')"));
check('health workspace has no destructive reset action', !/reset database|clear all queues|rotate secrets|delete data/i.test(page));
check('health workspace labels itself diagnostic only', page.includes('هذه الصفحة للمراقبة والتشخيص فقط'));
check('content publication readiness delegates to review queue', page.includes('to=\"/review-queue\"') && page.includes('جاهزية المحتوى والنشر'));
check('certificate readiness delegates to certificate owner', page.includes('to=\"/certificates\"') && page.includes('جاهزية الشهادات'));
check('runtime findings come from probes', page.includes("source: 'Runtime'"));
check('production findings come from runtime validator', page.includes('overview.productionReadiness.findings'));
check('JSON diagnostic export is generated from current overview', page.includes('JSON.stringify(overview, null, 2)'));

check('health page uses MANARATAK navy', page.includes('#142B5F'));
check('health page uses MANARATAK gold', page.includes('#D6A43B'));
check('admin shell uses MANARATAK navy', shell.includes('#142B5F'));
check('admin navigation uses MANARATAK navy', nav.includes('#142B5F'));
check('admin navigation uses MANARATAK gold', nav.includes('#D6A43B'));
check('legacy green removed from shared admin shell', !/#044A37|#235D4E|#E3B04B/i.test(`${shell}\n${nav}`));

check('unused static readiness blocker file removed', !exists('apps/admin/src/security/ProductionReadinessBlockers.ts'));
check('unused static readiness blocker test removed', !exists('apps/admin/src/security/ProductionReadinessBlockers.spec.ts'));
check('public diagnostic exposure has a regression test', tests.includes('keeps diagnostic overview and production readiness off the public monitoring surface'));
check('holistic release gate has a regression test', tests.includes('computes the admin release gate from configuration, runtime and monitoring coverage together'));
check('closure report exists', exists('docs/HEALTH_READINESS_FINAL_CLOSURE_2026-09-05.md'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`HEALTH_READINESS_SOURCE_CLOSURE=${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) {
  console.error(`HEALTH_READINESS_SOURCE_CLOSURE_FAILED=${failed.length}`);
  process.exit(1);
}
