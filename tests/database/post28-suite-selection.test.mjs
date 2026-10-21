import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {databaseSuite} from '../../config/testing/post28-database-suites.mjs';
import {selectedDiscovery,verifySuiteResults,requireCurrentSuiteSelection} from '../../scripts/database/post28-suite-policy.mjs';
const root='/project',file=root+'/tests/database/post28-http-finance.database.spec.mjs';
const count=databaseSuite('http-finance').minimumCases;
const rows=Array.from({length:count},(_,i)=>({file,name:'suite > case '+i}));
const report=()=>({success:true,numFailedTestSuites:0,numPendingTestSuites:0,numTotalTests:count,numPassedTests:1,numPendingTests:count-1,numFailedTests:0,numTodoTests:0,testResults:[{name:file,status:'passed',assertionResults:rows.map((_,i)=>({title:'case '+i,ancestorTitles:['suite'],fullName:'suite case '+i,status:i===0?'passed':'skipped'}))}]});

test('current admission acceptance cannot execute the pre111 duplicate-creation cases',()=>{
 const suite=databaseSuite('admission-import-concurrency');
 assert.equal(suite.minimumCases,10);
 assert.equal(suite.historicalPre111Cases.length,2);
 assert.throws(()=>requireCurrentSuiteSelection('admission-import-concurrency'),/HISTORICAL_PRE111_CASE/);
 for(const name of suite.historicalPre111Cases)assert.throws(()=>requireCurrentSuiteSelection('admission-import-concurrency',name),/HISTORICAL_PRE111_CASE/);
});
test('compatible exact selections remain scoped and the post111 suite can run fully',()=>{
 assert.doesNotThrow(()=>requireCurrentSuiteSelection('admission-import-concurrency','Post28 real nullable admission import concurrency > serializes two real import connections at the owner before nullable identity lookup'));
 assert.doesNotThrow(()=>requireCurrentSuiteSelection('admission-null-identity'));
 assert.equal(databaseSuite('admission-null-identity').minimumCases,5);
});
test('runner exposes the historical gate diagnostic before any database capability is supplied',()=>{
 const result=spawnSync(process.execPath,['scripts/database/run-post28-suite.mjs','admission-import-concurrency'],{encoding:'utf8',env:{NODE_ENV:'test',SystemRoot:process.env.SystemRoot,PATH:process.env.PATH}});
 assert.equal(result.status,1);
 assert.equal(result.stderr.trim(),'POST28_HISTORICAL_PRE111_CASE_NOT_CURRENT_ACCEPTANCE');
});
test('exact selection still requires the complete mandatory discovery',()=>{
 assert.equal(selectedDiscovery('http-finance',rows,rows[0].name,root).length,1);
 assert.throws(()=>selectedDiscovery('http-finance',rows.slice(0,1),rows[0].name,root));
 for(const value of ['', 'missing','suite'])assert.throws(()=>selectedDiscovery('http-finance',rows,value,root));
});
test('scoped result accepts exactly one passed selected identity and explicit unselected skipped cases',()=>{
 assert.deepEqual(verifySuiteResults('http-finance',rows,report(),root,rows[0].name),{expected:1,executed:1,passed:1,failed:0,skipped:0});
 assert.throws(()=>verifySuiteResults('http-finance',rows,report(),root));
});
test('selection cannot hide failed, executed, missing or forged unselected cases',()=>{
 for(const mutate of [r=>r.testResults[0].assertionResults[1].status='failed',r=>r.testResults[0].assertionResults[1].status='passed',r=>r.testResults[0].assertionResults.pop(),r=>r.testResults[0].assertionResults[1].title='forged',r=>r.numPendingTests=0]){const r=report();mutate(r);assert.throws(()=>verifySuiteResults('http-finance',rows,r,root,rows[0].name));}
});
test('selection cannot pass missing skipped failed or zero selected execution',()=>{
 for(const mutate of [r=>r.testResults[0].assertionResults[0].status='pending',r=>r.testResults[0].assertionResults[0].status='failed',r=>r.numPassedTests=0,r=>r.success=false]){const r=report();mutate(r);assert.throws(()=>verifySuiteResults('http-finance',rows,r,root,rows[0].name));}
});
