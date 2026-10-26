import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json')),
  { chromium } = require('playwright'),
  origin = 'http://127.0.0.2:3157';
const receipt = await (await fetch(origin + '/__isolated/scope-receipt')).json();
assert.equal(receipt.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY');
const output = 'docs/ui/evidence/courses-governance-20261026';
fs.mkdirSync(output, { recursive: true });
const result = {
  scope: receipt.scope,
  originalDatabaseWrites: 0,
  checks: [],
  screens: [],
  errors: [],
};
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const request = (page, method, path, body, version) =>
  page.evaluate(
    async ({ method, path, body, version }) => {
      const csrf = method === 'GET' ? {} : await (await fetch('/api/v1/auth/csrf-token')).json();
      const response = await fetch('/api/v1/admin/' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf.data?.csrfToken ?? csrf.csrfToken,
          'If-Match': String(version),
          'X-Review-Reason': 'Isolated scoped role acceptance',
          'Idempotency-Key': crypto.randomUUID(),
        },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    },
    { method, path, body, version },
  );
try {
  await new Promise((resolve) => setTimeout(resolve, 30500 - (Date.now() % 30000)));
  for (const action of ['edit', 'review', 'publish', 'grade']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
      page = await context.newPage();
    page.on('pageerror', (error) => result.errors.push(error.message));
    await page.goto(origin + '/__isolated/sign-in?account=scope-' + action);
    await page.getByRole('heading', { name: 'الدورات المسندة إليّ', exact: true }).waitFor();
    await page.getByRole('link', { name: 'فتح مساحة الدورة', exact: true }).waitFor();
    const allowed = await request(page, 'GET', `courses/${receipt.courseId}/access`);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.data[action], true);
    assert.equal(allowed.data.manage, false);
    for (const other of ['edit', 'review', 'publish', 'grade', 'learners'])
      if (other !== action) assert.equal(allowed.data[other], false);
    assert.equal((await request(page, 'GET', `courses/${receipt.foreignId}`)).status, 403);
    assert.equal((await request(page, 'GET', 'courses')).status, 403);
    assert.equal((await request(page, 'GET', 'certificates')).status, 403);
    assert.equal(
      (await request(page, 'POST', `courses/${receipt.courseId}/archive`, {}, 1)).status,
      403,
    );
    assert.equal((await request(page, 'GET', `courses/${receipt.courseId}/learners`)).status, 403);
    const course = await request(page, 'GET', `courses/${receipt.courseId}`);
    assert.equal(course.status, 200);
    const curriculum = await request(page, 'GET', 'courses/' + receipt.courseId + '/curriculum'),
      position =
        curriculum.status === 200
          ? Math.max(0, ...curriculum.data.modules.map((row) => row.position)) + 1
          : 1;
    const module = await request(
      page,
      'POST',
      `courses/${receipt.courseId}/modules`,
      { title: 'Scoped editor acceptance', position },
      course.data.version,
    );
    assert.equal(module.status, action === 'edit' ? 201 : 403);
    if (action !== 'publish')
      assert.equal(
        (
          await request(
            page,
            'POST',
            `courses/${receipt.courseId}/publish`,
            {},
            course.data.version,
          )
        ).status,
        403,
      );
    if (action !== 'grade')
      assert.equal(
        (await request(page, 'GET', `courses/${receipt.courseId}/assessment-reviews`)).status,
        403,
      );
    await page.goto(origin + `/admin/courses/${receipt.courseId}/editor`);
    await page.locator('.native-editor-content:not([disabled])').waitFor();
    assert.equal(await page.getByRole('button', { name: 'نسخ الدورة', exact: true }).count(), 0);
    assert.equal(
      await page.getByRole('button', { name: 'التسجيل والإتاحة', exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByRole('button', { name: 'الطلاب والتقدم', exact: true }).count(),
      0,
    );
    if (action === 'grade') {
      await page.getByRole('region', { name: 'التصحيح اليدوي', exact: true }).waitFor();
      assert.equal(
        await page.getByRole('button', { name: 'إضافة الاختبار', exact: true }).isDisabled(),
        true,
      );
    }
    if (action === 'edit') await page.locator('.native-curriculum').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, 'course-role-' + action + '.png') });
    result.screens.push('course-role-' + action);
    result.checks.push(
      action +
        ': canonical MFA + IAM course scope, isolated tools, denied foreign/global/certificate/learner/archive access',
    );
    await context.close();
  }
  assert.equal(result.errors.length, 0);
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failure = String(error.message);
  throw error;
} finally {
  fs.writeFileSync(
    path.join(output, 'scoped-access-verification.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
}
