import test from 'node:test';
import assert from 'node:assert/strict';
import { operationalRecoveryMetrics } from '../../scripts/recovery/OperationalRecoveryMetrics.mjs';

const input=()=>({incidentAt:'2026-10-20T15:00:00.000Z',serviceVerifiedAt:'2026-10-20T15:00:30.000Z',
  sourceEvents:[{id:'a',committedAt:'2026-10-20T14:59:00.000Z',sha256:'a'.repeat(64)},{id:'b',committedAt:'2026-10-20T14:59:50.000Z',sha256:'b'.repeat(64)}],
  recoveredEvents:[{id:'a',sha256:'a'.repeat(64)}],
  checks:{databaseParity:true,assets:true,apiReadiness:true,webBrowser:true,adminBrowser:true,authenticatedRead:true},
  objectives:{regionalLossRpoMinutes:5,regionalLossRtoMinutes:60}});
test('measures the actual recovered event watermark and integrated verification time',()=>{
  const result=operationalRecoveryMetrics(input());
  assert.equal(result.rpoSeconds,60);assert.equal(result.rtoSeconds,30);
  assert.deepEqual(result.lostEventIds,['b']);assert.equal(result.status,'PASS');
  assert.equal(result.productionAcceptance,false);
});
test('zero measured event loss does not substitute backup age for watermark',()=>{
  const value=input();value.recoveredEvents.push({id:'b',sha256:'b'.repeat(64)});
  const result=operationalRecoveryMetrics(value);assert.equal(result.rpoSeconds,0);assert.equal(result.lostEventCount,0);
});
test('rejects event holes, changed payloads and unknown recovered events',()=>{
  for(const events of [[{id:'b',sha256:'b'.repeat(64)}],[{id:'a',sha256:'c'.repeat(64)}],[{id:'unknown',sha256:'a'.repeat(64)}]]){
    assert.throws(()=>operationalRecoveryMetrics({...input(),recoveredEvents:events}),/RECOVERY_EVENT_PARITY_INVALID/);
  }
});
test('unverified services, missing event prefix and invalid clock cannot close operational recovery',()=>{
  for(const change of [{recoveredEvents:[]},{serviceVerifiedAt:'2026-10-20T14:59:59.000Z'},{sourceEvents:[]},{checks:{}}]){
    assert.throws(()=>operationalRecoveryMetrics({...input(),...change}),/RECOVERY_.*INVALID/);
  }
  const slow=input();slow.serviceVerifiedAt='2026-10-20T16:01:00.000Z';assert.equal(operationalRecoveryMetrics(slow).status,'FAIL');
});
