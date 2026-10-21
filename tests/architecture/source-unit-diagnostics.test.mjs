import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('CI test diagnostics retain the canonical arguments and failing child exit code',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'post28-unit-diagnostic-'));
  const cli=path.join(directory,'npm-fixture.js'),executable=path.join(directory,'npm');
  try{
    for(const code of [7,0]){
      const body=`if(JSON.stringify(process.argv.slice(2))!==JSON.stringify(['run','test:unit']))process.exit(99);console.log('FAIL deliberate fixture % marker');process.exit(${code});\n`;
      fs.writeFileSync(cli,body);fs.writeFileSync(executable,'#!'+process.execPath+'\n'+body,{mode:0o700});
      const result=spawnSync(process.execPath,['scripts/ci/run-source-unit-with-diagnostics.mjs','npm','run','test:unit'],{encoding:'utf8',env:{...process.env,npm_execpath:cli,PATH:directory+path.delimiter+process.env.PATH},timeout:10000,windowsHide:true});
      assert.equal(result.status,code,result.stderr);
      assert.match(result.stdout,/FAIL deliberate fixture/);
      if(code)assert.match(result.stderr,/::error title=Source unit failure::FAIL deliberate fixture %25 marker/);
      else assert.doesNotMatch(result.stderr,/::error/);
    }
  }finally{fs.unlinkSync(cli);fs.unlinkSync(executable);fs.rmdirSync(directory);}
});
