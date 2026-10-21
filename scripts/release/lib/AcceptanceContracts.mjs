import { SHA } from './ReleaseContracts.mjs';
export const DOMAINS = [
  'IAM',
  'AUDIT',
  'ASSETS',
  'SETTINGS',
  'IMPORT',
  'REFERENCE',
  'TAXONOMY',
  'TESTS',
  'MAJORS',
  'UNIVERSITIES',
  'SCHOLARSHIPS',
  'COUNTRY_GRAPH',
  'COURSES',
  'CERTIFICATES',
  'STUDENTS',
  'CMS',
  'LOCALIZATION',
  'AI',
  'STUDENT_TOOLS',
  'FINANCE',
  'SERVICES',
  'CAREERS',
  'NOTIFICATIONS',
  'REVIEW_QUEUE',
  'HEALTH',
  'DASHBOARD',
];
export function acceptanceMatrix(records, sha) {
  if (!SHA.test(sha ?? '')) throw new Error('ACCEPTANCE_SHA_INVALID');
  return DOMAINS.map((owner, index) => {
    const matches = records?.filter((row) => row.owner === owner) ?? [],
      row = matches[0];
    const required = [
      'public-truth',
      'permission-denial',
      'owner-isolation',
      'lifecycle',
      'locale',
    ];
    const excluded =
      row?.scope === 'EXCLUDED' && row?.exclusion?.approvedBy && row?.exclusion?.reason;
    const complete =
      matches.length === 1 &&
      row.sha === sha &&
      row.environment === 'DISPOSABLE' &&
      row.providerMode === 'STUB_OR_SANDBOX' &&
      row.fixtureId &&
      row.traceArtifact &&
      (excluded ||
        required.every(
          (key) =>
            row.assertions?.[key]?.executed === true && row.assertions[key].outcome === 'PASS',
        ));
    return {
      section: index + 1,
      owner,
      status: complete ? (excluded ? 'APPROVED_EXCLUSION' : 'VERIFIED') : 'UNVERIFIED',
    };
  });
}
export function businessCoverage(plan, observations, sha) {
  if (!SHA.test(sha ?? '')) throw new Error('BUSINESS_COVERAGE_SHA_INVALID');
  const rows = plan.map((market) => {
    const matches = observations.filter((row) => row.marketId === market.id),
      row = matches[0];
    let state = 'UNAVAILABLE';
    const valid =
      matches.length === 1 &&
      row.sha === sha &&
      row.countryId === market.countryId &&
      row.degreeLevelId === market.degreeLevelId &&
      row.teachingLanguageId === market.teachingLanguageId &&
      row.provenance === 'PERMISSIONED_COMPLETE_OWNER_QUERY' &&
      Number.isFinite(Date.parse(row.checkedAt)) && Date.now() - Date.parse(row.checkedAt) >= -30_000 && Date.now() - Date.parse(row.checkedAt) <= 24 * 3600_000 &&
      row.scope === 'COMPLETE' &&
      typeof row.total === 'number' &&
      Number.isSafeInteger(row.total) &&
      row.total >= 0;
    if (valid) {
      if (row.supported === false) state = 'UNSUPPORTED';
      else if (row.total === 0) state = 'ZERO';
      else if (
        row.universityPublished &&
        row.programActive &&
        row.majorProfilePublished &&
        row.canonicalTeachingLanguage &&
        row.scholarshipPublishedVerified &&
        row.programParentMatched &&
        row.sourceEvidenceVerified
      )
        state = 'AVAILABLE';
      else state = 'INCOMPLETE';
    }
    return {
      marketId: market.id,
      mandatory: market.mandatory === true,
      state,
      countryId: market.countryId, degreeLevelId: market.degreeLevelId, teachingLanguageId: market.teachingLanguageId,
      checkedAt: valid ? row.checkedAt : null, provenance: valid ? row.provenance : null,
      total: valid ? row.total : null,
    };
  });
  return {
    sha,
    rows,
    mandatoryReady: rows.filter((row) => row.mandatory).every((row) => row.state === 'AVAILABLE'),
    launchScopeDeclared: plan.length > 0,
    productionDecision: 'UNVERIFIED',
  };
}
export function acceptanceDetails(evidence, sha) {
  const failures = [];
  if (acceptanceMatrix(evidence.domainMatrix, sha).some((row) => row.status === 'UNVERIFIED'))
    failures.push('DOMAIN_MATRIX_INCOMPLETE');
  for (const id of [
    'database-parity',
    'built-browser',
    'cross-module-canary',
    'artifact-boot',
    'worker-effects',
    'load-slo',
    'rollback',
    'locale-indexing',
  ]) {
    const gate = evidence.gates?.find((gate) => gate.id === id);
    if (!gate || gate.environment !== 'DISPOSABLE' || gate.providerMode !== 'STUB_OR_SANDBOX')
      failures.push(`${id}:ISOLATION_NOT_PROVEN`);
  }
  if (
    !Array.isArray(evidence.topology?.units) ||
    evidence.topology.units.length !== 3 ||
    new Set(evidence.topology.units.map((unit) => unit.unit)).size !== 3 ||
    ['api', 'web', 'admin'].some(
      (name) =>
        !evidence.topology.units.some(
          (unit) =>
            unit.unit === name && unit.sourceSha === sha && /^https:\/\//.test(unit.origin ?? ''),
        ),
    ) ||
    evidence.topology.apiIngressPath !== '/api/v1' ||
    evidence.topology.tlsVerified !== true ||
    evidence.topology.corsVerified !== true ||
    evidence.topology.cookieVerified !== true ||
    evidence.topology.csrfVerified !== true
  )
    failures.push('TOPOLOGY_SECURITY_UNVERIFIED');
  const database = evidence.gates?.find(row => row.id === 'database-parity');
  if (database?.migrationReplay !== true || !Number.isSafeInteger(database?.migrationCount) || database.migrationCount < 1 || database.parityDiff !== '' || database.fkAndUniqueVerified !== true || database.rollbackIdempotencyVerified !== true) failures.push('DATABASE_MIGRATION_PARITY_UNVERIFIED');
  const browser = evidence.gates?.find(row => row.id === 'built-browser');
  if (browser?.builtArtifactsOnly !== true || browser.apiWebAdminAtSha !== true || browser.productionEquivalentRoutes !== true || !browser.traceArtifact) failures.push('BUILT_BROWSER_PROVENANCE_UNVERIFIED');
  const workers = evidence.gates?.find(row => row.id === 'worker-effects');
  if (['onceOnly','duplicateSafe','reorderSafe','crashRestartSafe','leaseFenced','deadLetterAlerted','privacyVerified','ledgerInvariant'].some(key => workers?.[key] !== true)) failures.push('WORKER_EFFECTS_UNVERIFIED');
  const boot = evidence.gates?.find((gate) => gate.id === 'artifact-boot');
  if (
    boot?.freshUnpackedBoot !== true ||
    boot?.nodeMajor !== 22 ||
    boot?.generatedPrismaClient !== true ||
    !boot?.runtimeImageDigest?.match(/^sha256:[0-9a-f]{64}$/)
  )
    failures.push('ARTIFACT_RUNTIME_LAYER_UNVERIFIED');
  const backup = evidence.gates?.find((gate) => gate.id === 'backup-restore');
  if (
    backup?.structuralRestorability !== true ||
    backup?.sloPassed !== true ||
    !(Number.isFinite(backup?.rtoMinutes) && backup.rtoMinutes >= 0 && backup.rtoMinutes <= 60) ||
    !(Number.isFinite(backup?.rpoMinutes) && backup.rpoMinutes >= 0 && backup.rpoMinutes <= 5) ||
    backup?.assetParity !== true
  )
    failures.push('RESTORE_OBJECTIVES_UNVERIFIED');
  const rollback = evidence.gates?.find((gate) => gate.id === 'rollback');
  const rollbackBudget = rollback?.canaryBudget;
  if (
    rollback?.expandContractCompatible !== true ||
    rollback?.previousApiCompatible !== true ||
    rollback?.previousWorkerCompatible !== true ||
    typeof rollback?.previousSourceSha !== 'string' || !SHA.test(rollback.previousSourceSha) ||
    rollback.previousSourceSha === sha ||
    typeof rollback?.previousApiArtifactSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(rollback.previousApiArtifactSha256) ||
    typeof rollback?.previousWorkerArtifactSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(rollback.previousWorkerArtifactSha256) ||
    rollback?.ledgerPreserved !== true ||
    typeof rollback?.incidentOwner !== 'string' || !rollback.incidentOwner.trim() ||
    typeof rollbackBudget?.approvedBy !== 'string' || !rollbackBudget.approvedBy.trim() ||
    !Number.isSafeInteger(rollbackBudget?.maximumRequests) || rollbackBudget.maximumRequests < 1 ||
    !Number.isSafeInteger(rollbackBudget?.maximumConcurrency) || rollbackBudget.maximumConcurrency < 1 ||
    rollbackBudget.maximumConcurrency > rollbackBudget.maximumRequests ||
    !Number.isFinite(rollbackBudget?.durationSeconds) || rollbackBudget.durationSeconds <= 0 ||
    !Number.isSafeInteger(rollbackBudget?.maximumUnexpectedErrors) || rollbackBudget.maximumUnexpectedErrors < 0 ||
    rollbackBudget.maximumUnexpectedErrors > rollbackBudget.maximumRequests
  )
    failures.push('ROLLBACK_COMPATIBILITY_UNVERIFIED');
  const scenarios = [
    'country-program-scholarship-student',
    'course-enrollment-certificate',
    'service-invoice-fulfillment',
    'cms-public',
    'outbox-retry-lease',
  ];
  const canary = evidence.gates?.find((gate) => gate.id === 'cross-module-canary');
  if (
    scenarios.some(
      (id) =>
        !canary?.scenarios?.some(
          (row) =>
            row.id === id &&
            row.executed === true &&
            row.outcome === 'PASS' &&
            row.canonicalOwnerAssertions === true,
        ),
    )
  )
    failures.push('CROSS_MODULE_CANARY_INCOMPLETE');
  const load = evidence.gates?.find((gate) => gate.id === 'load-slo');
  for (const category of [
    'public-search',
    'scholarship-filters',
    'student-writes',
    'admin-scans',
    'imports',
    'finance-stub',
    'worker-queues',
  ]) {
    const rows = Array.isArray(load?.categories)
      ? load.categories.filter((row) => row?.id === category)
      : [];
    const row = rows[0];
    if (
      rows.length !== 1 ||
      !Number.isFinite(row.p95Ms) ||
      !Number.isFinite(row.p99Ms) ||
      !Number.isFinite(row.maximumP99Ms) ||
      row.p95Ms < 0 ||
      row.p99Ms < row.p95Ms ||
      row.maximumP99Ms <= 0 ||
      row.p99Ms > row.maximumP99Ms ||
      !Number.isFinite(row.durationSeconds) ||
      row.durationSeconds < 60 ||
      typeof row.fixture !== 'string' ||
      !row.fixture.trim() ||
      row.errorBudgetPassed !== true ||
      row.poolSaturationSafe !== true ||
      row.rateLimitSafe !== true ||
      row.queueLagSafe !== true
    )
      failures.push(`${category}:SLO_UNVERIFIED`);
  }
  const locale = evidence.gates?.find((gate) => gate.id === 'locale-indexing');
  if (
    !['ar', 'en'].every((code) =>
      locale?.locales?.some(
        (row) =>
          row.locale === code &&
          row.canonicalCorrect &&
          row.hreflangCorrect &&
          row.deepLinks &&
          row.unpublished404 &&
          row.privateDenied &&
          row.noPrototypeData &&
          row.accessible,
      ),
    )
  )
    failures.push('LOCALE_AND_INDEXING_UNVERIFIED');
  const markets = businessCoverage(
    evidence.authority?.markets ?? [],
    evidence.businessCoverage ?? [],
    sha,
  );
  if (!markets.launchScopeDeclared || !markets.mandatoryReady)
    failures.push('MANDATORY_MARKET_COVERAGE_UNVERIFIED');
  return failures;
}
