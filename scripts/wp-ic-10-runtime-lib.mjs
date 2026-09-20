import fs from 'node:fs';
import path from 'node:path';

export const WPIC10_HISTORICAL_PACKAGE_BASE_SHA = 'cd077d8ed6a193428f6d5ab4e3fc07e7bd4c8b27';
export const WPIC10_EXPECTED_ROWS = 3663;
export const WPIC10_HEADERS = Object.freeze([
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

export function normalizeBaseUrl(value) {
  const parsed = new URL(String(value ?? '').trim());
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
  if (parsed.username || parsed.password) throw new Error('WPIC10_BASE_URL_CREDENTIALS_FORBIDDEN');
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    throw new Error('WPIC10_BASE_URL_HTTPS_REQUIRED');
  }
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

export function gate(name, pass, detail, extra = {}) {
  return { name, pass: Boolean(pass), detail: String(detail ?? ''), ...extra };
}

export function declaresSupportedNodeEngine(value) {
  const minimumMajor = String(value ?? '').match(/>=\s*(\d+)/)?.[1];
  return minimumMajor !== undefined && Number(minimumMajor) >= 20;
}

export function validateMemoryResult(input) {
  const failures = [];
  if (Number(input.rowsObserved) !== Number(input.rowsExpected)) failures.push('ROW_COUNT_MISMATCH');
  if (JSON.stringify(input.headersObserved) !== JSON.stringify(input.headersExpected)) failures.push('HEADER_MISMATCH');
  if (Number(input.rssAfterMb) > Number(input.maxRssMb)) failures.push('RSS_LIMIT_EXCEEDED');
  if (Number(input.rssDeltaMb) > Number(input.maxDeltaMb)) failures.push('RSS_DELTA_LIMIT_EXCEEDED');
  return { pass: failures.length === 0, failures };
}

export function providerReplayForceReanalysisInvariant({ operationsSource, identityDiffSource }) {
  const canonicalOperationOwnsForceBranch =
    /analyzeBatch\s*\([^)]*options[^)]*\)[\s\S]{0,700}?options\.force[\s\S]{0,400}?identityDiff\.analyzeBatch\s*\(\s*batchId\s*,\s*\{\s*force\s*:\s*true\s*\}\s*\)/m.test(operationsSource);
  const identityDiffHonorsForce = /options\.force/.test(identityDiffSource);
  return canonicalOperationOwnsForceBranch && identityDiffHonorsForce;
}

export function securityAudit(repoRoot) {
  const required = {
    app: 'apps/api/src/app.ts',
    linkChecker: 'packages/infrastructure/src/courses/SafeImportedCourseLinkChecker.ts',
    coordinator: 'packages/application/src/courses/use-cases/CourseImportCoordinator.ts',
    seedPilot: 'scripts/wp-ic-08-course-seed-pilot.mjs',
    continuation: 'packages/application/src/courses/use-cases/CourseProviderContinuationUseCases.ts',
    operations: 'packages/application/src/courses/use-cases/CourseImportOperationsUseCases.ts',
    identityDiff: 'packages/application/src/courses/use-cases/CourseImportIdentityDiffUseCase.ts',
    importedAdmin: 'packages/application/src/courses/use-cases/ImportedCourseAdminUseCases.ts',
    parser: 'packages/application/src/courses/parsers/CourseMasterArtifactParser.ts',
    packageJson: 'package.json',
    archivedSessionTest: 'scripts/archive/remediation-root/test_session_manager.ts',
  };
  const text = {};
  const checks = [];
  for (const [key, relative] of Object.entries(required)) {
    const full = path.join(repoRoot, relative);
    const exists = fs.existsSync(full);
    checks.push(gate(`file:${relative}`, exists, exists ? 'present' : 'missing'));
    text[key] = exists ? fs.readFileSync(full, 'utf8') : '';
  }
  if (checks.some((item) => !item.pass)) return finishSecurity(checks);

  checks.push(gate(
    'admin-import-route-protected',
    /v1Router\.use\('\/admin\/imports\/courses',[\s\S]*requireAdminPermission\('admin:imports:manage'\)/.test(text.app),
    'course import operations remain behind admin authentication/RBAC',
  ));
  checks.push(gate(
    'link-checker-https-only',
    /COURSE_LINK_HTTPS_REQUIRED/.test(text.linkChecker),
    'direct-course verifier rejects non-HTTPS targets',
  ));
  checks.push(gate(
    'link-checker-domain-allowlist',
    /domainAllowed\(/.test(text.linkChecker) && /COURSE_LINK_DOMAIN_NOT_APPROVED/.test(text.linkChecker),
    'link checks are constrained to provider-approved domains',
  ));
  checks.push(gate(
    'link-checker-private-network-block',
    /COURSE_LINK_PRIVATE_(?:ADDRESS|DNS_TARGET)_BLOCKED/.test(text.linkChecker),
    'private and unsafe network targets remain blocked',
  ));
  checks.push(gate(
    'transfer-auto-publish-forbidden',
    /COURSE_IMPORT_TRANSFER_AUTO_PUBLISH_FORBIDDEN/.test(text.coordinator) && /COURSE_IMPORT_TARGET_PUBLICATION_LOCKED/.test(text.coordinator),
    'controlled transfer cannot publish or mutate a published target',
  ));
  checks.push(gate(
    'seed-explicit-confirmation',
    /WPIC08_CONFIRM_CONTROLLED_TRANSFER/.test(text.seedPilot) && /I_UNDERSTAND_THIS_MUTATES_CANONICAL_COURSES/.test(text.seedPilot),
    '3,663-course transfer still requires explicit destructive confirmation',
  ));
  checks.push(gate(
    'registered-connectors-only',
    /defaultCourseProviderConnectorRegistry/.test(text.continuation) && /COURSE_PROVIDER_CONNECTOR_(?:IMPLEMENTATION_)?NOT_REGISTERED/.test(text.continuation),
    'continuation sync uses the registered connector registry instead of arbitrary URLs',
  ));
  checks.push(gate(
    'provider-drift-halts-staging',
    /CourseProviderDriftError/.test(text.continuation) && /COURSE_PROVIDER_SOURCE_DRIFT_BLOCKED/.test(text.continuation),
    'source drift remains a blocking condition',
  ));
  checks.push(gate(
    'rate-safe-link-health',
    /MAX_LINK_HEALTH_JOB_SIZE\s*=\s*10/.test(text.continuation) && /MIN_LINK_HEALTH_DELAY_MS\s*=\s*750/.test(text.continuation),
    'bulk link verification remains bounded and rate-safe',
  ));

  checks.push(gate(
    'exact-master-column-contract',
    /COURSE_MASTER_COLUMN_CONTRACT_MISMATCH/.test(text.parser),
    'course master parser fails closed when the approved 11-column order changes',
  ));
  checks.push(gate(
    'manual-url-mutation-blocked',
    /IMPORTED_COURSE_DIRECT_URL_CHANGE_REQUIRES_CONTROLLED_IMPORT/.test(text.importedAdmin),
    'manual admin edits cannot bypass source identity and URL history lineage',
  ));
  checks.push(gate(
    'provider-replay-force-reanalysis',
    providerReplayForceReanalysisInvariant({
      operationsSource: text.operations,
      identityDiffSource: text.identityDiff,
    }),
    'Canonical CourseImportOperationsUseCases must preserve force re-analysis and the identity-diff implementation must honor options.force.',
  ));
  checks.push(gate(
    'archived-cloudsql-credentials-removed',
    !/postgresql:\/\/ai_studio_(?:admin|app_user):/i.test(text.archivedSessionTest) &&
      /TEST_SESSION_ADMIN_DATABASE_URL/.test(text.archivedSessionTest) &&
      /TEST_SESSION_APP_DATABASE_URL/.test(text.archivedSessionTest),
    'archived session diagnostic reads explicit environment URLs and contains no embedded Cloud SQL credentials',
  ));

  let pkg = {};
  try { pkg = JSON.parse(text.packageJson); } catch {}
  const scripts = pkg.scripts ?? {};
  checks.push(gate('node-engine', declaresSupportedNodeEngine(pkg.engines?.node), 'Node 20+ is declared'));
  for (const name of ['typecheck', 'lint', 'build', 'test:unit', 'test:database', 'e2e']) {
    checks.push(gate(`script:${name}`, typeof scripts[name] === 'string' && scripts[name].length > 0, `repository script ${name}`));
  }

  return finishSecurity(checks);
}

function finishSecurity(checks) {
  const failed = checks.filter((item) => !item.pass);
  return { pass: failed.length === 0, checks, failed: failed.map((item) => item.name) };
}

export function buildFinalReport(gateResults, { phase = 'source', runtimeGitSha = 'UNAVAILABLE' } = {}) {
  const sourceRequired = ['ciClosure', 'security', 'memory'];
  const runtimeRequired = ['database', 'backupRestore', 'browserE2E', 'runtimeSmoke'];
  const requiredNames = phase === 'runtime' ? [...sourceRequired, ...runtimeRequired] : sourceRequired;
  const deferredNames = phase === 'runtime' ? [] : runtimeRequired;
  const gates = [];

  for (const name of requiredNames) {
    const value = gateResults[name];
    const shaValid = value?.gitSha === runtimeGitSha;
    gates.push(!value
      ? { name, pass: false, state: 'NOT_RUN', detail: 'required result artifact missing' }
      : {
          name,
          pass: value.pass === true && shaValid,
          state: value.pass === true && shaValid ? 'PASS' : 'FAIL',
          detail: !value.gitSha ? 'artifact gitSha missing' : !shaValid ? 'artifact gitSha does not match finalization checkout' : value.detail ?? value.result ?? '',
          source: value.source ?? null,
        });
  }
  for (const name of deferredNames) {
    const value = gateResults[name];
    gates.push(value
      ? { name, pass: value.pass === true, state: value.pass === true ? 'PASS' : 'FAIL', detail: value.detail ?? value.result ?? '', source: value.source ?? null }
      : { name, pass: null, state: 'DEFERRED_TO_GOOGLE_STUDIO', detail: 'prepared in repository; execute only after Google Studio provides the runtime/database environment' });
  }

  const requiredPass = gates.filter((item) => requiredNames.includes(item.name)).every((item) => item.pass === true);
  const runtimeClosureState = !requiredPass
    ? 'BLOCKED'
    : phase === 'runtime'
      ? 'GOOGLE_STUDIO_RUNTIME_VERIFIED'
      : 'CODE_COMPLETE_READY_FOR_GOOGLE_STUDIO_INTEGRATION';
  return {
    version: 2,
    wp: 'WP-IC-10R1',
    phase,
    historicalPackageBaseSha: WPIC10_HISTORICAL_PACKAGE_BASE_SHA,
    runtimeGitSha,
    generatedAt: new Date().toISOString(),
    pass: requiredPass,
    runtimeClosureState,
    gates,
  };
}

export function renderFinalMarkdown(report) {
  const lines = [
    '# WP-IC-10R1 Runtime Closure Repair Status',
    '',
    `- Historical package base: \`${report.historicalPackageBaseSha}\``,
    `- Runtime Git SHA: \`${report.runtimeGitSha}\``,
    `- Generated: ${report.generatedAt}`,
    `- Result: **${report.runtimeClosureState}**`,
    '',
    '| Gate | State | Detail |',
    '|---|---|---|',
  ];
  for (const item of report.gates) {
    lines.push(`| ${item.name} | ${item.state} | ${String(item.detail ?? '').replace(/\|/g, '\\|')} |`);
  }
  lines.push('', report.runtimeClosureState === 'CODE_COMPLETE_READY_FOR_GOOGLE_STUDIO_INTEGRATION'
    ? 'Source, contract, build, unit, security, and parser-memory gates passed. Database integration, backup/restore, browser E2E, and runtime smoke are prepared but intentionally deferred until Google Studio provides the runtime/database environment.'
    : report.runtimeClosureState === 'GOOGLE_STUDIO_RUNTIME_VERIFIED'
      ? 'Google Studio runtime smoke passed after database/service integration. Imported-course runtime integration is verified.'
      : 'Do not treat imported courses as runtime-closed until every required gate passes.');
  return `${lines.join('\n')}\n`;
}

export function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
