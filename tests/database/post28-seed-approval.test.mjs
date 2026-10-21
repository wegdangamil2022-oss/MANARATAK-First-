import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSeedApproval} from '../../scripts/database/post28-seed-approval.mjs';
const context={sourceSha:'a'.repeat(40),runId:'run',manifestSha256:'b'.repeat(64),steps:[{id:'source',sourceSha256:'c'.repeat(64)}],now:100000000};
const valid={kind:'POST28_LOCAL_REQUIRED_SEED_APPROVAL',sourceSha:context.sourceSha,runId:context.runId,scope:'LOCAL_DB_G_ONLY',authorization:'USER_REQUEST_COMPLETE_LOCAL_R04',seedManifestSha256:context.manifestSha256,actorId:'post28-local-user-authorized',expiresAt:new Date(context.now+3600000).toISOString(),sourceHashes:{source:'c'.repeat(64)}};
test('explicit local source-bound approval is accepted',()=>assert.deepEqual(validateSeedApproval(valid,context),{actorId:valid.actorId}));
for(const [key,value] of Object.entries({kind:'PRODUCTION_APPROVAL',sourceSha:'x',runId:'different',scope:'NEON',authorization:'CI',seedManifestSha256:'x',actorId:'admin',expiresAt:'invalid'})){
 test('approval rejects changed '+key,()=>assert.throws(()=>validateSeedApproval({...valid,[key]:value},context),/APPROVAL_INVALID/));
}
for(const expiry of [context.now-1,context.now+4*3600000])test('approval rejects expired or excessive lifetime '+expiry,()=>assert.throws(()=>validateSeedApproval({...valid,expiresAt:new Date(expiry).toISOString()},context),/APPROVAL_INVALID/));
for(const sourceHashes of [{},{source:'tampered'},{source:'c'.repeat(64),other:'x'}])test('approval rejects missing/tampered/additional source '+JSON.stringify(sourceHashes),()=>assert.throws(()=>validateSeedApproval({...valid,sourceHashes},context),/SOURCE_MISMATCH/));
