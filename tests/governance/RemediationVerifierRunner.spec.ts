import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('remediation verifier runner', () => {
  it('reports all failing source waves and skips final closure until they pass', () => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'manaratak-remediation-'));
    for (let index = 0; index <= 15; index += 1) {
      writeFileSync(path.join(fixture, `verify-w${index}-source.mjs`), index === 3 ? 'process.exit(7);' : index === 8 ? 'process.exit(9);' : 'process.exit(0);');
    }
    writeFileSync(path.join(fixture, 'verify-w16-final-closure.mjs'), 'process.exit(0);');
    const result = spawnSync(process.execPath, ['scripts/run-remediation-verifiers.mjs', '--verifier-dir', fixture], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('REMEDIATION_VERIFIER_FAILED=verify-w3-source.mjs EXIT_CODE=7');
    expect(result.stderr).toContain('REMEDIATION_VERIFIER_FAILED=verify-w8-source.mjs EXIT_CODE=9');
    expect(result.stderr).toContain('REMEDIATION_VERIFIERS=FAIL passed=14 failed=2');
    expect(result.stdout).toContain('REMEDIATION_FINAL_CLOSURE=SKIPPED_UNTIL_SOURCE_WAVES_PASS');
  }, 30000);
});

