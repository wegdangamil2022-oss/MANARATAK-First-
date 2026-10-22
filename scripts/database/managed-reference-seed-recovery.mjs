import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const recoveryHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// This budget belongs only to the managed development operator. Server-side
// statement, lock and abandoned-transaction limits remain independently bounded.
export const managedReferenceTransactionOptions=Object.freeze({maxWait:30000,timeout:60000});
/** Reuse only an exact content-bound receipt loaded for this run's handoff keys. */
export function cachedSeedReceipt(receipts,identity){
  const row=receipts.get(identity.handoffKey);
  if(!row)return null;
  assert.equal(row.ownerDomain,identity.ownerDomain,'IMPORT_RECEIPT_OWNER_CONFLICT');
  assert.equal(row.handoffKey,identity.handoffKey,'IMPORT_RECEIPT_IDENTITY_CONFLICT');
  assert.equal(row.requestHash,identity.requestHash,'IMPORT_RECEIPT_CONTENT_CONFLICT');
  return row;
}
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
