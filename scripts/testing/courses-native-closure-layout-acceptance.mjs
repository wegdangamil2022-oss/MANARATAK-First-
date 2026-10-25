import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json'));
const { chromium } = require('playwright');
const output = 'docs/ui/evidence/courses-native-closure-20261026';
const receipt = JSON.parse(fs.readFileSync(path.join(output, 'browser-verification.json')));
assert.equal(receipt.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY');
assert.equal(receipt.passed, true);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const result = { scope: receipt.scope, originalDatabaseWrites: 0, checks: [], screens: [] };
try {
  await page.waitForTimeout(30500 - (Date.now() % 30000));
  await page.goto('http://127.0.0.2:3157/__isolated/sign-in');
  await page.locator('.course-results[aria-busy=false]').waitFor();
  await page.evaluate(() => localStorage.setItem('manaratak_admin_lang', 'en'));
  await page.goto(
    'http://127.0.0.2:3157/admin/courses/' + receipt.copyId + '/editor?tab=assessments',
  );
  await page.locator('.native-editor-content:not([disabled])').waitFor();
  assert.equal(await page.locator('.native-editor').getAttribute('dir'), 'ltr');
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.native-assessments').scrollIntoViewIfNeeded();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      cairo: [
        ...document.querySelectorAll(
          '.native-editor h1,.native-editor button,.native-editor input,.native-editor select,.native-editor textarea',
        ),
      ].every((el) => getComputedStyle(el).fontFamily.includes('Cairo')),
    }));
    assert.equal(metrics.scroll, metrics.width);
    assert.equal(metrics.cairo, true);
    const name = 'english-native-advanced-' + width;
    await page.screenshot({ path: path.join(output, name + '.png') });
    result.screens.push(name);
  }
  await page.getByRole('button', { name: 'Copy course', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
  await page.screenshot({ path: path.join(output, 'english-mobile-copy-dialog.png') });
  result.screens.push('english-mobile-copy-dialog');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(errors.length, 0);
  result.checks.push(
    'English/LTR advanced editor at 1440/320px with Cairo on headings, controls and buttons; no document overflow',
    'Native copy dialog keyboard focus/Escape and mobile layout',
  );
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failure = String(error.message);
  throw error;
} finally {
  fs.writeFileSync(path.join(output, 'layout-verification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await browser.close();
}
