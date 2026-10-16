import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {npmInvocation} from '../../scripts/release/lib/DiagnosticProcess.mjs';

test('POSIX npm execution keeps argument boundaries',()=>{
  assert.deepEqual(npmInvocation(['run','build'],{platform:'linux'}),{command:'npm',args:['run','build']});
});
test('Windows npm invokes JavaScript through Node without shell interpolation',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'post28-npm-'));
  try {
    const cli=path.join(directory,'npm-cli.js');
    fs.writeFileSync(cli,'process.stdout.write(JSON.stringify(process.argv.slice(2)));');
    const args=['run','a name & echo unsafe'];
    const invocation=npmInvocation(args,{platform:'win32',env:{npm_execpath:cli}});
    const result=spawnSync(invocation.command,invocation.args,{encoding:'utf8'});
    assert.equal(result.status,0);assert.deepEqual(JSON.parse(result.stdout),args);
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
test('missing Windows npm CLI fails before execution',()=>{
  assert.throws(()=>npmInvocation([],{platform:'win32',execPath:path.join(os.tmpdir(),'absent-node','node.exe'),env:{}}));
});
