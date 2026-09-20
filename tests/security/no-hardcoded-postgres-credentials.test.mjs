import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const scanRoots = ['scripts', 'apps', 'packages'];
const textualExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const excludedDirectories = new Set(['.git', 'node_modules', 'dist', 'work', 'coverage', 'test', 'tests', '__tests__']);
const postgresUri = /postgres(?:ql)?:\/\/([^:/\s${}]+):([^@/\s${}]+)@([^/\s${}]+)/gi;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return excludedDirectories.has(entry.name) ? [] : walk(path.join(directory, entry.name));
    }
    return textualExtensions.has(path.extname(entry.name)) ? [path.join(directory, entry.name)] : [];
  });
}

function allowedLocalPlaceholder(user, password, host) {
  return user === 'postgres'
    && password === 'postgres'
    && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
}

test('current tree contains no hardcoded PostgreSQL credentials', () => {
  const violations = [];
  for (const scanRoot of scanRoots) {
    const directory = path.join(root, scanRoot);
    if (!fs.existsSync(directory)) continue;
    for (const file of walk(directory)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(postgresUri)) {
      const [, user, password, host] = match;
      if (!allowedLocalPlaceholder(user, password, host)) {
        violations.push(path.relative(root, file));
      }
    }
    }
  }
  assert.deepEqual([...new Set(violations)], [], 'Remove hardcoded PostgreSQL credentials; use environment variables instead.');
});
