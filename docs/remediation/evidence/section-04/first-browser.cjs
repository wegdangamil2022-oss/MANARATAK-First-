const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({bypassCSP:true});const errors=[];const calls=[];page.on('pageerror',e=>errors.push(e.message));
 const definitions=[{id:'flag',key:'feature.safe',valueType:'Boolean',defaultValue:false,isFeatureFlag:true,isDeprecated:false,isSecret:false},
 {id:'secret',key:'provider.secret',valueType:'String',isFeatureFlag:false,isDeprecated:false,isSecret:true}];
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname+url.search);let data={};
  if(url.pathname.endsWith('/auth/me'))data={data:{effectivePermissions:['admin:settings:manage']}};
  else if(url.pathname.endsWith('/definitions'))data={data:{definitions}};
  else if(url.pathname.endsWith('/assignments'))data={data:{assignments:[]}};
  else if(url.pathname.includes('/settings/inspect/feature.safe'))data={data:{key:'feature.safe',status:'RESOLVED',value:false,valueType:'Boolean',sourceScope:'DEFAULT',usedDefault:true,chain:[{scope:'GLOBAL',status:'NO_OVERRIDE'},{scope:'DEFAULT',status:'VALUE',value:false,winner:true}]}};
  else if(url.pathname.includes('/settings/inspect/provider.secret'))data={data:{key:'provider.secret',status:'SECRET_UNAVAILABLE',usedDefault:false,chain:[]}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:3094/admin/settings');
 const select=page.getByLabel(/مفتاح الإعداد للتحقق|Setting to inspect/);await select.waitFor();
 await select.selectOption('feature.safe');
 await page.getByRole('button',{name:/عرض القيمة الفعالة|Inspect effective value/}).click();
 await page.getByText('RESOLVED',{exact:true}).waitFor();
 assert(await page.getByText('false',{exact:true}).count()>0);
 await page.getByLabel(/نطاق المجال للتحقق|Domain context/).fill('courses');
 assert.equal(await page.getByText('RESOLVED',{exact:true}).count(),0);
 await select.selectOption('provider.secret');
 await page.getByRole('button',{name:/عرض القيمة الفعالة|Inspect effective value/}).click();
 await page.getByText('SECRET_UNAVAILABLE',{exact:true}).waitFor();
 const flag=page.getByRole('checkbox',{name:'Feature Flag',exact:true});await flag.check();
 const defaultSelect=page.getByLabel(/القيمة الافتراضية للميزة|Flag default/);
 assert.equal(await defaultSelect.inputValue(),'false');
 assert.equal(await defaultSelect.locator('option[value=""]').count(),0);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({status:'PASS',scope:'CHROMIUM_UI_WITH_INTERCEPTED_API_ONLY',testContext:'CSP bypass; dev HMR disabled; no actual API/database/provider calls',checks:['explicit false default and no empty feature default','effective source/value display','changed context invalidates result','secret unavailable without value/mask','no page exceptions'],calls},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
