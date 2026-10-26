import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// The launcher must attest DB-T and expose only synthetic fixture receipts.
// No credentials, student identities or MFA secrets are collected as evidence.
const require = createRequire(path.resolve('package.json'));
const { chromium } = require('playwright');
const origin = 'http://127.0.0.2:3157';
const fixture = await (await fetch(origin + '/__isolated/learning-receipt')).json();
assert.equal(fixture.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY');
assert.equal(
  fixture.fixturePurpose,
  'SEEDED_PUBLISHED_READ_FIXTURE_NOT_PUBLICATION_GATE_ACCEPTANCE',
);
const dir = path.resolve('docs/ui/evidence/courses-native-authoring-20261026');
fs.mkdirSync(dir, { recursive: true });
const result = {
  scope: fixture.scope,
  fixturePurpose: fixture.fixturePurpose,
  originalDatabaseWrites: 0,
  checks: [],
  screens: [],
  errors: [],
};
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const student = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await student.newPage();
page.on('pageerror', (error) => result.errors.push(error.message));
const request = (target, method, endpoint, body, version) =>
  target.evaluate(
    async ({ method, endpoint, body, version }) => {
      const csrf =
        method === 'GET'
          ? {}
          : await (await fetch('/api/v1/auth/csrf-token', { credentials: 'include' })).json();
      const response = await fetch('/api/v1' + endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf.data?.csrfToken ?? csrf.csrfToken,
          'Idempotency-Key': crypto.randomUUID(),
          'X-Review-Reason': 'Isolated historical learning acceptance',
          ...(version ? { 'If-Match': String(version) } : {}),
        },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    },
    { method, endpoint, body, version },
  );
const workspace = () => request(page, 'GET', `/student/courses/${fixture.courseId}/workspace`);
const shot = async (name, width) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(() => document.fonts.ready);
  const state = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    cairo: document.fonts.check('700 13px Cairo'),
    dir: document.querySelector('main')?.getAttribute('dir'),
  }));
  assert.equal(state.width, state.scroll, name + ': overflow');
  assert.equal(state.cairo, true);
  assert.equal(state.dir, 'rtl');
  await page.screenshot({ path: path.join(dir, name + '.png') });
  result.screens.push(name);
  result.checks.push({ name, ...state });
};
try {
  await page.goto(origin + '/__isolated/student-sign-in');
  await page
    .getByRole('button', { name: 'التسجيل في الدورة', exact: true })
    .waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'التسجيل في الدورة', exact: true }).click();
  await page
    .getByRole('button', { name: 'تحديد الدرس كمكتمل', exact: true })
    .first()
    .waitFor({ timeout: 60000 });
  let current = await workspace();
  assert.equal(current.status, 200);
  assert.equal(current.data.course.displayName, fixture.title);
  assert.equal(current.data.progress.enrollment.progressPercentage, 0);
  assert.equal(current.data.curriculum.contentBlocks.length, 3);
  assert.equal(await page.evaluate(() => window.__courseBlockXss), undefined);
  assert.ok(
    await page
      .getByText('نص المنهج الأصلي <script>window.__courseBlockXss=true</script>', { exact: true })
      .count(),
  );
  await shot('desktop-student-lesson-blocks', 1440);
  await shot('mobile-student-lesson-blocks', 360);
  await shot('narrow-student-lesson-blocks', 320);
  const mark = async (lessonId) => {
    const response = page.waitForResponse(
      (response) => response.request().method() === 'PUT' && response.url().endsWith('/progress'),
    );
    await page
      .locator(`[data-lesson-id="${lessonId}"]`)
      .getByRole('button', { name: 'تحديد الدرس كمكتمل', exact: true })
      .click();
    assert.equal((await response).status(), 200);
    await page
      .locator(`[data-lesson-id="${lessonId}"]`)
      .getByRole('button', { name: 'تحديد الدرس كمكتمل', exact: true })
      .waitFor({ state: 'detached' });
  };
  await mark(fixture.lessonIds[0]);
  await page.reload();
  await page.getByRole('button', { name: 'تحديد الدرس كمكتمل', exact: true }).first().waitFor();
  current = await workspace();
  assert.equal(current.data.progress.enrollment.progressPercentage, 50);
  await mark(fixture.lessonIds[1]);
  current = await workspace();
  assert.equal(current.data.progress.enrollment.progressPercentage, 100);
  await page
    .getByRole('button', { name: 'إنهاء الدورة والتحقق من الاستحقاق', exact: true })
    .click();
  await page.getByRole('heading', { name: 'اكتملت الدورة', exact: true }).waitFor();
  current = await workspace();
  assert.ok(current.data.progress.completion);
  assert.equal(current.data.progress.completion.eligibleForCertificate, false);
  result.checks.push(
    'Actual student enrolment -> ordered blocks -> explicit lesson completion -> persisted 50% after reload -> 100% -> authoritative course completion without a certificate claim',
  );
  const admin = await browser.newContext(),
    adminPage = await admin.newPage();
  await adminPage.waitForTimeout(30500 - (Date.now() % 30000));
  await adminPage.goto(origin + '/__isolated/sign-in');
  await adminPage.locator('.course-results[aria-busy=false]').waitFor();
  let course = await request(adminPage, 'GET', `/admin/courses/${fixture.courseId}`);
  assert.equal(
    (
      await request(
        adminPage,
        'POST',
        `/admin/courses/${fixture.courseId}/unpublish`,
        {},
        course.data.version,
      )
    ).status,
    200,
  );
  course = await request(adminPage, 'GET', `/admin/courses/${fixture.courseId}`);
  assert.equal(
    (
      await request(
        adminPage,
        'PUT',
        `/admin/courses/${fixture.courseId}/lessons/${fixture.lessonIds[0]}/content-blocks`,
        {
          blocks: [
            {
              id: fixture.blockIds[0],
              type: 'TEXT',
              payload: { text: 'نسخة حالية معدلة لا تستبدل منهج الطالب السابق' },
            },
          ],
        },
        course.data.version,
      )
    ).status,
    200,
  );
  await page.reload();
  await page.getByRole('heading', { name: 'اكتملت الدورة', exact: true }).waitFor();
  current = await workspace();
  assert.equal(current.status, 200);
  assert.equal(current.data.course.version, 1);
  assert.equal(current.data.curriculum.contentBlocks.length, 3);
  assert.ok(
    current.data.curriculum.contentBlocks.some((block) =>
      block.payload.text?.includes('نص المنهج الأصلي'),
    ),
  );
  assert.equal(current.data.progress.enrollment.progressPercentage, 100);
  await shot('mobile-student-pinned-completion', 360);
  result.checks.push(
    'Published enrollment snapshot remains readable after actual admin unpublish and content replacement; new draft does not overwrite enrolled curriculum or completion',
  );
  assert.equal(
    (await request(page, 'GET', `/admin/courses/${fixture.courseId}/curriculum`)).status,
    403,
  );
  const other = await (await fetch(origin + '/__isolated/native-receipt')).json();
  assert.equal(
    (
      await request(
        page,
        'GET',
        `/student/courses/${other.courseAId ?? other.courseId ?? other.ids?.[0]}/workspace`,
      )
    ).status,
    403,
  );
  const anonymous = await browser.newContext();
  assert.equal(
    (
      await anonymous.request.get(origin + `/api/v1/student/courses/${fixture.courseId}/workspace`)
    ).status(),
    401,
  );
  result.checks.push(
    'Student cannot use the admin curriculum API or another course enrollment; anonymous workspace rejected',
  );
  assert.equal(result.errors.length, 0);
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failure = error.message;
  await page.screenshot({ path: path.join(dir, 'student-failure.png') });
  throw error;
} finally {
  fs.writeFileSync(
    path.join(dir, 'learning-browser-verification.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
}
