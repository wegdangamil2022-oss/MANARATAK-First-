import fs from 'node:fs';
import path from 'node:path';
import {migrationInventory} from './post28-migration-inventory.mjs';
import {requireReviewedR06MigrationTransition} from './post28-r06-migration-transition.mjs';
export function requireScopedR06Authorization(root=process.cwd()){
 const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 const disposition=read('config/testing/post28-stage-disposition.json');
 if(disposition.version!==1||disposition.kind!=='POST28_LOCAL_STAGE_DISPOSITION'||disposition.authorization!=='USER_RECORD_R05_BLOCKERS_AND_CONTINUE_SCOPED_R06_2026_10_16'||disposition.scope!=='LOCAL_DB_T_SCOPED_TESTS_ONLY'||disposition.R05?.runtimeStatus!=='BLOCKED'||disposition.R05.acceptance!==false||disposition.R05.reviewStatus!=='REVIEW_COMPLETE_WITH_RECORDED_BLOCKERS'||disposition.productionAcceptance!==false||disposition.cloudMutationAuthorized!==false||disposition.deploymentAuthorized!==false)throw new Error('POST28_SCOPED_R06_AUTHORIZATION_REQUIRED');
 if(disposition.R05.evidence!=='docs/reviews/evidence/post28/40f93b655c4835f669c6686d7301817f48f0e5c2/r05-historical/status.json')throw new Error('POST28_R05_BLOCKER_EVIDENCE_REQUIRED');
 const r05=read(disposition.R05.evidence);if(r05.status!=='BLOCKED'||r05.sourceSha!==disposition.R05.evidenceSourceSha||r05.upgrade110Executed!==false)throw new Error('POST28_R05_BLOCKER_EVIDENCE_REQUIRED');
 const base='docs/reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/';
 const closure=read(base+'closure.json'),accepted=read(base+'migration-inventory.json'),current=migrationInventory(root);
 if(closure.status!=='PASS'||!closure.schemaParity||accepted.schemaSha256!==current.schemaSha256)throw new Error('POST28_R04_ACCEPTED_SCHEMA_REQUIRED');
 const transition=accepted.chainSha256===current.chainSha256?null:requireReviewedR06MigrationTransition(root,accepted,current);
 return {migrationTransition:transition,scope:disposition.scope,R04:'PASS_LOCAL_MATCHING_SCHEMA',R05:'BLOCKED_USER_AUTHORIZED_SCOPED_R06',fullR06Acceptance:false,deploymentAuthorized:false};
}
