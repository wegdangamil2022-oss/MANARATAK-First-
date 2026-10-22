import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryHash,validateSeedRecovery,seedReviewAction} from '../../scripts/database/managed-reference-seed-recovery.mjs';
test('same-run recovery rejects changed checkpoint, live rows, source and completed runs',()=>{
 const state={runId:'same-run',sourceSha:'prior-sha',completed:false},snapshot={rows:[{count:2,digest:'actual'}]};
 const approval={kind:'DELEGATED_REVIEWED_SAME_RUN_RECOVERY',stateSha256:'checkpoint-hash',snapshotSha256:recoveryHash(snapshot),priorSourceSha:state.sourceSha};
 validateSeedRecovery(approval,state,snapshot,'checkpoint-hash','same-run');
 for(const change of [{kind:'UNREVIEWED'},{stateSha256:'other'},{snapshotSha256:'other'},{priorSourceSha:'other'}])assert.throws(()=>validateSeedRecovery({...approval,...change},state,snapshot,'checkpoint-hash','same-run'));
 assert.throws(()=>validateSeedRecovery(approval,state,snapshot,'checkpoint-hash','new-run'));
 assert.throws(()=>validateSeedRecovery(approval,{...state,completed:true},snapshot,'checkpoint-hash','same-run'));
 assert.throws(()=>validateSeedRecovery(approval,state,{rows:[{count:3,digest:'changed'}]},'checkpoint-hash','same-run'));
});
test('existing approved and applied owner reviews are reused without fabricating approval',()=>{
 const plan={status:'APPROVED',reviewer:'owner',reason:'Delegated project-owner development bootstrap; source=hash; authorization=old'};
 assert.equal(seedReviewAction(plan,'owner','same','same'),'APPLY');
 assert.equal(seedReviewAction({...plan,status:'APPLIED'},'owner','same','same'),'REUSE');
 assert.equal(seedReviewAction({status:'PREVIEWED'},'owner','same','same'),'REVIEW');
 for(const change of [{reviewer:'other'},{reason:null},{status:'REJECTED'}])assert.throws(()=>seedReviewAction({...plan,...change},'owner','same','same'));
 assert.throws(()=>seedReviewAction(plan,'owner','changed','same'));
 for(const change of [{reviewer:'other'},{reason:null}])assert.throws(()=>seedReviewAction({...plan,status:'APPLIED',...change},'owner','same','same'));
 assert.throws(()=>seedReviewAction({...plan,status:'APPLIED'},'owner','changed','same'));
});
