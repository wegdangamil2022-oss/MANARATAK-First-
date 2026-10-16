import path from 'node:path';
const fail=code=>{throw new Error(code);};
export function playwrightCaseRows(report,expectedFiles) {
  if(!Array.isArray(report?.suites)||!path.isAbsolute(report?.config?.rootDir??''))fail('POST28_PLAYWRIGHT_REPORT_INVALID');
  const rows=[];
  function visit(suite) {
    for(const spec of suite.specs??[]) {
      const file=path.resolve(report.config.rootDir,spec.file);
      if(!expectedFiles.includes(file)||typeof spec.id!=='string'||!spec.id||!Array.isArray(spec.tests)||!spec.tests.length)
        fail('POST28_PLAYWRIGHT_FILE_OR_CASE_INVALID');
      for(const test of spec.tests) {
        if(typeof test.projectName!=='string'||!test.projectName)fail('POST28_PLAYWRIGHT_PROJECT_REQUIRED');
        rows.push({id:JSON.stringify([file,spec.id,test.projectName]),test});
      }
    }
    for(const child of suite.suites??[])visit(child);
  }
  report.suites.forEach(visit);
  if(!rows.length||new Set(rows.map(row=>row.id)).size!==rows.length)fail('POST28_PLAYWRIGHT_EMPTY_OR_DUPLICATE_CASES');
  const actual=[...new Set(rows.map(row=>JSON.parse(row.id)[0]))].sort();
  if(JSON.stringify(actual)!==JSON.stringify([...expectedFiles].sort()))fail('POST28_PLAYWRIGHT_FILES_MISSING');
  return rows;
}
export function verifyPlaywrightRun(discovery,report,expectedFiles) {
  const expected=playwrightCaseRows(discovery,expectedFiles),actual=playwrightCaseRows(report,expectedFiles);
  if(JSON.stringify(expected.map(row=>row.id).sort())!==JSON.stringify(actual.map(row=>row.id).sort()))fail('POST28_PLAYWRIGHT_CASE_SET_CHANGED');
  if(report.errors?.length||report.stats?.unexpected!==0||report.stats?.skipped!==0||report.stats?.flaky!==0||report.stats.expected!==expected.length)
    fail('POST28_PLAYWRIGHT_NOT_FULLY_PASSED');
  for(const {test} of actual)
    if(test.expectedStatus!=='passed'||test.status!=='expected'||test.results?.length!==1||test.results[0].status!=='passed'||test.results[0].retry!==0)
      fail('POST28_PLAYWRIGHT_FAILED_SKIPPED_OR_RETRIED');
  return {expected:expected.length,executed:actual.length,passed:actual.length,failed:0,skipped:0,retried:0};
}
