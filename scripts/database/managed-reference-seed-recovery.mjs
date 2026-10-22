import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const recoveryHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function validateSeedRecovery(approval,state,snapshot,stateHash,runId){
  assert.equal(state.runId,runId,'MANAGED_SEED_RECOVERY_RUN_MISMATCH');
  assert.equal(state.completed,false,'MANAGED_SEED_RECOVERY_ALREADY_COMPLETED');
  assert.equal(approval?.kind,'DELEGATED_REVIEWED_SAME_RUN_RECOVERY','MANAGED_SEED_RECOVERY_REVIEW_REQUIRED');
  assert.equal(approval.stateSha256,stateHash,'MANAGED_SEED_RECOVERY_STATE_CHANGED');
  assert.equal(approval.snapshotSha256,recoveryHash(snapshot),'MANAGED_SEED_RECOVERY_DATABASE_CHANGED');
  assert.equal(approval.priorSourceSha,state.sourceSha,'MANAGED_SEED_RECOVERY_SOURCE_CHANGED');
}
/** Preserve prior approvals. Only the real owner's workflow may advance a row. */
export function seedReviewAction(plan,actorId,payloadDigest,expectedDigest){
  assert.equal(payloadDigest,expectedDigest,'MANAGED_SEED_RECOVERY_PAYLOAD_CHANGED');
  assert.ok(['PREVIEWED','APPROVED','APPLIED'].includes(plan.status),'MANAGED_SEED_RECOVERY_REVIEW_STATE_INVALID');
  if(plan.status!=='PREVIEWED'){
    assert.equal(plan.reviewer,actorId,'MANAGED_SEED_RECOVERY_REVIEWER_CHANGED');
    assert.ok(plan.reason?.startsWith('Delegated project-owner development bootstrap; source='),'MANAGED_SEED_RECOVERY_APPROVAL_INVALID');
  }
  return plan.status==='PREVIEWED'?'REVIEW':plan.status==='APPLIED'?'REUSE':'APPLY';
}
