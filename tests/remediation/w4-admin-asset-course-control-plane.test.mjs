import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function loadTsModule(relPath, requireMap = {}) {
  const source = read(relPath);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (id in requireMap) return requireMap[id];
    throw new Error(`UNEXPECTED_REQUIRE:${id}`);
  };
  vm.runInThisContext(`(function(require,exports,module){${js}\n})`, { filename: relPath })(localRequire, module.exports, module);
  return module.exports;
}

class AssetId { constructor(value) { this.value = value; } }
const AssetLifecycleState = { ACTIVE: 'ACTIVE', QUARANTINED: 'QUARANTINED', ARCHIVED: 'ARCHIVED', DELETED: 'DELETED', PURGED: 'PURGED' };
const AssetSecurityClassification = { PUBLIC: 'PUBLIC', INTERNAL: 'INTERNAL', RESTRICTED: 'RESTRICTED', CONFIDENTIAL: 'CONFIDENTIAL' };

test('MNT-AUD-0026 AssetReferencePolicy enforces owner, lifecycle, classification and MIME role', async () => {
  const { AssetReferencePolicy } = loadTsModule('packages/application/src/asset-platform/AssetReferencePolicy.ts', {
    '@manaratak/domain': { AssetId, AssetLifecycleState, AssetSecurityClassification },
  });
  const records = new Map([
    ['img', { state: 'ACTIVE', classification: 'PUBLIC', owner: { ownerId: 'student-1', ownerType: 'STUDENT' }, metadata: { mimeType: 'image/png' } }],
    ['pdf', { state: 'ACTIVE', classification: 'PUBLIC', owner: { ownerId: 'student-1', ownerType: 'STUDENT' }, metadata: { mimeType: 'application/pdf' } }],
  ]);
  const policy = new AssetReferencePolicy({ findById: async (id) => records.get(id.value) ?? null });
  await assert.doesNotReject(policy.assertUsable('img', { purpose: 'STUDENT_AVATAR', expectedOwnerId: 'student-1', allowedOwnerTypes: ['STUDENT'], allowedMimeTypePrefixes: ['image/'] }));
  await assert.rejects(policy.assertUsable('pdf', { purpose: 'STUDENT_AVATAR', expectedOwnerId: 'student-1', allowedOwnerTypes: ['STUDENT'], allowedMimeTypePrefixes: ['image/'] }), /ASSET_MIME_NOT_ALLOWED/);
});

test('MNT-AUD-0026 Admin Asset Center exposes governed query/detail/picker/preview/audit surfaces', () => {
  const repo = read('packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts');
  const router = read('apps/api/src/presentation/api/router/AssetPlatformRouter.ts');
  const picker = read('apps/admin/src/components/AssetPicker.tsx');
  const app = read('apps/api/src/app.ts');
  for (const token of ['securityClassification', 'createdFrom', 'createdTo', 'mimeTypePrefix', 'q', 'cursor']) assert.match(repo, new RegExp(token));
  assert.match(router, /router\.get\('\/'/);
  assert.match(router, /router\.get\('\/:assetId'/);
  assert.match(router, /delivery-grant/);
  assert.match(router, /selection-audit/);
  assert.match(picker, /lifecycleState: 'ACTIVE'/);
  assert.match(picker, /mimeTypePrefix/);
  assert.match(picker, /delivery-grant/);
  assert.match(picker, /selection-audit/);
  assert.match(app, /admin\/assets'.*admin:assets:manage/s);
});

test('MNT-AUD-0026 shared governed selection is wired to Course, CMS, Certificate and Student avatar workflows', () => {
  const course = read('apps/admin/src/pages/CourseDetailPage.tsx');
  const cms = read('apps/admin/src/pages/CmsAdminPage.tsx');
  const certificate = read('apps/admin/src/pages/CertificateAdminPage.tsx');
  const student = read('apps/web/src/features/students/StudentWorkspacePage.tsx');
  assert.match(course, /AssetPicker[^>]+COURSE_LESSON_MEDIA/);
  assert.match(course, /mimeTypePrefix=\{courseAssetMimePrefix\[assetDraft\.assetType\]\}/);
  assert.match(cms, /AssetPicker[^>]+CMS_FEATURED_ASSET/);
  assert.match(cms, /AssetPicker[^>]+CMS_ATTACHMENT_ASSET/);
  assert.match(certificate, /AssetPicker[^>]+CERTIFICATE_TEMPLATE_LOGO/);
  assert.match(student, /StudentAvatarAssetPicker/);
  assert.match(student, /listMyActiveStudentAssets\('image\/'\)/);
});

test('MNT-AUD-0027 canonical Admin can create a native course and hand off to authoritative editor', () => {
  const ui = read('apps/admin/src/pages/CourseListPage.tsx');
  const router = read('apps/api/src/presentation/api/router/CourseAdminRouter.ts');
  const app = read('apps/api/src/app.ts');
  assert.match(ui, /Create native course/);
  assert.match(ui, /request<\{ id: string \}>\('\/admin\/courses', \{ method: 'POST'/);
  assert.match(ui, /navigate\(`\/courses\/\$\{created\.id\}`\)/);
  for (const field of ['titleAr', 'accessType', 'learningLanguage', 'category', 'difficultyLevel']) assert.match(ui, new RegExp(field));
  assert.match(router, /nativeCreateBodySchema/);
  assert.match(router, /router\.post\('\/',/);
  assert.match(router, /nativeCourseUseCases\.create/);
  assert.match(app, /admin\/courses'.*admin:courses:manage/s);
  assert.match(app, /new MutationAuditMiddleware\(auditRecordRepository, 'ADMIN'\)/);
});

test('MNT-AUD-0033 public composition has no duplicate P23 visibility authority', () => {
  const p24 = read('docs/phases/phase-24-enterprise-public-platform/phase-24-02-enterprise-public-platform-structure-contracts.md');
  const p23 = read('docs/phases/phase-23-enterprise-administration-portal/phase-23-02-enterprise-administration-portal-structure-contracts.md');
  const matrix = read('docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md');
  assert.doesNotMatch(p24, /export interface IPublicVisibilityControl/);
  assert.match(p24, /IPublicCompositionSourceGovernance/);
  assert.match(p24, /Phase 16 CMS navigation and published block\/content lifecycle/);
  assert.match(p23, /ownsIndependentVisibilityStore: boolean; \/\/ false/);
  assert.match(matrix, /R-069 .* Public visibility\/composition governance/);
});
