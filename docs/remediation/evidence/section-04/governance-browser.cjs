const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({bypassCSP:true});const errors=[];const commands=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'Reviewed policy change':undefined));
 let definition={id:'flag',key:'feature.safe',valueType:'Boolean',defaultValue:false,isFeatureFlag:true,isSecret:false,isDeprecated:false,revision:'2026-10-09T00:00:00.000Z'};
 let assignment={id:'assignment',key:'feature.safe',level:'DOMAIN',scopeId:'courses',currentVersionId:'v1',currentValue:true,isOverrideCleared:false,versions:[{id:'v1',value:true,valueType:'Boolean',operation:'SET',authorId:'admin',createdAt:'2026-10-09T00:00:00Z'}]};
 await page.route('**/api/v1/**',async route=>{const req=route.request();const url=new URL(req.url());let data={};
  if(url.pathname.endsWith('/auth/me'))data={data:{effectivePermissions:['admin:settings:manage']}};
  else if(url.pathname.endsWith('/auth/csrf-token'))data={data:{csrfToken:'isolated-test-csrf'}};
  else if(url.pathname.endsWith('/assignments/clear')){
   const body=req.postDataJSON();commands.push({path:url.pathname,body,headers:req.headers()});
   assignment={...assignment,currentVersionId:body.newVersionId,currentValue:null,isOverrideCleared:true,versions:[...assignment.versions,{id:body.newVersionId,value:true,valueType:'Boolean',operation:'CLEAR_OVERRIDE',changeReason:body.changeReason,createdAt:'2026-10-09T00:00:01Z'}]};data={data:{assignmentId:assignment.id}};
  }else if(url.pathname.endsWith('/definitions/update')){
   const body=req.postDataJSON();commands.push({path:url.pathname,body,headers:req.headers()});definition={...definition,isDeprecated:true,revision:'2026-10-09T00:00:01.000Z'};data={data:{message:'Updated'}};
  }else if(url.pathname.endsWith('/impact'))data={data:{assignmentCount:1}};
  else if(url.pathname.endsWith('/definitions'))data={data:{definitions:[definition]}};
  else if(url.pathname.endsWith('/assignments'))data={data:{assignments:[assignment]}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:3094/admin/settings');
 await page.getByRole('button',{name:/القيم وسجل النسخ|Values & History/,exact:true}).click();
 await page.getByRole('button',{name:/إلغاء القيمة والوراثة|Clear override \/ inherit/,exact:true}).click();
 await page.getByText(/وراثة — دون قيمة محلية|Inheriting — no local value/).waitFor();
 assert.equal(assignment.versions.length,2);assert.equal(assignment.versions[0].id,'v1');
 await page.getByRole('button',{name:/التعريفات|Definitions/,exact:true}).click();
 await page.getByRole('button',{name:/إيقاف التعريف|Deprecate definition/,exact:true}).click();
 await page.getByText(/^(متوقف|Deprecated)$/).waitFor();
 assert.equal(commands.length,2);assert.equal(commands[0].body.expectedCurrentVersionId,'v1');assert(commands[0].body.newVersionId);
 assert.equal(commands[1].body.expectedRevision,'2026-10-09T00:00:00.000Z');assert.equal(commands[1].body.isDeprecated,true);
 for(const c of commands){assert.equal(c.body.changeReason,'Reviewed policy change');assert(!c.body.authorId);assert(c.headers['idempotency-key']);}
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({status:'PASS',scope:'CHROMIUM_UI_WITH_INTERCEPTED_API_ONLY',testContext:'CSP bypass; HMR disabled; no actual API/DB/provider',checks:['clear creates a new version with prior revision and reason','history preserved and inheritance displayed','definition impact precedes confirmed deprecation','definition revision/reason retained','both commands use idempotency and server actor','no page exceptions'],commands:commands.map(({path,body})=>({path,body}))},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
