const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
 try {
  const page = await browser.newPage({ bypassCSP: true });
  const errors = [], reads = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  const definition = key => ({ id: key, key, valueType: 'String', isFeatureFlag: false, isSecret: false, isDeprecated: false, revision: '2026-10-09T00:00:00.000Z' });
  const assignment = (id, key, version) => ({ id, key, level: 'GLOBAL', currentVersionId: version, currentValue: 'Stored', isWritable: true, versionCount: 200, versions: [] });
  let hiddenVersion = 'hidden-v7';
  await page.route('**/api/v1/**', async route => {
   const req = route.request(), url = new URL(req.url()); let data = {};
   if (url.pathname.endsWith('/auth/me')) data = { data: { effectivePermissions: ['admin:settings:manage'] } };
   else if (url.pathname.endsWith('/auth/csrf-token')) data = { data: { csrfToken: 'isolated-csrf' } };
   else if (url.pathname.endsWith('/assignments/context')) {
    reads.push({ path: 'context', query: Object.fromEntries(url.searchParams) });
    const key = url.searchParams.get('key');
    if (key === 'site.slow') {
     await new Promise(resolve => setTimeout(resolve, 500));
     data = { data: { definition: { ...definition(key), valueType: 'Boolean' }, assignment: null } };
    } else data = { data: { definition: definition(key), assignment: key === 'site.offpage' ? assignment('hidden-assignment', key, hiddenVersion) : assignment('visible', key, 'changed-v2') } };
   } else if (url.pathname.endsWith('/definitions')) {
    reads.push({ path: 'definitions', query: Object.fromEntries(url.searchParams) });
    data = { data: { definitions: [definition(url.searchParams.has('cursor') ? 'site.offpage' : 'site.visible')], nextCursor: url.searchParams.has('cursor') ? undefined : 'site.visible' } };
   } else if (url.pathname.endsWith('/assignments') && req.method() === 'GET') {
    reads.push({ path: 'assignments', query: Object.fromEntries(url.searchParams) });
    data = { data: { assignments: [assignment(url.searchParams.has('cursor') ? 'second' : 'visible', url.searchParams.has('cursor') ? 'site.second' : 'site.visible', 'visible-v1')], nextCursor: url.searchParams.has('cursor') ? undefined : 'visible' } };
   } else if (url.pathname.endsWith('/assignments') && req.method() === 'POST') {
    const body = req.postDataJSON(); writes.push({ body, headers: req.headers() }); hiddenVersion = body.versionId;
    data = { data: { assignmentId: body.assignmentId } };
   }
   await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('http://127.0.0.1:3094/admin/settings');
  const next = page.getByRole('button', { name: /الصفحة التالية|Next page/, exact: true });
  const previous = page.getByRole('button', { name: /الصفحة السابقة|Previous page/, exact: true });
  await next.click(); await page.locator('td').getByText('site.offpage', { exact: true }).waitFor();
  assert(reads.some(read => read.path === 'definitions' && read.query.cursor === 'site.visible'));
  await previous.click(); await page.locator('td').getByText('site.visible', { exact: true }).waitFor();
  await page.getByRole('button', { name: /القيم وسجل النسخ|Values & History/, exact: true }).click();
  await next.click(); await page.locator('td').getByText('site.second', { exact: true }).waitFor();
  assert(reads.some(read => read.path === 'assignments' && read.query.cursor === 'visible'));
  await previous.click(); await page.locator('td').getByText('site.visible', { exact: true }).waitFor();
  const form = page.locator('form').last();
  await page.getByRole('button', { name: /تعديل القيمة|Edit value/, exact: true }).click();
  await page.getByText(/تغيّرت النسخة|Version changed/).waitFor();
  const save = form.getByRole('button', { name: /إنشاء نسخة جديدة|Create New Version/, exact: true });
  assert(await save.isDisabled(), 'stale list version cannot be silently rebased');
  const keyInput = form.locator('input[list="settings-definition-options"]');
  await keyInput.fill('site.slow');
  await page.waitForTimeout(300);
  await keyInput.fill('site.offpage');
  await form.locator('textarea').waitFor(); await page.waitForTimeout(550);
  assert.equal(await form.locator('textarea').count(), 1, 'late Boolean context cannot replace selected String context');
  await form.locator('textarea').fill('Reviewed edit'); await save.click();
  await page.getByRole('status').filter({ hasText: /تم الحفظ|Saved/ }).waitFor();
  assert.equal(writes.length, 1); assert.equal(writes[0].body.assignmentId, 'hidden-assignment');
  assert.equal(writes[0].body.expectedCurrentVersionId, 'hidden-v7'); assert(writes[0].headers['idempotency-key']); assert(!writes[0].body.authorId);
  const search = page.locator('section').filter({ has: page.locator('select').filter({ has: page.locator('option[value="DEPRECATED"]') }) }).locator('input').first();
  await search.fill('university');
  await page.waitForResponse(response => new URL(response.url()).searchParams.get('q') === 'university');
  assert(reads.some(read => read.path === 'assignments' && read.query.q === 'university' && !read.query.cursor));
  const filterSection = page.locator('section').filter({ has: page.locator('option[value="DEPRECATED"]') });
  await filterSection.locator('select').last().selectOption('DOMAIN');
  await page.waitForResponse(response => new URL(response.url()).searchParams.get('level') === 'DOMAIN');
  assert(reads.some(read => read.path === 'assignments' && read.query.level === 'DOMAIN' && !read.query.cursor));
  await filterSection.locator('select').first().selectOption('FLAG');
  await page.waitForResponse(response => new URL(response.url()).searchParams.get('classification') === 'FLAG');
  assert(reads.some(read => read.path === 'definitions' && read.query.classification === 'FLAG' && !read.query.cursor));
  assert(reads.filter(read => read.path !== 'context').every(read => read.query.limit === '50'));
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ status: 'PASS', scope: 'CHROMIUM_WITH_INTERCEPTED_API_ONLY', checks: ['next/previous use server cursors', 'search resets cursor and queries server', 'off-page assignment uses exact identity/current revision', 'changed list revision blocks save without silent rebase', 'late context response ignored', 'bounded requests, trusted actor/idempotency'], writes: writes.map(write => write.body) }, null, 2));
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
