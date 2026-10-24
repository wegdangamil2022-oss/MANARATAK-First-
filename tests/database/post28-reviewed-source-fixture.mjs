import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

// Historical acceptance applies to this exact source, never to later migrations.
export const REVIEWED_R06_SOURCE = 'e28e79883280963b9ac09675a0a0a10c08a60e15';
export function reviewedR06SourceFixture(root = process.cwd()) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'manaratak-reviewed-r06-'));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}).trim();
  assert.equal(git('rev-parse', `${REVIEWED_R06_SOURCE}^{commit}`), REVIEWED_R06_SOURCE);
  const common = fs.realpathSync(path.resolve(root, git('rev-parse', '--git-common-dir')));
  execFileSync('git', ['init', '--quiet', directory]);
  fs.writeFileSync(path.join(directory, '.git/objects/info/alternates'), path.join(common, 'objects').replaceAll('\\', '/') + '\n');
  execFileSync('git', ['-C', directory, 'update-ref', 'HEAD', REVIEWED_R06_SOURCE]);
  const files = git('ls-tree', '-r', '--name-only', REVIEWED_R06_SOURCE, '--',
    'packages/infrastructure/prisma', 'config/testing/post28-stage-disposition.json',
    'docs/reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure',
    'docs/reviews/evidence/post28/40f93b655c4835f669c6686d7301817f48f0e5c2/r05-historical',
    'docs/reviews/evidence/post28/dd1b122a6aad078c62b88fb5dffec7d1b0f9b91c/r05-local-closure').split('\n');
  for (const file of files) {
    const target = path.resolve(directory, file);
    assert.ok(target.startsWith(directory + path.sep));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, execFileSync('git', ['show', `${REVIEWED_R06_SOURCE}:${file}`], {cwd: root, maxBuffer: 16 * 1024 * 1024}));
  }
  return {root: directory, dispose() {
    const resolved = fs.realpathSync(directory);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('manaratak-reviewed-r06-'));
    fs.rmSync(resolved, {recursive: true, force: true});
  }};
}
