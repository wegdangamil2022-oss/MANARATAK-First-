import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const cli=fileURLToPath(new URL('../../scripts/release/verify-release-evidence.mjs',import.meta.url));
test('R13 evidence CLI executes and fails closed when source identity or artifacts are absent',()=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'r13-cli-'));
  try {
    const env={...process.env};delete env.SOURCE_SHA;
    const missing=spawnSync(process.execPath,[cli],{cwd,env,encoding:'utf8'});
    assert.notEqual(missing.status,0,'missing source must not silently succeed');
    assert.match(missing.stderr,/SOURCE_SHA_REQUIRED/);
    const artifacts=spawnSync(process.execPath,[cli],{cwd,env:{...env,SOURCE_SHA:'a'.repeat(40),RELEASE_ARTIFACT_DIRECTORY:path.join(cwd,'absent')},encoding:'utf8'});
    assert.notEqual(artifacts.status,0,'missing artifacts must not silently succeed');
    assert.match(artifacts.stderr,/ENOENT/);
    assert.equal(fs.existsSync(path.join(cwd,'release-evidence')),false);
  } finally {fs.rmSync(cwd,{recursive:true,force:true});}
});

test('R13 importing the verifier does not execute its CLI or write evidence',()=>{
  const imported=spawnSync(process.execPath,['--input-type=module','--eval',`await import(${JSON.stringify(new URL('../../scripts/release/verify-release-evidence.mjs',import.meta.url).href)});console.log('IMPORT_ONLY');`],{encoding:'utf8'});
  assert.equal(imported.status,0,imported.stderr);assert.equal(imported.stdout.trim(),'IMPORT_ONLY');
});
