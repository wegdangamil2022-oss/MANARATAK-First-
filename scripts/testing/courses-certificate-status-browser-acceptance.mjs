import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('package.json')),{chromium}=require('playwright');
const previous=JSON.parse(fs.readFileSync('docs/ui/evidence/courses-native-closure-20261026/browser-verification.json','utf8'));assert.equal(previous.scope,'ISOLATED_LOCAL_POSTGRES16_ONLY');assert.equal(previous.passed,true);
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const result={scope:previous.scope,originalDatabaseWrites:0,checks:[],screens:[],errors:[]},output='docs/ui/evidence/courses-governance-20261026';
page.on('pageerror',error=>result.errors.push(error.message));
try{await page.goto('http://127.0.0.2:3157/__isolated/student-sign-in');await page.goto(`http://127.0.0.2:3157/ar/student/courses/${previous.courseId}`);await page.getByRole('heading',{name:'اكتملت الدورة',exact:true}).waitFor({timeout:60000});
 await page.getByText('لم يسجل النظام استحقاق شهادة لهذه الدورة.',{exact:true}).waitFor();
 const response=await page.evaluate(async id=>{const res=await fetch(`/api/v1/student/courses/${id}/certificate-status`);return{status:res.status,data:await res.json()};},previous.courseId);assert.equal(response.status,200);assert.deepEqual(response.data,{status:'NOT_ELIGIBLE',certificateId:null,pdfAvailable:false});
 result.checks.push('Actual completed student sees the canonical NOT_ELIGIBLE response, without a fabricated issuance/pending statement');
 for(const width of [1440,360]){await page.setViewportSize({width,height:1000});await page.getByRole('heading',{name:'اكتملت الدورة',exact:true}).scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);const name=`certificate-status-${width}`;await page.screenshot({path:path.join(output,name+'.png')});result.screens.push(name);}
 assert.deepEqual(result.errors,[]);result.passed=true;console.log('COURSE_CERTIFICATE_STATUS_BROWSER_PASSED');
}finally{fs.writeFileSync(path.join(output,'certificate-status-verification.json'),JSON.stringify(result,null,2));await browser.close();}
