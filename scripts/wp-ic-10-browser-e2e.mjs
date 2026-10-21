#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {verifyPlaywrightRun} from './release/lib/PlaywrightCasePolicy.mjs';

// This legacy suite tests HTTP boundaries on a dev server; it cannot certify built-browser E2E.
if(!process.argv[2]||!path.isAbsolute(process.argv[2]))throw new Error('POST28_BROWSER_DIAGNOSTIC_OUTPUT_REQUIRED');
const root=fs.realpathSync(process.cwd()),parent=fs.realpathSync(path.dirname(process.argv[2]));
if(parent===root||parent.startsWith(root+path.sep))throw new Error('POST28_BROWSER_DIAGNOSTIC_OUTSIDE_CHECKOUT_REQUIRED');
const outputDir=path.join(parent,path.basename(process.argv[2]));
const gitSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
fs.mkdirSync(outputDir,{mode:0o700}); // Existing artifacts must never be reused.
const args=['node_modules/playwright/cli.js','test','--config=apps/web/playwright.config.ts','apps/web/e2e/imported-courses-runtime-closure.spec.ts','--reporter=json'];
const collect=JSON.parse(execFileSync(process.execPath,[...args,'--list'],{encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,PLAYWRIGHT_JSON_OUTPUT_FILE:''}}));
const reportFile=path.join(outputDir,'playwright.json');
execFileSync(process.execPath,args,{env:{...process.env,PLAYWRIGHT_JSON_OUTPUT_FILE:reportFile},stdio:'inherit'});
const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
const counts=verifyPlaywrightRun(collect,report,[path.resolve('apps/web/e2e/imported-courses-runtime-closure.spec.ts')]);
if(counts.expected!==3)throw new Error('POST28_HTTP_BOUNDARY_CASE_COUNT_CHANGED');
if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==gitSha)throw new Error('POST28_SOURCE_CHANGED_DURING_RUN');
fs.writeFileSync(path.join(outputDir,'BROWSER_E2E.json'),JSON.stringify({version:2,kind:'IMPORTED_COURSE_HTTP_BOUNDARY_DIAGNOSTIC',gitSha,
  diagnosticSucceeded:true,...counts,pass:false,runtimeAcceptance:false,builtBrowserVerified:false,generatedAt:new Date().toISOString(),
  detail:'Only the declared imported-course HTTP tests executed. Dev server/request fixtures are not built API/Web/Admin browser acceptance.'},null,2)+'\n',{flag:'wx',mode:0o600});
