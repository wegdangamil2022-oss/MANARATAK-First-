import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const useCases = read('packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts');
const repository = read('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts');
const router = read('apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts');
const domain = read('packages/domain/src/students/index.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const migration = read('packages/infrastructure/prisma/migrations/20260826034000_w11_student_lifecycle_consent_stats/migration.sql');
const phase15Verifier = read('scripts/verify-phase15-source.mjs');
const phase1516Verifier = read('scripts/verify-phase15-phase16-closure.mjs');
const courseCompletion = read('packages/domain/src/courses/events/CourseCompletedEvent.ts');
const certificateRepository = read('packages/infrastructure/src/certificates/PrismaCertificateRepository.ts');
const webClient = read('apps/web/src/api/client.ts');
const studentWeb = read('apps/web/src/features/students/StudentWorkspacePage.tsx');

const section = (source, start, end) => {
  const begin = source.indexOf(start);
  if (begin < 0) return '';
  const finish = source.indexOf(end, begin + start.length);
  return finish < 0 ? source.slice(begin) : source.slice(begin, finish);
};

const checks = [
  ['P15-INIT-001',
    !useCases.includes('getOrCreateWorkspace') &&
    useCases.includes('STUDENT_WORKSPACE_PROVISIONING_PENDING') &&
    repository.includes('status: StudentWorkspaceStatus.INITIALIZING') &&
    repository.includes("'StudentWorkspaceActivated'")],
  ['P15-LIFE-002',
    repository.includes("event.eventType === 'StudentIdentitySuspended'") &&
    repository.includes("event.eventType === 'StudentIdentityArchived'") &&
    repository.includes("'StudentWorkspaceSuspended'") && repository.includes("'StudentWorkspaceArchived'")],
  ['P15-SYNC-003',
    repository.includes('WORKSPACE_SYNC_BLOCKED_${workspace.status}') &&
    repository.includes('if (syncBlocked) return false;')],
  ['P15-READ-004',
    useCases.includes("workspace.status === StudentWorkspaceStatus.ARCHIVED") &&
    useCases.indexOf('await this.requireReadableWorkspace(studentReferenceId);') < useCases.indexOf('this.deliveryCache?.getDashboard(studentReferenceId)')],
  ['P15-CONSENT-007',
    domain.includes('StudentPrivacyConsentDecisionDto') && schema.includes('model StudentPrivacyConsentDecision') &&
    router.includes("'/privacy-consent'") && repository.includes("'StudentPrivacyConsentDecided'") &&
    repository.includes('beforePreferences') && repository.includes('afterPreferences') && repository.includes('changedFields')],
  ['P15-SNAP-005',
    section(repository, 'public async createSnapshot(', 'public async listSnapshots').includes('this.requireWritable(tx, studentReferenceId)')],
  ['P15-PRIV-006',
    !section(repository, 'public async createSnapshot(', 'public async listSnapshots').includes('privacyPreferences') &&
    !section(repository, 'public async restoreSnapshot(', 'public async resetLayout').includes('privacyPreferences')],
  ['P15-AUDIT-009',
    repository.includes("actorType: 'SYSTEM'") && repository.includes('sourceEventId: event.eventId') &&
    repository.includes('const principal: StudentAuditActor = actor ??')],
  ['P15-STATS-008',
    schema.includes('model StudentPersonalStatistics') && repository.includes('studentPersonalStatistics.findUnique') &&
    repository.includes('studentLearningProjection.aggregate') && repository.includes('refreshPersonalStatistics')],
  ['P15-QG-010',
    phase15Verifier.includes('const hasRoute =') && phase1516Verifier.includes('const hasRoute =') &&
    !phase15Verifier.includes("router.get('/dashboard'") && !phase1516Verifier.includes("router.get('/dashboard'")],
  ['W11-MIGRATION-GUARD',
    migration.includes('source-only migration') && migration.includes('DO NOT APPLY outside the Google Studio') &&
    migration.includes('No StudentPrivacyConsentDecision rows are fabricated')],
  ['W11-PRIVACY-GENERIC-WRITE-GUARD',
    useCases.includes('STUDENT_PRIVACY_CONSENT_COMMAND_REQUIRED') && repository.includes('STUDENT_PRIVACY_CONSENT_COMMAND_REQUIRED') &&
    router.includes('privacyPreferences is intentionally rejected; use PUT /student/privacy-consent') && router.includes('}).strict();')],
  ['W11-WEB-TO-CONSENT-CONTRACT',
    webClient.includes('/student/privacy-consent') && studentWeb.includes('updateMyStudentPrivacyConsent') &&
    studentWeb.indexOf('updateMyStudentWorkspace') < studentWeb.indexOf('updateMyStudentPrivacyConsent')],
  ['W11-IG-G-CONTRACT-GUARD',
    courseCompletion.includes("COURSE_COMPLETED_EVENT_TYPE = 'CourseCompleted'") &&
    certificateRepository.includes("schemaVersion: '2.0'") && certificateRepository.includes('studentReferenceId: certificate.studentReferenceId') &&
    repository.includes("['CourseEnrolled', 'CourseProgressUpdated', 'CourseCompleted']") && repository.includes("['CertificateIssued', 'CertificateRevoked', 'CertificateReissued']")],
];

let failures = 0;
for (const [id, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${id}`);
  if (!passed) failures += 1;
}
if (failures) process.exit(1);
console.log(`W11_SOURCE_VERIFIER=PASS ${checks.length}/${checks.length}`);
console.log('W11_RUNTIME_DB_PROOF=PENDING_GOOGLE_STUDIO');
