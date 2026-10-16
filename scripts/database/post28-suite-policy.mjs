import path from 'node:path';
import {databaseSuite} from '../../config/testing/post28-database-suites.mjs';

const fail = code => {throw new Error(code);};
const relative = (root, file) => path.relative(root, path.resolve(file)).replaceAll('\\','/');
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
export function verifySuiteResults(name, discovery, report, root = process.cwd()) {
  const expected = verifyDiscovery(name,discovery,root);
  if (report?.success !== true || (report.numFailedTestSuites ?? 0) !== 0 ||
      (report.numPendingTestSuites ?? 0) !== 0 || report.numFailedTests !== 0 || report.numPendingTests !== 0 ||
      (report.numTodoTests ?? 0) !== 0 || report.numTotalTests !== expected.length ||
      report.numPassedTests !== expected.length || !Array.isArray(report.testResults))
    fail('POST28_DATABASE_SUITE_NOT_FULLY_PASSED');
  const results = report.testResults.flatMap(file => {
    if (file.status !== 'passed' || !Array.isArray(file.assertionResults)) fail('POST28_DATABASE_SUITE_FILE_FAILED');
    return file.assertionResults.map(row => {
      if (row.status !== 'passed') fail('POST28_DATABASE_SUITE_SKIPPED_OR_FAILED');
      return `${relative(root,file.name)}\0${row.fullName}`;
    });
  }).sort();
  if (JSON.stringify(results) !== JSON.stringify(expected)) fail('POST28_DATABASE_CASE_SET_CHANGED');
  return {expected:expected.length,executed:results.length,passed:results.length,failed:0,skipped:0};
}
