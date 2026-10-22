import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDefenderHealth, validateDefenderScan } from '../../scripts/database/native-seed-scanner.mjs';

const now=Date.parse('2026-10-22T00:00:00Z');
const healthy={signatureStatus:'Valid',publisher:'CN=Microsoft Windows Publisher, O=Microsoft Corporation',
  serviceEnabled:true,antivirusEnabled:true,signatureUpdatedAt:new Date(now-3600000).toISOString(),signatureVersion:'1.461.140.0'};
test('native scanner requires signed Microsoft binary and fresh enabled engine',()=>{
  assert.equal(validateDefenderHealth(healthy,now).signatureVersion,healthy.signatureVersion);
  for(const change of [{signatureStatus:'NotSigned'},{publisher:'CN=Other'},{serviceEnabled:false},
    {antivirusEnabled:false},{signatureUpdatedAt:'invalid'},
    {signatureUpdatedAt:new Date(now-73*3600000).toISOString()},
    {signatureUpdatedAt:new Date(now+3600000).toISOString()}]){
    assert.throws(()=>validateDefenderHealth({...healthy,...change},now),/DEFENDER_HEALTH/);
  }
});
test('exit zero alone cannot activate an asset and remediation or byte changes fail closed',()=>{
  const result={status:0,stdout:'Scan finished.\nScanning found no threats.',stderr:''};
  assert.equal(validateDefenderScan(result,'a'.repeat(64),'a'.repeat(64)),true);
  for(const change of [{status:2},{status:null},{stdout:'Scan finished.'},{error:new Error('timeout')},{signal:'SIGTERM'}]){
    assert.throws(()=>validateDefenderScan({...result,...change},'a'.repeat(64),'a'.repeat(64)),/DEFENDER_SCAN/);
  }
  assert.throws(()=>validateDefenderScan(result,'a'.repeat(64),'b'.repeat(64)),/DEFENDER_SCAN/);
});
