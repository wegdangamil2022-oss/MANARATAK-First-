import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

// Uses only the attested private DB-T launcher, canonical MFA and the
// fixture-fenced HTTPS provider. It is not a production antivirus certification.
const require = createRequire(path.resolve('package.json'));
const { chromium } = require('playwright');
const origin = 'http://127.0.0.2:3157';
const receipt = JSON.parse(
  fs.readFileSync('docs/ui/evidence/courses-native-closure-20261026/browser-verification.json'),
);
assert.equal(receipt.scope, 'ISOLATED_LOCAL_POSTGRES16_ONLY');
assert.ok(receipt.copyId);
const result = {
  scope: receipt.scope,
  originalDatabaseWrites: 0,
  productionSecurityValidation: false,
  checks: [],
};
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();
const request = (method, suffix, body, version) =>
  page.evaluate(
    async ({ method, suffix, body, version }) => {
      const csrf = method === 'GET' ? {} : await (await fetch('/api/v1/auth/csrf-token')).json();
      const response = await fetch('/api/v1/admin/courses/' + suffix, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf.data?.csrfToken ?? csrf.csrfToken,
          'If-Match': String(version),
          'X-Review-Reason': 'Isolated media rejection acceptance',
          'Idempotency-Key': crypto.randomUUID(),
        },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    },
    { method, suffix, body, version },
  );
try {
  await page.waitForTimeout(30500 - (Date.now() % 30000));
  await page.goto(origin + '/__isolated/sign-in');
  await page.locator('.course-results[aria-busy=false]').waitFor();
  const courseId = receipt.copyId;
  const course = await request('GET', courseId);
  assert.equal(course.data.status, 'DRAFT');
  const curriculum = await request('GET', courseId + '/curriculum');
  const lesson = curriculum.data.lessons[0];
  const write = (suffix, body = {}) =>
    request('POST', courseId + '/media/' + suffix, body, course.data.version);
  for (const fixture of [
    {
      name: 'not-video.webm',
      mime: 'video/webm',
      bytes: Buffer.from('This is not a video. Signature verification must reject it.'),
      finalize: false,
    },
    {
      name: 'scanner-test.txt',
      mime: 'text/plain',
      bytes: Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE - isolated rejection fixture'),
      finalize: true,
    },
  ]) {
    const allocation = await write('lessons/' + lesson.id + '/uploads', {
      originalFilename: fixture.name,
      fileExtension: fixture.name.split('.').at(-1),
      mimeType: fixture.mime,
      byteSize: fixture.bytes.length,
      rightsSource: 'Generated isolated rejection test',
    });
    assert.equal(allocation.status, 201);
    const { assetId, uploadGrant } = allocation.data;
    const transferred = await page.evaluate(
      async ({ grant, bytes }) =>
        (
          await fetch(grant.uploadUrl, {
            method: grant.method,
            headers: grant.headers,
            body: new Uint8Array(bytes),
            credentials: 'omit',
            redirect: 'error',
          })
        ).status,
      { grant: uploadGrant, bytes: [...fixture.bytes] },
    );
    assert.equal(transferred, 200);
    const finalized = await write(assetId + '/finalize');
    if (fixture.finalize) {
      assert.equal(finalized.status, 200);
      assert.equal((await write(assetId + '/process')).status, 409);
      const state = await request('GET', courseId + '/media/' + assetId);
      assert.equal(state.data.state, 'MALWARE_SCAN_FAILED');
      assert.equal(state.data.scan, 'FAILED');
      assert.equal(state.data.sanitized, false);
    } else assert.notEqual(finalized.status, 200);
    const linked = await request(
      'POST',
      courseId + '/lessons/' + lesson.id + '/assets',
      {
        assetId,
        assetType: fixture.finalize ? 'DOCUMENT' : 'VIDEO',
        title: 'Rejected fixture ' + randomUUID(),
        position: 100,
      },
      course.data.version,
    );
    assert.notEqual(linked.status, 201);
    assert.notEqual(linked.status, 200);
    const after = await request('GET', courseId + '/curriculum');
    assert.equal(
      after.data.assets.some((row) => row.assetId === assetId),
      false,
    );
    result.checks.push(
      fixture.finalize
        ? 'EICAR marker rejected by fixture scanner; no sanitation, activation or curriculum link'
        : 'Incorrect WebM signature rejected at actual provider verification; no curriculum link',
    );
  }
  const anonymous = await browser.newContext({ ignoreHTTPSErrors: true });
  assert.equal(
    (await anonymous.request.get('https://127.0.0.1:3168/delivery/' + randomUUID())).status(),
    403,
  );
  assert.equal(
    (
      await anonymous.request.post('https://127.0.0.1:3168/v1/assets/delivery-grants', { data: {} })
    ).status(),
    403,
  );
  result.checks.push(
    'Unknown media capabilities and unsigned provider commands rejected over HTTPS',
  );
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.failure = String(error.message);
  throw error;
} finally {
  fs.writeFileSync(
    'docs/ui/evidence/courses-native-closure-20261026/media-security-verification.json',
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
}
