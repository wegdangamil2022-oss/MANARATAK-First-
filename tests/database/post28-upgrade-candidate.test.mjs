import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {prepareUpgradeCandidate} from '../../scripts/database/prepare-post28-upgrade.mjs';
const root=process.cwd();
test('selected 109-migration predecessor is a checksummed prefix of the 110-migration source',()=>{
 const result=prepareUpgradeCandidate(root,'23897bda');
 assert.equal(result.before.sourceSha,'23897bdaa66d966eef15c85f44288589ecbcdf2b');
 assert.equal(result.before.migrations.length,109);assert.equal(result.after.migrations.length,110);
 assert.equal(result.prefixChecksumsMatched,109);assert.equal(result.pendingMigrations.length,1);
 assert.equal(result.pendingMigrations[0].name,'20261016150000_post28_schema_reconciliation');
 assert.equal(result.comparisonPlan.requiredModels.length,281);
 assert.equal(result.before.clientGeneration.prismaCliVersion,'5.22.0');
 assert.equal(result.before.clientGeneration.prismaClientVersion,'5.22.0');
 assert.equal(result.before.migrationChainSha256,'937036de62620f4474fbe9071ef0e1eaddac971b64025a1b94c8ab1e62d67da7');
 assert.equal(result.after.migrationChainSha256,'542a3b4a6f90a50dda5e10bdb062bb2b4eae16e211e79c110417cd3dea8c2ab7');
 assert.equal(result.runtimeExecuted,false);assert.equal(result.runtimeAcceptance,false);
 assert.equal(result.comparisonPlan.expectedTarget,null);assert.equal(result.comparisonPlan.runId,null);
 assert.equal(result.comparisonPlan.version,2);
 assert.equal(result.before.clientGeneration.generated,false);
 assert.match(result.fixturePolicy.newOrphanOn109Prefix,/still enforces new writes/);
});
for(const value of ['HEAD','--help','main;anything','../other','',null])test('candidate refuses non-commit input '+value,()=>assert.throws(()=>prepareUpgradeCandidate(root,value),/PREDECESSOR_COMMIT_REQUIRED/));
test('a commit cannot be its own predecessor',()=>{
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 assert.throws(()=>prepareUpgradeCandidate(root,sha),/ANCESTOR_REQUIRED/);
});
