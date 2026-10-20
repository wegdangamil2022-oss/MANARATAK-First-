import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptanceDetails} from '../../scripts/release/lib/AcceptanceContracts.mjs';

const sha='a'.repeat(40);
const backup=()=>({id:'backup-restore',structuralRestorability:true,sloPassed:true,
  rtoMinutes:17/60,rpoMinutes:3.443/60,assetParity:true});
const failures=row=>acceptanceDetails({gates:[row]},sha);

test('R13 accepts finite measured recovery objectives without approving unrelated gates',()=>{
  const result=failures(backup());
  assert(!result.includes('RESTORE_OBJECTIVES_UNVERIFIED'));
  assert(result.length>0);
  assert(!failures({...backup(),rtoMinutes:0,rpoMinutes:0}).includes('RESTORE_OBJECTIVES_UNVERIFIED'));
});

for(const [field,excess] of [['rtoMinutes',61],['rpoMinutes',6]])
  test(`R13 rejects missing or coerced ${field} in runtime release evidence`,()=>{
    for(const value of [undefined,null,'0',false,[],[0],NaN,Infinity,-1,excess]){
      assert(failures({...backup(),[field]:value}).includes('RESTORE_OBJECTIVES_UNVERIFIED'),`${field}: ${String(value)}`);
    }
  });
