import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const verifier = fileURLToPath(
  new URL('../../scripts/verify/verify-final-repository-organization.mjs', import.meta.url),
);
function inspect(files = {}, directories = []) {
  const temporary = mkdtempSync(path.join(tmpdir(), 'absheer-organization-'));
  // Managed checkouts commonly live under /workspace; that parent directory
  // must not make the entire checkout look like the repository's datasets.
  const root = path.join(temporary, 'workspace', 'fixture');
  mkdirSync(root, { recursive: true });
  try {
    for (const directory of [
      'workspace/import-sources/international-tests/unified-56',
      'workspace/phase-10-major-catalogs',
      ...directories,
    ])
      mkdirSync(path.join(root, directory), { recursive: true });
    for (const [name, content] of Object.entries({
      'package.json': JSON.stringify({ workspaces: ['apps/*', 'packages/*'] }),
      'package-lock.json': '{}',
      'README.md': '# Fixture',
      ...files,
    })) {
      if (content === null) continue;
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      writeFileSync(path.join(root, name), content);
    }
    const result = spawnSync(process.execPath, [verifier], { cwd: root, encoding: 'utf8' });
    assert.equal(result.error, undefined);
    return { status: result.status, report: JSON.parse(result.stdout) };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

test('organization allows active workspace configuration and generated dependency/build directories', () => {
  const result = inspect(
    {
      'server.js': '',
      'metadata.json': '{}',
      '.env.compose.example': '',
      '.section16-vitest.config.ts': '',
    },
    ['config', 'vendor', 'storage', 'node_modules', 'release-artifacts'],
  );
  assert.equal(result.status, 0);
  assert.deepEqual(result.report.unexpectedRootDirectories, []);
});

test('review evidence logs are retained while temporary files remain errors', () => {
  assert.equal(
    inspect({
      'docs/remediation/evidence/review/tests.log': 'PASS',
      'docs/reviews/evidence/review/build.log': 'PASS',
    }).status,
    0,
  );
  const result = inspect({ 'docs/remediation/evidence/review/unfinished.tmp': 'temporary' });
  assert.equal(result.status, 1);
  assert.deepEqual(result.report.temporaryArtifacts, [
    'docs/remediation/evidence/review/unfinished.tmp',
  ]);
});

test('browser session files, retired lockfiles and a missing npm lockfile fail organization checks', () => {
  const retired = inspect({ 'cookies.txt': 'fixture', 'bun.lock': '{}' });
  assert.equal(retired.status, 1);
  assert.ok(retired.report.unexpectedRootFiles.includes('cookies.txt'));
  assert.deepEqual(retired.report.competingRootLockfiles, ['bun.lock']);
  const missing = inspect({ 'package-lock.json': null });
  assert.equal(missing.status, 1);
  assert.deepEqual(missing.report.activeLockfiles, []);
});

test('unknown source directories and broken imports and documentation links are still rejected', () => {
  const result = inspect(
    {
      'apps/web/src/app.ts': "import './missing';",
      'README.md': '[Missing](docs/missing.md)',
      'docs/operations/runbook.md': '[Missing entry point](../../retired-server.ts)',
    },
    ['obsolete-app'],
  );
  assert.equal(result.status, 1);
  assert.deepEqual(result.report.unexpectedRootDirectories, ['obsolete-app']);
  assert.equal(result.report.brokenRelativeImports.length, 1);
  assert.equal(result.report.brokenImportantLinks.length, 2);
});

test('source import checks ignore fixture strings and resolve declarations and future build outputs', () => {
  const result = inspect({
    'scripts/check.mjs': "import { value } from '../packages/config/dist/index.js'; const fixture = \"import './fictional';\";",
    'packages/config/src/index.ts': 'export const value = 1;',
    'vendor/library/types/index.d.ts': "export type { Entry } from './entry';",
    'vendor/library/types/entry.d.ts': 'export interface Entry { name: string }',
  });
  assert.equal(result.status, 0);
  assert.deepEqual(result.report.brokenRelativeImports, []);
});
