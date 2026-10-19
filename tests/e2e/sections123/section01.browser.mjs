// Actual Chromium + Admin UI. HTTP is intercepted; no live session/API/provider claim.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const summary = [];
try {
  for (const language of ['en', 'ar']) {
    const context = await browser.newContext({ bypassCSP: true });
    await context.addInitScript(lang => localStorage.setItem('absheer_admin_lang', lang), language);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [], calls = [];
    page.on('console', message => {
      // Missing Vite favicon is unrelated; caught React/render errors must fail.
      if (message.type() === 'error' && !/^Failed to load resource:.*404/.test(message.text())) errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    const identity = { id: 'isolated-staff', type: 'Human', status: 'ACTIVE', account: { accessState: 'Active' }, user: { profile: { displayName: 'Isolated Staff', avatarUrl: '', preferredLanguage: language, timeZone: 'UTC' }, contactRegistry: { primaryEmail: 'staff@example.invalid', isEmailVerified: true } }, assignedRoles: [], latestAccessChange: null };
    let permissions = ['admin:identities:manage'];
    let malformedEligibility = false;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const path = url.pathname.replace('/api/v1', '');
      calls.push({ path, query: url.search, method: route.request().method() });
      const reply = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      if (path === '/auth/me') return reply({ data: { effectivePermissions: permissions } });
      if (path === '/admin/identities/role-options') return reply({ data: { roles: [], nextCursor: null } });
      if (path === '/admin/identities') return reply({ data: { items: [identity], total: 2, nextCursor: url.searchParams.get('cursor') ? null : 'isolated-next' } });
      if (path === '/admin/identities/isolated-staff') return reply({ data: identity });
      if (path.startsWith('/admin/authorization/')) {
        const key = path.split('/').at(-1);
        if (key === 'eligible-identities' && malformedEligibility) return reply({ data: { items: [], nextCursor: null } });
        return reply({ data: { [key === 'eligible-identities' ? 'identities' : key === 'emergency-access' ? 'grants' : key === 'assignment-audit' ? 'events' : key]: [], nextCursor: null, total: 0, nextOffset: 0, hasMore: false } });
      }
      throw new Error('UNEXPECTED_ISOLATED_REQUEST ' + path);
    });
    await page.goto('http://127.0.0.1:3013/admin/identities');
    await page.getByText('staff@example.invalid', { exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('dir'), language === 'en' ? 'ltr' : 'rtl');
    const next = page.getByRole('button', { name: language === 'en' ? 'Next' : 'التالي', exact: true }).last();
    const nextPage = page.waitForResponse(response => new URL(response.url()).searchParams.get('cursor') === 'isolated-next');
    await Promise.all([nextPage, next.click()]);
    assert.ok(calls.some(c => c.query.includes('cursor=isolated-next')));
    // Direct unauthorized navigation is stopped before owner API requests.
    const before = calls.length;
    await page.goto('http://127.0.0.1:3013/admin/authorization');
    await page.waitForLoadState('networkidle');
    assert.equal(calls.slice(before).some(c => c.path.startsWith('/admin/authorization')), false);
    permissions = ['admin:authorization:manage'];
    const authStart = calls.length;
    await page.goto('http://127.0.0.1:3013/admin/authorization');
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Staff and permissions|الموظفون والصلاحيات/ }).waitFor();
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.ok(calls.slice(authStart).some(c => c.path === '/admin/authorization/roles'));
    assert.equal(calls.slice(authStart).some(c => c.path.startsWith('/admin/identities')), false);
    // A malformed chooser reply must leave the workspace visible and show a local error.
    malformedEligibility = true;
    await page.reload();
    await page.getByRole('heading', { name: /Staff and permissions|الموظفون والصلاحيات/ }).waitFor();
    await page.getByRole('button', { name: language === 'en' ? 'Assignments' : 'التعيينات', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: language === 'en' ? 'Unable to load identities.' : 'تعذر تحميل الهويات.' }).first().waitFor();
    assert.deepEqual(errors, []);
    summary.push({ language, checks: ['identity-only route', 'cursor continuation', 'authorization route denied before API', 'authorization-only route', 'no identity owner call from authorization-only', 'document direction', 'workspace actually rendered', 'malformed eligibility shows local error without React crash'], calls });
    await context.close();
  }
  console.log(JSON.stringify({ status: 'PASS', scope: 'CHROMIUM_UI_INTERCEPTED_HTTP', summary }, null, 2));
} finally { await browser.close(); }
