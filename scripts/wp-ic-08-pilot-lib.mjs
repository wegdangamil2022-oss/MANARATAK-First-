import { createHash } from 'node:crypto';

export const WPIC08_HISTORICAL_PACKAGE_BASE_SHA = '670d2950810e45b07c0493fadc29c0c9b7708852';
export const WPIC08_WORKBOOK_NAME = 'MANARATAK_Free_Courses_MASTER_UPDATED_2026-08-21_CISCO_NETWORKING_ACADEMY_FINAL_DEEP_AUDIT_CLOSED_3663.xlsx';
export const WPIC08_WORKBOOK_SHA256 = 'eda9c78fa05f94f0edd4b605a487a58e227c0550c4a671faeac1c7c152dd068f';
export const WPIC08_SHEET_NAME = 'Courses';
export const WPIC08_EXPECTED_SOURCE_ROWS = 3663;
export const WPIC08_EXPECTED_PROVIDER_COUNT = 18;
export const WPIC08_EXPECTED_FREE_CERTIFICATE_YES = 2517;
export const WPIC08_EXPECTED_FREE_CERTIFICATE_NO = 1146;

export const WPIC08_HEADERS = Object.freeze([
  'No.',
  'Platform / University',
  'Course Name',
  'Direct Course URL',
  'Study Free',
  'Free Certificate',
  'Certificate Type',
  'Language',
  'Study Level',
  'Course Duration',
  'Short Course Topics (4)',
]);

export const WPIC08_PROVIDER_COUNTS = Object.freeze({
  'The Open University — OpenLearn': 919,
  freeCodeCamp: 911,
  'FAO eLearning Academy': 522,
  'IBM SkillsBuild': 208,
  'HubSpot Academy': 170,
  'Saylor University': 162,
  NextGenU: 158,
  'openHPI — Hasso Plattner Institute': 146,
  'Global Health Learning Center': 89,
  'Semrush Academy': 77,
  'Cisco Networking Academy': 57,
  JMOOC: 50,
  'WIPO Academy': 49,
  'UNDP Learning for Nature': 45,
  'HP LIFE': 37,
  'Google Skillshop': 28,
  'University of Helsinki — MOOC.fi': 24,
  'Harvard University — CS50': 11,
});

const REVIEW_CHANGE_STATES = new Set([
  'URL_CHANGED',
  'METADATA_CHANGED',
  'URL_AND_METADATA_CHANGED',
]);

const BLOCKED_CHANGE_STATES = new Set([
  'AMBIGUOUS_MATCH',
  'CONFLICT',
  'INVALID',
  'INCOMPLETE',
  'REJECTED',
]);

const REJECTED_CHANGE_STATES = new Set([
  'INVALID',
  'INCOMPLETE',
  'REJECTED',
]);

export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return createHash('sha256').update(bytes).digest('hex');
}

export function text(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

export function normalizeYesNo(value) {
  const normalized = text(value).toLowerCase();
  if (normalized === 'yes') return 'Yes';
  if (normalized === 'no') return 'No';
  return text(value);
}

export function countBy(values) {
  const result = {};
  for (const value of values) {
    const key = text(value) || '(blank)';
    result[key] = (result[key] ?? 0) + 1;
  }
  return sortObject(result);
}

export function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

export function equalRecord(actual, expected) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (actualKeys.length !== expectedKeys.length) return false;
  return actualKeys.every((key, index) => key === expectedKeys[index] && Number(actual[key]) === Number(expected[key]));
}

export function buildSourceManifest({
  workbookName,
  workbookSha256,
  sheetName,
  headers,
  rows,
  strictOfficialWorkbook = true,
}) {
  if (!Array.isArray(headers)) throw new Error('WPIC08_HEADERS_REQUIRED');
  if (!Array.isArray(rows)) throw new Error('WPIC08_ROWS_REQUIRED');

  const normalizedHeaders = headers.map(text);
  const headerMatches = normalizedHeaders.length === WPIC08_HEADERS.length
    && normalizedHeaders.every((header, index) => header === WPIC08_HEADERS[index]);

  const providerCounts = {};
  const studyFreeCounts = {};
  const freeCertificateCounts = {};
  const languageRawCounts = {};
  let rowsWithTopics = 0;
  let rowsWithoutTopics = 0;
  let rowsWithLanguageRaw = 0;
  let rowsWithoutLanguageRaw = 0;
  let invalidSourceOrder = 0;
  const sourceOrderSeen = new Set();
  let duplicateSourceOrder = 0;

  for (const row of rows) {
    const provider = text(row['Platform / University']);
    providerCounts[provider || '(blank)'] = (providerCounts[provider || '(blank)'] ?? 0) + 1;

    const study = normalizeYesNo(row['Study Free']);
    studyFreeCounts[study || '(blank)'] = (studyFreeCounts[study || '(blank)'] ?? 0) + 1;

    const freeCertificate = normalizeYesNo(row['Free Certificate']);
    freeCertificateCounts[freeCertificate || '(blank)'] = (freeCertificateCounts[freeCertificate || '(blank)'] ?? 0) + 1;

    const language = text(row.Language);
    languageRawCounts[language || '(blank)'] = (languageRawCounts[language || '(blank)'] ?? 0) + 1;
    if (language) rowsWithLanguageRaw += 1;
    else rowsWithoutLanguageRaw += 1;

    if (text(row['Short Course Topics (4)'])) rowsWithTopics += 1;
    else rowsWithoutTopics += 1;

    const sourceOrder = text(row['No.']);
    if (!/^\d+$/.test(sourceOrder)) invalidSourceOrder += 1;
    if (sourceOrderSeen.has(sourceOrder)) duplicateSourceOrder += 1;
    sourceOrderSeen.add(sourceOrder);
  }

  const sortedProviderCounts = sortObject(providerCounts);
  const checks = {
    workbookName: strictOfficialWorkbook ? workbookName === WPIC08_WORKBOOK_NAME : true,
    workbookSha256: strictOfficialWorkbook ? workbookSha256 === WPIC08_WORKBOOK_SHA256 : /^[a-f0-9]{64}$/i.test(workbookSha256),
    sheetName: sheetName === WPIC08_SHEET_NAME,
    exactHeaders: headerMatches,
    sourceRows: strictOfficialWorkbook ? rows.length === WPIC08_EXPECTED_SOURCE_ROWS : rows.length > 0,
    providerCount: strictOfficialWorkbook ? Object.keys(providerCounts).length === WPIC08_EXPECTED_PROVIDER_COUNT : Object.keys(providerCounts).length > 0,
    providerCounts: strictOfficialWorkbook ? equalRecord(providerCounts, WPIC08_PROVIDER_COUNTS) : true,
    studyFreeAllYes: strictOfficialWorkbook ? studyFreeCounts.Yes === WPIC08_EXPECTED_SOURCE_ROWS && Object.keys(studyFreeCounts).length === 1 : true,
    freeCertificateCounts: strictOfficialWorkbook
      ? freeCertificateCounts.Yes === WPIC08_EXPECTED_FREE_CERTIFICATE_YES
        && freeCertificateCounts.No === WPIC08_EXPECTED_FREE_CERTIFICATE_NO
        && Object.keys(freeCertificateCounts).length === 2
      : true,
    sourceOrderIsDisplayOnlyAndSane: invalidSourceOrder === 0 && duplicateSourceOrder === 0,
  };

  const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
  return {
    version: 1,
    mode: 'SOURCE_MANIFEST',
    workbook: { name: workbookName, sha256: workbookSha256, sheetName },
    expected: strictOfficialWorkbook ? {
      workbookName: WPIC08_WORKBOOK_NAME,
      workbookSha256: WPIC08_WORKBOOK_SHA256,
      sourceRows: WPIC08_EXPECTED_SOURCE_ROWS,
      providerCount: WPIC08_EXPECTED_PROVIDER_COUNT,
      studyFreeYes: WPIC08_EXPECTED_SOURCE_ROWS,
      freeCertificateYes: WPIC08_EXPECTED_FREE_CERTIFICATE_YES,
      freeCertificateNo: WPIC08_EXPECTED_FREE_CERTIFICATE_NO,
    } : null,
    observed: {
      sourceRows: rows.length,
      providerCount: Object.keys(providerCounts).length,
      providerCounts: sortedProviderCounts,
      studyFreeCounts: sortObject(studyFreeCounts),
      freeCertificateCounts: sortObject(freeCertificateCounts),
      languageRawCounts: sortObject(languageRawCounts),
      rowsWithLanguageRaw,
      rowsWithoutLanguageRaw,
      rowsWithTopics,
      rowsWithoutTopics,
      invalidSourceOrder,
      duplicateSourceOrder,
    },
    headers: normalizedHeaders,
    checks,
    failures,
    pass: failures.length === 0,
  };
}

export function classifyAnalyses(analyses = [], records = [], approvals = {}) {
  const recordsById = new Map(records.map((record) => [String(record.id), record]));
  const countsByChangeState = {};
  const countsByMatchState = {};
  const readyRecordIds = [];
  const approvedReviewRecordIds = [];
  const reviewRecordIds = [];
  const rejectedRecordIds = [];
  const sameFileDuplicateRecordIds = [];
  const existingDuplicateRecordIds = [];
  const blockedOrConflictRecordIds = [];
  const alreadyTransferredRecordIds = [];

  for (const analysis of analyses) {
    const recordId = String(analysis.importRecordId ?? '');
    const changeState = text(analysis.changeState) || 'UNKNOWN';
    const matchState = text(analysis.matchState) || 'UNKNOWN';
    countsByChangeState[changeState] = (countsByChangeState[changeState] ?? 0) + 1;
    countsByMatchState[matchState] = (countsByMatchState[matchState] ?? 0) + 1;

    const record = recordsById.get(recordId);
    if (record?.promotedEntityId) alreadyTransferredRecordIds.push(recordId);
    if (matchState === 'SAME_BATCH_DUPLICATE') sameFileDuplicateRecordIds.push(recordId);
    if (matchState === 'EXACT_EXISTING' || matchState === 'CROSS_BATCH_UNCHANGED' || analysis.matchedCourseId) {
      existingDuplicateRecordIds.push(recordId);
    }

    if (REJECTED_CHANGE_STATES.has(changeState)) {
      rejectedRecordIds.push(recordId);
      continue;
    }
    if (BLOCKED_CHANGE_STATES.has(changeState)) {
      blockedOrConflictRecordIds.push(recordId);
      reviewRecordIds.push(recordId);
      continue;
    }
    if (matchState === 'SAME_BATCH_DUPLICATE') {
      continue;
    }

    const needsReview = Boolean(analysis.requiresReview) || REVIEW_CHANGE_STATES.has(changeState);
    if (needsReview) {
      reviewRecordIds.push(recordId);
      if (approvals && approvals[recordId]) approvedReviewRecordIds.push(recordId);
      continue;
    }

    if (['NEW', 'UNCHANGED', 'READY_TO_TRANSFER'].includes(changeState)) {
      readyRecordIds.push(recordId);
    }
  }

  const approvedTransferRecordIds = [...new Set([...readyRecordIds, ...approvedReviewRecordIds])]
    .filter((id) => id && !alreadyTransferredRecordIds.includes(id));

  return {
    countsByChangeState: sortObject(countsByChangeState),
    countsByMatchState: sortObject(countsByMatchState),
    sameFileDuplicateCount: sameFileDuplicateRecordIds.length,
    sameFileDuplicateRecordIds,
    existingDuplicateCount: new Set(existingDuplicateRecordIds).size,
    existingDuplicateRecordIds: [...new Set(existingDuplicateRecordIds)],
    readyToTransferCount: readyRecordIds.length,
    readyRecordIds,
    reviewRequiredCount: new Set(reviewRecordIds).size,
    reviewRecordIds: [...new Set(reviewRecordIds)],
    explicitlyApprovedReviewCount: approvedReviewRecordIds.length,
    approvedReviewRecordIds,
    rejectedCount: new Set(rejectedRecordIds).size,
    rejectedRecordIds: [...new Set(rejectedRecordIds)],
    blockedOrConflictCount: new Set(blockedOrConflictRecordIds).size,
    blockedOrConflictRecordIds: [...new Set(blockedOrConflictRecordIds)],
    alreadyTransferredCount: new Set(alreadyTransferredRecordIds).size,
    alreadyTransferredRecordIds: [...new Set(alreadyTransferredRecordIds)],
    approvedTransferRecordIds,
    approvedTransferCount: approvedTransferRecordIds.length,
  };
}

export function summarizeProviderResolution(preflightProviders = []) {
  const providerIds = new Map();
  const duplicateProviderIdentities = [];
  const unresolved = [];

  for (const provider of preflightProviders) {
    if (!provider?.resolved || !provider.providerId) {
      unresolved.push(text(provider?.label));
      continue;
    }
    const id = String(provider.providerId);
    const labels = providerIds.get(id) ?? [];
    labels.push(text(provider.label));
    providerIds.set(id, labels);
  }

  for (const [providerId, labels] of providerIds) {
    if (labels.length > 1) duplicateProviderIdentities.push({ providerId, labels });
  }

  return {
    discovered: preflightProviders.length,
    resolved: preflightProviders.filter((provider) => provider?.resolved).length,
    unresolved: unresolved.length,
    unresolvedLabels: unresolved.filter(Boolean),
    duplicateProviderIdentityCount: duplicateProviderIdentities.length,
    duplicateProviderIdentities,
  };
}

export function countUrlIssues(preflight) {
  const counts = {};
  const relevant = new Set([
    'COURSE_DIRECT_URL_INVALID',
    'COURSE_PROVIDER_DOMAIN_NOT_APPROVED',
  ]);
  for (const issue of preflight?.issues ?? []) {
    if (!relevant.has(issue?.code)) continue;
    counts[issue.code] = (counts[issue.code] ?? 0) + 1;
  }
  return { counts: sortObject(counts), total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
}

export function buildRelationshipReadiness(sourceManifest) {
  const observed = sourceManifest.observed;
  return {
    taxonomy: {
      state: 'DEFERRED_PRE_TRANSFER_TO_WP06_POST_TRANSFER_RELATIONSHIP_ANALYSIS',
      reason: 'WP-IC-06 relationship analysis requires a canonical Course id; WP-IC-08 Phase A must not mutate Course.',
      rowsWithTopicSource: observed.rowsWithTopics,
      rowsWithoutTopicSource: observed.rowsWithoutTopics,
    },
    language: {
      state: 'DEFERRED_PRE_TRANSFER_TO_WP06_POST_TRANSFER_RELATIONSHIP_ANALYSIS',
      reason: 'ReferenceLanguage resolution is owned by the existing WP-IC-06 relationship path after canonical transfer.',
      rowsWithLanguageRaw: observed.rowsWithLanguageRaw,
      rowsWithoutLanguageRaw: observed.rowsWithoutLanguageRaw,
      rawValueCounts: observed.languageRawCounts,
    },
  };
}

export function buildPhaseBReconciliation({
  sourceManifest,
  preflight,
  stagedRecords,
  analyses,
  providerResolution,
  canonicalBefore,
  canonicalAfter,
  canonicalSentinelBefore = null,
  canonicalSentinelAfter = null,
}) {
  const sourceRows = Number(sourceManifest?.observed?.sourceRows ?? 0);
  const parsedRows = Number(preflight?.summary?.rowsFound ?? 0);
  const stagedRows = Array.isArray(stagedRecords) ? stagedRecords.length : 0;
  const analyzedRows = Array.isArray(analyses) ? analyses.length : 0;
  const accountedRows = analyzedRows;
  const unexplainedLostRows = Math.max(0, sourceRows - accountedRows);
  const beforeOverview = canonicalBefore?.overview ?? canonicalBefore ?? {};
  const afterOverview = canonicalAfter?.overview ?? canonicalAfter ?? {};
  const beforeTotal = Number(beforeOverview.total ?? 0);
  const afterTotal = Number(afterOverview.total ?? 0);
  const beforePublished = Number(beforeOverview.published ?? 0);
  const afterPublished = Number(afterOverview.published ?? 0);

  const apiCourseMutationDelta = afterTotal - beforeTotal;
  const autoPublishedDelta = afterPublished - beforePublished;
  const strongSentinelAvailable = Boolean(canonicalSentinelBefore && canonicalSentinelAfter);
  const strongSentinelUnchanged = strongSentinelAvailable
    ? canonicalSentinelBefore.rowCount === canonicalSentinelAfter.rowCount
      && canonicalSentinelBefore.contentDigest === canonicalSentinelAfter.contentDigest
      && canonicalSentinelBefore.publishedCount === canonicalSentinelAfter.publishedCount
    : null;

  const invariants = {
    sourceManifestPass: Boolean(sourceManifest?.pass),
    sourceRowsExpected3663: sourceRows === WPIC08_EXPECTED_SOURCE_ROWS,
    sourceRowsParsed3663: parsedRows === WPIC08_EXPECTED_SOURCE_ROWS,
    sourceRowsStaged3663: stagedRows === WPIC08_EXPECTED_SOURCE_ROWS,
    sourceRowsAccountedFor3663: accountedRows === WPIC08_EXPECTED_SOURCE_ROWS,
    unexplainedLostRowsZero: unexplainedLostRows === 0,
    duplicateProviderIdentitiesZero: Number(providerResolution?.duplicateProviderIdentityCount ?? 0) === 0,
    unresolvedProvidersZero: Number(providerResolution?.unresolved ?? 0) === 0,
    phaseADidNotCreateCanonicalCourses: apiCourseMutationDelta === 0,
    autoPublishedCoursesZero: autoPublishedDelta === 0,
    silentOverwritesZero: strongSentinelAvailable ? strongSentinelUnchanged : false,
    strongCanonicalSentinelUnchanged: strongSentinelAvailable ? strongSentinelUnchanged : 'NOT_PROVIDED',
  };

  const hardGateKeys = [
    'sourceManifestPass',
    'sourceRowsExpected3663',
    'sourceRowsParsed3663',
    'sourceRowsStaged3663',
    'sourceRowsAccountedFor3663',
    'unexplainedLostRowsZero',
    'duplicateProviderIdentitiesZero',
    'unresolvedProvidersZero',
    'phaseADidNotCreateCanonicalCourses',
    'autoPublishedCoursesZero',
    'silentOverwritesZero',
  ];
  if (strongSentinelAvailable) hardGateKeys.push('strongCanonicalSentinelUnchanged');

  const failed = hardGateKeys.filter((key) => invariants[key] !== true);
  return {
    sourceRows,
    parsedRows,
    stagedRows,
    analyzedRows,
    accountedRows,
    unexplainedLostRows,
    canonicalMutationSentinel: {
      api: {
        beforeTotal,
        afterTotal,
        totalDelta: apiCourseMutationDelta,
        beforePublished,
        afterPublished,
        publishedDelta: autoPublishedDelta,
      },
      strong: strongSentinelAvailable ? {
        before: canonicalSentinelBefore,
        after: canonicalSentinelAfter,
        unchanged: strongSentinelUnchanged,
      } : { state: 'NOT_PROVIDED' },
    },
    invariants,
    failed,
    pass: failed.length === 0,
  };
}

export function summarizeTransferResults(responses = []) {
  const states = {};
  let attempted = 0;
  let transferred = 0;
  let blockedOrFailed = 0;
  const errors = [];

  for (const response of responses) {
    attempted += Number(response?.attempted ?? 0);
    transferred += Number(response?.transferred ?? 0);
    blockedOrFailed += Number(response?.blockedOrFailed ?? 0);
    for (const item of response?.results ?? []) {
      if (item?.status !== 'TRANSFERRED') {
        if (item?.error) errors.push({ recordId: item.recordId, error: item.error });
        continue;
      }
      const state = text(item?.transfer?.state) || 'UNKNOWN';
      states[state] = (states[state] ?? 0) + 1;
    }
  }

  return {
    attempted,
    transferred,
    blockedOrFailed,
    states: sortObject(states),
    canonicalCreated: states.TRANSFERRED_CREATED ?? 0,
    canonicalUpdated: states.TRANSFERRED_UPDATED ?? 0,
    canonicalUnchanged: states.TRANSFERRED_UNCHANGED ?? 0,
    errors,
  };
}

export function assertIdempotencyReplay(replaySummary) {
  const unexpected = Object.entries(replaySummary.states ?? {})
    .filter(([state, count]) => state !== 'TRANSFERRED_UNCHANGED' && Number(count) > 0);
  const pass = replaySummary.blockedOrFailed === 0 && unexpected.length === 0;
  return { pass, unexpectedStates: Object.fromEntries(unexpected), replaySummary };
}

export function renderReconciliationMarkdown(report) {
  const lines = [];
  lines.push('# WP-IC-08 — 3,663-Course Pilot Result');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt ?? new Date().toISOString()}`);
  lines.push(`Mode: ${report.mode ?? 'unknown'}`);
  lines.push(`Historical package base SHA: ${report.historicalPackageBaseSha ?? WPIC08_HISTORICAL_PACKAGE_BASE_SHA}`);
  lines.push(`Runtime git SHA: ${report.runtimeGitSha ?? 'UNAVAILABLE'}`);
  lines.push('');

  if (report.sourceManifest) {
    lines.push('## Source workbook');
    lines.push('');
    lines.push(`- File: \`${report.sourceManifest.workbook.name}\``);
    lines.push(`- SHA-256: \`${report.sourceManifest.workbook.sha256}\``);
    lines.push(`- Sheet: \`${report.sourceManifest.workbook.sheetName}\``);
    lines.push(`- Source rows: **${report.sourceManifest.observed.sourceRows}**`);
    lines.push(`- Providers: **${report.sourceManifest.observed.providerCount}**`);
    lines.push(`- Source manifest gate: **${report.sourceManifest.pass ? 'PASS' : 'FAIL'}**`);
    lines.push('');
  }

  if (report.dryRun) {
    const dry = report.dryRun;
    lines.push('## Phase A — Dry run');
    lines.push('');
    lines.push(`- Parsed: ${dry.preflight?.summary?.rowsFound ?? 'n/a'}`);
    lines.push(`- Staged: ${dry.stagedRecordCount ?? 'n/a'}`);
    lines.push(`- Valid: ${dry.preflight?.summary?.validRows ?? 'n/a'}`);
    lines.push(`- Invalid/incomplete: ${dry.preflight?.summary?.incompleteRows ?? 'n/a'}`);
    lines.push(`- Same-file duplicates: ${dry.analysis?.sameFileDuplicateCount ?? 'n/a'}`);
    lines.push(`- Existing duplicates/matches: ${dry.analysis?.existingDuplicateCount ?? 'n/a'}`);
    lines.push(`- URL issues / changed URLs: ${dry.urlIssues?.totalAttentionRows ?? dry.urlIssues?.total ?? 'n/a'}`);
    lines.push(`- Ready to transfer: ${dry.analysis?.readyToTransferCount ?? 'n/a'}`);
    lines.push(`- Review required: ${dry.analysis?.reviewRequiredCount ?? 'n/a'}`);
    lines.push(`- Rejected: ${dry.analysis?.rejectedCount ?? 'n/a'}`);
    lines.push('');
    lines.push(`Taxonomy state: **${dry.relationships?.taxonomy?.state ?? 'n/a'}**`);
    lines.push(`Language state: **${dry.relationships?.language?.state ?? 'n/a'}**`);
    lines.push('');
  }

  if (report.phaseB) {
    lines.push('## Phase B — Reconciliation');
    lines.push('');
    lines.push(`Gate: **${report.phaseB.pass ? 'PASS' : 'FAIL'}**`);
    for (const [name, value] of Object.entries(report.phaseB.invariants ?? {})) {
      lines.push(`- ${name}: ${value === true ? 'PASS' : value === false ? 'FAIL' : value}`);
    }
    if ((report.phaseB.failed ?? []).length) lines.push(`- Failed: ${report.phaseB.failed.join(', ')}`);
    lines.push('');
  }

  if (report.transfer) {
    lines.push('## Phase C — Controlled transfer');
    lines.push('');
    lines.push(`- Attempted: ${report.transfer.attempted}`);
    lines.push(`- Transferred: ${report.transfer.transferred}`);
    lines.push(`- Canonical created: ${report.transfer.canonicalCreated}`);
    lines.push(`- Canonical updated: ${report.transfer.canonicalUpdated}`);
    lines.push(`- Canonical unchanged: ${report.transfer.canonicalUnchanged}`);
    lines.push(`- Blocked/failed: ${report.transfer.blockedOrFailed}`);
    lines.push(`- Auto-published delta: ${report.finalReconciliation?.autoPublishedDelta ?? 'n/a'}`);
    if (report.idempotency) lines.push(`- Idempotency replay: ${report.idempotency.pass ? 'PASS' : 'FAIL'}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
