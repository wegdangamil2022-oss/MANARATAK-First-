import path from 'node:path';
import {databaseSuite} from '../../config/testing/post28-database-suites.mjs';

const fail = code => {throw new Error(code);};
const relative = (root, file) => path.relative(root, path.resolve(file)).replaceAll('\\','/');
export function requireCurrentSuiteSelection(name,caseExact){
 const historical=databaseSuite(name).historicalPre111Cases;
 if(historical?.length&&(caseExact===undefined||historical.includes(caseExact)))fail('POST28_HISTORICAL_PRE111_CASE_NOT_CURRENT_ACCEPTANCE');
}
export function verifyDiscovery(name, rows, root = process.cwd()) {
  const suite = databaseSuite(name);
  if (!Array.isArray(rows) || rows.length < suite.minimumCases) fail('POST28_SUITE_CASES_MISSING');
  const files = [...new Set(rows.map(row => relative(root,row.file)))].sort();
  if (JSON.stringify(files) !== JSON.stringify([...suite.files].sort()) ||
      rows.some(row => typeof row.name !== 'string' || !row.name.trim())) fail('POST28_SUITE_FILES_MISMATCH');
  const ids = rows.map(row => `${relative(root,row.file)}\0${row.name}`);
  if (new Set(ids).size !== ids.length) fail('POST28_DUPLICATE_CASE_IDENTITY');
  return ids.sort();
}
export function selectedDiscovery(name, discovery, caseExact, root = process.cwd()) {
  verifyDiscovery(name,discovery,root);
  if (caseExact === undefined) return discovery;
  if (typeof caseExact !== 'string' || !caseExact.trim()) fail('POST28_CASE_SELECTION_INVALID');
  const selected = discovery.filter(row => row.name === caseExact);
  if (selected.length !== 1) fail('POST28_CASE_SELECTION_NOT_UNIQUE');
  return selected;
}
export function verifySuiteResults(name, discovery, report, root = process.cwd(), caseExact) {
  const selected = selectedDiscovery(name,discovery,caseExact,root);
  const expected = selected.map(row => `${relative(root,row.file)}\0${row.name}`).sort();
  if (caseExact !== undefined) {
    // Vitest reports deliberately unselected cases as skipped (and counts them as pending). Validate every
    // identity and status before removing those exclusions from the scoped view.
    const all = verifyDiscovery(name,discovery,root);
    const seen = [];
    const testResults = (report?.testResults ?? []).map(file => ({...file,
      assertionResults: (file.assertionResults ?? []).filter(row => {
        if (!Array.isArray(row.ancestorTitles) || typeof row.title !== 'string') fail('POST28_DATABASE_CASE_IDENTITY_INVALID');
        const id = `${relative(root,file.name)}\0${[...row.ancestorTitles,row.title].join(' > ')}`;
        seen.push(id);
        if (expected.includes(id)) return true;
        if (!all.includes(id) || row.status !== 'skipped') fail('POST28_SELECTION_EXCLUSION_INVALID');
        return false;
      }),
    })).filter(file => file.assertionResults.length);
    if (JSON.stringify(seen.sort()) !== JSON.stringify(all) || report.numPendingTests !== all.length-expected.length || report.numTotalTests !== all.length) fail('POST28_SELECTION_EXCLUSION_INVALID');
    report = {...report,numTotalTests:expected.length,numPendingTests:0,testResults};
  }
  if (report?.success !== true || (report.numFailedTestSuites ?? 0) !== 0 ||
      (report.numPendingTestSuites ?? 0) !== 0 || report.numFailedTests !== 0 || report.numPendingTests !== 0 ||
      (report.numTodoTests ?? 0) !== 0 || report.numTotalTests !== expected.length ||
      report.numPassedTests !== expected.length || !Array.isArray(report.testResults))
    fail('POST28_DATABASE_SUITE_NOT_FULLY_PASSED');
  const resultFiles = report.testResults.map(file => relative(root,file.name)).sort();
  if (JSON.stringify(resultFiles) !== JSON.stringify([...new Set(selected.map(row => relative(root,row.file)))].sort()))
    fail('POST28_SUITE_FILES_MISMATCH');
  const results = report.testResults.flatMap(file => {
    if (file.status !== 'passed' || !Array.isArray(file.assertionResults)) fail('POST28_DATABASE_SUITE_FILE_FAILED');
    return file.assertionResults.map(row => {
      if (row.status !== 'passed') fail('POST28_DATABASE_SUITE_SKIPPED_OR_FAILED');
      // Vitest list uses ` > ` between suites; JSON fullName uses spaces.
      // Reconstruct from structured titles without replacing characters in names.
      if (!Array.isArray(row.ancestorTitles) || row.ancestorTitles.some(title => typeof title !== 'string') ||
          typeof row.title !== 'string' || !row.title.trim() ||
          row.fullName !== [...row.ancestorTitles,row.title].join(' '))
        fail('POST28_DATABASE_CASE_IDENTITY_INVALID');
      return `${relative(root,file.name)}\0${[...row.ancestorTitles,row.title].join(' > ')}`;
    });
  }).sort();
  if (JSON.stringify(results) !== JSON.stringify(expected)) fail('POST28_DATABASE_CASE_SET_CHANGED');
  return {expected:expected.length,executed:results.length,passed:results.length,failed:0,skipped:0};
}
