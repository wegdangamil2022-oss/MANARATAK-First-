const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'] });
 try {
 const page = await browser.newPage({ bypassCSP:true });
 const calls=[]; const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const asset={id:'last-asset',reference:'test-ref',ownerId:'owner-one',ownerType:'STUDENT',lifecycleState:'INITIATED',securityClassification:'INTERNAL',retentionCategory:'PERMANENT',metadata:{originalFilename:'test.pdf',mimeType:'application/pdf',fileExtension:'pdf',byteSize:64},createdAt:'2026-10-09T00:00:00Z'};
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname+url.search);
  let data={};
  if(url.pathname.endsWith('/auth/me')) data={data:{effectivePermissions:['admin:assets:manage']}};
  else if(url.pathname.endsWith('/admin/assets/last-asset')) data=asset;
  else if(url.pathname.endsWith('/admin/assets')) {
   data=url.searchParams.get('usageStatus')==='IN_USE'&&!url.searchParams.has('cursor')
    ? {items:[],hasMore:true,nextCursor:'test-cursor'} : {items:[asset],hasMore:false,nextCursor:null};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:3093/admin/assets');
 await page.getByRole('heading',{name:'مركز الملفات والأصول الرقمية'}).waitFor();
 await page.getByLabel('حالة الاستخدام').selectOption('IN_USE');
 await page.getByRole('button',{name:'تصفية وتطبيق البحث'}).click();
 await page.getByText('لا توجد نتائج في هذه الدفعة؛ حمّل المزيد لمتابعة البحث.').waitFor();
 await page.getByRole('button',{name:'تحميل المزيد من الأصول'}).click();
 await page.getByRole('button',{name:'عرض التفاصيل',exact:true}).click();
 await page.getByRole('button',{name:'عرض أصول هذا المالك'}).click();
 await page.waitForFunction(()=>document.querySelector('input[aria-label="معرف المالك"]')?.value==='owner-one');
 assert(calls.some(c=>c.includes('usageStatus=IN_USE')&&c.includes('cursor=test-cursor')));
 assert(calls.some(c=>c.includes('ownerType=STUDENT')&&c.includes('ownerId=owner-one')&&!c.includes('cursor=')));
 await page.getByRole('button',{name:'إعادة ضبط',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('select[aria-label="حالة الاستخدام"]')?.value==='');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({status:'PASS',scope:'CHROMIUM_UI_WITH_INTERCEPTED_API_ONLY',testContext:'CSP bypass; dev HMR disabled; no actual API/provider/DB calls',checks:['empty usage page continuation','usage filter retained with cursor','exact owner filter resets cursor','reset clears usage filter','no page exceptions'],calls},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
