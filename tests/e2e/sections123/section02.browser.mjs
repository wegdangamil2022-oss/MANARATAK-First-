// Real Chromium UI with intercepted HTTP only. Run with node --import tsx.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { en } from '../../../apps/admin/src/i18n/en.ts';
import { ar } from '../../../apps/admin/src/i18n/ar.ts';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const summary = [];
try {
  for (const language of ['en', 'ar']) {
    const t = language === 'en' ? en : ar;
    const context = await browser.newContext({ bypassCSP: true });
    await context.addInitScript(lang => localStorage.setItem('absheer_admin_lang', lang), language);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const calls = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const record = { id: 'audit-fixture', reference: 'AUD-fixture', action: 'ROLE_CREATED', category: 'AUTHORIZATION_MUTATION', severity: 'INFO', result: 'SUCCESS', evidenceLevel: 'ATOMIC_BUSINESS_AUDIT_RECORDED', actor: { actorId: '=2+2', actorType: 'IDENTITY' }, target: { targetId: 'course-fixture', targetType: 'COURSE' }, source: 'admin-api', timestamp: '2026-10-01T00:00:00Z', contextMetadata: { result: 'SUCCESS' }, correlationReference: 'correlation-fixture' };
    let failList = false;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const path = url.pathname.replace('/api/v1', '');
      calls.push({ path, query: url.search });
      const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === '/auth/me') return reply({ data: { effectivePermissions: ['admin:audit:manage'] } });
      if (path === '/admin/audit/records') {
        if (failList) { failList = false; return reply({ error: 'ISOLATED_FAILURE' }, 500); }
        return reply({ items: [record], hasMore: !url.searchParams.has('cursor'), nextCursor: url.searchParams.has('cursor') ? null : 'audit-next' });
      }
      if (path === '/admin/audit/records/audit-fixture') return reply(record);
      if (path === '/admin/audit/export') return reply({ items: [record], bounded: true, hasMore: !url.searchParams.has('cursor'), nextCursor: url.searchParams.has('cursor') ? null : 'export-next', exportedAt: '2026-10-12T00:00:00Z' });
      throw new Error('UNEXPECTED_ISOLATED_REQUEST ' + path);
    });
    await page.goto('http://127.0.0.1:3013/admin/audit');
    await page.locator('tbody').getByText('ROLE_CREATED', { exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('dir'), language === 'en' ? 'ltr' : 'rtl');
    assert.equal(await page.locator('a[href*="/courses/"]').count(), 0);
    await page.getByLabel(t.audit_text_001, { exact: true }).fill('operator');
    assert.equal(await page.getByRole('button', { name: t.audit_text_056, exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: t.audit_export_filtered, exact: true }).isDisabled(), true);
    await Promise.all([page.waitForResponse(r => new URL(r.url()).searchParams.get('actorId') === 'operator'), page.getByRole('button', { name: t.audit_text_035, exact: true }).click()]);
    await Promise.all([page.waitForResponse(r => new URL(r.url()).searchParams.get('cursor') === 'audit-next'), page.getByRole('button', { name: t.audit_text_056, exact: true }).click()]);
    assert.ok(calls.some(c => c.query.includes('actorId=operator') && c.query.includes('cursor=audit-next')));
    assert.equal(await page.locator('tbody tr').count(), 1);
    const csvPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: new RegExp(language === 'en' ? '^Export loaded CSV' : '^تصدير المحمّل CSV') }).click();
    const csv = await csvPromise;
    const csvText = await readFile(await csv.path(), 'utf8');
    assert.ok(csvText.includes("'=2+2"));
    const filteredPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: t.audit_export_filtered, exact: true }).click();
    const filtered = await filteredPromise;
    const payload = JSON.parse(await readFile(await filtered.path(), 'utf8'));
    assert.equal(payload.bounded, true);
    assert.equal(payload.hasMore, true);
    const nextExport = page.waitForEvent('download');
    await page.getByRole('button', { name: t.audit_export_next, exact: true }).click();
    await nextExport;
    assert.ok(calls.some(c => c.path.endsWith('/export') && c.query.includes('actorId=operator') && c.query.includes('cursor=export-next')));
    failList = true;
    await page.getByRole('button', { name: t.audit_text_015, exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('tbody').getByText('ROLE_CREATED', { exact: true }).count(), 0);
    await page.getByRole('button', { name: t.audit_text_015, exact: true }).click();
    await page.locator('tbody').getByText('ROLE_CREATED', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    summary.push({ language, checks: ['RBAC-aware links', 'draft/applied filters', 'cursor preserves actor filter', 'duplicate row rejection', 'loaded CSV formula defense', 'bounded server JSON export and continuation', 'reset failure clears stale records', 'retry recovery', 'RTL/LTR'], calls });
    await context.close();
  }
  console.log(JSON.stringify({ status: 'PASS', scope: 'CHROMIUM_UI_INTERCEPTED_HTTP', summary }, null, 2));
} finally { await browser.close(); }
