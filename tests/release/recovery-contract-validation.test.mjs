import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const entry=path.join(root,'scripts/recovery/verify-recovery-contract.mjs');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'config/recovery/production-recovery-contract.json'),'utf8'));
function verify(objectives){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'r10-contract-'));
  try{
    for(const file of ['docs/operations/PLATFORM_DISASTER_RECOVERY_RUNBOOK.md','scripts/recovery/run-whole-platform-restore-drill.mjs','.github/workflows/recovery-restore-audit.yml']){
      const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'');
    }
    fs.mkdirSync(path.join(directory,'config/recovery'),{recursive:true});
    fs.writeFileSync(path.join(directory,'config/recovery/production-recovery-contract.json'),JSON.stringify({...baseline,objectives:{...baseline.objectives,...objectives}}));
    const result=spawnSync(process.execPath,[entry],{cwd:directory,encoding:'utf8',timeout:10000});
    assert.ifError(result.error);return result;
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
}

test('recovery CLI accepts the actual numeric recovery objectives',()=>{
  const result=verify({});assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/RECOVERY_SOURCE_CONTRACT=PASS/);
  assert.match(result.stdout,/SOURCE_ONLY=TRUE/);
});
for(const [field,label,invalid] of [
  ['regionalLossRpoMinutes','RPO <= 5m',[null,'5',-1,6]],
  ['regionalLossRtoMinutes','RTO <= 60m',[null,'60',-1,61]],
  ['pitrWindowDays','PITR >= 30d',[null,'30',-1,29]],
])test(`recovery CLI rejects invalid ${field} without issuing source PASS`,()=>{
  for(const value of invalid){
    const result=verify({[field]:value});
    assert.equal(result.status,1,JSON.stringify({field,value,stdout:result.stdout,stderr:result.stderr}));
    assert(result.stdout.includes('FAIL '+label));
    assert.doesNotMatch(result.stdout,/RECOVERY_SOURCE_CONTRACT=PASS/);
  }
});
