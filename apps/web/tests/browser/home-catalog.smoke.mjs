/** Production-built UI with intercepted published API fixtures; never contacts a real DB/provider. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = new URL(process.env.HOME_CATALOG_TEST_ORIGIN || 'http://127.0.0.1:4179');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Local built preview only');
const output = path.resolve(process.env.HOME_CATALOG_TEST_OUTPUT || 'test-results/home-catalog');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.HOME_CATALOG_CHROMIUM ? { executablePath: process.env.HOME_CATALOG_CHROMIUM } : {}), args: ['--no-sandbox'] });
const results = [];
const university = { publicId: 'fixture-university', slug: 'fixture-university', displayName: 'Published Fixture University', canonicalName: 'Published Fixture University', officialWebsite: 'https://university.example.test', country: 'Fixture Country', institutionType: 'UNIVERSITY', programProfiles: [] };
const course = originType => ({ ownerId: `fixture-${originType}`, publicId: `fixture-${originType}`, slug: originType.toLowerCase(), displayName: `Published Fixture ${originType}`, canonicalName: 'Published fixture', originType, accessType: originType === 'PAID_COURSE' ? 'PAID' : 'FREE_STUDY_AND_CERTIFICATE', isStudyFree: true, isFreeCertificate: true, providerName: 'Fixture provider', directCourseUrl: 'https://courses.example.test' });
try {
  for (const locale of ['ar']) for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let mode = 'loading'; let release;
    let hold = new Promise(resolve => { release = resolve; });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname.includes('/auth/') || url.pathname.includes('/student/')) return route.fulfill({ status: 401, json: { error: 'Unauthenticated fixture' } });
      const isUniversity = url.pathname.startsWith('/api/v1/public/universities');
      const isCourse = url.pathname.startsWith('/api/v1/public/courses');
      if (mode === 'loading' && (isUniversity || isCourse)) await hold;
      if (mode === 'unavailable' && (isUniversity || isCourse)) return route.fulfill({ status: 503, json: { error: 'Owner unavailable fixture' } });
      if (mode === 'native-unavailable' && isCourse && url.searchParams.get('originType') !== 'EXTERNAL_LINKED_COURSE') return route.fulfill({ status: 503, json: { error: 'Native unavailable fixture' } });
      let data = [];
      if (mode === 'ready' && isUniversity) data = [university];
      if (mode === 'ready' && isCourse) data = [course(url.searchParams.get('originType') || 'EXTERNAL_LINKED_COURSE')];
      if (isUniversity && /\/universities\/[^/]+$/.test(url.pathname)) return route.fulfill({ json: university });
      if (isCourse && /\/courses\/[^/]+$/.test(url.pathname)) return route.fulfill({ json: course('EXTERNAL_LINKED_COURSE') });
      return route.fulfill({ json: url.pathname.includes('student-tools') ? [] : { data, total: data.length, nextCursor: null, hasMore: false, totalPages: 1 } });
    });
    const universities = page.locator('#featured-universities-section');
    const courses = page.locator('#featured-courses-section');
    const nativeText = locale === 'ar' ? 'دورات منارتك' : 'Manaratak Courses';
    const retryText = locale === 'ar' ? 'إعادة المحاولة' : 'Try again';
    const state = (section, value) => section.locator(`[data-catalog-state="${value}"]`).waitFor({ state: 'visible', timeout: 10000 });
    const slots = async (section, kind) => assert.equal(await section.locator(`[data-catalog-slot="${kind}"]`).count(), 3);
    await page.goto(`${base.origin}/${locale}`, { waitUntil: 'domcontentloaded' });
    await state(universities, 'loading'); await state(courses, 'loading');
    await slots(universities, 'universities'); await slots(courses, 'courses');
    mode = 'empty'; release();
    await state(universities, 'empty'); await state(courses, 'empty');
    assert.equal(await page.locator('html').getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr');
    for (const section of [universities, courses]) {
      await section.scrollIntoViewIfNeeded();
      assert.equal(await section.locator('[role="button"]').count(), 0, 'State slots cannot open fake details');
      assert.equal(await section.locator('img').count(), 0, 'State slots have no fake imagery');
      assert.ok(await section.locator('button[id^="btn-view-all"]').isVisible());
      const box = await section.boundingBox(); assert.ok(box && box.width > 0 && box.width <= width);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal document overflow');
    const nativeButton = courses.locator('button[aria-controls="home-course-cards"]').nth(1);
    assert.ok((await nativeButton.innerText()).trim().length > 0, nativeText);
    await nativeButton.click(); await state(courses, 'empty'); await slots(courses, 'courses');
    await universities.screenshot({ path: path.join(output, `${locale}-${width}-universities-empty.png`) });
    await courses.screenshot({ path: path.join(output, `${locale}-${width}-courses-empty.png`) });

    // Failed source, then real retry: reload must invalidate the cached empty snapshot.
    mode = 'unavailable'; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await state(universities, 'unavailable'); await state(courses, 'unavailable');
    await slots(universities, 'universities'); await slots(courses, 'courses');
    mode = 'ready'; await universities.getByRole('button', { name: retryText, exact: true }).click();
    await universities.getByText(university.displayName, { exact: false }).first().waitFor();
    await courses.getByText('Published Fixture NATIVE_MANARATAK_COURSE', { exact: true }).waitFor();
    await courses.locator('button[aria-controls="home-course-cards"]').first().click();
    await courses.getByText('Published Fixture EXTERNAL_LINKED_COURSE', { exact: true }).waitFor();
    assert.equal(await universities.locator('[data-catalog-slot]').count(), 0);
    assert.equal(await courses.locator('[data-catalog-slot]').count(), 0);
    await universities.screenshot({ path: path.join(output, `${locale}-${width}-universities-ready.png`) });
    await courses.screenshot({ path: path.join(output, `${locale}-${width}-courses-ready.png`) });

    mode = 'native-unavailable'; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await state(courses, 'empty');
    await nativeButton.click(); await state(courses, 'unavailable');
    await courses.locator('button[aria-controls="home-course-cards"]').first().click(); await state(courses, 'empty');
    assert.equal(errors.length, 0, errors.join('\n'));
    results.push({ locale, width, loading: true, empty: true, unavailable: true, retryToPublished: true, independentTabs: true, noHorizontalOverflow: true, javascriptErrors: errors });
    await page.close();
  }
  const localePolicyPage = await browser.newPage(); localePolicyPage.setDefaultNavigationTimeout(15000);
  await localePolicyPage.goto(`${base.origin}/en`);
  await localePolicyPage.waitForURL(/\/ar(?:\/|$)/);
  results.push({ englishPublicReleasePolicy: 'REDIRECT_TO_AR_PRESERVED' });
  await localePolicyPage.close();
  // English is intentionally not released publicly. Exercise both component directions
  // using the exact SSR output from HomeCatalogVisual.spec.tsx and production CSS.
  for (const locale of ['ar', 'en']) for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const html = fs.readFileSync(path.join(output, `${locale}-components.html`), 'utf8').replaceAll('http://127.0.0.1:4179', base.origin);
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin) return route.abort();
      if (url.pathname.startsWith('/__catalog-component-fixture/')) return route.fulfill({ contentType: 'text/html', body: html });
      return route.continue();
    });
    await page.goto(`${base.origin}/__catalog-component-fixture/${locale}`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-catalog-slot]').first().evaluate(element => getComputedStyle(element).display), 'flex', 'Production CSS must actually load');
    assert.equal(await page.locator('html').getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr');
    assert.equal(await page.locator('[data-catalog-slot]').count(), 6);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, `${locale}-${width}-isolated-components.png`), fullPage: true });
    results.push({ locale, width, mode: 'ISOLATED_BILINGUAL_COMPONENT_SSR_WITH_PRODUCTION_CSS', outcome: 'PASS' });
    await page.close();
  }
  // Published detail navigation uses the owner slug; browse remains available when empty.
  const page = await browser.newPage(); page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(15000);
  await page.route('**/*', route => { const u = new URL(route.request().url());
    if (u.origin !== base.origin) return route.abort();
    if (!u.pathname.startsWith('/api/')) return route.continue();
    if (u.pathname.includes('/public/universities/')) return route.fulfill({ json: university });
    if (u.pathname.includes('/public/universities')) return route.fulfill({ json: { data: [university] } });
    if (u.pathname.includes('/public/courses/')) return route.fulfill({ json: course('EXTERNAL_LINKED_COURSE') });
    if (u.pathname.includes('/public/courses')) return route.fulfill({ json: { data: [course(u.searchParams.get('originType') || 'EXTERNAL_LINKED_COURSE')] } });
    return route.fulfill({ json: u.pathname.includes('student-tools') ? [] : { data: [], total: 0 } }); });
  await page.goto(`${base.origin}/ar`); await page.locator('#featured-universities-section [role="button"]').click();
  await page.waitForURL(/\/universities\/fixture-university/);
  await page.goto(`${base.origin}/ar`); await page.locator('#featured-courses-section [role="button"]').first().click();
  await page.waitForURL(/\/courses\/external_linked_course/);
  await page.goto(`${base.origin}/ar`); await page.locator('#btn-view-all-universities').click();
  await page.waitForURL(/\/universities\/?$/);
  await page.goto(`${base.origin}/ar`); await page.locator('#btn-view-all-courses').click();
  await page.waitForURL(/\/courses\/?$/);
  results.push({ ownerDetailNavigation: 'PASS', browseNavigation: 'PASS' });
  await page.close();
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({ mode: 'BUILT_UI_WITH_INTERCEPTED_API_NO_DATABASE', results }, null, 2));
  console.log(JSON.stringify({ scenarios: results.length, localeViewportCombinations: 3, outcome: 'PASS', output }));
} finally { await browser.close(); }
