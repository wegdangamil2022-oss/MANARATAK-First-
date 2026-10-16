import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPlaywrightRun} from '../../scripts/release/lib/PlaywrightCasePolicy.mjs';
const file='/fixture/boundary.spec.mjs';
const report={config:{rootDir:'/fixture'},errors:[],stats:{expected:1,unexpected:0,skipped:0,flaky:0},suites:[{specs:[{id:'case-1',file:'boundary.spec.mjs',tests:[{projectName:'chromium',expectedStatus:'passed',status:'expected',results:[{status:'passed',retry:0}]}]}]}]};
test('Playwright exact case comparison accepts a fully executed report',()=>assert.equal(verifyPlaywrightRun(report,report,[file]).passed,1));
for(const [name,mutate] of [
  ['zero cases',r=>{r.suites=[];}],['missing file',r=>{r.suites[0].specs[0].file='other.spec.mjs';}],
  ['changed identity',r=>{r.suites[0].specs[0].id='changed';}],['skip',r=>{r.stats.skipped=1;}],
  ['unexpected',r=>{r.stats.unexpected=1;}],['flaky',r=>{r.stats.flaky=1;}],
  ['empty result',r=>{r.suites[0].specs[0].tests[0].results=[];}],['expected failure',r=>{r.suites[0].specs[0].tests[0].expectedStatus='failed';}],
  ['duplicate identity',r=>{r.suites[0].specs.push(r.suites[0].specs[0]);}],['retried',r=>{r.suites[0].specs[0].tests[0].results[0].retry=1;}],
])test(`Playwright report refuses ${name}`,()=>{const changed=structuredClone(report);mutate(changed);assert.throws(()=>verifyPlaywrightRun(report,changed,[file]));});
test('actual Playwright JSON list/run roundtrip without a browser, service or DB',async()=>{
  const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),cp=await import('node:child_process');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-playwright-'));
  try {
    const api=new URL('../../node_modules/@playwright/test/index.mjs',import.meta.url).href;
    const target=path.join(root,'boundary.spec.mjs'),config=path.join(root,'config.mjs');
    fs.writeFileSync(target,`import {test,expect} from ${JSON.stringify(api)};test('inert, no browser or database',()=>expect(1).toBe(1));`);
    fs.writeFileSync(config,`export default {testDir:${JSON.stringify(root)},testMatch:'**/*.spec.mjs',workers:1,projects:[{name:'chromium'}]};`);
    const args=['node_modules/playwright/cli.js','test','--config',config,'--reporter=json'];
    const invoke=extra=>cp.spawnSync(process.execPath,[...args,...extra],{encoding:'utf8',env:{...process.env,PLAYWRIGHT_JSON_OUTPUT_FILE:''},maxBuffer:8*1024*1024});
    const list=invoke(['--list']),run=invoke([]);assert.equal(list.status,0,list.stderr);assert.equal(run.status,0,run.stderr);
    assert.equal(verifyPlaywrightRun(JSON.parse(list.stdout),JSON.parse(run.stdout),[target]).passed,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
