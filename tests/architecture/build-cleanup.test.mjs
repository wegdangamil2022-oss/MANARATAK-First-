import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {cleanBuildOutputs, planBuildCleanup} from '../../scripts/maintenance/clean-build-output.mjs';
import {createSymbolicLinkFixture} from '../release/helpers/symbolic-link.mjs';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'manaratak-clean-')));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const workspace = path.join(root, 'apps', 'web');
  fs.mkdirSync(workspace, {recursive: true});
  fs.writeFileSync(path.join(workspace, 'package.json'), '{}');
  for (const directory of [root, workspace]) {
    fs.mkdirSync(path.join(directory, 'dist'));
    fs.writeFileSync(path.join(directory, 'dist', 'output'), 'build');
    fs.writeFileSync(path.join(directory, 'tsconfig.tsbuildinfo'), 'build');
  }
  return {root, workspace};
}

test('cleanup removes only generated outputs and retains dependencies, source, storage and evidence', t => {
  const {root} = fixture(t);
  for (const directory of ['node_modules', 'private', 'storage', 'docs', 'release-artifacts']) {
    fs.mkdirSync(path.join(root, directory));
    fs.writeFileSync(path.join(root, directory, 'keep'), 'retained');
  }
  const plan = planBuildCleanup(root);
  assert.equal(plan.length, 4);
  cleanBuildOutputs(plan);
  assert.deepEqual(planBuildCleanup(root), []);
  for (const directory of ['node_modules', 'private', 'storage', 'docs', 'release-artifacts'])
    assert.equal(fs.readFileSync(path.join(root, directory, 'keep'), 'utf8'), 'retained');
});

test('workspace cleanup stays within the selected package and rejects unknown locations', t => {
  const {root, workspace} = fixture(t);
  cleanBuildOutputs(planBuildCleanup(root, workspace));
  assert.equal(fs.existsSync(path.join(root, 'dist', 'output')), true);
  assert.throws(() => planBuildCleanup(root, path.dirname(root)), /UNKNOWN_WORKSPACE/);
});

test('a linked output aborts the entire plan before any deletion', t => {
  const {root, workspace} = fixture(t);
  fs.rmSync(path.join(workspace, 'dist'), {recursive: true});
  createSymbolicLinkFixture(path.join(root, 'dist'), path.join(workspace, 'dist'));
  assert.throws(() => planBuildCleanup(root), /LINKED_OUTPUT/);
  assert.equal(fs.readFileSync(path.join(root, 'dist', 'output'), 'utf8'), 'build');
});
