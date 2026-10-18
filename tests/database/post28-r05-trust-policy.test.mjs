import test from 'node:test';import assert from 'node:assert/strict';import {requireKnownSourceTrust} from '../../scripts/database/post28-r05-trust-policy.mjs';
import fs from 'node:fs';
const actual=()=>{const x=JSON.parse(fs.readFileSync(new URL('./fixtures/post28-real-clean-asset-replay.json',import.meta.url)));x.at=new Date(x.at);return x;};
test('replays actual PG16 ACTIVE row without rewriting quarantine scan locators to clean',()=>{const x=actual();assert.notEqual(x.asset.cleanStorageLocator,x.asset.malwareScanStatus.locator);assert.equal(requireKnownSourceTrust(x).trustChecksPassed,true);});
test('rejects a completed activation whose expected digest differs from actual bytes',()=>{const x=actual();x.asset.malwareScanStatus.activationOperation.expectedSha256='f'.repeat(64);assert.throws(()=>requireKnownSourceTrust(x),/ACTIVATION_NOT_COMPLETED/);});
function fixture(){const source='a'.repeat(64),clean='b'.repeat(64),locator='clean://synthetic-only/clean/file';return {at:new Date('2026-10-18'),packet:{kind:'POST28_NEW_SYNTHETIC_KNOWN_SOURCE_CASE',assetId:'synthetic-id',owner:{ownerId:'synthetic-student'},source:{createdForThisNewCase:true,sha256:source,byteSize:636},claims:{originalMissingFileRecovered:false}},decision:{classification:'CONFIDENTIAL',retentionCategory:'TEMPORARY',sourceCreatedAt:'2026-10-17T00:00:00Z',expiresAt:'2027-04-15T00:00:00Z',legalHoldUntil:null},asset:{id:'synthetic-id',ownerId:'synthetic-student',ownerType:'STUDENT',lifecycleState:'ACTIVE',securityClassification:'CONFIDENTIAL',retentionCategory:'TEMPORARY',retentionExpiresAt:'2027-04-15T00:00:00Z',cleanStorageLocator:locator,quarantineStorageLocator:null,checksumAlgorithm:'sha256',checksumHash:clean,metadata:{byteSize:10234,mimeType:'application/pdf'},sanitizationMetadata:{sanitizedAt:'2026-10-17T00:00:01Z'},malwareScanStatus:{status:'PASSED',scannedAt:'2026-10-17T00:00:02Z',locator:'quarantine://synthetic-only/sanitized/file',activationOperation:{phase:'COMPLETED',version:1,sourceLocator:'quarantine://synthetic-only/sanitized/file',expectedSha256:clean,preparedAt:'2026-10-17T00:00:02Z',completedAt:'2026-10-17T00:00:03Z'},uploadVerification:{signatureVerified:true,locator:'quarantine://synthetic-only/sanitized/file',byteSize:10234,verifiedMimeType:'application/pdf',checksumSha256:clean,verifiedAt:'2026-10-17T00:00:02Z'}}},providerProof:{sourceSha256:source,sourceBytes:636,sanitizedSha256:clean,originalObjectsCopied:0,pixelsMatched:true,preScan:{clean:true,sha256:source,digestUnchanged:true},postScan:{clean:true,sha256:clean,digestUnchanged:true},storageReadbackSha256:clean},historicalBefore:{binding:{consent:null,attestation:'old'},money:'900719925474099312345'},historicalAfter:{binding:{consent:null,attestation:'old'},money:'900719925474099312345'}};}
test('trust check accepts distinct raw and sanitized digests without claiming owner approval',()=>{const r=requireKnownSourceTrust(fixture());assert.equal(r.trustChecksPassed,true);assert.equal(r.ownerAuthorizationVerified,false);assert.equal(r.upgradeAuthorized,false);});
for(const [name,mutate] of [
 ['FK existence with INITIATED row',x=>{x.asset.lifecycleState='INITIATED';}],
 ['foreign owner',x=>{x.asset.ownerId='foreign';}],
 ['original-file recovery claim',x=>{x.packet.claims.originalMissingFileRecovered=true;}],
 ['permanent retention shortcut',x=>{x.decision.retentionCategory='PERMANENT';}],
 ['retry extends fixed deadline',x=>{x.decision.expiresAt=x.asset.retentionExpiresAt='2035-01-01';}],
 ['expired asset',x=>{x.at=new Date('2030-01-01');}],
 ['fabricated legal hold',x=>{x.asset.legalHoldUntil='2035-01-01';}],
 ['raw checksum substituted',x=>{x.asset.checksumHash='a'.repeat(64);}],
 ['scan without byte binding',x=>{x.asset.malwareScanStatus.locator='quarantine://wrong/file';}],
 ['missing sanitizer evidence',x=>{delete x.asset.sanitizationMetadata;}],
 ['pending activation',x=>{x.asset.malwareScanStatus.activationOperation.phase='PREPARED';}],
 ['unscanned sanitized output',x=>{x.providerProof.postScan.clean=false;}],
 ['changed consent',x=>{x.historicalAfter.binding.consent=true;}],
 ['changed financial history',x=>{x.historicalAfter.money='1';}],
])test('rejects '+name,()=>{const x=fixture();mutate(x);assert.throws(()=>requireKnownSourceTrust(x),/POST28_R05_/);});
