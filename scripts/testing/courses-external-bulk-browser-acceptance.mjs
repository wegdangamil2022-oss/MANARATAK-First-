import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json')), { chromium } = require('playwright');
const fixture = JSON.parse(fs.readFileSync(path.resolve('../../private/review-workspace-20261024/COURSES_EXTERNAL_BULK_BROWSER_LAB.json')));
const manual = JSON.parse(fs.readFileSync('docs/ui/evidence/courses-external-20261025/browser-verification.json'));
assert.equal(fixture.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY'); assert.equal(manual.passed, true);
const origin = 'http://127.0.0.2:3157', out = path.resolve('docs/ui/evidence/courses-external-20261025');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }), page = await context.newPage();
const result = { scope: fixture.scope, linkEvidence: fixture.linkEvidence, realApi: true, canonicalMfa: true, originalDatabaseWrites: 0, ids: fixture.ids, checks: [], errors: [] };
page.on('pageerror', error => result.errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
const api = (method, endpoint, body, version, key) => page.evaluate(async ({ method, endpoint, body, version, key }) => {
  const csrf = method === 'GET' ? {} : await (await fetch('/api/v1/auth/csrf-token', { credentials: 'include' })).json();
  const response = await fetch('/api/v1' + endpoint, { method, credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.data?.csrfToken ?? csrf.csrfToken,
    'X-Review-Reason': 'Isolated durable bulk acceptance', 'Idempotency-Key': key ?? crypto.randomUUID(), ...(version ? { 'If-Match': String(version) } : {}) }, ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }) });
  return { status: response.status, body: await response.json().catch(() => null) };
}, { method, endpoint, body, version, key });
const open = async id => { await page.goto(origin + '/admin/courses/external?batch=' + id); await page.locator('.course-bulk-counts').waitFor(); };
const continueTo = async phase => {
  await page.getByRole('button', { name: 'متابعة الدفعة', exact: true }).click();
  await page.waitForFunction(async ({ id, phase }) => { const response = await fetch('/api/v1/admin/courses/imported/bulk/' + id, { credentials: 'include' }); return response.ok && (await response.json()).summary.phase === phase; }, { id: new URL(page.url()).searchParams.get('batch'), phase }, { polling: 500, timeout: 30000 });
  await page.getByRole('button', { name: phase === 'PREVIEWED' ? 'تأكيد نشر المؤهل' : 'معاينة جديدة للفاشل فقط', exact: true }).waitFor();
};
try {
  // The canonical MFA gateway rejects reuse of a TOTP counter. The preceding
  // browser suite signs in with the same synthetic owner; wait for a fresh code.
  await new Promise(resolve => setTimeout(resolve, 30500 - Date.now() % 30000));
  await page.goto(origin + '/__isolated/sign-in'); await page.locator('.course-results[aria-busy=false]').waitFor();
  for (const id of fixture.ids) { const readiness = await api('GET', '/admin/courses/imported/' + id + '/readiness'); assert.equal(readiness.status, 200); assert.equal(readiness.body.eligible, true, JSON.stringify(readiness.body)); }
  const preview = await api('POST', '/admin/courses/imported/bulk/preview', { mode: 'IDS', ids: [...fixture.ids, manual.createdId] }); assert.equal(preview.status, 201, JSON.stringify(preview.body));
  result.batchId = preview.body.summary.id; await open(result.batchId); await continueTo('PREVIEWED');
  const checked = await api('GET', '/admin/courses/imported/bulk/' + result.batchId);
  assert.equal(checked.body.summary.counts.ELIGIBLE, 2); assert.equal(checked.body.summary.counts.BLOCKED, 1);
  assert.equal(await page.getByRole('button', { name: 'تأكيد نشر المؤهل', exact: true }).isDisabled(), true);
  const course = await api('GET', '/admin/courses/' + fixture.ids[1]);
  const raced = await api('PATCH', '/admin/courses/imported/' + fixture.ids[1], { displayName: course.body.displayName + ' — concurrent reviewed display' }, course.body.version);
  assert.equal(raced.status, 200, JSON.stringify(raced.body));
  await page.getByLabel('مبرر العملية', { exact: true }).fill('نشر المؤهل فقط مع احترام تعارض النسخ');
  await page.getByRole('checkbox', { name: 'أوافق على نشر المؤهل فقط وترك بقية النتائج دون نشر.', exact: true }).check();
  await page.getByRole('button', { name: 'تأكيد نشر المؤهل', exact: true }).click();
  await page.getByRole('button', { name: 'متابعة الدفعة', exact: true }).waitFor(); await continueTo('COMPLETE');
  const complete = await api('GET', '/admin/courses/imported/bulk/' + result.batchId); assert.equal(complete.status, 200, JSON.stringify(complete.body)); result.firstCounts = complete.body.summary.counts;
  assert.deepEqual(result.firstCounts, { PENDING: 0, ELIGIBLE: 0, BLOCKED: 1, SUCCESS: 1, FAILED: 1, NOT_EXECUTED: 0 });
  const beforeRetry = await Promise.all(fixture.ids.map(id => api('GET', '/admin/courses/' + id))); assert.equal(beforeRetry[0].body.status, 'PUBLISHED'); assert.equal(beforeRetry[1].body.status, 'READY_TO_REVIEW');
  await page.locator('dialog').evaluate(node => { node.scrollTop = 0; });
  await page.screenshot({ path: path.join(out, 'desktop-bulk-partial-results.png') });
  const titleWidth = await page.locator('.course-bulk-table td').first().evaluate(node => node.getBoundingClientRect().width);
  assert.ok(titleWidth >= 230, 'Bulk course titles must not inherit the selection-checkbox column width');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'CSV للصفحة المعروضة', exact: true }).click(); const file = await download;
  await file.saveAs(path.join(out, 'bulk-report.csv')); assert.match(fs.readFileSync(path.join(out, 'bulk-report.csv'), 'utf8'), /SUCCESS/);
  result.checks.push('Actual canonical publication succeeds for one course, blocks one, and rejects the concurrent version; eligible-only consent and paginated report/CSV are functional');
  const approvedAgain = await api('POST', '/admin/courses/imported/' + fixture.ids[1] + '/mark-ready', {}, beforeRetry[1].body.version);
  assert.equal(approvedAgain.status, 200, JSON.stringify(approvedAgain.body));
  await page.getByLabel('مبرر العملية', { exact: true }).fill('إعادة فحص الفاشل فقط بعد تعارض النسخة');
  await page.getByRole('button', { name: 'معاينة جديدة للفاشل فقط', exact: true }).click();
  await page.waitForURL(url => url.searchParams.get('batch') !== result.batchId); result.retryId = new URL(page.url()).searchParams.get('batch');
  await page.getByRole('button', { name: 'متابعة الدفعة', exact: true }).waitFor(); await continueTo('PREVIEWED');
  const retry = await api('GET', '/admin/courses/imported/bulk/' + result.retryId); assert.equal(retry.body.summary.total, 1); assert.deepEqual(retry.body.data.map(item => item.id), [fixture.ids[1]]); assert.equal(retry.body.summary.counts.ELIGIBLE, 1);
  await page.getByLabel('مبرر العملية', { exact: true }).fill('اعتماد نشر النسخة المحدثة بعد المعاينة الجديدة');
  await page.getByRole('button', { name: 'تأكيد نشر المؤهل', exact: true }).click(); await page.getByRole('button', { name: 'متابعة الدفعة', exact: true }).waitFor();
  await page.getByRole('button', { name: 'متابعة الدفعة', exact: true }).click();
  await page.waitForFunction(async id => (await (await fetch('/api/v1/admin/courses/imported/bulk/' + id)).json()).summary.phase === 'COMPLETE', result.retryId, { polling: 500, timeout: 30000 });
  const repeated = await api('POST', '/admin/courses/imported/bulk/' + result.retryId + '/step', {}); assert.equal(repeated.body.summary.counts.SUCCESS, 1);
  const finalCourses = await Promise.all(fixture.ids.map(id => api('GET', '/admin/courses/' + id))); assert.equal(finalCourses[0].body.version, beforeRetry[0].body.version); assert.equal(finalCourses[1].body.status, 'PUBLISHED');
  const undo = await api('POST', '/admin/courses/imported/' + fixture.ids[1] + '/unpublish', {}, finalCourses[1].body.version); assert.equal(undo.status, 200);
  assert.equal((await api('GET', '/admin/courses/' + fixture.ids[1])).body.status, 'READY_TO_REVIEW');
  result.checks.push('Retry creates a new preview containing only failed records at current versions; prior success is not republished; repeated completion is idempotent and canonical unpublish works');
  await page.goto(origin + '/admin/courses/external?course=' + fixture.ids[1]);
  await page.locator('[data-external-section=source]').waitFor();
  await page.getByRole('button', { name: 'إجراءات المصدر والمراجعة', exact: true }).click();
  await page.getByLabel('مبرر الإجراء', { exact: true }).fill('اعتماد ونشر فردي موثق في اختبار معزول');
  await page.getByRole('button', { name: 'اعتماد الجاهزية', exact: true }).click();
  await page.getByRole('button', { name: 'نشر الدورة', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'نشر الدورة', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'فحص جاهزية النشر', exact: true }).click();
  await page.getByRole('button', { name: 'نشر الدورة', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('نشر الدورة') && !button.disabled));
  await page.getByRole('button', { name: 'نشر الدورة', exact: true }).click();
  await page.getByRole('button', { name: 'إلغاء النشر', exact: true }).waitFor();
  const individual = await api('GET', '/admin/courses/' + fixture.ids[1]); assert.equal(individual.body.status, 'PUBLISHED'); result.individualPublicationVersion = individual.body.version;
  assert.equal(await page.getByRole('button', { name: 'تحقق من المصدر', exact: true }).isDisabled(), true);
  const forbidden = await api('PATCH', '/admin/courses/imported/' + fixture.ids[1], { displayName: 'Published overwrite attempt' }, individual.body.version); assert.equal(forbidden.status, 400);
  await page.getByRole('button', { name: 'إلغاء النشر', exact: true }).click();
  await page.getByRole('button', { name: 'اعتماد الجاهزية', exact: true }).waitFor();
  result.checks.push('Individual drawer readiness is mandatory; actual publication/unpublication succeeds and published content/source mutation is blocked');
  result.finalVersions = finalCourses.map(course => ({ id: course.body.id, version: course.body.version }));
  assert.deepEqual(result.errors, []); result.passed = true;
} catch (error) { result.failure = error.stack; await page.screenshot({ path: path.join(out, 'bulk-failure.png') }).catch(() => {}); throw error; }
finally { fs.writeFileSync(path.join(out, 'bulk-browser-verification.json'), JSON.stringify(result, null, 2)); await browser.close(); }
console.log(JSON.stringify({ passed: result.passed, batchId: result.batchId, retryId: result.retryId, counts: result.firstCounts }));
