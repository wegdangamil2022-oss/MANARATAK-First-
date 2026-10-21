import {isDeepStrictEqual} from 'node:util';
const fail=code=>{throw new Error(code);};
const sha=/^[a-f0-9]{40}$/,hash=/^[a-f0-9]{64}$/;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const keys=value=>Object.keys(value??{}).sort();
const sameKeys=(value,expected)=>isDeepStrictEqual(keys(value),[...expected].sort());
function financialRows(rows) {
  if(!Array.isArray(rows)||!rows.length)fail('POST28_UPGRADE_FINANCIAL_PROOF_MISSING');
  const ids=new Set();
  return rows.map(row=>{
    if(typeof row.accountId!=='string'||!row.accountId||!/^[A-Z]{3}$/.test(row.currency??'')||
        !Number.isSafeInteger(row.scale)||row.scale<0||row.scale>18||!/^(-?[1-9][0-9]*|0)$/.test(row.balanceUnits??''))
      fail('POST28_UPGRADE_FINANCIAL_PROOF_INVALID');
    const id=JSON.stringify([row.accountId,row.currency,row.scale]);
    if(ids.has(id))fail('POST28_UPGRADE_FINANCIAL_PROOF_DUPLICATE');
    ids.add(id);return {id,balanceUnits:row.balanceUnits};
  }).sort((a,b)=>a.id.localeCompare(b.id));
}
export function verifyUpgradePreservation(plan,before,after) {
  if(plan?.version!==2||!uuid.test(plan.runId??'')||!sha.test(plan.beforeSourceSha??'')||!sha.test(plan.afterSourceSha??'')||
      !Array.isArray(plan.requiredModels)||!plan.requiredModels.length||new Set(plan.requiredModels).size!==plan.requiredModels.length||
      !Array.isArray(plan.requiredInvariants)||!plan.requiredInvariants.length||new Set(plan.requiredInvariants).size!==plan.requiredInvariants.length)
    fail('POST28_UPGRADE_PLAN_INCOMPLETE');
  for(const name of ['beforeSchemaSha256','afterSchemaSha256','beforeMigrationChainSha256','afterMigrationChainSha256'])
    if(!hash.test(plan[name]??''))fail('POST28_UPGRADE_EXPECTED_DIGESTS_REQUIRED');
  const target=plan.expectedTarget;
  if(target?.label!=='DB-U'||target.host!=='127.0.0.1'||!Number.isInteger(target.port)||target.port<1024||target.port>65535||
      !/^[1-9][0-9]*$/.test(target.serverIdentity??'')||!/^[1-9][0-9]*$/.test(target.databaseOid??'')||
      !/^manaratak_post28_[a-z0-9_]+_test$/.test(target.database??'')||/prod|production|live|restore/.test(target.database)||
      !/^post28_[a-z0-9_]+$/.test(target.role??'')||/bootstrap|postgres|admin/.test(target.role)||
      target.roleKind!=='MIGRATION'||!hash.test(target.markerSha256??''))fail('POST28_UPGRADE_EXPECTED_TARGET_REQUIRED');
  for(const [snapshot,expectedSha] of [[before,plan.beforeSourceSha],[after,plan.afterSourceSha]]) {
    if(snapshot?.version!==1||snapshot.kind!=='POST28_UPGRADE_MEASUREMENT'||snapshot.runId!==plan.runId||
        snapshot.sourceSha!==expectedSha||snapshot.target?.label!=='DB-U'||
        !/^[1-9][0-9]*$/.test(snapshot.target.serverIdentity??'')||!/^[1-9][0-9]*$/.test(snapshot.target.databaseOid??'')||
        snapshot.sessionReplicationRole!=='origin'||!hash.test(snapshot.schemaSha256??'')||!hash.test(snapshot.migrationChainSha256??''))
      fail('POST28_UPGRADE_MEASUREMENT_IDENTITY_INVALID');
    if(snapshot.schemaSha256!==plan[snapshot===before?'beforeSchemaSha256':'afterSchemaSha256']||
        snapshot.migrationChainSha256!==plan[snapshot===before?'beforeMigrationChainSha256':'afterMigrationChainSha256'])
      fail('POST28_UPGRADE_EXPECTED_DIGEST_MISMATCH');
    if(!isDeepStrictEqual(snapshot.target,plan.expectedTarget))fail('POST28_UPGRADE_EXPECTED_TARGET_MISMATCH');
    if(!sameKeys(snapshot.counts,plan.requiredModels)||!sameKeys(snapshot.invariants,plan.requiredInvariants))
      fail('POST28_UPGRADE_PROOF_SET_CHANGED');
    if(Object.values(snapshot.counts).some(n=>typeof n!=='string'||!/^(0|[1-9][0-9]*)$/.test(n))||
        Object.values(snapshot.invariants).some(n=>typeof n!=='string'||!hash.test(n)))
      fail('POST28_UPGRADE_PROOF_INVALID');
  }
  if(!isDeepStrictEqual(before.target,after.target))fail('POST28_UPGRADE_TARGET_CHANGED');
  if(!isDeepStrictEqual(before.counts,after.counts))fail('POST28_UPGRADE_ROW_COUNTS_CHANGED');
  if(!isDeepStrictEqual(before.invariants,after.invariants))fail('POST28_UPGRADE_IMMUTABLE_OR_RELATIONSHIP_CHANGED');
  if(!isDeepStrictEqual(financialRows(before.financialTotals),financialRows(after.financialTotals)))
    fail('POST28_UPGRADE_FINANCIAL_TOTALS_CHANGED');
  return {kind:'POST28_UPGRADE_PRESERVATION_COMPARISON',models:plan.requiredModels.length,invariants:plan.requiredInvariants.length,
    financialGroups:before.financialTotals.length,runtimeAcceptance:false,
    note:'Comparison only; measured producer provenance, ledger, catalog, backup and compatibility execution remain mandatory.'};
}
