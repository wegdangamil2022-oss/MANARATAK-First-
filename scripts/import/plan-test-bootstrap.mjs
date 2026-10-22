import {createHash} from 'node:crypto';

/** Offline diagnostic only. Its output is never a reviewed write plan. */
export function planTestBootstrap(manifestText,target){
 const manifest=JSON.parse(manifestText),rows=manifest.matching_rows;
 if(!Array.isArray(rows)||rows.length!==56)throw Error('TEST_BOOTSTRAP_EXPECTED_56_SOURCES');
 if(target?.environment!=='independent-development'||!target.projectId||!target.branchId||!target.observedAt||!Number.isFinite(Date.parse(target.observedAt)))throw Error('TEST_BOOTSTRAP_TARGET_OBSERVATION_REQUIRED');
 for(const field of ['providers','families','tests','identities','roles','roleAssignments'])if(!Number.isSafeInteger(target[field])||target[field]<0)throw Error('TEST_BOOTSTRAP_TARGET_COUNTS_REQUIRED');
 const seen=new Set(),counts={NEW_TEST:0,REPLACE_EXISTING:0,REVIEW_REQUIRED:0};
 const entries=rows.map(row=>{
  if(!Object.hasOwn(counts,row.classification)||typeof row.folder!=='string'||typeof row.filename!=='string')throw Error('TEST_BOOTSTRAP_INVALID_SOURCE');
  const sourceKey=row.folder+'/'+row.filename;
  if(!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.md$/.test(sourceKey)||seen.has(sourceKey))throw Error('TEST_BOOTSTRAP_SOURCE_IDENTITY_INVALID');
  seen.add(sourceKey);counts[row.classification]++;
  const action=target.tests>0?'LIVE_IDENTITY_RECONCILIATION_REQUIRED':row.classification==='NEW_TEST'?'CREATE_CANDIDATE_REQUIRES_REVIEW':row.classification==='REPLACE_EXISTING'?'HOLD_HISTORICAL_REPLACE_WITHOUT_TARGET':'HOLD_MANUAL_REVIEW';
  return {sourceKey,sourceClassification:row.classification,action,targetId:null,providerId:null,familyId:null};
 });
 return {kind:'TEST_BOOTSTRAP_DIAGNOSTIC_NOT_WRITE_PLAN',databaseWrites:0,readyToWrite:false,sourceManifestSha256:createHash('sha256').update(manifestText).digest('hex'),target,counts,entries,
  requiredNext:[...(target.identities===0||target.roles===0||target.roleAssignments===0?['PROVISION_VERIFIED_DEVELOPMENT_ACTOR_THROUGH_IDENTITY_AUTHORIZATION_OWNER']:[]),...(target.providers===0?['CREATE_REVIEWED_PROVIDERS_THROUGH_ATOMIC_TEST_OWNER']:[]),'RESOLVE_HISTORICAL_REPLACE_VS_EMPTY_TARGET_WITHOUT_EDITING_SOURCE','RESOLVE_ACTUAL_UUIDS_AND_PREVIEW_HASH','FRESH_RECOVERY_EVIDENCE_BEFORE_APPROVED_WRITE'],
  optionalFamilyPolicy:'familyId is optional in the write contract; do not invent a family UUID or bypass an owner to populate the table'};
}
