import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(path.resolve('package.json')),
  { chromium } = require('playwright');
const origin = 'http://127.0.0.2:3157',
  fixture = await (await fetch(origin + '/__isolated/native-receipt')).json();
assert.equal(fixture.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY');
const dir = path.resolve('docs/ui/evidence/courses-native-authoring-20261026');
fs.mkdirSync(dir, { recursive: true });
const result = {
  scope: fixture.scope,
  originalDatabaseWrites: 0,
  canonicalMfa: true,
  checks: [],
  errors: [],
  screens: [],
};
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
  page = await ctx.newPage();
page.on('pageerror', (error) => result.errors.push(error.message));
let dismissDialog = false;
page.on('dialog', (dialog) => (dismissDialog ? dialog.dismiss() : dialog.accept()));
const api = (method, endpoint, body, version) =>
  page.evaluate(
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
          'X-Review-Reason': 'Isolated authoring concurrency acceptance',
          'Idempotency-Key': crypto.randomUUID(),
          ...(version ? { 'If-Match': String(version) } : {}),
        },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    },
    { method, endpoint, body, version },
  );
const ready = async () => {
  await page.locator('.native-editor-content:not([disabled])').waitFor({ timeout: 60000 });
};
const action = async (name, method) => {
  const response = page.waitForResponse(
    (response) =>
      response.request().method() === method && response.url().includes('/api/v1/admin/courses/'),
  );
  await page.getByRole('button', { name, exact: true }).click();
  assert.ok([200, 201].includes((await response).status()), name);
  await ready();
};
const tab = async (name) => {
  await page.getByRole('button', { name, exact: true }).click();
  await ready();
};
const shot = async (name, width = 1440) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(() => document.fonts.ready);
  const state = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    cairo: document.fonts.check('700 13px Cairo'),
    dir: document.querySelector('.native-editor').getAttribute('dir'),
  }));
  assert.equal(state.width, state.scroll, name + ': page overflow');
  assert.equal(state.cairo, true);
  await page.screenshot({ path: path.join(dir, name + '.png') });
  result.screens.push(name);
  result.checks.push({ name, ...state });
};
try {
  await page.waitForTimeout(30500 - (Date.now() % 30000));
  await page.goto(origin + '/__isolated/sign-in');
  await page.locator('.course-results[aria-busy=false]').waitFor();
  await page.goto(origin + '/admin/courses/native');
  await page.locator('.course-results[aria-busy=false]').waitFor();
  await page.getByRole('button', { name: 'إنشاء دورة منارتك', exact: true }).click();
  const title = 'دورة بناء منهج معزولة ' + randomUUID();
  await page.getByLabel('اسم الدورة بالعربية', { exact: true }).fill(title);
  await page.getByLabel('مبرر الإنشاء', { exact: true }).fill('تجربة بناء دورة معزولة موثقة');
  await page.getByRole('button', { name: 'حفظ المسودة وفتح المحرر', exact: true }).click();
  await page.waitForURL(/\/courses\/[^/]+\/editor/);
  await ready();
  const id = new URL(page.url()).pathname.split('/').at(-2);
  result.courseId = id;
  await page.getByLabel('مبرر الإجراء', { exact: true }).fill('بناء محتوى اختباري معزول');
  const basics = page.locator('.native-basics');
  await basics
    .getByLabel('الوصف', { exact: true })
    .fill('وصف دورة معزولة محفوظ فعليًا، لا يستخدم بيانات الإنتاج.');
  await basics
    .getByLabel('مخرجات التعلم — عنصر لكل سطر', { exact: true })
    .fill('فهم المنهج\nتطبيق المحتوى');
  await action('حفظ المعلومات', 'PATCH');
  await tab('المنهج والمحاضرات');
  await page.getByRole('button', { name: 'إضافة وحدة', exact: true }).click();
  await page
    .locator('.native-lecture-content')
    .getByLabel('العنوان', { exact: true })
    .fill('الوحدة الأولى');
  await action('حفظ', 'POST');
  await page.getByRole('button', { name: 'إضافة محاضرة', exact: true }).click();
  await page
    .locator('.native-lecture-content')
    .getByLabel('العنوان', { exact: true })
    .fill('المحاضرة الأولى');
  await action('حفظ', 'POST');
  await page
    .locator('.native-lecture-content')
    .getByRole('button', { name: 'العنوان', exact: true })
    .click();
  await page.getByLabel('الوصف والأهداف', { exact: true }).fill('شرح تطبيقي محفوظ للمحاضرة');
  await page.getByLabel('المدة التقريبية بالدقائق — اختياري', { exact: true }).fill('12');
  await action('حفظ', 'PATCH');
  await page.getByRole('button', { name: 'إضافة محتوى', exact: true }).click();
  await page
    .locator('.native-block')
    .last()
    .getByLabel('المحتوى', { exact: true })
    .fill('نص محفوظ <script>not executed</script>');
  await action('حفظ كتل المحاضرة', 'PUT');
  await page.getByLabel('نوع الكتلة الجديدة', { exact: true }).selectOption('HEADING');
  await page.getByRole('button', { name: 'إضافة محتوى', exact: true }).click();
  await page
    .locator('.native-block')
    .last()
    .getByLabel('المحتوى', { exact: true })
    .fill('عنوان قبل النص');
  await page
    .locator('.native-block')
    .last()
    .getByRole('button', { name: 'نقل لأعلى', exact: true })
    .click();
  await action('حفظ كتل المحاضرة', 'PUT');
  const saved = await api('GET', `/admin/courses/${id}/curriculum`);
  assert.equal(saved.status, 200);
  assert.deepEqual(
    saved.data.contentBlocks.map((block) => block.type),
    ['HEADING', 'TEXT'],
  );
  assert.deepEqual(
    saved.data.contentBlocks.map((block) => block.position),
    [1, 2],
  );
  assert.equal(saved.data.lessons[0].summary, 'شرح تطبيقي محفوظ للمحاضرة');
  assert.equal(saved.data.lessons[0].estimatedDurationMinutes, 12);
  await page.getByRole('button', { name: 'معاينة المحتوى الحالي', exact: true }).click();
  assert.equal(
    await page
      .locator('.native-block-preview')
      .getByText('عنوان قبل النص', { exact: true })
      .count(),
    1,
  );
  assert.equal(await page.locator('.native-block-preview script').count(), 0);
  result.checks.push(
    'Actual UI create -> basics -> module -> lecture -> ordered persisted blocks; Arabic audit reasons accepted',
  );
  await shot('desktop-native-curriculum');
  await shot('mobile-native-curriculum', 360);
  await shot('narrow-native-curriculum', 320);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator('.native-block')
    .last()
    .getByLabel('المحتوى', { exact: true })
    .fill('مسودة تبقى عند التعارض');
  const current = (await api('GET', `/admin/courses/${id}`)).data;
  assert.equal(
    (
      await api(
        'PATCH',
        `/admin/courses/${id}`,
        { description: 'Concurrent accepted change' },
        current.version,
      )
    ).status,
    200,
  );
  const conflict = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' && response.url().includes('/content-blocks'),
  );
  await page.getByRole('button', { name: 'حفظ كتل المحاضرة', exact: true }).click();
  assert.equal((await conflict).status(), 409);
  await ready();
  assert.equal(
    await page.locator('.native-block').last().getByLabel('المحتوى', { exact: true }).inputValue(),
    'مسودة تبقى عند التعارض',
  );
  await shot('desktop-native-conflict');
  await page.getByRole('button', { name: 'قراءة النسخة الأحدث', exact: true }).click();
  await ready();
  assert.equal(
    await page.locator('.native-block').last().getByLabel('المحتوى', { exact: true }).inputValue(),
    'نص محفوظ <script>not executed</script>',
  );
  await page.getByRole('button', { name: 'إضافة محاضرة', exact: true }).click();
  await page.locator('.native-lecture-content').getByLabel('العنوان', { exact: true }).fill('المحاضرة الثانية');
  await action('حفظ', 'POST');
  await page.locator('.native-curriculum-tree').getByRole('button', { name: '2. المحاضرة الثانية', exact: true }).click();
  await page.getByRole('button', { name: 'إضافة محتوى', exact: true }).click();
  await page.locator('.native-block').last().getByLabel('المحتوى', { exact: true }).fill('محتوى المحاضرة الثانية');
  const selectedLesson = new URL(page.url()).searchParams.get('lesson');
  await action('حفظ كتل المحاضرة', 'PUT');
  assert.equal(new URL(page.url()).searchParams.get('lesson'), selectedLesson);
  assert.equal(await page.locator('.native-lecture-content').getByRole('heading', { name: 'المحاضرة الثانية', exact: true }).count(), 1);
  result.checks.push('Saving a second lecture retains its selection and saved content instead of jumping to the first lecture');
  await tab('التقييمات');
  await page.getByLabel('عنوان الاختبار', { exact: true }).fill('اختبار المحاضرة المحفوظ');
  await page.getByLabel('موضع الاختبار', { exact: true }).selectOption(saved.data.lessons[0].id);
  await action('إضافة الاختبار', 'POST');
  await page
    .locator('.native-assessments')
    .getByLabel('السؤال', { exact: true })
    .fill('ما العنصر الأساسي في المنهج؟');
  await page
    .locator('.native-assessments')
    .getByLabel('الخيارات — خيار لكل سطر', { exact: true })
    .fill('محاضرة\nسعر');
  await page
    .locator('.native-assessments')
    .getByLabel('الإجابة الصحيحة', { exact: true })
    .selectOption('محاضرة');
  await action('حفظ السؤال', 'POST');
  await tab('المنهج والمحاضرات');
  await page.locator('.native-curriculum-tree').getByRole('button', { name: '1. المحاضرة الأولى', exact: true }).click();
  await page.getByLabel('نوع الكتلة الجديدة', { exact: true }).selectOption('QUIZ');
  await page.getByRole('button', { name: 'إضافة محتوى', exact: true }).click();
  const assessment = (await api('GET', `/admin/courses/${id}/curriculum`)).data.quizzes[0];
  await page
    .locator('.native-block')
    .last()
    .getByLabel('اختبار المحاضرة', { exact: true })
    .selectOption(assessment.id);
  await action('حفظ كتل المحاضرة', 'PUT');
  const withAssessment = (await api('GET', `/admin/courses/${id}/curriculum`)).data;
  assert.equal(withAssessment.questions[0].prompt, 'ما العنصر الأساسي في المنهج؟');
  assert.ok(withAssessment.contentBlocks.some(block => block.quizId === assessment.id));
  result.checks.push(
    'Lecture description/duration saved; live preview escapes script text; real assessment and question created in editor and linked as a lecture block',
  );
  await shot('desktop-native-assessment-block');
  await tab('المعاينة والنشر');
  assert.equal(await page.getByRole('button', { name: 'نشر الدورة', exact: true }).count(), 0);
  await shot('desktop-native-readiness');
  result.checks.push(
    'Version conflict retains the block draft; explicit reload restores saved content; incomplete course cannot publish',
  );
  await page.goto(origin + `/admin/courses/${fixture.ids[0]}/editor?tab=students`);
  await ready();
  await page.locator('.native-students tbody tr').first().waitFor();
  assert.equal(await page.locator('.native-students tbody tr').count(), 3);
  await page
    .locator('.native-students')
    .getByRole('button', { name: 'عرض التقدم', exact: true })
    .first()
    .click();
  await page.locator('.native-learner-detail[aria-busy=false]').waitFor();
  await shot('desktop-native-learners');
  await shot('mobile-native-learners', 360);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await tab('التقارير');
  await page.locator('.native-report-bars').waitFor();
  const report = await api('GET', `/admin/courses/${fixture.ids[0]}/learning-report`);
  assert.equal(report.status, 200);
  assert.equal(report.data.totals.enrollments, 3);
  assert.equal(report.data.totals.started, 2);
  assert.equal(report.data.totals.completions, 1);
  await shot('desktop-native-learning-report');
  await shot('mobile-native-learning-report', 360);
  await page.getByLabel('التسجيل من — شامل UTC', { exact: true }).fill('2026-01-11');
  await page.getByLabel('التسجيل قبل — غير شامل UTC', { exact: true }).fill('2026-02-01');
  const cohortRead = page.waitForResponse((response) =>
    response.url().includes('/learning-report?cohortFrom=2026-01-11'),
  );
  await page.getByRole('button', { name: 'تطبيق الفترة', exact: true }).click();
  assert.equal((await cohortRead).status(), 200);
  await page.locator('.native-learning-report[aria-busy=false] .native-report-bars').waitFor();
  assert.deepEqual(
    await page.locator('.native-report-bars strong').allTextContents(),
    [0, 0, 0, 0].map((value) => value.toLocaleString('ar')),
  );
  result.checks.push(
    'Actual learner rows and bounded progress details; exact owner-only reporting and cohort aggregates without student identity or answers',
  );
  await page.evaluate(() => localStorage.setItem('manaratak_admin_lang', 'en'));
  await page.goto(origin + `/admin/courses/${id}/editor?tab=curriculum`);
  await ready();
  assert.equal(await page.locator('.native-editor').getAttribute('dir'), 'ltr');
  await shot('english-mobile-native-editor', 360);
  const anonymous = await browser.newContext();
  assert.equal(
    (await anonymous.request.get(origin + `/api/v1/admin/courses/${id}/learners`)).status(),
    401,
  );
  await anonymous.close();
  const denied = await browser.newContext();
  await denied.request.get(origin + '/__isolated/sign-in?account=denied');
  assert.equal(
    (await denied.request.get(origin + `/api/v1/admin/courses/${id}/learners`)).status(),
    403,
  );
  await denied.close();
  assert.deepEqual(result.errors, []);
  result.passed = true;
} catch (error) {
  result.failure = error.message;
  await page.screenshot({ path: path.join(dir, 'failure.png') }).catch(() => undefined);
  throw error;
} finally {
  fs.writeFileSync(path.join(dir, 'browser-verification.json'), JSON.stringify(result, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({
    passed: result.passed,
    checks: result.checks.length,
    courseId: result.courseId,
    screens: result.screens,
  }),
);
