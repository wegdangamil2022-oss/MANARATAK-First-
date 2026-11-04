import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Unix exercises file/directory symlinks. Windows junctions are real directory
// reparse points that expose the same isSymbolicLink boundary without elevation.
export function createSymbolicLinkFixture(target, link) {
  if (process.platform === 'win32') {
    const directory = fs.statSync(target).isDirectory() ? target : path.dirname(target);
    fs.symlinkSync(directory, link, 'junction');
  } else {
    fs.symlinkSync(target, link);
  }
  assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
}
