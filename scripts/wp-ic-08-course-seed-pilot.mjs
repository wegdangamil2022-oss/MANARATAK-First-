#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { readXlsxTextMatrix } from './lib/spreadsheet-workbook-adapter.mjs';
import {
  WPIC08_HISTORICAL_PACKAGE_BASE_SHA,
  WPIC08_EXPECTED_SOURCE_ROWS,
  WPIC08_HEADERS,
  WPIC08_SHEET_NAME,
  WPIC08_WORKBOOK_NAME,
  WPIC08_WORKBOOK_SHA256,
  assertIdempotencyReplay,
  buildPhaseBReconciliation,
  buildRelationshipReadiness,
  buildSourceManifest,
  classifyAnalyses,
  countUrlIssues,
  renderReconciliationMarkdown,
  sha256,
  summarizeProviderResolution,
  summarizeTransferResults,
  text,
} from './wp-ic-08-pilot-lib.mjs';

const args = parseArgs(process.argv.slice(2));
const mode = String(args.mode ?? 'source').toLowerCase();
const workbookPath = path.resolve(String(args.workbook ?? process.env.WPIC08_WORKBOOK ?? WPIC08_WORKBOOK_NAME));
const outputDir = path.resolve(String(args['output-dir'] ?? process.env.WPIC08_OUTPUT_DIR ?? 'wp-ic-08-results'));
const apiBase = stripTrailingSlash(String(args['api-base'] ?? process.env.WPIC08_API_BASE ?? ''));
const assetId = String(args['asset-id'] ?? process.env.WPIC08_ASSET_ID ?? '').trim();
const authorization = String(args.authorization ?? process.env.WPIC08_AUTHORIZATION ?? '').trim();
const cookie = String(args.cookie ?? process.env.WPIC08_COOKIE ?? '').trim();
const approvalsPath = args.approvals ? path.resolve(String(args.approvals)) : process.env.WPIC08_APPROVALS_FILE ? path.resolve(process.env.WPIC08_APPROVALS_FILE) : null;
const sourceSystem = String(args['source-system'] ?? process.env.WPIC08_SOURCE_SYSTEM ?? 'COURSE_MASTER_ARTIFACT').trim();
const verifyIdempotency = Boolean(args['verify-idempotency']);
const dbSentinelEnabled = Boolean(args['database-sentinel']) || process.env.WPIC08_ENABLE_DB_SENTINEL === '1';
const runtimeGitSha = currentGitSha();

if (!['source', 'dry-run', 'transfer'].includes(mode)) {
  fatal(`Unsupported --mode ${mode}. Use source, dry-run, or transfer.`);
}

fs.mkdirSync(outputDir, { recursive: true });

const source = await readOfficialWorkbook(workbookPath);
writeJson(path.join(outputDir, 'SOURCE_MANIFEST.json'), source.manifest);

if (!source.manifest.pass) {
  writeJson(path.join(outputDir, 'WPIC08_RESULT.json'), {
    mode,
    historicalPackageBaseSha: WPIC08_HISTORICAL_PACKAGE_BASE_SHA,
    runtimeGitSha,
    generatedAt: new Date().toISOString(),
    sourceManifest: source.manifest,
    result: 'BLOCKED_SOURCE_MANIFEST',
  });
  fatal(`Official source manifest failed: ${source.manifest.failures.join(', ')}`);
}

if (mode === 'source') {
  const report = {
    version: 1,
    mode: 'source',
    historicalPackageBaseSha: WPIC08_HISTORICAL_PACKAGE_BASE_SHA,
    runtimeGitSha,
    generatedAt: new Date().toISOString(),
    sourceManifest: source.manifest,
    result: 'SOURCE_VERIFIED',
    canonicalCourseMutation: 'NONE',
  };
  persistReport(outputDir, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

requireApiArguments();
const approvals = approvalsPath ? readJson(approvalsPath) : {};
const authHeaders = {
  ...(authorization ? { Authorization: authorization } : {}),
  ...(cookie ? { Cookie: cookie } : {}),
};

const sentinelClient = dbSentinelEnabled ? await createSentinelClient() : null;
const canonicalSentinelBefore = sentinelClient ? await readCanonicalCourseSentinel(sentinelClient) : null;
const canonicalBefore = await api('/admin/courses/imported?page=1&pageSize=1');
const preflight = await api('/admin/imports/courses/preflight', {
  method: 'POST',
  body: {
    assetId,
    expectedSha256: WPIC08_WORKBOOK_SHA256,
    sourceSystem,
  },
});

if (preflight?.artifact?.sha256 !== WPIC08_WORKBOOK_SHA256) {
  fatal(`API preflight workbook hash mismatch: ${preflight?.artifact?.sha256 ?? 'missing'}`);
}
if (preflight?.artifact?.sheetName !== WPIC08_SHEET_NAME) {
  fatal(`API preflight sheet mismatch: ${preflight?.artifact?.sheetName ?? 'missing'}`);
}
if (Number(preflight?.summary?.rowsFound ?? 0) !== WPIC08_EXPECTED_SOURCE_ROWS) {
  fatal(`API preflight source row mismatch: ${preflight?.summary?.rowsFound ?? 'missing'}`);
}

const staged = await api('/admin/imports/courses/batches', {
  method: 'POST',
  body: {
    assetId,
    expectedSha256: WPIC08_WORKBOOK_SHA256,
    sourceSystem,
  },
});
const batchId = String(staged?.existingBatchId ?? staged?.staging?.batch?.id ?? '').trim();
if (!batchId) fatal('Course import batch id missing after stage.');

const records = await fetchAllBatchRecords(batchId);
const analyses = Array.isArray(staged?.analysis?.analyses) ? staged.analysis.analyses : [];
if (analyses.length !== records.length) {
  fatal(`Analysis count ${analyses.length} does not match staged record count ${records.length}.`);
}

const canonicalAfterDryRun = await api('/admin/courses/imported?page=1&pageSize=1');
const canonicalSentinelAfter = sentinelClient ? await readCanonicalCourseSentinel(sentinelClient) : null;
const providerResolution = summarizeProviderResolution(preflight?.providers ?? []);
const analysisSummary = classifyAnalyses(analyses, records, approvals);
const relationships = buildRelationshipReadiness(source.manifest);
const preflightUrlIssues = countUrlIssues(preflight);
const changedUrlRows = Number(analysisSummary.countsByChangeState.URL_CHANGED ?? 0)
  + Number(analysisSummary.countsByChangeState.URL_AND_METADATA_CHANGED ?? 0);
const urlIssues = {
  ...preflightUrlIssues,
  changedUrlRows,
  totalAttentionRows: preflightUrlIssues.total + changedUrlRows,
};
const sentinelBefore = canonicalSentinelBefore ?? (args['sentinel-before'] ? readJson(path.resolve(String(args['sentinel-before']))) : null);
const sentinelAfter = canonicalSentinelAfter ?? (args['sentinel-after'] ? readJson(path.resolve(String(args['sentinel-after']))) : null);
const phaseB = buildPhaseBReconciliation({
  sourceManifest: source.manifest,
  preflight,
  stagedRecords: records,
  analyses,
  providerResolution,
  canonicalBefore,
  canonicalAfter: canonicalAfterDryRun,
  canonicalSentinelBefore: sentinelBefore,
  canonicalSentinelAfter: sentinelAfter,
});

const dryRun = {
  batchId,
  duplicateArtifact: Boolean(staged?.duplicateArtifact),
  preflight,
  stagedRecordCount: records.length,
  providerResolution,
  analysis: analysisSummary,
  analysisRuntimeCounts: staged?.analysis?.counts ?? {},
  urlIssues,
  relationships,
  canonicalBefore: canonicalBefore?.overview ?? null,
  canonicalAfter: canonicalAfterDryRun?.overview ?? null,
};

const dryReport = {
  version: 1,
  mode: 'dry-run',
  historicalPackageBaseSha: WPIC08_HISTORICAL_PACKAGE_BASE_SHA,
  runtimeGitSha,
  generatedAt: new Date().toISOString(),
  sourceManifest: source.manifest,
  dryRun,
  phaseB,
  result: phaseB.pass ? 'PHASE_B_PASS_READY_FOR_CONTROLLED_TRANSFER' : 'BLOCKED_RECONCILIATION',
  canonicalCourseMutation: 'FORBIDDEN_IN_PHASE_A',
};
persistReport(outputDir, dryReport);

if (mode === 'dry-run') {
  if (sentinelClient) await sentinelClient.$disconnect();
  console.log(JSON.stringify(dryReport, null, 2));
  process.exit(phaseB.pass ? 0 : 2);
}

if (!phaseB.pass) fatal(`Phase B reconciliation failed: ${phaseB.failed.join(', ')}`);
assertTransferConfirmation();

const transferRecordIds = analysisSummary.approvedTransferRecordIds;
const transferResponses = [];
for (const chunk of chunks(transferRecordIds, 100)) {
  const chunkApprovals = Object.fromEntries(chunk.filter((id) => approvals[id]).map((id) => [id, approvals[id]]));
  transferResponses.push(await api(`/admin/imports/courses/batches/${encodeURIComponent(batchId)}/transfer`, {
    method: 'POST',
    body: {
      recordIds: chunk,
      limit: 100,
      correlationId: `WP-IC-08:${source.manifest.workbook.sha256.slice(0, 12)}`,
      ...(Object.keys(chunkApprovals).length ? { approvals: chunkApprovals } : {}),
    },
  }));
}
const transferSummary = summarizeTransferResults(transferResponses);

const recordsAfterTransfer = await fetchAllBatchRecords(batchId);
const canonicalAfterTransfer = await api('/admin/courses/imported?page=1&pageSize=1');
const promotedAfter = recordsAfterTransfer.filter((record) => Boolean(record.promotedEntityId)).length;
const beforePublished = Number((canonicalAfterDryRun?.overview ?? {}).published ?? 0);
const afterPublished = Number((canonicalAfterTransfer?.overview ?? {}).published ?? 0);
const autoPublishedDelta = afterPublished - beforePublished;

let idempotency = null;
if (verifyIdempotency && transferRecordIds.length > 0) {
  const replayResponses = [];
  for (const chunk of chunks(transferRecordIds, 100)) {
    const chunkApprovals = Object.fromEntries(chunk.filter((id) => approvals[id]).map((id) => [id, approvals[id]]));
    replayResponses.push(await api(`/admin/imports/courses/batches/${encodeURIComponent(batchId)}/transfer`, {
      method: 'POST',
      body: {
        recordIds: chunk,
        limit: 100,
        correlationId: `WP-IC-08-IDEMPOTENCY:${source.manifest.workbook.sha256.slice(0, 12)}`,
        ...(Object.keys(chunkApprovals).length ? { approvals: chunkApprovals } : {}),
      },
    }));
  }
  idempotency = assertIdempotencyReplay(summarizeTransferResults(replayResponses));
}

const finalReconciliation = {
  sourceRows: source.manifest.observed.sourceRows,
  stagedRows: recordsAfterTransfer.length,
  invalidOrRejected: analysisSummary.rejectedCount,
  reviewRows: analysisSummary.reviewRequiredCount,
  readyRows: analysisSummary.readyToTransferCount,
  explicitlyApprovedReviewRows: analysisSummary.explicitlyApprovedReviewCount,
  sameFileDuplicatesAccountedNoTransfer: analysisSummary.sameFileDuplicateCount,
  selectedForControlledTransfer: transferRecordIds.length,
  transferredImportRecordsTotal: promotedAfter,
  transferredThisRun: transferSummary.transferred,
  canonicalCreated: transferSummary.canonicalCreated,
  canonicalUpdated: transferSummary.canonicalUpdated,
  canonicalUnchanged: transferSummary.canonicalUnchanged,
  blockedOrConflicted: analysisSummary.blockedOrConflictCount + transferSummary.blockedOrFailed,
  publishedBeforeTransfer: beforePublished,
  publishedAfterTransfer: afterPublished,
  autoPublishedDelta,
};

const transferPass = transferSummary.blockedOrFailed === 0
  && autoPublishedDelta === 0
  && (!verifyIdempotency || Boolean(idempotency?.pass));
if (sentinelClient) await sentinelClient.$disconnect();

const finalReport = {
  version: 1,
  mode: 'transfer',
  historicalPackageBaseSha: WPIC08_HISTORICAL_PACKAGE_BASE_SHA,
  runtimeGitSha,
  generatedAt: new Date().toISOString(),
  sourceManifest: source.manifest,
  dryRun,
  phaseB,
  transfer: transferSummary,
  idempotency,
  finalReconciliation,
  result: transferPass ? 'CONTROLLED_SEED_COMPLETE' : 'CONTROLLED_SEED_COMPLETED_WITH_GATE_FAILURE',
};
persistReport(outputDir, finalReport);
console.log(JSON.stringify(finalReport, null, 2));
if (!transferPass) process.exitCode = 3;

async function readOfficialWorkbook(filePath) {
  if (!fs.existsSync(filePath)) fatal(`Workbook not found: ${filePath}`);
  const bytes = fs.readFileSync(filePath);
  const workbookSha256 = sha256(bytes);
  const matrix = await readXlsxTextMatrix(bytes, WPIC08_SHEET_NAME);
  if (!matrix) fatal(`Required sheet ${WPIC08_SHEET_NAME} not found.`);
  if (matrix.length === 0) fatal('Courses sheet is empty.');
  const headers = matrix[0].map(text);
  const dataRows = matrix.slice(1).filter((row) => row.some((value) => text(value) !== ''));
  const rows = dataRows.map((values) => Object.fromEntries(WPIC08_HEADERS.map((header, index) => [header, values[index] ?? ''])));
  const manifest = buildSourceManifest({
    workbookName: path.basename(filePath),
    workbookSha256,
    sheetName: WPIC08_SHEET_NAME,
    headers,
    rows,
    strictOfficialWorkbook: true,
  });
  return { manifest };
}

async function fetchAllBatchRecords(batchId) {
  const rows = [];
  let page = 1;
  while (true) {
    const response = await api(`/admin/imports/courses/batches/${encodeURIComponent(batchId)}/records?page=${page}&pageSize=100`);
    rows.push(...(response?.data ?? []));
    const total = Number(response?.total ?? 0);
    const pageSize = Number(response?.pageSize ?? 100);
    if (page * pageSize >= total) break;
    page += 1;
    if (page > 10000) fatal('Batch pagination safety bound exceeded.');
  }
  return rows;
}

async function api(relativePath, options = {}) {
  const response = await fetch(`${apiBase}${relativePath}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    redirect: 'error',
  });
  const bodyText = await response.text();
  let payload = null;
  if (bodyText) {
    try { payload = JSON.parse(bodyText); }
    catch { payload = bodyText; }
  }
  if (!response.ok) {
    const detail = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`WPIC08_API_${response.status}:${relativePath}:${detail}`);
  }
  return payload;
}


async function createSentinelClient() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    return new PrismaClient();
  } catch (error) {
    fatal(`Cannot load @prisma/client for the mandatory canonical Course sentinel: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readCanonicalCourseSentinel(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT
      COUNT(*)::text AS "rowCount",
      COALESCE(
        md5(string_agg(md5(to_jsonb(c)::text), '' ORDER BY c."id")),
        md5('')
      ) AS "contentDigest",
      COUNT(*) FILTER (WHERE c."status"::text = 'PUBLISHED')::text AS "publishedCount"
    FROM "Course" c
  `;
  const row = rows?.[0] ?? {};
  return {
    rowCount: Number(row.rowCount ?? 0),
    contentDigest: String(row.contentDigest ?? ''),
    publishedCount: Number(row.publishedCount ?? 0),
    capturedAt: new Date().toISOString(),
  };
}

function requireApiArguments() {
  if (!apiBase) fatal('--api-base or WPIC08_API_BASE is required for dry-run/transfer. It must include the API prefix before /admin.');
  let parsedApiBase;
  try {
    parsedApiBase = new URL(apiBase);
  } catch {
    fatal('WPIC08_API_BASE must be an absolute URL.');
  }
  const localApi = ['localhost', '127.0.0.1', '::1'].includes(parsedApiBase.hostname);
  if (parsedApiBase.username || parsedApiBase.password) fatal('WPIC08_API_BASE must not contain credentials.');
  if (parsedApiBase.protocol !== 'https:' && !(localApi && parsedApiBase.protocol === 'http:')) {
    fatal('WPIC08_API_BASE requires HTTPS except for localhost/loopback development.');
  }
  if (!assetId) fatal('--asset-id or WPIC08_ASSET_ID is required. Register the workbook through the existing Asset platform first.');
  if (!authorization && !cookie) fatal('Provide WPIC08_AUTHORIZATION or WPIC08_COOKIE for an authenticated admin principal.');
  if (!dbSentinelEnabled && !args['sentinel-before']) {
    fatal('Phase B requires a strong canonical Course sentinel. Use --database-sentinel (recommended) or provide --sentinel-before/--sentinel-after JSON files.');
  }
}

function assertTransferConfirmation() {
  const confirmation = String(args.confirm ?? process.env.WPIC08_CONFIRM_CONTROLLED_TRANSFER ?? '');
  if (confirmation !== 'I_UNDERSTAND_THIS_MUTATES_CANONICAL_COURSES') {
    fatal('Controlled transfer blocked. Set WPIC08_CONFIRM_CONTROLLED_TRANSFER=I_UNDERSTAND_THIS_MUTATES_CANONICAL_COURSES.');
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const raw = token.slice(2);
    const equals = raw.indexOf('=');
    if (equals >= 0) {
      result[raw.slice(0, equals)] = raw.slice(equals + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      result[raw] = next;
      index += 1;
    } else {
      result[raw] = true;
    }
  }
  return result;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function persistReport(directory, report) {
  writeJson(path.join(directory, 'WPIC08_RESULT.json'), report);
  fs.writeFileSync(path.join(directory, 'WPIC08_RESULT.md'), renderReconciliationMarkdown(report), 'utf8');
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function fatal(message) {
  console.error(`[WP-IC-08] ${message}`);
  process.exit(1);
}

function currentGitSha() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'UNAVAILABLE'; }
}
