// Local operator authorization only; never a production identity or P7 receipt.
export function validateSeedApproval(approval,{sourceSha,runId,manifestSha256,steps,now=Date.now()}){
 if(approval?.kind!=='POST28_LOCAL_REQUIRED_SEED_APPROVAL'||approval.sourceSha!==sourceSha||approval.runId!==runId||
    approval.scope!=='LOCAL_DB_G_ONLY'||approval.authorization!=='USER_REQUEST_COMPLETE_LOCAL_R04'||
    approval.seedManifestSha256!==manifestSha256||typeof approval.actorId!=='string'||!/^post28-local-[a-z0-9-]{1,80}$/.test(approval.actorId)||
    !Number.isFinite(Date.parse(approval.expiresAt))||Date.parse(approval.expiresAt)<=now||Date.parse(approval.expiresAt)>now+3*3600000)
  throw new Error('POST28_SEED_APPROVAL_INVALID');
 if(!approval.sourceHashes||Object.keys(approval.sourceHashes).length!==steps.length||steps.some(step=>approval.sourceHashes[step.id]!==step.sourceSha256))
  throw new Error('POST28_SEED_APPROVAL_SOURCE_MISMATCH');
 return {actorId:approval.actorId};
}
