import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
async function runWithMutation(file, mutate) {
  const script = await readFile(path.join(root, 'scripts/verify-w11-source.mjs'), 'utf8');
  const fixture = await mkdtemp(path.join(tmpdir(), 'w11-contract-'));
  try {
    for (const match of script.matchAll(/read\('([^']+)'\)/g)) {
      const relative = match[1];
      let source = await readFile(path.join(root, relative), 'utf8');
      if (relative === file) source = mutate(source);
      const target = path.join(fixture, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, source);
    }
    return spawnSync(process.execPath, [path.join(root, 'scripts/verify-w11-source.mjs')], { cwd: fixture, encoding: 'utf8' });
  } finally { await rm(fixture, { recursive: true, force: true }); }
}

test('current W11 gate rejects dashboard reads before archived-owner admission', async () => {
  const result = await runWithMutation('packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts', source => source.replace(/(public async getDashboard\([^]*?)await this\.requireReadableWorkspace\(studentReferenceId\);/, '$1'));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /FAIL P15-READ-004/);
});
test('current W11 gate rejects missing certificate lifecycle projection handlers', async () => {
  const result = await runWithMutation('packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts', source => source.replaceAll("'CertificateArchived'", "'UnsupportedCertificateEvent'"));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /FAIL W11-IG-G-CONTRACT-GUARD/);
});
