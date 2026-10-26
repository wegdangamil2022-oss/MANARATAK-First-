import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// These hashes are the already applied original development ledger, not a
// normalized SQL representation. No database connection is made by this test.
const applied = [
  ['20261024000100_executive_dashboard_analytics', 'b6f6580c2a4b48407116451757462f276b604dc53cd794e10e1330d74d0386d5'],
  ['20261024000200_review_workspace', 'b144c4f796cd19f5591de052d4cf06130aa63e34c1b9b749142169a237c6d407'],
  ['20261025210000_course_lesson_content_blocks', '38d827e8e7164b52cf71b8af06f53394c9fc6c45f7d8632d6aac30a638c4987c'],
];
for (const [name, expected] of applied) {
  test(`applied migration survives an autocrlf checkout: ${name}`, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'manaratak-migration-bytes-'));
    const file = `packages/infrastructure/prisma/migrations/${name}/migration.sql`;
    const original = fs.readFileSync(file);
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    const git = args => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
    try {
      assert.equal(digest(original), expected);
      git(['init', '--quiet']);
      git(['config', 'core.autocrlf', 'true']);
      fs.copyFileSync('.gitattributes', path.join(directory, '.gitattributes'));
      fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
      fs.writeFileSync(path.join(directory, file), original);
      git(['add', '.gitattributes', file]);
      assert.equal(digest(git(['show', `:${file}`])), expected);
      fs.unlinkSync(path.join(directory, file));
      git(['checkout', '--', file]);
      assert.equal(digest(fs.readFileSync(path.join(directory, file))), expected);
    } finally {
      // Only this newly created temporary fixture is removed.
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}
