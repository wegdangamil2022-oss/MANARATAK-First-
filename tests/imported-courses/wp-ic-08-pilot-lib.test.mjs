import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WPIC08_HEADERS,
  buildPhaseBReconciliation,
  buildSourceManifest,
  classifyAnalyses,
  summarizeProviderResolution,
  summarizeTransferResults,
  assertIdempotencyReplay,
  renderReconciliationMarkdown,
} from '../../scripts/wp-ic-08-pilot-lib.mjs';

function fixtureRow(no, provider, overrides = {}) {
  return {
    'No.': String(no),
    'Platform / University': provider,
    'Course Name': `Course ${no}`,
    'Direct Course URL': `https://example.org/course-${no}`,
    'Study Free': 'Yes',
    'Free Certificate': 'No',
    'Certificate Type': 'No free certificate',
    Language: 'English',
    'Study Level': 'Beginner',
    'Course Duration': '1 hour',
    'Short Course Topics (4)': 'Topic A • Topic B',
    ...overrides,
  };
}

test('buildSourceManifest validates a non-official fixture without weakening official constants', () => {
  const rows = [fixtureRow(1, 'Provider A'), fixtureRow(2, 'Provider B')];
  const result = buildSourceManifest({
    workbookName: 'fixture.xlsx',
    workbookSha256: 'a'.repeat(64),
    sheetName: 'Courses',
    headers: WPIC08_HEADERS,
    rows,
    strictOfficialWorkbook: false,
  });
  assert.equal(result.pass, true);
  assert.equal(result.observed.sourceRows, 2);
  assert.equal(result.observed.providerCount, 2);
});

test('pilot report keeps historical package and runtime Git SHA separate', () => {
  const markdown = renderReconciliationMarkdown({
    historicalPackageBaseSha: 'historical-sha',
    runtimeGitSha: 'runtime-sha',
  });
  assert.match(markdown, /Historical package base SHA: historical-sha/);
  assert.match(markdown, /Runtime git SHA: runtime-sha/);
  assert.doesNotMatch(markdown, /Base SHA:/);
});

test('buildSourceManifest rejects wrong exact header order', () => {
  const headers = [...WPIC08_HEADERS];
  [headers[0], headers[1]] = [headers[1], headers[0]];
  const result = buildSourceManifest({
    workbookName: 'fixture.xlsx',
    workbookSha256: 'a'.repeat(64),
    sheetName: 'Courses',
    headers,
    rows: [fixtureRow(1, 'Provider A')],
    strictOfficialWorkbook: false,
  });
  assert.equal(result.pass, false);
  assert.ok(result.failures.includes('exactHeaders'));
});

test('classifyAnalyses excludes same-batch duplicates from controlled transfer', () => {
  const analyses = [
    { importRecordId: 'r1', changeState: 'NEW', matchState: 'NOT_DUPLICATE', requiresReview: false },
    { importRecordId: 'r2', changeState: 'UNCHANGED', matchState: 'SAME_BATCH_DUPLICATE', requiresReview: false },
    { importRecordId: 'r3', changeState: 'URL_CHANGED', matchState: 'EXACT_EXISTING', requiresReview: true },
    { importRecordId: 'r4', changeState: 'INVALID', matchState: 'NOT_DUPLICATE', requiresReview: true },
  ];
  const classified = classifyAnalyses(analyses, analyses.map((a) => ({ id: a.importRecordId })), {
    r3: { expectedAnalysisId: 'a3', reason: 'verified', approvedFields: ['directCourseUrl'], urlVerified: true },
  });
  assert.deepEqual(classified.readyRecordIds, ['r1']);
  assert.deepEqual(classified.sameFileDuplicateRecordIds, ['r2']);
  assert.ok(classified.approvedTransferRecordIds.includes('r3'));
  assert.ok(!classified.approvedTransferRecordIds.includes('r2'));
  assert.equal(classified.rejectedCount, 1);
});

test('provider reconciliation detects duplicate provider identity', () => {
  const resolution = summarizeProviderResolution([
    { label: 'A', resolved: true, providerId: 'p1' },
    { label: 'Alias A', resolved: true, providerId: 'p1' },
  ]);
  assert.equal(resolution.duplicateProviderIdentityCount, 1);
});

test('Phase B passes only when all 3663 rows are accounted and Course snapshot is unchanged', () => {
  const sourceManifest = {
    pass: true,
    observed: { sourceRows: 3663 },
  };
  const preflight = { summary: { rowsFound: 3663 } };
  const stagedRecords = Array.from({ length: 3663 }, (_, i) => ({ id: `r${i}` }));
  const analyses = Array.from({ length: 3663 }, (_, i) => ({ importRecordId: `r${i}` }));
  const providerResolution = { duplicateProviderIdentityCount: 0, unresolved: 0 };
  const canonical = { overview: { total: 12, published: 4 } };
  const sentinel = { rowCount: 12, contentDigest: 'abc', publishedCount: 4 };
  const result = buildPhaseBReconciliation({
    sourceManifest,
    preflight,
    stagedRecords,
    analyses,
    providerResolution,
    canonicalBefore: canonical,
    canonicalAfter: canonical,
    canonicalSentinelBefore: sentinel,
    canonicalSentinelAfter: sentinel,
  });
  assert.equal(result.pass, true);
  assert.equal(result.unexplainedLostRows, 0);
});

test('Phase B fails if canonical Course changes during dry run', () => {
  const result = buildPhaseBReconciliation({
    sourceManifest: { pass: true, observed: { sourceRows: 3663 } },
    preflight: { summary: { rowsFound: 3663 } },
    stagedRecords: Array.from({ length: 3663 }, (_, i) => ({ id: `r${i}` })),
    analyses: Array.from({ length: 3663 }, (_, i) => ({ importRecordId: `r${i}` })),
    providerResolution: { duplicateProviderIdentityCount: 0, unresolved: 0 },
    canonicalBefore: { overview: { total: 0, published: 0 } },
    canonicalAfter: { overview: { total: 1, published: 0 } },
  });
  assert.equal(result.pass, false);
  assert.ok(result.failed.includes('phaseADidNotCreateCanonicalCourses'));
});


test('Phase B blocks transfer when the strong Course sentinel is not provided', () => {
  const result = buildPhaseBReconciliation({
    sourceManifest: { pass: true, observed: { sourceRows: 3663 } },
    preflight: { summary: { rowsFound: 3663 } },
    stagedRecords: Array.from({ length: 3663 }, (_, i) => ({ id: `r${i}` })),
    analyses: Array.from({ length: 3663 }, (_, i) => ({ importRecordId: `r${i}` })),
    providerResolution: { duplicateProviderIdentityCount: 0, unresolved: 0 },
    canonicalBefore: { overview: { total: 10, published: 0 } },
    canonicalAfter: { overview: { total: 10, published: 0 } },
  });
  assert.equal(result.pass, false);
  assert.ok(result.failed.includes('silentOverwritesZero'));
});

test('idempotency replay accepts only TRANSFERRED_UNCHANGED', () => {
  const summary = summarizeTransferResults([{
    attempted: 2,
    transferred: 2,
    blockedOrFailed: 0,
    results: [
      { status: 'TRANSFERRED', transfer: { state: 'TRANSFERRED_UNCHANGED' } },
      { status: 'TRANSFERRED', transfer: { state: 'TRANSFERRED_UNCHANGED' } },
    ],
  }]);
  assert.equal(assertIdempotencyReplay(summary).pass, true);

  const bad = summarizeTransferResults([{
    attempted: 1,
    transferred: 1,
    blockedOrFailed: 0,
    results: [{ status: 'TRANSFERRED', transfer: { state: 'TRANSFERRED_UPDATED' } }],
  }]);
  assert.equal(assertIdempotencyReplay(bad).pass, false);
});
