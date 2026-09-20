import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[
 ['P15 support detail contract', read('packages/domain/src/students/index.ts').includes('StudentSupportWorkspaceDetailDto')],
 ['P15 repository owns support detail', read('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts').includes('getSupportWorkspaceDetail')],
 ['Support detail exposes provisioning health', read('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts').includes('pendingEventCount') && read('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts').includes('failedEventCount')],
 ['Support detail exposes consent audit without preferences', read('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts').includes('consentAudit')],
 ['Support detail uses linked counts only', read('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts').includes('linkedSummaries')],
 ['Privileged support mutation has separate RBAC permission', read('apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts').includes("admin:students:support:mutate")],
 ['Support action requires audited reason', read('apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts').includes('STUDENT_SUPPORT_RESET_LAYOUT') && read('apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts').includes('reason: body.reason')],
 ['Admin UI hides privileged action without permission', read('apps/admin/src/pages/StudentSupportAdminPage.tsx').includes("hasPermission('admin:students:support:mutate')")],
 ['No impersonation endpoint in support router', !read('apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts').toLowerCase().includes('impersonat')],
];
let fail=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok)fail++;}
console.log(`W4 student support: ${checks.length-fail}/${checks.length}`); process.exitCode=fail?1:0;
