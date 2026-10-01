import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('retired auth diagnostics and launchers fail before loading database or credential code', () => {
  for (const file of ['inspect_hash_format.ts', 'show-hash-format.ts', 'simulate_full_flow.ts', 'test-resend.ts', 'verify_credentials.ts', 'run-test-resend.js', 'run-show-hash-format.js']) {
    const source = readFileSync(`scripts/${file}`, 'utf8');
    assert.doesNotMatch(source, /@prisma\/client|\bfetch\s*\(|\bspawn\s*\(|password\s*:/i);
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /LEGACY_DIAGNOSTIC_DISABLED/);
  }
});

test('newly classified mutation tools keep their approval gates before constructing Prisma', () => {
  for (const file of ['rbac-baseline-provision.mjs', 'rotate-application-role.mjs']) {
    const source = readFileSync(`scripts/${file}`, 'utf8');
    assert.match(source, /requireDatabaseMutationGate/);
    const result = spawnSync(process.execPath, [`scripts/${file}`], { encoding: 'utf8', env: { PATH: process.env.PATH, NODE_ENV: 'test', ALLOW_DATABASE_MUTATIONS: 'NO' } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DATABASE_MUTATION_BLOCKED/);
    assert.doesNotMatch(result.stderr, /PrismaClientInitializationError|ECONNREFUSED/);
  }
});
