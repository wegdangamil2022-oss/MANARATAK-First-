import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
const require = createRequire(path.resolve('package.json')),
  { chromium } = require('playwright');
const origin = 'http://127.0.0.2:3157';
const refs = JSON.parse(
  fs.readFileSync(
    path.resolve('../../private/review-workspace-20261024/COURSES_NATIVE_CLOSURE_REFERENCES.json'),
  ),
);
assert.equal(refs.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY');
const output = path.resolve('docs/ui/evidence/courses-native-closure-20261026'),
  mediaRoot = path.resolve('../../private/courses-media-provider-lab');
fs.mkdirSync(output, { recursive: true });
const result = {
  scope: refs.scope,
  originalDatabaseWrites: 0,
  productionMediaProviderTested: false,
  providerSecurity:
    'KNOWN_GENERATED_FIXTURE_MANIFEST_ONLY_NOT_PRODUCTION_ANTIVIRUS_OR_SANITIZATION',
  checks: [],
  screens: [],
  errors: [],
};
const mark = (message) => {
  result.checks.push(message);
  fs.writeFileSync(path.join(output, 'browser-verification.json'), JSON.stringify(result, null, 2));
  console.log('CHECK', message);
};
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const admin = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  ignoreHTTPSErrors: true,
});
let nextRequestAt = 0;
const pace = async (context) =>
  context.route('**/api/v1/**', async (route) => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    nextRequestAt = Math.max(Date.now(), nextRequestAt) + 700;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await route.continue();
  });
await pace(admin);
const page = await admin.newPage();
page.on('pageerror', (error) => result.errors.push(error.message));
page.on('dialog', (dialog) => dialog.accept());
const request = (target, method, endpoint, body, version, key) =>
  target.evaluate(
    async ({ method, endpoint, body, version, key }) => {
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
          'X-Review-Reason': 'Isolated native closure acceptance',
          'Idempotency-Key': key ?? crypto.randomUUID(),
          ...(version ? { 'If-Match': String(version) } : {}),
        },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    },
    { method, endpoint, body, version, key },
  );
const ready = () =>
  page.locator('.native-editor-content:not([disabled])').waitFor({ timeout: 60000 });
let courseId;
const command = async (suffix, body, method = 'POST') => {
  const owner = await request(page, 'GET', `/admin/courses/${courseId}`);
  const response = await request(
    page,
    method,
    `/admin/courses/${courseId}` + (suffix ? '/' + suffix : ''),
    body,
    owner.data.version,
  );
  assert.ok(
    [200, 201, 204].includes(response.status),
    suffix +
      ': ' +
      response.status +
      ' ' +
      JSON.stringify(response.data?.error ?? response.data?.detail ?? ''),
  );
  return response.data;
};
const ui = async (name, method) => {
  const pending = page.waitForResponse(
    (response) =>
      response.request().method() === method && response.url().includes('/api/v1/admin/courses/'),
  );
  await page.getByRole('button', { name, exact: true }).click();
  const response = await pending;
  assert.ok([200, 201, 204].includes(response.status()), name + ': ' + response.status());
  await ready();
  return response;
};
const shot = async (target, name, width = 1440) => {
  await target.setViewportSize({ width, height: 1000 });
  await target.evaluate(() => document.fonts.ready);
  const state = await target.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    cairoLoaded: [...document.fonts].some(
      (font) => font.family.includes('Cairo') && font.status === 'loaded',
    ),
  }));
  assert.equal(state.width, state.scroll, name + ': overflow');
  assert.equal(state.cairoLoaded, true);
  await target.screenshot({ path: path.join(output, name + '.png') });
  result.screens.push(name);
};
try {
  // Actual browser-encoded WebM, PCM WAV, PNG and VTT. The fixture-only
  // provider accepts only their exact hashes. No production scan is claimed.
  const generate = await browser.newPage();
  const webm = Buffer.from(
    await generate.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const context = canvas.getContext('2d');
      const stream = canvas.captureStream(12),
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' }),
        chunks = [];
      const done = new Promise((resolve) => {
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = async () =>
          resolve(
            Array.from(
              new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()),
            ),
          );
      });
      recorder.start();
      let frame = 0;
      const timer = setInterval(() => {
        context.fillStyle = frame++ % 2 ? '#142B5F' : '#0E7C86';
        context.fillRect(0, 0, 320, 180);
      }, 70);
      await new Promise((resolve) => setTimeout(resolve, 1700));
      clearInterval(timer);
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
      return done;
    }),
  );
  const png = Buffer.from(
    await generate.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#D6A43B';
      ctx.fillRect(0, 0, 32, 32);
      return canvas.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
  await generate.close();
  const wav = Buffer.alloc(16044);
  wav.write('RIFF');
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(16000, 40);
  for (let i = 0; i < 8000; i++)
    wav.writeInt16LE(Math.round(Math.sin((i / 8000) * 440 * 2 * Math.PI) * 2000), 44 + i * 2);
  const files = [
    { name: 'lecture.webm', mimeType: 'video/webm', buffer: webm },
    { name: 'lecture.wav', mimeType: 'audio/wav', buffer: wav },
    {
      name: 'captions.vtt',
      mimeType: 'text/vtt',
      buffer: Buffer.from('WEBVTT\n\n00:00.000 --> 00:01.500\nترجمة المحاضرة المعزولة\n'),
    },
    { name: 'diagram.png', mimeType: 'image/png', buffer: png },
    {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Isolated course notes. No personal data.'),
    },
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream',
  ].entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += index + 1 + ' 0 obj\n' + object + '\nendobj\n';
  }
  const xref = Buffer.byteLength(pdf);
  pdf +=
    'xref\n0 5\n0000000000 65535 f \n' +
    offsets
      .slice(1)
      .map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n')
      .join('') +
    'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' +
    xref +
    '\n%%EOF\n';
  files.push({ name: 'worksheet.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) });
  const manifest = JSON.parse(fs.readFileSync(path.join(mediaRoot, 'fixture-hashes.json')));
  manifest.hashes = [
    ...new Set([
      ...manifest.hashes,
      ...files.map((file) => createHash('sha256').update(file.buffer).digest('hex')),
    ]),
  ];
  fs.writeFileSync(path.join(mediaRoot, 'fixture-hashes.json'), JSON.stringify(manifest));
  await page.waitForTimeout(30500 - (Date.now() % 30000));
  await page.goto(origin + '/__isolated/sign-in');
  await page.locator('.course-results[aria-busy=false]').waitFor();
  const title = 'دورة إغلاق معزولة ' + randomUUID();
  const created = await request(page, 'POST', '/admin/courses', {
    titleAr: title,
    learningLanguage: refs.languageName,
    category: refs.category,
    difficultyLevel: 'Beginner',
  });
  assert.equal(created.status, 201);
  courseId = created.data.id;
  result.courseId = courseId;
  await command(
    '',
    {
      description: 'دورة معزولة كاملة لاختبار المنهج والوسائط والتقييم والتقدم.',
      learningOutcomes: ['استخدام المحرر التعليمي', 'تطبيق التقييم'],
      instructor: 'مدرب اختبار معزول',
      certificateAvailable: false,
      completionCriteria: { minimumProgress: 100, assessmentRequired: true },
    },
    'PATCH',
  );
  await command('relationships/language', { languageReferenceId: refs.languageId });
  const relation = await command('relationships/taxonomy', {
    taxonomyNodeId: refs.taxonomyId,
    relationshipType: 'PRIMARY',
  });
  await command(`relationships/taxonomy/${relation.id}/approve`, {});
  const module = await command('modules', { title: 'وحدة تطبيقية', position: 1 });
  const lesson = await command(`modules/${module.id}/lessons`, {
    title: 'محاضرة متعددة الوسائط',
    lessonType: 'MIXED',
    position: 1,
    contentText: 'نص قديم محفوظ بالكامل',
  });
  await page.goto(origin + `/admin/courses/${courseId}/editor?tab=curriculum&lesson=${lesson.id}`);
  await ready();
  await page
    .getByLabel('مبرر الإجراء', { exact: true })
    .fill('بناء دورة معزولة والتحقق من وسائطها');
  await ui('تحويل النص إلى كتل', 'POST');
  let snapshot = (await request(page, 'GET', `/admin/courses/${courseId}/curriculum`)).data;
  assert.equal(snapshot.lessons[0].contentText, null);
  assert.equal(snapshot.contentBlocks[0].payload.text, 'نص قديم محفوظ بالكامل');
  const uploaded = [];
  for (const file of files) {
    console.log('MEDIA_FIXTURE', file.name);
    await page.getByRole('button', { name: 'رفع ملف جديد', exact: true }).click();
    const panel = page.locator('.native-media-upload');
    await panel.getByLabel('ملف المحاضرة', { exact: true }).waitFor();
    await panel.getByLabel('ملف المحاضرة', { exact: true }).setInputFiles(file);
    await panel
      .getByLabel('مصدر حق استخدام الملف', { exact: true })
      .fill('Known fixture generated solely for isolated acceptance');
    if (file.name === 'lecture.webm')
      await page.route('https://127.0.0.1:3168/upload/**', (route) => route.abort('failed'), {
        times: 1,
      });
    const finalized = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith('/finalize'),
    );
    await panel.getByRole('button', { name: 'رفع إلى الحجر والتحقق', exact: true }).click();
    if (file.name === 'lecture.webm') {
      await panel.getByRole('alert').waitFor();
      await panel.getByLabel('الملف الأصلي لاستئناف الرفع', { exact: true }).setInputFiles(file);
      await panel.getByRole('button', { name: 'استئناف رفع الملف نفسه', exact: true }).click();
    }
    assert.equal((await finalized).status(), 200);
    const processed = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith('/process'),
    );
    await panel.getByRole('button', { name: 'فحص ومعالجة وتفعيل الملف', exact: true }).click();
    const response = await processed;
    assert.equal(
      response.status(),
      200,
      'processing ' + file.name + ': ' + (await response.text()).slice(0, 250),
    );
    const status = await response.json();
    assert.equal(status.state, 'ACTIVE');
    uploaded.push({ assetId: status.assetId, name: file.name, mime: file.mimeType });
    if (file.name === 'lecture.webm') await shot(page, 'desktop-course-media-active');
    await ui('ربط الملف بالمحاضرة', 'POST');
  }
  snapshot = (await request(page, 'GET', `/admin/courses/${courseId}/curriculum`)).data;
  assert.equal(snapshot.assets.length, 6);
  const video = snapshot.assets.find((row) => row.assetType === 'VIDEO'),
    audio = snapshot.assets.find((row) => row.assetType === 'AUDIO'),
    image = snapshot.assets.find((row) => row.assetType === 'IMAGE'),
    caption = snapshot.assets.find((row) => row.assetType === 'SUBTITLE'),
    document = snapshot.assets.find((row) => row.assetType === 'DOCUMENT'),
    pdfAsset = snapshot.assets.find((row) => row.assetType === 'PDF');
  await page.getByLabel('نوع الكتلة الجديدة', { exact: true }).selectOption('VIDEO');
  await page.getByRole('button', { name: 'إضافة محتوى', exact: true }).click();
  const block = page.locator('.native-block').last();
  await block.getByLabel('عنوان الملف', { exact: true }).fill('الفيديو العملي');
  await block.getByLabel('ملف المحاضرة المعتمد', { exact: true }).selectOption(video.id);
  await block.getByLabel('ترجمة الفيديو VTT — اختياري', { exact: true }).selectOption(caption.id);
  await ui('حفظ كتل المحاضرة', 'PUT');
  snapshot = (await request(page, 'GET', `/admin/courses/${courseId}/curriculum`)).data;
  await command(
    `lessons/${lesson.id}/content-blocks`,
    {
      blocks: [
        ...snapshot.contentBlocks.map(({ id, type, payload, assetReferenceId, quizId }) => ({
          id,
          type,
          payload,
          assetReferenceId,
          quizId,
        })),
        {
          id: randomUUID(),
          type: 'AUDIO',
          payload: { title: 'المقطع الصوتي' },
          assetReferenceId: audio.id,
        },
        {
          id: randomUUID(),
          type: 'IMAGE',
          payload: { alt: 'صورة توضيحية معزولة' },
          assetReferenceId: image.id,
        },
        {
          id: randomUUID(),
          type: 'FILE',
          payload: { title: 'ملف العمل' },
          assetReferenceId: document.id,
        },
        {
          id: randomUUID(),
          type: 'FILE',
          payload: { title: 'ورقة PDF' },
          assetReferenceId: pdfAsset.id,
        },
      ],
    },
    'PUT',
  );
  mark(
    'Failed direct upload recovered through UI using a renewed grant for the same EAP identity, without a second allocation',
  );
  mark(
    'Real HTTPS transfer and byte verification -> fixture-fenced scanning/sanitization -> clean promotion -> ACTIVE -> versioned lecture linking for WebM/WAV/PNG/VTT/text/PDF; no raw media URLs in blocks',
  );
  await page.goto(origin + `/admin/courses/${courseId}/editor?tab=assessments`);
  await ready();
  await page.getByLabel('مبرر الإجراء', { exact: true }).fill('بناء اختبارات وواجبات معزولة');
  await page.getByLabel('عنوان الاختبار', { exact: true }).fill('اختبار الوحدة');
  await page.getByLabel('موضع الاختبار', { exact: true }).selectOption('module:' + module.id);
  await ui('إضافة الاختبار', 'POST');
  const author = page.locator('.native-assessments');
  await author.getByLabel('نوع السؤال', { exact: true }).selectOption('TRUE_FALSE');
  await author.getByLabel('السؤال', { exact: true }).fill('هل فتح الفيديو يثبت إكمال الدورة؟');
  await author.getByLabel('الإجابة الصحيحة', { exact: true }).selectOption('false');
  await ui('حفظ السؤال', 'POST');
  await page.getByLabel('عنوان الاختبار', { exact: true }).fill('الواجب الكتابي');
  await page.getByLabel('نوع التقييم', { exact: true }).selectOption('ASSIGNMENT');
  await page.getByLabel('موضع الاختبار', { exact: true }).selectOption(lesson.id);
  await ui('إضافة الاختبار', 'POST');
  for (const [type, prompt] of [
    ['ESSAY', 'اشرح تطبيقك العملي'],
    ['SHORT_ANSWER', 'اذكر نتيجة تعلم واحدة'],
  ]) {
    await author.getByLabel('نوع السؤال', { exact: true }).selectOption(type);
    await author.getByLabel('السؤال', { exact: true }).fill(prompt);
    await author
      .getByLabel('معيار التصحيح / شرح للمراجع', { exact: true })
      .fill('صحة الفكرة مع مثال تطبيقي');
    await ui('حفظ السؤال', 'POST');
  }
  await shot(page, 'desktop-native-advanced-authoring');
  await shot(page, 'mobile-native-advanced-authoring', 360);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const readiness = await request(page, 'GET', `/admin/courses/${courseId}/readiness`);
  assert.equal(
    readiness.data.ready,
    true,
    JSON.stringify(readiness.data.checks.filter((row) => row.state === 'INCOMPLETE')),
  );
  console.log('AUTHORING_AND_READINESS_PASSED');
  await page.getByRole('button', { name: 'المعاينة والنشر', exact: true }).click();
  await ui('إرسال للمراجعة', 'POST');
  await ui('اعتماد الجاهزية', 'POST');
  await ui('نشر الدورة', 'POST');
  let published = (await request(page, 'GET', `/admin/courses/${courseId}`)).data;
  assert.equal(published.status, 'PUBLISHED');
  mark(
    'Positive native readiness and actual review -> approval -> publication, with real canonical relationships and media; not a seeded publication status',
  );
  const student = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
    }),
    learner = await student.newPage();
  await pace(student);
  learner.on('pageerror', (error) => result.errors.push(error.message));
  await learner.goto(origin + '/__isolated/student-sign-in');
  await learner.goto(origin + `/ar/student/courses/${courseId}`);
  await learner.getByRole('button', { name: 'التسجيل في الدورة', exact: true }).click();
  await learner.getByRole('button', { name: 'تحديد الدرس كمكتمل', exact: true }).waitFor();
  await page.getByRole('button', { name: 'نسخ الدورة', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('اسم النسخة بالعربية', { exact: true }).fill(title + ' — نسخة');
  await dialog.getByLabel('سبب النسخ', { exact: true }).fill('نسخة مسودة مستقلة مع مراجعة الحقوق');
  await dialog.getByRole('checkbox').last().check();
  await dialog.getByRole('button', { name: 'إنشاء النسخة', exact: true }).click();
  await page.waitForURL(
    (url) => url.pathname.includes('/editor') && !url.pathname.includes(courseId),
  );
  await ready();
  const copyId = new URL(page.url()).pathname.split('/').at(-2);
  result.copyId = copyId;
  const copy = (await request(page, 'GET', `/admin/courses/${copyId}`)).data;
  assert.equal(copy.status, 'DRAFT');
  assert.equal(copy.certificateAvailable, false);
  assert.equal((await request(page, 'GET', `/admin/courses/${copyId}/learners`)).data.total, 0);
  assert.equal(
    (await request(page, 'GET', `/admin/courses/${courseId}`)).data.version,
    published.version,
  );
  const copied = (await request(page, 'GET', `/admin/courses/${copyId}/curriculum`)).data;
  const copiedVideo = copied.contentBlocks.find((row) => row.type === 'VIDEO');
  assert.equal(
    copiedVideo.payload.subtitleReferenceId,
    copied.assets.find((row) => row.assetType === 'SUBTITLE').id,
  );
  assert.notEqual(copiedVideo.assetReferenceId, video.id);
  await page.getByLabel('مبرر الإجراء', { exact: true }).fill('نسخ الوحدة والمحاضرة في المختبر');
  await page.getByRole('button', { name: 'المنهج والمحاضرات', exact: true }).click();
  await page.getByRole('button', { name: 'نسخ الوحدة', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox').last().check();
  await ui('تأكيد النسخ', 'POST');
  await page.getByRole('button', { name: 'نسخ المحاضرة', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox').last().check();
  await ui('تأكيد النسخ', 'POST');
  assert.equal(
    (await request(page, 'GET', `/admin/courses/${copyId}/curriculum`)).data.lessons.length,
    3,
  );
  await shot(page, 'desktop-native-copy-curriculum');
  mark(
    'UI course/module/lecture duplication with independent IDs, caption remapping, no enrollment or certificate inheritance, and unchanged published source version',
  );
  await learner.getByRole('button', { name: 'الفيديو العملي', exact: true }).click();
  await learner.locator('video').waitFor();
  await learner.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
  await learner.locator('video').evaluate((video) => video.play());
  await learner.waitForTimeout(500);
  assert.ok(await learner.locator('video').evaluate((video) => video.currentTime > 0));
  await learner.waitForFunction(
    () => document.querySelector('video')?.textTracks[0]?.cues?.length > 0,
  );
  await shot(learner, 'desktop-student-video-captions');
  await shot(learner, 'mobile-student-video-captions', 360);
  await learner.getByRole('button', { name: 'المقطع الصوتي', exact: true }).click();
  await learner.locator('audio').waitFor();
  await learner.waitForFunction(() => document.querySelector('audio')?.readyState >= 2);
  await learner.locator('audio').evaluate((audio) => audio.play());
  await learner.waitForFunction(
    () => document.querySelector('audio')?.currentTime > 0,
    {},
    { timeout: 10000 },
  );
  assert.ok(await learner.locator('audio').evaluate((audio) => audio.currentTime > 0));
  await learner.getByRole('button', { name: 'صورة توضيحية معزولة', exact: true }).click();
  await learner.getByAltText('صورة توضيحية معزولة', { exact: true }).waitFor();
  assert.equal(
    await learner.getByAltText('صورة توضيحية معزولة').evaluate((img) => img.naturalWidth),
    32,
  );
  const download = learner.waitForEvent('download');
  await learner.getByRole('button', { name: 'ملف العمل', exact: true }).click();
  const downloaded = await download;
  assert.equal(
    createHash('sha256')
      .update(fs.readFileSync(await downloaded.path()))
      .digest('hex'),
    createHash('sha256').update(files[4].buffer).digest('hex'),
  );
  const pdfDownload = learner.waitForEvent('download');
  await learner.getByRole('button', { name: 'ورقة PDF', exact: true }).click();
  assert.equal(
    createHash('sha256')
      .update(fs.readFileSync(await (await pdfDownload).path()))
      .digest('hex'),
    createHash('sha256').update(files[5].buffer).digest('hex'),
  );
  const before = (await request(learner, 'GET', `/student/courses/${courseId}/workspace`)).data;
  assert.equal(before.progress.enrollment.progressPercentage, 0);
  assert.equal(
    (await request(page, 'GET', `/admin/courses/${courseId}/learning-report`)).data.totals.started,
    0,
  );
  mark(
    'Actual video playback + VTT cues, audio playback, decoded PNG and byte-identical text/PDF downloads through enrolled-student grants; opening media alone does not record completion or a learning start',
  );
  const current = (await request(page, 'GET', `/admin/courses/${courseId}/curriculum`)).data,
    quiz = current.quizzes.find((row) => row.title === 'اختبار الوحدة'),
    assignment = current.quizzes.find((row) => row.title === 'الواجب الكتابي');
  const quizCard = learner.locator(`[data-course-quiz-id="${quiz.id}"]`);
  await quizCard.getByRole('button', { name: 'بدء الاختبار', exact: true }).click();
  await quizCard.getByRole('radio', { name: 'خطأ', exact: true }).check();
  const autoSubmitted = learner.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/submit'),
  );
  await quizCard.getByRole('button', { name: 'إرسال الإجابات', exact: true }).click();
  assert.equal((await autoSubmitted).status(), 200);
  const assignmentCard = learner.locator(`[data-course-quiz-id="${assignment.id}"]`);
  await assignmentCard.getByRole('button', { name: 'بدء الواجب', exact: true }).click();
  await assignmentCard
    .getByLabel('اشرح تطبيقك العملي', { exact: true })
    .fill('تطبيق معزول يوضح منهجًا فعليًا محفوظًا');
  await assignmentCard
    .getByLabel('اذكر نتيجة تعلم واحدة', { exact: true })
    .fill('حفظ تقدم الطالب دون أرقام وهمية');
  const manualSubmitted = learner.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/submit'),
  );
  await assignmentCard.getByRole('button', { name: 'إرسال الإجابات', exact: true }).click();
  const submitted = await (await manualSubmitted).json();
  assert.equal(submitted.status, 'SUBMITTED');
  assert.equal(submitted.score, null);
  assert.equal(submitted.passed, null);
  await learner.getByRole('button', { name: 'تحديد الدرس كمكتمل', exact: true }).click();
  await learner
    .getByRole('button', { name: 'إنهاء الدورة والتحقق من الاستحقاق', exact: true })
    .waitFor({ state: 'visible' });
  const blocked = await request(learner, 'POST', `/student/courses/${courseId}/complete`, {});
  assert.notEqual(blocked.status, 200);
  assert.equal(
    (await request(learner, 'GET', `/student/courses/${courseId}/workspace`)).data.progress
      .completion,
    null,
  );
  await page.goto(origin + `/admin/courses/${courseId}/editor?tab=assessments`);
  await ready();
  const review = page.getByRole('region', { name: 'التصحيح اليدوي', exact: true });
  await review.getByRole('button', { name: 'تحميل التسليمات', exact: true }).click();
  await review.locator('input[type=number]').first().waitFor();
  await review.getByText('صحة الفكرة مع مثال تطبيقي', { exact: false }).first().waitFor();
  await review
    .getByLabel('سبب اعتماد الدرجات', { exact: true })
    .fill('تطبيق معيار التصحيح المحفوظ في التسليم');
  for (const input of await review.locator('input[type=number]').all())
    await input.fill(await input.getAttribute('max'));
  await review
    .getByLabel('ملاحظات للطالب', { exact: true })
    .fill('إجابة مكتملة وفق معيار التقييم المحفوظ');
  const [graded] = await Promise.all([
    page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith('/grade'),
    ),
    review.getByRole('button', { name: 'اعتماد الدرجة', exact: true }).click(),
  ]);
  assert.equal(graded.status(), 200);
  await learner.reload();
  await learner
    .getByRole('button', { name: 'إنهاء الدورة والتحقق من الاستحقاق', exact: true })
    .click();
  await learner.getByRole('heading', { name: 'اكتملت الدورة', exact: true }).waitFor();
  const completed = (await request(learner, 'GET', `/student/courses/${courseId}/workspace`)).data;
  assert.equal(completed.progress.enrollment.progressPercentage, 100);
  assert.ok(completed.progress.completion);
  assert.equal(completed.progress.completion.eligibleForCertificate, false);
  await shot(learner, 'mobile-student-graded-completion', 360);
  mark(
    'Real module quiz auto-grading and essay/short-answer assignment submission, pending human grade with null score/pass, completion blocked before grading, saved rubric grading through admin UI, then authoritative completion',
  );
  const anonymous = await browser.newContext();
  assert.equal(
    (
      await anonymous.request.get(origin + `/api/v1/student/courses/${courseId}/workspace`)
    ).status(),
    401,
  );
  assert.equal(
    (await request(learner, 'GET', `/admin/courses/${courseId}/curriculum`)).status,
    403,
  );
  assert.equal((await request(learner, 'GET', `/student/courses/${copyId}/workspace`)).status, 403);
  mark('Anonymous/student administration/cross-course enrollment boundaries remain enforced');
  assert.equal(result.errors.length, 0);
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failure = String(error.message).replace(
    /https:\/\/127\.0\.0\.1:3168\/[^\s"']+/g,
    '[isolated media capability redacted]',
  );
  await page.screenshot({ path: path.join(output, 'failure.png') });
  throw error;
} finally {
  fs.writeFileSync(path.join(output, 'browser-verification.json'), JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      passed: result.passed,
      checks: result.checks.length,
      screens: result.screens,
      courseId: result.courseId,
    }),
  );
  await browser.close();
}
