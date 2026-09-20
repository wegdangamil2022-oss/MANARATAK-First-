import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = rel => readFileSync(join(root, rel), 'utf8');
const walk = dir => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

test('production domain barrel no longer exports generated dummy authority', () => {
  const barrel = read('packages/domain/src/index.ts');
  assert.doesNotMatch(barrel, /generated\/dummy/);
  const runtimeFiles = [...walk(join(root, 'apps')), ...walk(join(root, 'packages'))]
    .filter(file => /\.(?:ts|tsx)$/.test(file) && !file.endsWith('generated/dummy.ts'));
  for (const file of runtimeFiles) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*generated\/dummy['"]/);
  }
});

test('canonical replacement contracts contain no permissive any or DUMMY lifecycle', () => {
  const files = walk(join(root, 'packages/domain/src/foundation-contracts')).filter(file => file.endsWith('.ts'));
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\bany\b/);
    assert.doesNotMatch(source, /\bDUMMY\b/);
    assert.doesNotMatch(source, /constructor\s*\(\.\.\./);
  }
});

test('active source contains no ts-nocheck suppressions', () => {
  const runtimeFiles = [...walk(join(root, 'apps')), ...walk(join(root, 'packages'))]
    .filter(file => /\.(?:ts|tsx)$/.test(file) && !file.includes('/generated/'));
  for (const file of runtimeFiles) assert.doesNotMatch(readFileSync(file, 'utf8'), /@ts-nocheck/);
});
