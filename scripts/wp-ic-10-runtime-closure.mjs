#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import {
  WPIC10_EXPECTED_ROWS,
  WPIC10_HEADERS,
  buildFinalReport,
  normalizeBaseUrl,
  readJsonIfExists,
  renderFinalMarkdown,
  securityAudit,
  validateMemoryResult,
} from './wp-ic-10-runtime-lib.mjs';

const { command, args } = parse(process.argv.slice(2));
const repoRoot = path.resolve(String(args['repo-root'] ?? process.cwd()));
const outputDir = path.resolve(String(args['output-dir'] ?? 'wp-ic-10-results'));
fs.mkdirSync(outputDir, { recursive: true });
const gitSha = currentGitSha(repoRoot);

if (command === 'security') {
  const audit = securityAudit(repoRoot);
  const result = { version: 1, kind: 'security', gitSha, generatedAt: new Date().toISOString(), ...audit };
  write('SECURITY_AUDIT.json', result);
  console.log(JSON.stringify(result, null, 2));
  process.exit(audit.pass ? 0 : 2);
}

if (command === 'memory') {
  const rowsExpected = positiveInt(args.rows, WPIC10_EXPECTED_ROWS);
  const maxRssMb = positiveNumber(args['max-rss-mb'], 1024);
  const maxDeltaMb = positiveNumber(args['max-delta-mb'], 512);
  const before = process.memoryUsage();
  const workbookPath = args.workbook ? path.resolve(String(args.workbook)) : null;
  let bytes;
  let source;
  if (workbookPath) {
    if (!fs.existsSync(workbookPath)) fatal(`Workbook not found: ${workbookPath}`);
    bytes = fs.readFileSync(workbookPath);
    source = `workbook:${path.basename(workbookPath)}`;
  } else {
    const { writeXlsxMatrix } = await import('./lib/spreadsheet-workbook-adapter.mjs');
    const matrix = [WPIC10_HEADERS, ...Array.from({ length: rowsExpected }, (_, index) => [
      index + 1,
      'WP-IC-10 Synthetic Provider',
      `Synthetic Course ${index + 1}`,
      `https://example.org/courses/${index + 1}`,
      'Yes',
      index % 2 === 0 ? 'Yes' : 'No',
      index % 2 === 0 ? 'Certificate' : 'None',
      'English',
      'Not officially specified',
      '1 hour',
      'Runtime; Memory; Import; Verification',
    ])];
    bytes = await writeXlsxMatrix('Courses', matrix);
    source = 'synthetic-3663-shape';
  }

  const parserSource = path.join(repoRoot, 'packages/application/src/courses/parsers/CourseMasterArtifactParser.ts');
  const parserModule = path.join(outputDir, 'wpic10-memory-parser.cjs');
  if (!fs.existsSync(parserSource)) fatal('CourseMasterArtifactParser source not found.');
  // Bundle the production parser as Node-loadable ESM; this avoids relying on
  // workspace export maps while still rehearsing the exact parser implementation.
  const esbuildExecutable = path.join(repoRoot, 'node_modules/esbuild/bin/esbuild');
  const esbuildArgs = [parserSource, '--bundle', '--platform=node', '--format=cjs', `--outfile=${parserModule}`];
  // The npm package exposes a JavaScript shim on Windows and a native ELF
  // executable on Linux/macOS, so only the Windows shim is launched via Node.
  execFileSync(process.platform === 'win32' ? process.execPath : esbuildExecutable,
    process.platform === 'win32' ? [esbuildExecutable, ...esbuildArgs] : esbuildArgs,
    { stdio: 'inherit' });
  const { CourseMasterArtifactParser } = createRequire(import.meta.url)(parserModule);
  const parsed = await CourseMasterArtifactParser.parse({
    bytes: new Uint8Array(bytes),
    originalFilename: workbookPath ? path.basename(workbookPath) : 'wp-ic-10-synthetic-3663.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    declaredByteSize: bytes.length,
  });
  if (parsed.issues.some((issue) => issue.severity === 'ERROR')) {
    fatal(`Real parser memory rehearsal failed: ${parsed.issues.filter((issue) => issue.severity === 'ERROR').map((issue) => issue.code).join(',')}`);
  }
  const headersObserved = parsed.headers;
  const rowsObserved = parsed.rows.length;
  const after = process.memoryUsage();
  const toMb = (value) => Math.round((value / 1024 / 1024) * 100) / 100;
  const memory = {
    version: 1,
    kind: 'large-file-memory',
    gitSha,
    generatedAt: new Date().toISOString(),
    source,
    rowsExpected,
    rowsObserved,
    headersExpected: WPIC10_HEADERS,
    headersObserved,
    bytes: bytes.length,
    rssBeforeMb: toMb(before.rss),
    rssAfterMb: toMb(after.rss),
    rssDeltaMb: toMb(Math.max(0, after.rss - before.rss)),
    heapUsedBeforeMb: toMb(before.heapUsed),
    heapUsedAfterMb: toMb(after.heapUsed),
    maxRssMb,
    maxDeltaMb,
  };
  Object.assign(memory, validateMemoryResult(memory));
  write('LARGE_FILE_MEMORY.json', memory);
  console.log(JSON.stringify(memory, null, 2));
  process.exit(memory.pass ? 0 : 2);
}

if (command === 'smoke') {
  const baseUrl = normalizeBaseUrl(args['base-url'] ?? process.env.WPIC10_BASE_URL ?? '');
  const authorization = String(args.authorization ?? process.env.WPIC10_AUTHORIZATION ?? '').trim();
  const checks = [];
  checks.push(await requestCheck('liveness', `${baseUrl}/api/v1/monitoring/health/liveness`, [200], (body) => body?.status === 'UP'));
  checks.push(await requestCheck('readiness', `${baseUrl}/api/v1/monitoring/health/readiness`, [200], (body) => body?.status === 'UP'));
  checks.push(await requestCheck('csrf-read', `${baseUrl}/api/v1/auth/csrf-token`, [200], (body) => body && typeof body === 'object'));
  checks.push(await requestCheck('admin-import-auth-boundary', `${baseUrl}/api/v1/admin/imports/courses/overview`, [401], () => true));
  checks.push(await requestCheck('continuation-mutation-auth-boundary', `${baseUrl}/api/v1/admin/imports/courses/providers/wp-ic-10-smoke/connector/run`, [401, 403, 423], () => true, { method: 'POST', body: '{}' }));
  if (authorization) {
    checks.push(await requestCheck('authenticated-import-overview', `${baseUrl}/api/v1/admin/imports/courses/overview`, [200], (body) => body && typeof body === 'object', { headers: { Authorization: authorization } }));
    checks.push(await requestCheck('authenticated-provider-registry', `${baseUrl}/api/v1/admin/imports/courses/providers`, [200], (body) => Array.isArray(body?.data), { headers: { Authorization: authorization } }));
  }
  const failed = checks.filter((item) => !item.pass);
  const result = {
    version: 1,
    kind: 'runtime-smoke',
    gitSha,
    generatedAt: new Date().toISOString(),
    baseUrl,
    authenticatedChecksEnabled: Boolean(authorization),
    pass: failed.length === 0,
    checks,
    failed: failed.map((item) => item.name),
  };
  write('RUNTIME_SMOKE.json', result);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.pass ? 0 : 2);
}

if (command === 'finalize') {
  const resultsDir = path.resolve(String(args['results-dir'] ?? outputDir));
  const gateResults = {
    ciClosure: readJsonIfExists(path.join(resultsDir, 'CI_CLOSURE.json')),
    security: readJsonIfExists(path.join(resultsDir, 'SECURITY_AUDIT.json')),
    memory: readJsonIfExists(path.join(resultsDir, 'LARGE_FILE_MEMORY.json')),
    database: readJsonIfExists(path.join(resultsDir, 'DATABASE_REHEARSAL.json')),
    backupRestore: readJsonIfExists(path.join(resultsDir, 'BACKUP_RESTORE_REHEARSAL.json')),
    browserE2E: readJsonIfExists(path.join(resultsDir, 'BROWSER_E2E.json')),
    runtimeSmoke: readJsonIfExists(path.join(resultsDir, 'RUNTIME_SMOKE.json')),
  };
  const phase = String(args.phase ?? 'source');
  if (phase !== 'source' && phase !== 'runtime') fatal('FINALIZE_PHASE_MUST_BE_SOURCE_OR_RUNTIME');
  const report = buildFinalReport(gateResults, { phase, runtimeGitSha: gitSha });
  fs.writeFileSync(path.join(resultsDir, 'FINAL_IMPLEMENTATION_STATUS.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(resultsDir, 'FINAL_IMPLEMENTATION_STATUS.md'), renderFinalMarkdown(report));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 2);
}

fatal('Usage: wp-ic-10-runtime-closure.mjs <security|memory|smoke|finalize> [options]');

async function requestCheck(name, url, allowedStatuses, bodyPredicate, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...(options.body ? { body: options.body } : {}),
      redirect: 'error',
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    const pass = allowedStatuses.includes(response.status) && bodyPredicate(body);
    return { name, pass, status: response.status, detail: pass ? 'PASS' : `unexpected status/body`, body: pass ? undefined : body };
  } catch (error) {
    return { name, pass: false, status: null, detail: error instanceof Error ? error.message : String(error) };
  }
}

function write(name, value) {
  fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function parse(values) {
  const command = values[0] ?? '';
  const args = {};
  for (let index = 1; index < values.length; index++) {
    const token = values[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; index += 1; }
  }
  return { command, args };
}
function positiveInt(value, fallback) { const n = Number.parseInt(String(value ?? ''), 10); return Number.isInteger(n) && n > 0 ? n : fallback; }
function positiveNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : fallback; }
function fatal(message) { console.error(message); process.exit(1); }
function currentGitSha(root) { try { return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return 'UNAVAILABLE'; } }
