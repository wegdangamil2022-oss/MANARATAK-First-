import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acceptanceDetails} from '../../scripts/release/lib/AcceptanceContracts.mjs';

const sha='a'.repeat(40);
const gate=()=>({id:'rollback',expandContractCompatible:true,previousApiCompatible:true,
  previousWorkerCompatible:true,previousSourceSha:'b'.repeat(40),
  previousApiArtifactSha256:'c'.repeat(64),previousWorkerArtifactSha256:'d'.repeat(64),
  ledgerPreserved:true,incidentOwner:'Synthetic incident owner',
  canaryBudget:{approvedBy:'Synthetic budget authority',maximumRequests:10,maximumConcurrency:1,durationSeconds:60,maximumUnexpectedErrors:0}});
const rollbackRejected=row=>acceptanceDetails({gates:[row]},sha).includes('ROLLBACK_COMPATIBILITY_UNVERIFIED');

test('R12 rejects unidentified previous units, absent API compatibility and unbounded canary evidence',()=>{
  const invalid=[
    {previousApiCompatible:undefined},{previousSourceSha:undefined},{previousSourceSha:sha},
    {previousApiArtifactSha256:'unknown'},{previousWorkerArtifactSha256:undefined},
    {previousSourceSha:['b'.repeat(40)]},{previousApiArtifactSha256:['c'.repeat(64)]},
    {previousWorkerArtifactSha256:['d'.repeat(64)]},
    {incidentOwner:'   '},{incidentOwner:{}},{canaryBudget:undefined},
    ...[{approvedBy:' '},{maximumRequests:Infinity},{maximumRequests:0},{maximumConcurrency:0},
      {maximumConcurrency:11},{durationSeconds:NaN},{maximumUnexpectedErrors:-1},
      {maximumUnexpectedErrors:11}].map(value=>({canaryBudget:{...gate().canaryBudget,...value}})),
  ];
  for(const value of invalid)assert.equal(rollbackRejected({...gate(),...value}),true,JSON.stringify(value));
});

test('R12 accepts a bounded identified rollback record without passing unrelated release gates',()=>{
  assert.equal(rollbackRejected(gate()),false);
  assert(acceptanceDetails({gates:[gate()]},sha).length>0);
});
