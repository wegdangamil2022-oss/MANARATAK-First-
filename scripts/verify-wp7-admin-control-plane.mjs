import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const webRouter = read('apps/web/src/router/index.tsx');
const apiApp = read('apps/api/src/app.ts');
const testDetail = read('apps/admin/src/pages/InternationalTestDetailPage.tsx');
const adminClient = read('apps/admin/src/api/client.ts');
const testRouter = read('apps/api/src/presentation/api/router/InternationalTestAdminRouter.ts');
const majorRouter = read('apps/api/src/presentation/api/router/MajorAdminRouter.ts');

const adminSourceFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (/\.tsx?$/.test(entry.name)) adminSourceFiles.push(target);
  }
};
walk(path.join(process.cwd(), 'apps', 'admin', 'src'));

const directPrismaImports = adminSourceFiles.filter((file) => /@prisma\/client|\bPrismaClient\b/.test(fs.readFileSync(file, 'utf8')));
const duplicateDetailMethods = [
  'listInternationalTestVariants',
  'listInternationalTestSections',
  'listInternationalTestAvailability',
  'listInternationalTestPreparationMaterials',
  'listInternationalTestEvidence',
].filter((method) => testDetail.includes(method) || adminClient.includes(`${method}(`));
const guards = [
  'admin:reference-data:manage',
  'admin:academic-taxonomy:manage',
  'admin:international-tests:manage',
  'admin:majors:manage',
  'admin:universities:manage',
].filter((permission) => apiApp.includes(permission));

const report = {
  canonicalAdminBoundary: webRouter.includes('return <CanonicalAdminRedirect legacyPath={location.pathname} />'),
  previewFallbackDisabled: webRouter.includes('if (!hasExternalAdminUrl) return <CanonicalAdminUnavailable />'),
  directPrismaImports,
  backendPermissionGuards: guards.length,
  adminMutationAudit: apiApp.includes("new MutationAuditMiddleware(auditRecordRepository, 'ADMIN').generate()"),
  duplicateInternationalTestDetailMethods: duplicateDetailMethods,
  initialInternationalTestDetailRequests: (testDetail.match(/getInternationalTest(?:<[^>]+>)?\(/g) || []).length,
  internationalTestMaxPageSize100: /Math\.min\(Math\.max\(parseInt\(value, 10\), 1\), 100\)/.test(testRouter),
  majorMaxPageSize100: /\.max\(100\)/.test(majorRouter),
};

console.log(JSON.stringify(report, null, 2));
if (
  !report.canonicalAdminBoundary || !report.previewFallbackDisabled || directPrismaImports.length ||
  guards.length !== 5 || !report.adminMutationAudit || duplicateDetailMethods.length ||
  report.initialInternationalTestDetailRequests !== 1 || !report.internationalTestMaxPageSize100 ||
  !report.majorMaxPageSize100
) process.exitCode = 1;
