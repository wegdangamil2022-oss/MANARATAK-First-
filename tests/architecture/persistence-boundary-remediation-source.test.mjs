import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = rel => readFileSync(join(root, rel), 'utf8');

test('ADR-028 chooses shared relational persistence with enforceable ownership', () => {
  const adr = read('docs/architecture/adr/ADR-028-Shared-Relational-Persistence-Boundary.md');
  assert.match(adr, /Select remediation option \*\*\(b\)\*\*/);
  assert.match(adr, /Direct ORM mutation of another Domain owner's model is forbidden/);
  assert.match(adr, /independent review remains an explicit closure requirement/);
});

test('persistence ownership verifier passes with complete model ownership and zero cross-owner writes', () => {
  const output = execFileSync(process.execPath, ['scripts/architecture/verify-persistence-boundaries.mjs'], { cwd: root, encoding: 'utf8' });
  const schema = read('packages/infrastructure/prisma/schema.prisma');
  const modelCount = [...schema.matchAll(/^model\s+\w+\s*\{/gm)].length;
  assert.match(output, new RegExp(`${modelCount}/${modelCount}`));
  assert.match(output, /direct cross-context ORM mutations = 0/);
  assert.match(output, /PERSISTENCE_BOUNDARY_VERIFIER = PASS/);
});

test('active phase implementation guides no longer prescribe executable @@schema mappings', () => {
  const files = [
    'docs/phases/phase-12-scholarships/phase-12-03-implementation-guide.md',
    'docs/phases/phase-09-tests-platform/phase-09-03-implementation-guide.md',
    'docs/phases/phase-13-learning-platform/phase-13-03-implementation-guide.md',
    'docs/phases/phase-10-major-platform/phase-10-03-implementation-guide.md',
    'docs/phases/phase-11-universities-institutions/phase-11-03-implementation-guide.md',
  ];
  for (const file of files) {
    const source = read(file);
    assert.match(source, /ADR-028 persistence note/);
    assert.doesNotMatch(source, /@@schema\("/);
    assert.doesNotMatch(source, /schemas\s*=\s*\[/);
  }
});
