#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const assertions = [];
const check = (name, condition, detail = '') => assertions.push({ name, condition: Boolean(condition), detail });
const has = (relative, marker) => exists(relative) && read(relative).includes(marker);

const core = 'scripts/architecture/source-architecture-guard-core.mjs';
const guard = 'scripts/architecture/verify-source-architecture-guards.mjs';
const guardTests = 'tests/architecture/source-architecture-guard-contracts.test.mjs';
const workflow = '.github/workflows/source-architecture-guards.yml';
const matrix = 'docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md';
const closure = 'docs/remediation/p11/P11_SOURCE_ARCHITECTURE_GUARDS_CLOSURE_2026-09-03.md';
const universityDetail = 'apps/web/src/features/public-template/components/UniversityDetailModal.tsx';
const packageJson = 'package.json';

check('P11-FILES-001 guard core exists', exists(core));
check('P11-FILES-002 executable guard exists', exists(guard));
check('P11-FILES-003 negative contract test exists', exists(guardTests));
check('P11-FILES-004 CI workflow exists', exists(workflow));
check('P11-FILES-005 closure record exists', exists(closure));

for (const marker of [
  'collectPrismaBoundaryViolations',
  'collectCanonicalIdentityViolations',
  'collectPublicFixtureViolations',
  'collectStudentLocalStorageViolations',
  'collectAdminBoundaryViolations',
  'collectAIVendorViolations',
  'collectCertificateBoundaryViolations',
  'collectAuthorityDocumentViolations',
  'collectMatrixContractViolations',
]) check(`P11-GUARD-${marker}`, has(core, marker));

check('P11-GUARD-PRISMA owner boundary is explicit', has(core, "relative.startsWith('packages/infrastructure/src/')") && has(core, "apps/api/src/infrastructure/di/container.ts"));
check('P11-GUARD-P15 localStorage guard is scoped to student live source', has(core, 'apps/web/src/features/students') && has(core, 'p15-localstorage'));
check('P11-GUARD-P23 control-plane blocks persistence/Application bypass', has(core, 'p23-persistence-import') && has(core, 'p23-application-bypass'));
check('P11-GUARD-P17 AI vendor authority is explicit', has(core, 'ai-vendor-outside-p17') && has(core, "relative.includes('/src/ai-platform/')"));
check('P11-GUARD-P13P14 certificate generation is rejected in P13', has(core, 'p13-certificate-authority') && has(core, 'COURSE_COMPLETED_EVENT_TYPE') && has(core, 'LEARNING_PATH_COMPLETED_EVENT_TYPE'));
check('P11-GUARD-AUTHORITY authoritative architecture documents are guarded', has(core, 'Enterprise-Domain-Ownership-Matrix-v1.0.md') && has(core, 'Enterprise-API-Registry-v1.0.md') && has(core, 'Enterprise-Event-Catalog-v1.0.md'));
check('P11-GUARD-MATRIX R-001→R-068 contract is asserted', has(core, 'index <= 68') && has(core, 'matrix-source-gap'));

check('P11-REPAIR-001 University major navigation uses canonical majorId directly', has(universityDetail, 'university.studyPrograms.majorLinks?.length') && has(universityDetail, 'onOpenMajor?.(major.majorId)'));
check('P11-REPAIR-002 University test navigation uses canonical examId directly', has(universityDetail, 'language.acceptedTestLinks?.length') && has(universityDetail, 'onOpenExam?.(test.examId)'));
check('P11-REPAIR-003 label equality lookup removed from University relationships', !/\.find\([\s\S]{0,180}\.label\s*===/u.test(read(universityDetail)));

check('P11-TEST-001 negative test covers Prisma', has(guardTests, 'blocks Prisma outside Infrastructure'));
check('P11-TEST-002 negative test covers name relation', has(guardTests, 'blocks display-label equality'));
check('P11-TEST-003 negative test covers Public mocks', has(guardTests, 'blocks live public mocks'));
check('P11-TEST-004 negative test covers P15 localStorage', has(guardTests, 'blocks localStorage as P15 live state'));
check('P11-TEST-005 negative test covers P23 bypass', has(guardTests, 'blocks Admin persistence and Application bypass imports'));
check('P11-TEST-006 negative test covers P17 vendor isolation', has(guardTests, 'blocks AI vendor SDK/endpoints outside P17'));
check('P11-TEST-007 negative test covers P13 certificate authority', has(guardTests, 'blocks certificate generation inside P13'));

const workflowText = read(workflow);
check('P11-CI-001 workflow runs architecture guard', workflowText.includes('node scripts/architecture/verify-source-architecture-guards.mjs'));
check('P11-CI-002 workflow runs negative guard tests', workflowText.includes('node --test tests/architecture/source-architecture-guard-contracts.test.mjs'));
check('P11-CI-003 workflow runs cycle/source-quality gate', workflowText.includes('node scripts/quality/verify-source-quality.mjs'));
check('P11-CI-004 workflow requires no database/service', !/postgres|redis|DATABASE_URL|services:/u.test(workflowText));

const pkg = read(packageJson);
check('P11-PKG-001 guard test script exists', pkg.includes('"phase11:guards:test": "node --test tests/architecture/source-architecture-guard-contracts.test.mjs"'));
check('P11-PKG-002 guard verify script chains architecture/tests/cycles', pkg.includes('"phase11:guards:verify": "node scripts/architecture/verify-source-architecture-guards.mjs && npm run phase11:guards:test && node scripts/quality/verify-source-quality.mjs"'));
check('P11-PKG-003 plan verifier script exists', pkg.includes('"phase11:plan:verify": "node scripts/verify-p11-plan-closure.mjs"'));

const matrixText = read(matrix);
check('P11-MATRIX-001 matrix is current source-rebaseline authority', /\*\*Status:\*\* ACTIVE — SOURCE_REBASELINED \/ RUNTIME_EVIDENCE_PENDING/.test(matrixText) && /\*\*Version:\*\* 3\.0\.0-source-rebaselined/.test(matrixText));
check('P11-MATRIX-002 P11 closure mapping recorded', matrixText.includes('**P11:** **CLOSED (source)**'));
check('P11-MATRIX-003 no relationship regressed to Missing', !matrixText.split('\n').some((line) => /^\| R-\d{3} \|/u.test(line) && line.includes('| Missing |')));
for (let index = 1; index <= 68; index += 1) {
  const id = `R-${String(index).padStart(3, '0')}`;
  check(`P11-MATRIX-ROW ${id}`, matrixText.split('\n').some((line) => line.startsWith(`| ${id} |`)));
}

check('P11-DOC-001 closure status is conservative', has(closure, 'SOURCE CLOSED / RUNTIME PENDING'));
check('P11-DOC-002 no migration claim', has(closure, 'does not apply migrations') && has(closure, 'No live migration'));
check('P11-DOC-003 real repaired violation documented', has(closure, 'display `label` matched') && has(closure, 'canonical `majorLinks`'));

function run(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  check(name, result.status === 0, output.trim().slice(-1200));
  return output;
}

const guardOutput = run('P11-RUN-001 architecture guard passes current source', [guard]);
check('P11-RUN-001A architecture guard emits PASS marker', guardOutput.includes('SOURCE_ARCHITECTURE_GUARD=PASS'));
const testOutput = run('P11-RUN-002 negative guard contracts pass', ['--test', '--test-reporter=tap', guardTests]);
const guardPassCount = Number(testOutput.match(/# pass (\d+)\b/u)?.[1] ?? 0);
check('P11-RUN-002A negative guard suite fully passes', guardPassCount >= 9 && /# fail 0\b/u.test(testOutput));
const qualityOutput = run('P11-RUN-003 cycle/source-quality gate passes', ['scripts/quality/verify-source-quality.mjs']);
check('P11-RUN-003A zero package cycles', qualityOutput.includes('SOURCE_QUALITY_PACKAGE_CYCLES=0'));
check('P11-RUN-003B zero file cycles', qualityOutput.includes('SOURCE_QUALITY_FILE_CYCLES=0'));

let failed = 0;
for (const item of assertions) {
  if (item.condition) console.log(`PASS ${item.name}`);
  else {
    failed += 1;
    console.error(`FAIL ${item.name}${item.detail ? ` :: ${item.detail}` : ''}`);
  }
}
console.log(`P11_PLAN_CLOSURE=${assertions.length - failed}/${assertions.length}`);
console.log(`P11_SOURCE_CLOSED=${failed ? 'NO' : 'YES'}`);
process.exitCode = failed ? 1 : 0;
