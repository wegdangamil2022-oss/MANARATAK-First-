import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(path.resolve('package.json'));
const { chromium } = require('playwright');
const origin = 'http://127.0.0.2:3157',
  fixture = JSON.parse(
    fs.readFileSync('../../private/review-workspace-20261024/DESTINATIONS_REFERENCE_FIXTURES.json'),
  );
assert.equal(fixture.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY');
const evidence = path.resolve('docs/ui/evidence/destinations-reference-20261026');
fs.mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const result = {
  scope: fixture.scope,
  originalDatabaseWrites: 0,
  checks: [],
  errors: [],
  screens: [],
};
page.on('pageerror', (error) => result.errors.push(error.message));
const check = (name) => {
  result.checks.push(name);
  console.log('PASS', name);
};
const api = async (endpoint, method = 'GET', body, revision) => {
  const token =
    method === 'GET'
      ? {}
      : await (await context.request.get(origin + '/api/v1/auth/csrf-token')).json();
  const response = await context.request.fetch(origin + '/api/v1' + endpoint, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(method === 'GET'
        ? {}
        : {
            'X-CSRF-Token': token.data?.csrfToken ?? token.csrfToken,
            'Idempotency-Key': randomUUID(),
            'X-Review-Reason': 'Isolated destination reference acceptance',
          }),
      ...(revision == null ? {} : { 'If-Match': String(revision) }),
    },
    ...(method === 'GET' ? {} : { data: body ?? {} }),
  });
  return {
    status: response.status(),
    headers: response.headers(),
    data: await response.json().catch(() => null),
  };
};
const snap = async (name) => {
  await page.screenshot({ path: path.join(evidence, name + '.png'), fullPage: true });
  result.screens.push(name);
};
const dimensions = async (selector) => {
  await page.evaluate(() => document.fonts.ready);
  const facts = await page
    .locator(selector)
    .evaluate((element) => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      font: getComputedStyle(element).fontFamily,
    }));
  assert.ok(facts.document <= facts.viewport, 'document overflow ' + JSON.stringify(facts));
  assert.match(facts.font, /Cairo/);
};
try {
  await page.goto(origin + '/__isolated/sign-in');
  await page.goto(origin + '/admin/settings/reference-data');
  await page.locator('.reference-entry-grid button').first().waitFor();
  assert.equal(await page.locator('.reference-entry-grid button').count(), 6);
  await page
    .getByText('جارٍ قراءة الأعداد المرجعية…', { exact: true })
    .waitFor({ state: 'hidden' });
  await dimensions('.reference-workspace');
  await snap('reference-home-desktop');
  check('six real reference entries and owner counts');
  const base = '/admin/study-destinations/' + fixture.iso2;
  const initial = await api(base);
  assert.equal(initial.status, 200);
  const old = initial.data.profile;
  assert.equal(old.status, 'DRAFT');
  const preview = await api(base + '/preview');
  assert.equal(preview.status, 200);
  assert.equal(preview.headers['cache-control'], 'no-store');
  assert.match(preview.headers['x-robots-tag'], /noindex/);
  check('protected uncached draft preview');
  const saved = await api(
    base + '/profile',
    'PUT',
    {
      overviewAr: 'نبذة مختبرية محفوظة — تحقق ' + randomUUID(),
      costHighlightsAr: [{ label: 'تكلفة | معيشة', value: '100 | شهر' }],
    },
    old.revision,
  );
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const current = (await api(base)).data.profile;
  for (const key of [
    'overviewEn',
    'admissionHighlightsEn',
    'visaRequirementsEn',
    'costHighlightsEn',
    'studentLifeHighlightsEn',
    'officialLinks',
  ])
    assert.deepEqual(current[key], old[key]);
  assert.equal(current.costHighlightsAr[0].label, 'تكلفة | معيشة');
  check('real PostgreSQL save preserves hidden English and structured pipes');
  assert.equal(
    (await api(base + '/profile', 'PUT', { overviewAr: 'stale' }, old.revision)).status,
    409,
  );
  assert.equal(
    (await api(base + '/profile', 'PUT', { overviewEn: 'forbidden' }, current.revision)).status,
    403,
  );
  assert.deepEqual((await api(base)).data.profile.overviewEn, old.overviewEn);
  check('stale revision and English authoring rejected without overwrite');
  const publish = await api(base + '/publish', 'POST', {}, current.revision);
  assert.ok([409, 422].includes(publish.status), JSON.stringify(publish));
  check('incomplete unverified destination cannot publish');
  const recordBase = '/admin/reference-data';
  const city = (await api(recordBase + '/records/CITY/' + fixture.cityId)).data;
  assert.equal(city.id, fixture.cityId);
  assert.equal(city.countryIso2Code, fixture.iso2);
  const foreign = (await api(recordBase + '/records/CITY/' + fixture.foreignCityId)).data;
  assert.equal(foreign.name, city.name);
  assert.notEqual(foreign.countryIso2Code, city.countryIso2Code);
  check('duplicate city names resolve exact canonical IDs');
  const cityBody = {
    id: city.id,
    expectedVersion: city.versionNumber,
    name: city.name,
    nameAr: city.nameAr,
    countryIso2Code: city.countryIso2Code,
    region: city.region,
    administrativeRegionId: city.administrativeRegionId,
    timezone: 'Asia/Aden',
    latitude: null,
    longitude: null,
  };
  const citySave = await api(recordBase + '/cities', 'PUT', cityBody);
  assert.equal(citySave.status, 200, JSON.stringify(citySave.data));
  assert.equal((await api(recordBase + '/cities', 'PUT', cityBody)).status, 409);
  const latest = (await api(recordBase + '/records/CITY/' + fixture.cityId)).data;
  assert.equal(latest.timezone, 'Asia/Aden');
  assert.equal(latest.latitude, null);
  assert.equal(latest.longitude, null);
  const bad = await api(recordBase + '/cities', 'PUT', {
    ...cityBody,
    expectedVersion: latest.versionNumber,
    countryIso2Code: fixture.foreignIso2,
  });
  assert.equal(bad.status, 409);
  check('versioned reference save, null coordinates and country immutability');
  const quality = await api(
    recordBase + '/quality/issues?entityType=CITY&q=' + encodeURIComponent(fixture.duplicateName),
  );
  assert.equal(quality.status, 200, JSON.stringify(quality.data));
  assert.ok(quality.data.data.length > 0);
  assert.ok(
    quality.data.data.every(
      (row) =>
        row.entityType === 'CITY' &&
        [fixture.cityId, fixture.foreignCityId].includes(row.referenceId),
    ),
  );
  assert.equal(quality.data.authoritativeCoverage, 'unknown');
  check('PostgreSQL Arabic quality search filters before facets and paging');
  await page.goto(origin + '/admin/study-destinations/' + fixture.iso2);
  await page.locator('.destination-navigation').waitFor();
  assert.equal(await page.locator('.destination-navigation button').count(), 10);
  await dimensions('.destination-workspace');
  await snap('destination-overview-desktop');
  const card = page.locator('#destination-card-overview');
  await card.getByRole('button', { name: 'تعديل', exact: true }).click();
  await card.locator('textarea').fill('نص واجهة معزول للحفظ');
  await card.getByLabel('سبب التعديل').fill('اختبار حفظ بطاقة عربية');
  await card.getByRole('button', { name: 'حفظ البطاقة', exact: true }).click();
  await card.getByRole('button', { name: 'تعديل', exact: true }).waitFor();
  assert.ok((await card.innerText()).includes('نص واجهة معزول للحفظ'));
  check('read-first single-card edit and confirmed save');
  await card.getByRole('button', { name: 'تعديل', exact: true }).click();
  await card.locator('textarea').fill('لن يحفظ');
  await card.getByRole('button', { name: 'إلغاء', exact: true }).click();
  assert.ok(!(await card.innerText()).includes('لن يحفظ'));
  check('card cancel restores saved content');
  await page.getByRole('combobox', { name: 'لغة المحتوى' }).selectOption('en');
  assert.equal(await card.getByRole('button', { name: 'تعديل', exact: true }).isDisabled(), true);
  await page.getByRole('combobox', { name: 'لغة المحتوى' }).selectOption('ar');
  check('English content remains read only');
  for (const [section, name] of [
    ['study', 'الدراسة والقبول'],
    ['visa', 'التأشيرة'],
    ['living', 'المعيشة والحياة'],
    ['universities', 'الجامعات'],
    ['programs', 'البرامج والتخصصات'],
    ['scholarships', 'المنح الدراسية'],
    ['supporting', 'المدن والعلاقات المساندة'],
    ['sources', 'المصادر والروابط'],
    ['publish', 'الجاهزية والنشر'],
  ]) {
    await page
      .locator('.destination-navigation')
      .getByRole('button', { name, exact: true })
      .click();
    await page.waitForURL('**section=' + section + '*');
    await page.waitForTimeout(500);
    assert.ok(!(await page.getByText('حدث خطأ غير متوقع', { exact: true }).count()));
  }
  check('ten section navigation including lazy owner relationships');
  await page.goto(
    origin +
      '/admin/settings/reference-data?section=cities&p7Q=' +
      encodeURIComponent(fixture.duplicateName) +
      '&recordId=' +
      fixture.cityId,
  );
  await page.getByRole('dialog').waitFor();
  await page
    .getByRole('dialog')
    .getByRole('heading', { name: 'الإعدادات المرجعية', exact: true })
    .waitFor();
  assert.equal(await page.getByRole('dialog').locator('input:enabled').count(), 0);
  await snap('reference-city-dialog-desktop');
  const group = page
    .getByRole('dialog')
    .locator('.reference-content-card')
    .filter({ has: page.getByRole('heading', { name: 'الإعدادات المرجعية', exact: true }) });
  await group.getByRole('button', { name: 'تعديل', exact: true }).click();
  await group.getByLabel('التوقيت IANA', { exact: true }).fill('Asia/Muscat');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'إلغاء التعديل', exact: true })
    .click();
  assert.ok((await group.innerText()).includes('Asia/Aden'));
  check('exact city dialog read first and field-group cancellation');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(origin + '/admin/settings/reference-data');
  await page.locator('.reference-entry-grid').waitFor();
  await dimensions('.reference-workspace');
  await snap('reference-home-mobile');
  await page.goto(origin + '/admin/study-destinations/' + fixture.iso2 + '?section=living');
  await page.locator('#destination-card-living-costs').waitFor();
  await dimensions('.destination-workspace');
  await snap('destination-living-mobile');
  check('Cairo and no document overflow at 360px');
  await page.setViewportSize({ width: 320, height: 800 });
  await dimensions('.destination-workspace');
  await page.goto(origin + '/admin/settings/reference-data?section=cities');
  await page.locator('.reference-table-scroll').waitFor();
  await dimensions('.reference-workspace');
  await snap('reference-cities-320px');
  check('320px bounded reference table scroll');
  const anonymous = await browser.newContext();
  assert.equal((await anonymous.request.get(origin + '/api/v1' + base + '/preview')).status(), 401);
  await anonymous.close();
  check('anonymous draft access denied');
  assert.deepEqual(result.errors, []);
  result.passed = true;
} catch (error) {
  result.failure = String(error);
  await page
    .screenshot({
      path: path.resolve('../../private/destinations-reference-failure.png'),
      fullPage: true,
    })
    .catch(() => {});
  console.log('PAGE', page.url(), (await page.locator('body').innerText()).slice(-4500));
  throw error;
} finally {
  fs.writeFileSync(path.join(evidence, 'acceptance.json'), JSON.stringify(result, null, 2));
  await browser.close();
}
