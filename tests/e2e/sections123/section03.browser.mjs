// English/mobile browser acceptance with intercepted HTTP only; provider/DB are separate evidence.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ bypassCSP: true, viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem('manaratak_admin_lang', 'en'));
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [], calls = [];
  page.on('pageerror', error => errors.push(error.message));
  const asset = { id: 'isolated-en', reference: 'isolated-reference', ownerId: 'isolated-owner', ownerType: 'STUDENT', lifecycleState: 'QUARANTINED', securityClassification: 'INTERNAL', retentionCategory: 'PERMANENT', metadata: { originalFilename: 'test.pdf', mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 64 }, createdAt: '2026-01-01T00:00:00Z', securityEvidence: { uploadConfirmed: true, malwareStatus: null, sanitized: false }, versions: [{ versionNumber: 1, createdAt: '2026-01-01T00:00:00Z', checksum: null }] };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const path = url.pathname.replace('/api/v1', '');
    calls.push({ path, query: url.search });
    const reply = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '/auth/me') return reply({ data: { effectivePermissions: ['admin:assets:manage'] } });
    if (path === '/admin/assets') return reply({ items: [asset], hasMore: true, nextCursor: 'isolated-next' });
    if (path === '/admin/assets/isolated-en') return reply(asset);
    throw new Error('UNEXPECTED_ISOLATED_REQUEST ' + path);
  });
  await page.goto('http://127.0.0.1:3013/admin/assets');
  await page.getByRole('button', { name: 'View details', exact: true }).click();
  await page.getByRole('region', { name: 'Asset version history', exact: true }).waitFor();
  const workspace = page.locator('div.mx-auto.max-w-7xl.space-y-6');
  assert.equal(await workspace.getAttribute('dir'), 'ltr');
  assert.doesNotMatch(await workspace.innerText(), /[\u0600-\u06ff]/);
  assert.equal(await page.getByRole('button', { name: 'Activate verified file', exact: true }).count(), 0);
  await page.getByPlaceholder('Search by ID / name / owner / file').fill('PDF');
  assert.equal(await page.getByRole('button', { name: 'Load more assets', exact: true }).isDisabled(), true);
  await Promise.all([page.waitForResponse(r => new URL(r.url()).searchParams.get('q') === 'PDF'), page.getByRole('button', { name: 'Apply search and filters', exact: true }).click()]);
  await Promise.all([page.waitForResponse(r => new URL(r.url()).searchParams.get('cursor') === 'isolated-next'), page.getByRole('button', { name: 'Load more assets', exact: true }).click()]);
  assert.ok(calls.some(c => c.query.includes('q=PDF') && c.query.includes('cursor=isolated-next')));
  assert.equal(await page.locator('tbody tr').count(), 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'PASS', scope: 'CHROMIUM_ENGLISH_MOBILE_INTERCEPTED_HTTP', checks: ['translated details/governance/actions/upload', 'LTR', 'no premature activation', 'draft blocks cursor', 'applied search retained', 'deduplication', 'no page exceptions'], calls }, null, 2));
} finally { await browser.close(); }
