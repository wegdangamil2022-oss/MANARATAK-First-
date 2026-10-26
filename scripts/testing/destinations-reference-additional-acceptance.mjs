import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json')),
  { chromium } = require('playwright');
const origin = 'http://127.0.0.2:3157',
  fixture = JSON.parse(
    fs.readFileSync('../../private/review-workspace-20261024/DESTINATIONS_REFERENCE_FIXTURES.json'),
  );
assert.equal(fixture.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY');
const evidence = path.resolve('docs/ui/evidence/destinations-reference-20261026'),
  browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  }),
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
  page = await context.newPage(),
  checks = [];
try {
  await page.goto(origin + '/__isolated/sign-in');
  await page.goto(
    origin + '/admin/settings/reference-data?section=cities&recordId=' + fixture.cityId,
  );
  await page.getByRole('dialog').getByRole('heading', { name: 'التسميات', exact: true }).waitFor();
  const group = page
    .getByRole('dialog')
    .locator('.reference-content-card')
    .filter({ has: page.getByRole('heading', { name: 'التسميات', exact: true }) });
  await group.getByRole('button', { name: 'تعديل', exact: true }).click();
  await group.getByLabel('الاسم العربي', { exact: true }).fill('تعديل لن يغادر');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(), true);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'إلغاء التعديل', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'المصدر والأسماء البديلة', exact: true })
    .click();
  await page.getByRole('heading', { name: 'الأسماء البديلة', exact: true }).waitFor();
  await page.screenshot({
    path: path.join(evidence, 'reference-sources-desktop.png'),
    fullPage: true,
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'الحوكمة والسجل', exact: true })
    .click();
  await page.getByRole('heading', { name: 'دورة حياة السجل', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  checks.push('dirty dialog refuses Escape discard, source/governance tools load');
  await page.goto(origin + '/admin/settings/reference-data?section=quality');
  await page.getByRole('heading', { name: 'مشكلات جودة السجلات المرجعية', exact: true }).waitFor();
  await page.getByLabel('البحث في السجلات المتأثرة', { exact: true }).fill(fixture.duplicateName);
  const precise = page.locator('.reference-workspace a[href*="recordId="]').first();
  await precise.waitFor();
  assert.ok((await precise.getAttribute('href')).includes('recordId='));
  await page.screenshot({
    path: path.join(evidence, 'reference-quality-desktop.png'),
    fullPage: true,
  });
  checks.push('quality results have exact ID repair links');
  await page.getByRole('button', { name: 'اللغة', exact: true }).click();
  await page.goto(origin + '/admin/settings/reference-data');
  await page.getByRole('heading', { name: 'Reference data administration', exact: true }).waitFor();
  assert.equal(await page.locator('.reference-workspace').getAttribute('dir'), 'ltr');
  await page.screenshot({
    path: path.join(evidence, 'reference-home-english.png'),
    fullPage: true,
  });
  await page.goto(origin + '/admin/study-destinations/' + fixture.iso2);
  await page
    .locator('.destination-navigation')
    .getByRole('button', { name: 'Overview', exact: true })
    .waitFor();
  assert.equal(await page.locator('.destination-workspace').getAttribute('dir'), 'ltr');
  await page.screenshot({
    path: path.join(evidence, 'destination-overview-english.png'),
    fullPage: true,
  });
  checks.push('English shell and LTR navigation');
  const denied = await browser.newContext();
  const response = await denied.request.get(origin + '/__isolated/sign-in?account=denied');
  assert.equal(response.status(), 200);
  for (const endpoint of [
    '/admin/reference-data/records/CITY/' + fixture.cityId,
    '/admin/study-destinations/' + fixture.iso2 + '/preview',
  ])
    assert.equal((await denied.request.get(origin + '/api/v1' + endpoint)).status(), 403);
  await denied.close();
  checks.push('canonical MFA staff without owner permissions receives 403 from both APIs');
  console.log(JSON.stringify({ pass: true, checks }));
  fs.writeFileSync(
    path.join(evidence, 'additional-acceptance.json'),
    JSON.stringify({ pass: true, checks }, null, 2),
  );
} catch (error) {
  console.log('FAIL', page.url(), (await page.locator('body').innerText()).slice(-3000));
  throw error;
} finally {
  await browser.close();
}
