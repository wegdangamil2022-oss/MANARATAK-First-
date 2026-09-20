import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('MNT-AUD-0110 audit HTTP surface is read-only and persistence is append-only', () => {
  const router = read('apps/api/src/presentation/api/router/AuditRouter.ts');
  assert.doesNotMatch(router, /router\.post\('\/records'/);
  assert.match(router, /router\.get\('\/records'/);

  const useCase = read('packages/application/src/audit/use-cases/ManageAuditRecordsUseCase.ts');
  assert.doesNotMatch(useCase, /createAuditRecord\(/);

  const prisma = read('packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts');
  assert.doesNotMatch(prisma, /auditRecord\.upsert/);
  assert.match(prisma, /auditRecord\.create\(\{ data \}\)/);
  assert.match(prisma, /AUDIT_APPEND_ONLY_DUPLICATE/);

  const inMemory = read('packages/infrastructure/src/audit/InMemoryAuditRecordRepository.ts');
  assert.match(inMemory, /this\.records\.has\(id\)/);
  assert.match(inMemory, /AUDIT_APPEND_ONLY_DUPLICATE/);
});

test('MNT-AUD-0106 authenticated Admin actor is server-owned and required', () => {
  const helper = read('apps/api/src/presentation/audit/AuditHelper.ts');
  assert.match(helper, /getAuthenticatedPrincipal\(req\)/);
  assert.match(helper, /AUDIT_AUTHENTICATED_PRINCIPAL_REQUIRED/);
  assert.doesNotMatch(helper, /req as any\)\.user/);

  const authz = read('apps/api/src/presentation/api/router/AuthorizationAdminRouter.ts');
  assert.match(authz, /requireAuthenticatedPrincipal\(req\)/);
  assert.doesNotMatch(authz, /\|\| 'SYSTEM'/);
  assert.doesNotMatch(authz, /req as any\)\.user/);

  const middleware = read('apps/api/src/presentation/audit/MutationAuditMiddleware.ts');
  assert.match(middleware, /this\.scope === 'AUTH' \? 'OPTIONAL' : 'REQUIRED'/);
});

test('MNT-AUD-0084 all Admin mutations are audited by default', () => {
  const policy = read('apps/api/src/presentation/audit/MutationAuditMiddleware.ts');
  assert.match(policy, /return 'STANDARD_AUDIT_REQUIRED';/);
  for (const area of ['/admin/scholarships', '/admin/courses', '/admin/certificates', '/admin/cms', '/admin/services', '/admin/finance', '/admin/careers', '/admin/ai', '/admin/student-tools']) {
    assert.ok(policy.includes(`'${area}'`), `missing critical Admin area ${area}`);
  }
  assert.match(policy, /ADMIN_EXEMPTIONS/);
  assert.match(policy, /\/preview\$/);
});
