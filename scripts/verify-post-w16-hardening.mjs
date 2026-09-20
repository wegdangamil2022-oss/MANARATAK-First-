#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
const web = read('apps/web/src/features/students/StudentWorkspacePage.tsx');
const client = read('apps/web/src/api/client.ts');
const studentRouter = read('apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts');
const studentUseCases = read('packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts');
const studentRepository = read('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts');
const scholarshipRepository = read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts');
const scholarshipUi = read('apps/web/src/features/admin-preview/AdminScholarshipsPreviewPage.tsx');
const runner = read('scripts/run-remediation-verifiers.mjs');
const ci = read('.github/workflows/ci.yml');
const baseline = read('scripts/quality/source-quality-baseline.json');
const handoff = read('docs/governance/audits/remediation/W16_FINAL_SOURCE_CLOSURE_AND_RUNTIME_HANDOFF.md');

const checks = [
  ['privacy client route', client.includes('/student/privacy-consent') && web.includes('updateMyStudentPrivacyConsent')],
  ['privacy absent from generic mutation', !web.slice(web.indexOf('updateMyStudentWorkspace'), web.indexOf('updateMyStudentPrivacyConsent')).includes('privacyPreferences')],
  ['generic workspace rejects unknown privacy field', studentRouter.includes('privacyPreferences is intentionally rejected; use PUT /student/privacy-consent') && studentRouter.includes('}).strict();')],
  ['consent application guard remains authoritative', studentUseCases.includes('STUDENT_PRIVACY_CONSENT_COMMAND_REQUIRED')],
  ['public collection schema hides type', !studentRouter.slice(studentRouter.indexOf('const collectionSchema'), studentRouter.indexOf("router.use(")).includes('type:')],
  ['repository fixes PERSONAL after caller data', studentRepository.includes('...data, type: StudentCollectionType.PERSONAL')],
  ['scholarship filtering precedes pagination', scholarshipRepository.indexOf('if (filters.query)') < scholarshipRepository.indexOf('skip: (page - 1) * pageSize')],
  ['admin UI has no page-local filtering', !scholarshipUi.includes('items = items.filter') && scholarshipUi.includes('setTotal(res.total)')],
  ['summary is server-derived', scholarshipUi.includes('getAdminScholarshipSummary') && scholarshipRepository.includes('async getAdminSummary()')],
  ['remediation runner executes W0 through W16', runner.includes('Array.from({ length: 16 }') && runner.includes('verify-w16-final-closure.mjs') && runner.includes('spawnSync')],
  ['CI invokes remediation gate', ci.includes('npm run remediation:verify')],
  ['accessibility debt removed after semantic button', scholarshipUi.includes('<button\n            type="button"') && !baseline.includes('a11y-click-keyboard')],
  ['package cycle debt removed', !baseline.includes('package-cycle:@manaratak/application <-> @manaratak/infrastructure')],
  ['runtime boundary preserved', handoff.includes('PENDING_GOOGLE_STUDIO')],
];
let failures = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures += 1; }
if (failures) process.exit(1);
console.log(`POST_W16_HARDENING_VERIFIER=PASS ${checks.length}/${checks.length}`);
