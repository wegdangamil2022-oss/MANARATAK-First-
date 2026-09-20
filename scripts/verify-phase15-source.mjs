import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const hasRoute = (source, method, path) => new RegExp(`router\\.${method}\\s*\\(\\s*['\"]${path.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}['\"]`, 'm').test(source);
const checks = [
  ['domain lifecycle', 'packages/domain/src/students/index.ts', (s) => s.includes('StudentWorkspaceStatus')],
  ['privacy consent contract', 'packages/domain/src/students/index.ts', (s) => s.includes('StudentPrivacyConsentDecisionDto')],
  ['database inbox', 'packages/infrastructure/prisma/schema.prisma', (s) => s.includes('model StudentWorkspaceEventInbox')],
  ['database consent ledger', 'packages/infrastructure/prisma/schema.prisma', (s) => s.includes('model StudentPrivacyConsentDecision')],
  ['database statistics', 'packages/infrastructure/prisma/schema.prisma', (s) => s.includes('model StudentPersonalStatistics')],
  ['lifecycle events', 'packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts', (s) => s.includes('StudentIdentitySuspended') && s.includes('StudentIdentityArchived')],
  ['deduplicated inbox', 'packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts', (s) => s.includes('ingestIntegrationEvent') && s.includes('eventId: event.eventId')],
  ['tenant isolation', 'apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts', (s) => s.includes('STUDENT_WORKSPACE_ACCESS_DENIED')],
  ['optimistic concurrency', 'packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts', (s) => s.includes('STUDENT_WORKSPACE_VERSION_CONFLICT')],
  ['snapshot restore', 'packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts', (s) => s.includes('restoreSnapshot')],
  ['identity-derived dashboard route', 'apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts', (s) => hasRoute(s, 'get', '/dashboard')],
  ['privacy consent route', 'apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts', (s) => hasRoute(s, 'put', '/privacy-consent')],
  ['distributed cache and realtime invalidation', 'packages/infrastructure/src/students/RedisStudentWorkspaceDeliveryCache.ts', (s) => s.includes('StudentWorkspaceInvalidated')],
  ['runtime runbook', 'docs/implementation-status/MANARATAK-Phase15-Student-Platform-Source-Closure-and-Google-Studio-Runbook.md', (s) => s.includes('SOURCE_COMPLETE_RUNTIME_PENDING')],
];
let failures = 0;
for (const [name, path, predicate] of checks) {
  const passed = predicate(read(path));
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failures++;
}
const repository = read('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts');
if (repository.includes('courseEnrollment.findMany') || repository.includes('certificate.findMany')) { console.error('FAIL cross-domain direct Prisma reads'); failures++; }
if (failures) process.exit(1);
console.log(`Phase 15 source verification passed (${checks.length}/${checks.length}).`);
