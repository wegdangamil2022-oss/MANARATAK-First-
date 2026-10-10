import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium, expect } from '@playwright/test';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Browser contract test only: fixture API responses, never a real student session/DB.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
await mkdir(join(root, 'tmp'), { recursive: true });
const temporary = await mkdtemp(join(root, 'tmp', 'certificate-browser-'));
const output = resolve(process.argv[2] || join(root, 'tmp', 'certificate-browser-evidence'));
await mkdir(output, { recursive: true });
const html = join(temporary, 'index.html');
await writeFile(
  html,
  '<html lang="ar" dir="rtl"><div id="root"></div><script type="module" src="./entry.tsx"></script></html>',
);
await writeFile(
  join(temporary, 'entry.tsx'),
  `import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {I18nProvider} from '${root}/apps/web/src/i18n/I18nProvider';
import {StudentCertificatesPanel} from '${root}/apps/web/src/features/certificates/StudentCertificatesPanel';
import {ApprovedCertificatePreview} from '${root}/apps/admin/src/components/certificates/ApprovedCertificatePreview';
createRoot(document.getElementById('root')!).render(<BrowserRouter><I18nProvider><main style={{maxWidth:900,margin:'auto'}}><StudentCertificatesPanel initial={[]}/><ApprovedCertificatePreview input={{recipient:'وجدان جميل عبدالهادي علي السروري',achievement:'دورة المنح الدراسية',achievementAr:'دورة المنح الدراسية',achievementEn:'Scholarships Course',serial:'MNR-PREVIEW',issuedAt:'2026-10-10',verificationUrl:'https://example.org/certificates/verify?code=PREVIEW'}}/></main></I18nProvider></BrowserRouter>);`,
);
const server = await createServer({
  configFile: false,
  root,
  publicDir: join(root, 'apps/admin/public'),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 0 },
  resolve: { alias: { '@manaratak/shared': join(root, 'packages/shared/src/index.ts') } },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1200 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let phase = 'empty',
    pages = 0;
  const grants = [];
  const row = {
    certificateId: '11111111-1111-4111-8111-111111111111',
    publicId: 'public',
    serialNumber: 'MNR-PREVIEW',
    verificationCode: 'PREVIEW',
    verificationUrl: 'https://example.org/certificates/verify?code=PREVIEW',
    status: 'ACTIVE',
    achievementDisplayName: 'دورة المنح الدراسية',
    issuedAt: '2026-10-10T00:00:00Z',
    certificatePdfAssetId: 'pdf',
    previewImageAssetId: 'preview',
  };
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/certificates')) {
      pages++;
      await route.fulfill({
        json: {
          data:
            phase === 'empty'
              ? []
              : [
                  url.searchParams.has('cursor')
                    ? {
                        ...row,
                        certificateId: '22222222-2222-4222-8222-222222222222',
                        serialNumber: 'MNR-PREVIEW-2',
                      }
                    : row,
                ],
          nextCursor:
            phase === 'issued' && !url.searchParams.has('cursor')
              ? '22222222-2222-4222-8222-222222222222'
              : null,
        },
      });
      return;
    }
    if (url.pathname.includes('/delivery-grant')) {
      grants.push(url.pathname);
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      await route.fulfill({
        json: {
          url:
            origin + (url.pathname.includes('/preview/') ? '/fixture-preview.svg' : '/fixture.pdf'),
          headers: {},
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
      });
      return;
    }
    if (url.pathname.includes('csrf')) {
      await route.fulfill({ json: { csrfToken: 'browser-fixture' } });
      return;
    }
    await route.fulfill({ json: {} });
  });
  const exported = resolve(process.argv[3] || join(root, 'docs/templates/certificates'));
  await page.route('**/fixture-preview.svg', (route) =>
    route.fulfill({
      path: join(exported, 'manaratak-approved-editable.svg'),
      contentType: 'image/svg+xml',
    }),
  );
  await page.route('**/fixture.pdf', (route) =>
    route.fulfill({
      path: join(exported, 'manaratak-approved-preview.pdf'),
      contentType: 'application/pdf',
    }),
  );
  await page.goto(`${origin}/${html.slice(root.length + 1)}`);
  await expect(page.getByText('تظهر شهادة منارتك للدورات المؤهلة', { exact: false })).toBeVisible();
  await expect(page.getByAltText('معاينة قالب منارتك المعتمد')).toBeVisible();
  await page.waitForFunction(() => {
    const img = document.querySelector('img[alt="معاينة قالب منارتك المعتمد"]');
    return img?.complete && img.naturalWidth > 0;
  });
  phase = 'issued';
  await expect(page.getByRole('heading', { name: 'دورة المنح الدراسية' })).toBeVisible({
    timeout: 12000,
  });
  await page.getByRole('button', { name: 'عرض الشهادة', exact: true }).click();
  await expect(page.getByAltText('معاينة الشهادة')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'تحميل الشهادة PDF', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(join(output, 'downloaded-certificate.pdf'));
  expect(
    (await readFile(join(output, 'downloaded-certificate.pdf'))).subarray(0, 5).toString(),
  ).toBe('%PDF-');
  await page.getByRole('button', { name: 'عرض المزيد', exact: true }).click();
  await expect(page.getByText('MNR-PREVIEW-2', { exact: true })).toBeVisible();
  expect(grants).toHaveLength(2);
  expect(errors).toEqual([]);
  await page.screenshot({ path: join(output, 'student-certificates.png'), fullPage: true });
  await page
    .getByAltText('معاينة قالب منارتك المعتمد')
    .screenshot({ path: join(output, 'admin-template.png') });
  await writeFile(
    join(output, 'verification.json'),
    JSON.stringify(
      {
        status: 'PASS',
        fixtureApi: true,
        liveDatabase: false,
        listRequests: pages,
        grants,
        consoleErrors: errors,
        pdfDownloaded: true,
        previewDisplayed: true,
        asynchronousArrival: true,
        pagination: true,
      },
      null,
      2,
    ),
  );
  console.log(`Certificate browser contracts PASS: ${output}`);
} finally {
  await browser?.close();
  await server.close();
  await rm(temporary, { recursive: true, force: true });
}
