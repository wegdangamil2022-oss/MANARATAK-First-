// Focused component security proof; not an application/browser acceptance claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';

const [output,channel]=process.argv.slice(2);
if(!output||process.argv.length>4||(channel&&channel!=='msedge'))throw Error('CMS_PROOF_ARGUMENT_INVALID');
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const bundle=await build({stdin:{contents:`import {createElement} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {CmsRichText} from './packages/ui/src/CmsRichText.tsx';const root=createRoot(document.getElementById('root'));globalThis.renderCms=body=>flushSync(()=>root.render(createElement(CmsRichText,{body})));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
const report={kind:'CMS_RICH_TEXT_BROWSER_SECURITY',sourceSha,workingTreeMayContainChanges:true,browserVersion:browser.version(),cases:[],externalRequests:[],pageErrors:[],fullR09Acceptance:false};
try{
 const context=await browser.newContext();await context.route('**/*',route=>{report.externalRequests.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(error.message));
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 const render=body=>page.evaluate(body=>globalThis.renderCms(body),body);
 await render('<h2>Safe title</h2><p>Hello <strong>world</strong></p><a href="https://example.invalid/safe">Safe link</a>');
 assert.equal(await page.getByRole('heading',{name:'Safe title'}).count(),1);assert.equal(await page.locator('strong').textContent(),'world');
 assert.equal(await page.locator('a').getAttribute('href'),'https://example.invalid/safe');assert.equal(await page.locator('a').getAttribute('rel'),'noopener noreferrer');
 report.cases.push({name:'allowed formatting and credential-free HTTPS link survive',passed:true});
 const payloads=[
  '<p onclick="globalThis.cmsExecuted=true">Keep text</p><img src="https://example.invalid/image" onerror="globalThis.cmsExecuted=true"><script>globalThis.cmsExecuted=true</script><svg onload="globalThis.cmsExecuted=true"></svg><a href="javascript:globalThis.cmsExecuted=true">Unsafe link</a><a href="https://user:password@example.invalid/">Credential link</a><iframe src="https://example.invalid/frame"></iframe>',
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=https://example.invalid/mutation onerror=globalThis.cmsExecuted=true>">',
 ];
 for(const [index,payload]of payloads.entries()){
  await render(payload);
  const observed=await page.evaluate(()=>{const root=document.getElementById('root');return{executed:globalThis.cmsExecuted===true,dangerous:root.querySelectorAll('script,img,svg,math,iframe,object,embed,style,template').length,events:[...root.querySelectorAll('*')].flatMap(element=>[...element.attributes].filter(attribute=>attribute.name.startsWith('on')).map(attribute=>attribute.name)),links:[...root.querySelectorAll('a')].map(link=>link.href)};});
  assert.deepEqual(observed,{executed:false,dangerous:0,events:[],links:[]});report.cases.push({name:'malicious markup '+index,passed:true});
 }
 await render('Plain < text > remains text');assert.equal(await page.locator('#root').textContent(),'Plain < text > remains text');report.cases.push({name:'plain comparison text is preserved',passed:true});
 assert.equal(report.pageErrors.length,0);assert.equal(report.externalRequests.length,0);report.passed=true;
}catch(error){report.passed=false;report.failure=error.message;process.exitCode=1;}
finally{await browser.close();fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
