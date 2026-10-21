import assert from 'node:assert/strict';
import path from 'node:path';
import { randomBytes, randomUUID, scryptSync, createHash } from 'node:crypto';
import { totp } from '../../../packages/infrastructure/src/auth/mfa/Totp.ts';
import { createDiagnosticRequestBudget } from './DiagnosticRequestBudget.mjs';
import { PUBLIC_TEMPLATE_LOCALES } from '../../../packages/shared/src/localization/readiness.ts';
import { assertCmsDiagnosticLocale } from './CmsDiagnosticLocaleContract.mjs';

/** Only the setup principal in the already verified new DB-T calls this helper. */
export async function seedR14AdminCmsFixture(setup, secrets) {
  const actors = [];
  for (const kind of ['author', 'reviewer', 'publisher']) {
    const actor = { kind, id: randomUUID(), email: randomUUID() + '@example.invalid', password: randomBytes(24).toString('base64url') };
    secrets.push(actor.email, actor.password);
    const permission = { author: 'author', reviewer: 'review', publisher: 'publish' }[kind], roleId = 'r14-cms-' + kind;
    await setup.roleRecord.create({ data: { id: roleId, name: 'Synthetic CMS ' + kind, description: 'New isolated Linux CMS fixture', permissions: ['admin:access', 'admin:cms:view', 'admin:cms:' + permission], policyIds: [] } });
    const salt = randomBytes(16), passwordHash = 'scrypt:16384:8:1:' + salt.toString('hex') + ':' + scryptSync(actor.password, salt, 64).toString('hex');
    await setup.identityRecord.create({ data: { id: actor.id, type: 'Human', status: 'ACTIVE', createdBy: 'R14_LINUX_SYNTHETIC', user: { create: { displayName: 'Synthetic ' + kind, primaryEmail: actor.email, isEmailVerified: true } }, account: { create: { accessState: 'Active' } }, credentials: { create: { type: 'password', passwordHash } }, roleAssignments: { create: { id: randomUUID(), roleId } } } });
    actors.push(actor);
  }
  return { actors, slug: 'r14-' + randomUUID() };
}

export async function exerciseR14AdminCms({ browser, origin, db, fixture, proof, secrets, sourceSha }) {
  const pages = {}, contexts = [], observations = [], errors = [], network = [], blocked = new Set();
  const requestBudget = createDiagnosticRequestBudget();
  const protectedTables = ['StudentPrivacyConsentDecision', 'StudentApplicationDocumentBinding', 'FinancialLedgerEntryRecord', 'FinanceInvoiceRecord', 'Certificate'];
  const fingerprint = async () => {
    const rows = {};
    for (const table of protectedTables) {
      const data = await db.$queryRawUnsafe('SELECT row_to_json(t)::text AS row FROM public."' + table + '" t ORDER BY row_to_json(t)::text');
      rows[table] = { count: data.length, sha256: createHash('sha256').update(JSON.stringify(data)).digest('hex') };
    }
    return rows;
  };
  const baseline = await fingerprint();
  const wait = (page, endpoint, method = 'POST') => page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.request().method() === method);
  const unwrap = async response => { const body = await response.json(); return response.headers()['x-import-envelope-version'] === '2' ? body.data : body; };
  const newPage = async () => {
    const context = await browser.newContext({ ignoreHTTPSErrors: false }); contexts.push(context);
    await context.route('**/*', async route => { const target = new URL(route.request().url()); if (target.origin === origin) { if (target.pathname.startsWith('/api/')) await requestBudget.acquire(); return route.continue(); } if (['data:', 'blob:'].includes(target.protocol)) return route.continue(); blocked.add(target.origin); return route.abort(); });
    const page = await context.newPage(); page.setDefaultTimeout(90000); page.setDefaultNavigationTimeout(90000); page.on('dialog', dialog => dialog.accept()); page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { const url = new URL(response.url()); if (url.origin === origin) network.push({ path: url.pathname, status: response.status(), method: response.request().method() }); });
    return page;
  };
  const open = async (page, locale) => {
    await page.goto(origin + '/admin/cms'); await page.getByLabel('بحث المحتوى', { exact: true }).fill(fixture.slug);
    await page.getByRole('button').filter({ hasText: '/' + fixture.slug }).first().click(); await page.getByLabel('العنوان', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'فتح محرر اللغة', exact: true }).nth(locale === 'ar' ? 0 : 1).click();
  };
  const action = async (page, id, label, endpoint, method = 'POST') => {
    const response = wait(page, '/api/v1/admin/cms/content/' + id + '/' + endpoint, method);
    await page.getByRole('button', { name: label, exact: true }).click();
    const result = await response; assert.equal(result.status(), 200, 'R14_CMS_ACTION_' + endpoint); return result.json();
  };
  try {
    for (const actor of fixture.actors) {
      const page = await newPage(); pages[actor.kind] = page;
      await page.goto(origin + '/admin/login'); await page.locator('#admin-email').fill(actor.email); await page.locator('#admin-password').fill(actor.password);
      let response = wait(page, '/api/v1/auth/login'); await page.locator('form button[type=submit]').click(); assert.equal((await response).status(), 200); await page.waitForURL('**/admin/cms');
      await page.goto(origin + '/admin/security'); const section = page.locator('section').filter({ has: page.locator('input[type=password]') });
      await section.locator('input[type=password]').fill(actor.password); response = wait(page, '/api/v1/auth/mfa/enroll');
      await section.getByRole('button', { name: 'بدء إعداد المصادقة', exact: true }).click(); assert.equal((await response).status(), 200);
      const secret = await section.locator('code').textContent(); assert.match(secret, /^[A-Z2-7]+$/); secrets.push(secret);
      const step = Math.floor(Date.now() / 30000), code = totp(secret, step); secrets.push(code);
      await section.locator('input[inputmode=numeric]').fill(code); response = wait(page, '/api/v1/auth/mfa/confirm');
      await section.getByRole('button', { name: 'تأكيد التفعيل', exact: true }).click(); assert.equal((await response).status(), 200); await page.waitForURL('**/admin/login');
      assert.equal(await db.sessionRecord.count({ where: { identityId: actor.id, revokedAt: null } }), 0);
      const delay = (step + 1) * 30000 - Date.now() + 1000; if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      const fresh = totp(secret, Math.floor(Date.now() / 30000)); secrets.push(fresh);
      await page.locator('#admin-email').fill(actor.email); await page.locator('#admin-password').fill(actor.password); await page.locator('#admin-mfa-code').fill(fresh);
      response = wait(page, '/api/v1/auth/login'); await page.locator('form button[type=submit]').click(); assert.equal((await response).status(), 200); await page.waitForURL('**/admin/cms');
      const status = await page.evaluate(async () => { const result = await fetch('/api/v1/auth/mfa', { credentials: 'include' }); return { status: result.status, data: await result.json() }; });
      assert.equal(status.status, 200); assert.equal(status.data.data.stepUpFresh, true);
      observations.push({ step: 'REAL_UI_MFA_ENROLL_CONFIRM_AND_NEW_LOGIN', actorKind: actor.kind, preconfirmedCredentialInserted: false });
    }
    const author = pages.author, reviewer = pages.reviewer, publisher = pages.publisher;
    await author.getByLabel('الرابط', { exact: true }).fill(fixture.slug + '-category');
    await author.getByLabel('الاسم العربي', { exact: true }).fill('تصنيف صناعي'); await author.getByLabel('الاسم الإنجليزي', { exact: true }).fill('Synthetic category');
    let response = wait(author, '/api/v1/admin/cms/categories'); await author.getByRole('button', { name: 'إضافة التصنيف', exact: true }).click(); let wire = await response; assert.equal(wire.status(), 201); const category = await unwrap(wire);
    await author.getByLabel('العنوان العربي', { exact: true }).fill('محتوى صناعي ' + fixture.slug); await author.getByLabel('الرابط الثابت بالإنجليزية', { exact: true }).fill(fixture.slug);
    await author.locator('form').filter({ has: author.getByLabel('العنوان العربي', { exact: true }) }).getByRole('combobox').nth(1).selectOption(category.id);
    response = wait(author, '/api/v1/admin/cms/content'); await author.getByRole('button', { name: 'إنشاء المسودة', exact: true }).click(); wire = await response; assert.equal(wire.status(), 201); const content = await unwrap(wire); assert.equal(typeof content.id, 'string');
    const publicPage = await newPage(), webPage = await newPage(), locales = [];
    for (const locale of ['ar', 'en']) {
      const title = (locale === 'ar' ? 'محتوى صناعي ' : 'Synthetic content ') + fixture.slug, body = 'R14_PUBLISHED_' + locale + '_' + fixture.slug;
      await open(author, locale); await author.getByLabel('الرابط المحلي', { exact: true }).fill(fixture.slug); await author.getByLabel('العنوان', { exact: true }).fill(title); await author.getByLabel('الملخص', { exact: true }).fill('Synthetic ' + locale + ' summary');
      await author.getByLabel('نص المحتوى').fill('<p>' + body + '</p>'); await author.getByLabel('عنوان SEO', { exact: true }).fill('Synthetic title'); await author.getByLabel('وصف SEO', { exact: true }).fill('Synthetic publishing and withdrawal diagnostic');
      await action(author, content.id, 'حفظ النسخة على الخادم', 'localized', 'PUT');
      const publicUrl = origin + '/api/v1/public/cms/pages/http-resolve?path=' + encodeURIComponent('/' + locale + '/articles/' + fixture.slug);
      assert.equal((await publicPage.goto(publicUrl)).status(), 404);
      await action(author, content.id, 'إرسال للمراجعة', 'submit-review'); assert.equal(await author.getByRole('button', { name: 'اعتماد كناشر', exact: true }).isDisabled(), true);
      const denied = await author.evaluate(async ({ id, locale }) => { const token = await fetch('/api/v1/auth/csrf-token', { credentials: 'include' }); return (await fetch('/api/v1/admin/cms/content/' + id + '/approve', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID(), 'x-csrf-token': token.headers.get('x-csrf-token') }, body: JSON.stringify({ locale, expectedVersion: 1 }) })).status; }, { id: content.id, locale });
      assert.equal(denied, 403);
      await open(reviewer, locale); assert.equal(await reviewer.getByRole('button', { name: 'نشر الآن', exact: true }).isDisabled(), true); await action(reviewer, content.id, 'اعتماد كناشر', 'approve');
      await open(publisher, locale); await action(publisher, content.id, 'نشر الآن', 'publish');
      const delivered = await publicPage.goto(publicUrl);
      const publicLocaleEnabled = assertCmsDiagnosticLocale({ locale, enabledLocales: PUBLIC_TEMPLATE_LOCALES, status: delivered.status(), robots: delivered.headers()['x-robots-tag'] });
      const owner = () => publicPage.evaluate(async ({ slug, locale }) => { const result = await fetch('/api/v1/public/cms/content/' + slug + '?locale=' + locale); return { status: result.status, data: await result.json() }; }, { slug: fixture.slug, locale });
      let snapshot = await owner(); assert.equal(snapshot.status, 200); assert.equal(snapshot.data.title, title); assert(snapshot.data.body.includes(body));
      if (publicLocaleEnabled) { await publicPage.getByRole('heading', { name: title, exact: true }).waitFor(); assert((await publicPage.locator('body').innerText()).includes(body)); }
      await webPage.goto(origin + '/' + locale + '/articles/' + fixture.slug);
      if (publicLocaleEnabled) { await webPage.getByRole('heading', { name: title, exact: true }).waitFor(); assert((await webPage.locator('body').innerText()).includes(body)); }
      else { await webPage.waitForURL(origin + '/ar/articles/' + fixture.slug); assert(!(await webPage.locator('body').innerText()).includes(body)); }
      await open(author, locale); await author.getByLabel('نص المحتوى').fill('<p>R14_UNPUBLISHED_' + locale + '</p>'); await action(author, content.id, 'حفظ النسخة على الخادم', 'localized', 'PUT');
      const reloaded = await publicPage.reload(); assertCmsDiagnosticLocale({ locale, enabledLocales: PUBLIC_TEMPLATE_LOCALES, status: reloaded.status(), robots: reloaded.headers()['x-robots-tag'] });
      snapshot = await owner(); assert.equal(snapshot.status, 200); assert(snapshot.data.body.includes(body)); assert(!snapshot.data.body.includes('R14_UNPUBLISHED_' + locale));
      assert(!(await publicPage.locator('body').innerText()).includes('R14_UNPUBLISHED_' + locale));
      await webPage.reload(); if (publicLocaleEnabled) await webPage.getByRole('heading', { name: title, exact: true }).waitFor(); assert(!(await webPage.locator('body').innerText()).includes('R14_UNPUBLISHED_' + locale));
      await open(publisher, locale); await action(publisher, content.id, 'أرشفة', 'archive'); await publicPage.goto(origin + '/admin/login'); await publicPage.goBack();
      assert(!(await publicPage.locator('body').innerText()).includes(body)); assert.equal((await publicPage.reload()).status(), 404);
      const missing = webPage.waitForResponse(result => new URL(result.url()).pathname === '/api/v1/public/cms/content/' + fixture.slug && result.status() === 404);
      await webPage.reload(); await missing; await webPage.getByRole('heading', { name: title, exact: true }).waitFor({ state: 'hidden' });
      assert(!(await webPage.locator('body').innerText()).includes(body));
      assert.equal((await owner()).status, 404);
      assert.equal(await db.cmsPublishedContent.count({ where: { contentId: content.id, locale, status: 'PUBLISHED' } }), 0);
      locales.push({ locale, authoredReviewedPublishedWithdrawnViaUi: true, publicTemplateLocaleEnabled: publicLocaleEnabled, publicWebBundleRendered: publicLocaleEnabled, disabledLocalePublicationStillBlocked: !publicLocaleEnabled, publishedOwnerSnapshotVerified: true, withdrawnOwnerSnapshotStatus: 404, withdrawnWebOwnerStatus: 404, authorApprovalDenied: 403, reviewerPublishDisabled: true, unpublishedDraftHidden: true, withdrawnStatus: 404 });
    }
    await publisher.screenshot({ path: path.join(proof, 'r14-cms-withdrawn-admin.png'), fullPage: true });
    for (const actor of fixture.actors) {
      const status = await pages[actor.kind].evaluate(async () => { const token = await fetch('/api/v1/auth/csrf-token', { credentials: 'include' }); return (await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include', headers: { 'x-csrf-token': token.headers.get('x-csrf-token') } })).status; });
      assert.equal(status, 200); assert.equal(await db.sessionRecord.count({ where: { identityId: actor.id, revokedAt: null } }), 0);
    }
    assert.deepEqual(await fingerprint(), baseline); assert.equal(errors.length, 0); assert.equal(network.filter(row => row.status >= 500 || row.status === 429).length, 0);
    return { sourceSha, builtThreeUnitsAtOneSha: true, publicTemplateLocales: [...PUBLIC_TEMPLATE_LOCALES], publicEnglishReleaseAccepted: false, locales, observations, requestBudget: requestBudget.snapshot(), protectedBeforeAndAfter: baseline, noExternalEffects: true, blockedExternalOrigins: [...blocked], pageErrors: errors, network, allActorSessionsRevoked: true, formalAcceptance: false };
  } finally {
    // Synthetic sessions only; cleanup must also revoke sessions after a failed journey.
    await db.sessionRecord.updateMany({ where: { identityId: { in: fixture.actors.map(actor => actor.id) }, revokedAt: null }, data: { revokedAt: new Date() } });
    await Promise.all(contexts.map(context => context.close()));
  }
}
