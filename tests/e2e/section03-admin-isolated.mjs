// Real Chromium + real Admin UI with intercepted HTTP. No real API, DB or provider claims.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.EAP_CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ bypassCSP: true }); // Dev React refresh inline preamble; deployed CSP remains unverified.
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const calls = [];
let inUse = true;
let failNextList = false;
const asset = { id: 'isolated-a', reference: 'isolated-ref', ownerId: 'isolated-owner', ownerType: 'STUDENT',
 lifecycleState: 'QUARANTINED', securityClassification: 'INTERNAL', retentionCategory: 'PERMANENT',
 metadata: { originalFilename: 'isolated.pdf', mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 64 },
 governance: { createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z', archivedAt: null, deletedAt: null, purgedAt: null, legalHoldUntil: '2027-01-01T00:00:00.000Z' },
 versions: [{versionNumber:1,createdAt:'2026-10-01T00:00:00.000Z',checksum:{algorithm:'sha256',hash:'a'.repeat(64)}}],
 createdAt: '2026-10-09T00:00:00.000Z', securityEvidence: { uploadConfirmed: true, malwareStatus: null, sanitized: false } };
await page.route('**/*', async route => {
 const request = route.request(), url = new URL(request.url());
 if (url.hostname !== '127.0.0.1') return route.abort();
 if (!url.pathname.startsWith('/api/')) return route.continue();
 const path = url.pathname.replace('/api/v1', '');
 calls.push({ path, method: request.method(), query: url.search });
 const reply = (data, status=200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
 if (path === '/auth/me') return reply({ data: { effectivePermissions: ['admin:assets:manage'] } });
 if (path === '/auth/csrf-token') return reply({ csrfToken: 'isolated-not-a-real-session' });
 if (path === '/admin/assets' && failNextList) { failNextList=false; return reply({error:'ISOLATED_LIST_FAILURE'},500); }
 if (path === '/admin/assets') return reply({items:[asset], hasMore:true, nextCursor:'isolated-cursor'});
 if (path === '/admin/assets/isolated-a' && request.method() === 'GET') return reply(asset);
 if (path.endsWith('/usages')) return reply({assetId: asset.id,inUse,usages: inUse ? [{consumer:'COURSE',field:'thumbnailAssetId'}] : []});
 if (request.method() === 'POST' && ['/validate','/sanitize','/activate','/archive'].some(suffix=>path.endsWith(suffix))) {
  assert.equal(request.postData(), '{}');
  assert.ok(request.headers()['idempotency-key']);
  if(path.endsWith('/validate')) {asset.lifecycleState='VALIDATING';asset.securityEvidence.malwareStatus='PASSED';}
  if(path.endsWith('/sanitize')) {asset.lifecycleState='SANITIZING';asset.securityEvidence.sanitized=true;}
  if(path.endsWith('/activate')) asset.lifecycleState='ACTIVE';
  if(path.endsWith('/archive')) asset.lifecycleState='ARCHIVED';
  return reply({id:asset.id,state:asset.lifecycleState});
 }
 return reply({error:'UNEXPECTED_ISOLATED_REQUEST'},500);
});
try {
 await page.goto('http://127.0.0.1:3013/admin/assets');
 await page.getByRole('button',{name:'عرض التفاصيل',exact:true}).click();
 await page.getByRole('region',{name:'سجل نسخ الأصل'}).getByText(/نسخة 1/).waitFor();
 await page.getByText('الحجز القانوني حتى',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'نسخ معرف الأصل',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'تفعيل الملف المتحقق منه',exact:true}).count(),0);
 await page.getByRole('button',{name:'فحص الملف',exact:true}).click();
 await page.getByRole('button',{name:'تنظيف الملف',exact:true}).click();
 await page.getByRole('button',{name:'تفعيل الملف المتحقق منه',exact:true}).click();
 await page.getByRole('button',{name:'أرشفة الملف',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'الأصل مرتبط بمحتوى'}).waitFor();
 assert.equal(calls.filter(c=>c.path.endsWith('/archive')).length,0);
 inUse=false;
 await page.getByRole('button',{name:'أرشفة الملف',exact:true}).click();
 await page.getByRole('button',{name:'تأكيد الإجراء',exact:true}).click();
 await page.getByRole('button',{name:'أرشفة الملف',exact:true}).waitFor({state:'visible'});
 assert.equal(calls.filter(c=>c.path.endsWith('/archive')).length,1);
 // Pending filter changes must block reuse of the old cursor.
 await page.getByPlaceholder('بحث بالمعرف / الاسم / المالك / الملف').fill('different-query');
 assert.equal(await page.getByRole('button',{name:'تحميل المزيد من الأصول'}).isDisabled(),true);
 await page.getByRole('combobox', {name:'سياسة الاحتفاظ',exact:true}).selectOption('TEMPORARY');
 await page.getByRole('combobox', {name:'وجود بصمة المحتوى',exact:true}).selectOption('MISSING');
 await page.getByRole('combobox', {name:'عائلة الملف',exact:true}).selectOption('PDF');
 await page.getByRole('combobox', {name:'نتيجة فحص الملف',exact:true}).selectOption('PASSED');
 await page.getByRole('combobox', {name:'طابور المعالجة',exact:true}).selectOption('PROCESSING');
 await page.getByRole('button',{name:'تصفية وتطبيق البحث'}).click();
 await page.getByRole('button',{name:'تحميل المزيد من الأصول'}).waitFor({state:'visible'});
 const nextPage = page.waitForResponse(response => new URL(response.url()).searchParams.has('cursor'));
 await page.getByRole('button',{name:'تحميل المزيد من الأصول'}).click();
 await nextPage;
 await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===1);
 assert.ok(calls.some(c=>c.query.includes('q=different-query')&&c.query.includes('cursor=isolated-cursor')));
 const pagedQuery = new URLSearchParams(calls.find(c=>c.query.includes('cursor=isolated-cursor')).query);
 assert.equal(pagedQuery.get('retentionCategory'),'TEMPORARY');
 assert.equal(pagedQuery.get('checksumPresence'),'MISSING');
 assert.equal(pagedQuery.get('fileFamily'),'PDF');
 assert.equal(pagedQuery.get('malwareStatus'),'PASSED');
 assert.equal(pagedQuery.get('processingQueue'),'PROCESSING');
 assert.equal(await page.locator('tbody tr').count(),1);
 const resetResponse = page.waitForResponse(response => {const url=new URL(response.url()); return url.pathname.endsWith('/admin/assets') && !url.searchParams.has('retentionCategory') && !url.searchParams.has('checksumPresence') && !url.searchParams.has('fileFamily') && !url.searchParams.has('malwareStatus') && !url.searchParams.has('processingQueue') && !url.searchParams.has('cursor') && !url.searchParams.has('q');});
 await page.getByRole('button',{name:'إعادة ضبط',exact:true}).click();
 await resetResponse;
 assert.equal(await page.getByRole('combobox', {name:'سياسة الاحتفاظ',exact:true}).inputValue(),'');
 assert.equal(await page.getByRole('combobox', {name:'وجود بصمة المحتوى',exact:true}).inputValue(),'');
 failNextList=true;
 await page.getByRole('button',{name:'تحديث البيانات',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'ISOLATED_LIST_FAILURE'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'تحميل المزيد من الأصول'}).count(),0);
 assert.equal(await page.locator('tbody').getByText('isolated.pdf',{exact:true}).count(),0);
 await page.getByRole('button',{name:'تحديث البيانات',exact:true}).click();
 await page.locator('tbody').getByText('isolated.pdf',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/purge|حذف نهائي/i}).count(),0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS', scope:'CHROMIUM_UI_WITH_INTERCEPTED_API_ONLY',checks:['security-dependent actions','scan/sanitize/activate request contracts','in-use archive denied','usage confirmation before archive','draft filters block pagination','applied query retained with cursor','duplicate rows eliminated','persisted governance and version detail','workspace facets retained with cursor','reset removes facets and cursor','failed reset cannot reuse stale rows/cursor','retry reloads list','no page exceptions'],calls},null,2));
} catch(error) { console.error(JSON.stringify({ errors, calls, text: (await page.locator('body').innerText()).slice(0,2500) }, null, 2)); throw error; } finally { await browser.close(); }
