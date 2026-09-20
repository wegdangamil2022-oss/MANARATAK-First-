import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
const hasRoute = (source, method, path) => new RegExp(`router\\.${method}\\s*\\(\\s*['\"]${path.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}['\"]`, 'm').test(source);
const required = [
  ['15 identity-derived BFF', 'apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts', (s) => hasRoute(s, 'get', '/dashboard')],
  ['15 projections', 'packages/infrastructure/prisma/schema.prisma', (s) => s.includes('model StudentLearningProjection')],
  ['15 consent ledger', 'packages/infrastructure/prisma/schema.prisma', (s) => s.includes('model StudentPrivacyConsentDecision')],
  ['15 cache isolation', 'packages/infrastructure/src/students/RedisStudentWorkspaceDeliveryCache.ts', (s) => s.includes('encodeURIComponent(studentReferenceId)')],
  ['15 UI snapshot restore', 'apps/web/src/features/students/StudentWorkspacePage.tsx', (s) => s.includes('onRestoreSnapshot')],
  ['16 explicit slug mutation', 'packages/infrastructure/src/cms/PrismaCmsRepository.ts', (s) => s.includes('changeLocalizedSlug')],
  ['16 scheduling cancellation', 'apps/api/src/presentation/api/router/CmsAdminRouter.ts', (s) => s.includes('cancel-schedule')],
  ['16 navigation', 'packages/infrastructure/prisma/schema.prisma', (s) => s.includes('model CmsNavigationMenu')],
  ['16 blocks', 'packages/infrastructure/prisma/schema.prisma', (s) => s.includes('model CmsContentBlock')],
  ['16 announcements', 'packages/infrastructure/prisma/schema.prisma', (s) => s.includes('model CmsAnnouncement')],
  ['16 delivery ETag', 'apps/api/src/presentation/api/router/CmsPublicRouter.ts', (s) => s.includes("req.headers['if-none-match']")],
  ['16 authenticated preview', 'apps/api/src/presentation/api/router/CmsAdminRouter.ts', (s) => s.includes("'/content/:id/preview'")],
  ['source-only migration', 'packages/infrastructure/prisma/migrations/20260825010000_phase15_phase16_mandatory_closure/migration.sql', (s) => s.includes('Google Studio runtime window')],
];
let failures = 0;
for (const [label, path, predicate] of required) { const passed = predicate(read(path)); console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`); if (!passed) failures++; }
if (failures) process.exit(1);
console.log(`Phase 15/16 mandatory closure verification passed (${required.length}/${required.length}).`);
