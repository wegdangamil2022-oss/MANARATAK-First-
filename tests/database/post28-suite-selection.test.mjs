import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseSuite} from '../../config/testing/post28-database-suites.mjs';
import {selectedDiscovery,verifySuiteResults} from '../../scripts/database/post28-suite-policy.mjs';
const root='/project',file=root+'/tests/database/post28-http-finance.database.spec.mjs';
const count=databaseSuite('http-finance').minimumCases;
const rows=Array.from({length:count},(_,i)=>({file,name:'suite > case '+i}));
const report=()=>({success:true,numFailedTestSuites:0,numPendingTestSuites:0,numTotalTests:count,numPassedTests:1,numPendingTests:count-1,numFailedTests:0,numTodoTests:0,testResults:[{name:file,status:'passed',assertionResults:rows.map((_,i)=>({title:'case '+i,ancestorTitles:['suite'],fullName:'suite case '+i,status:i===0?'passed':'skipped'}))}]});
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
