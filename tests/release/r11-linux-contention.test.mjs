import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dockerResourceSample,assertContentionOutcome,runLinuxStudentContention} from '../../scripts/performance/LinuxStudentContention.mjs';

test('R11 contention proof rejects two successes, hidden error, or lost update',()=>{
  const success={status:200,body:{version:2,theme:'LIGHT'}},conflict={status:409,body:{error:'STUDENT_WORKSPACE_VERSION_CONFLICT'}};
  assert.equal(assertContentionOutcome([conflict,success],{version:2,theme:'LIGHT'},1),success);
  assert.throws(()=>assertContentionOutcome([success,success],{version:2,theme:'LIGHT'},1));
  assert.throws(()=>assertContentionOutcome([success,{status:409,body:{error:'UNRELATED_CONFLICT'}}],{version:2,theme:'LIGHT'},1));
  assert.throws(()=>assertContentionOutcome([success,conflict],{version:3,theme:'LIGHT'},1));
  assert.throws(()=>assertContentionOutcome([success,conflict],{version:2,theme:'DARK'},1));
});
test('R11 Docker resource metrics fail closed on missing or malformed measurements',()=>{
  assert.deepEqual(dockerResourceSample({CPUPerc:'1.23%',MemUsage:'100MiB / 768MiB'}),{cpuPercent:1.23,residentMemoryBytes:104857600});
  for(const row of [{},{CPUPerc:'--',MemUsage:'100MiB / 1GiB'},{CPUPerc:'1%',MemUsage:'unknown'}])assert.throws(()=>dockerResourceSample(row));
});
test('R11 resource guard aborts before login or mutation and retains honest partial proof',async()=>{
  let requests=0,proof;
  await assert.rejects(runLinuxStudentContention({origin:'https://127.0.0.1:1234',sourceSha:'a'.repeat(40),
    request:async()=>{requests++;},db:{},record:r=>{proof=r;},
    sampleResources:async()=>({api:{cpuPercent:99,residentMemoryBytes:1024},postgres:{cpuPercent:0,residentMemoryBytes:1024},applicationConnections:1})}),/R11_CPU_BUDGET/);
  assert.equal(requests,0);assert.equal(proof.status,'ABORTED');assert.equal(proof.pairs.length,0);assert.equal(proof.poolWaitMs,null);assert.equal(proof.sloAcceptance,false);
});
