import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  collectAdminBoundaryViolations,
  collectAIVendorViolations,
  collectCanonicalIdentityViolations,
  collectCertificateBoundaryViolations,
  collectPrismaBoundaryViolations,
  collectPublicFixtureViolations,
  collectStudentLocalStorageViolations,
  collectOperationalToolingViolations,
} from '../../scripts/architecture/source-architecture-guard-core.mjs';

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manaratak-p11-'));
  for (const [relative, source] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  return root;
}

function kinds(items) { return items.map((item) => item.kind); }

test('blocks Prisma outside Infrastructure but allows Infrastructure ownership adapter', () => {
  const root = fixture({
    'apps/web/src/leak.ts': "import { PrismaClient } from '@prisma/client'; new PrismaClient();",
    'packages/infrastructure/src/reference-data/Repo.ts': "import { PrismaClient } from '@prisma/client'; export class Repo {}",
    'apps/api/src/infrastructure/runtime/RuntimeResourceRegistry.ts': "import { PrismaClient } from '@prisma/client'; export class RuntimeResourceRegistry { get() { return new PrismaClient(); } }",
  });
  assert.deepEqual(kinds(collectPrismaBoundaryViolations(root)), ['cross-domain-prisma']);
});

test('blocks display-label equality used to resolve a relationship', () => {
  const root = fixture({
    'apps/web/src/features/public-template/components/Detail.tsx': "const target = links.find((link) => link.label === name);",
  });
  assert.ok(kinds(collectCanonicalIdentityViolations(root)).includes('name-based-relation'));
});

test('blocks live public mocks but allows the explicit prototype adapter', () => {
  const root = fixture({
    'apps/web/src/features/public-template/PublicTemplateApp.tsx': 'const live = MOCK_UNIVERSITIES;',
    'apps/web/src/features/public-template/publicPrototypeDataSource.ts': 'const preview = MOCK_UNIVERSITIES;',
    'apps/web/src/features/public-template/usePublicLiveData.ts': "if (dataMode === 'prototype') import('./publicPrototypeDataSource');",
  });
  assert.deepEqual(kinds(collectPublicFixtureViolations(root)), ['public-live-fixture']);
});

test('blocks localStorage as P15 live state', () => {
  const root = fixture({ 'apps/web/src/features/students/Workspace.tsx': "localStorage.setItem('saved', '1');" });
  assert.deepEqual(kinds(collectStudentLocalStorageViolations(root)), ['p15-localstorage']);
});

test('blocks Admin persistence and Application bypass imports', () => {
  const root = fixture({ 'apps/admin/src/page.tsx': "import { X } from '@manaratak/application'; import { PrismaClient } from '@prisma/client';" });
  assert.deepEqual(new Set(kinds(collectAdminBoundaryViolations(root))), new Set(['p23-application-bypass', 'p23-persistence-import']));
});

test('blocks AI vendor SDK/endpoints outside P17 and allows the ai-platform adapter', () => {
  const root = fixture({
    'packages/application/src/student-tools/Bad.ts': "import OpenAI from 'openai'; const url='https://api.openai.com/v1';",
    'packages/infrastructure/src/ai-platform/Provider.ts': "const url='https://api.openai.com/v1';",
  });
  assert.equal(collectAIVendorViolations(root).length, 2);
});

test('blocks certificate generation inside P13', () => {
  const root = fixture({ 'packages/application/src/courses/Bad.ts': 'issueCertificate(courseId);' });
  assert.ok(kinds(collectCertificateBoundaryViolations(root)).includes('p13-certificate-authority'));
});


test('scripts/** rejects unclassified direct Prisma and presentation bypasses', () => {
  const root = fixture({
    'scripts/architecture/operational-tooling-boundary.json': JSON.stringify({ classifiedDirectPrismaScripts: [] }),
    'scripts/bad-db.mjs': "import { PrismaClient } from '@prisma/client'; new PrismaClient();",
    'scripts/bad-ui.mjs': "import x from '../apps/web/src/thing.ts';",
  });
  const found = new Set(kinds(collectOperationalToolingViolations(root)));
  assert.ok(found.has('operational-prisma-unclassified'));
  assert.ok(found.has('operational-presentation-bypass'));
});

test('scripts/** permits explicitly classified direct Prisma tooling', () => {
  const root = fixture({
    'scripts/architecture/operational-tooling-boundary.json': JSON.stringify({ classifiedDirectPrismaScripts: ['scripts/database/tool.mjs'] }),
    'scripts/database/tool.mjs': "import { PrismaClient } from '@prisma/client'; new PrismaClient();",
  });
  assert.deepEqual(collectOperationalToolingViolations(root), []);
});
