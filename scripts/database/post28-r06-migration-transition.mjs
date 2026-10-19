import fs from 'node:fs';
import path from 'node:path';
import {digest} from './post28-migration-inventory.mjs';
import {verifyEvidenceIndex} from '../lib/verify-evidence-index.mjs';
export const R06_ADMISSION_MIGRATION={name:'20261019000100_admission_null_identity',checksum:'013eb65a4295987696e3202c06a32cf5874adb389a83467f39ca37cf67bb4efa'};
export function requireReviewedR06MigrationTransition(root,accepted,current){
 const prefix=current.migrations.slice(0,accepted.migrations.length);
 if(accepted.schemaSha256!==current.schemaSha256||current.migrations.length!==accepted.migrations.length+1||
 digest(JSON.stringify(prefix.map(({name,checksum})=>({name,checksum}))))!==accepted.chainSha256||
 JSON.stringify(current.migrations.at(-1)&&{name:current.migrations.at(-1).name,checksum:current.migrations.at(-1).checksum})!==JSON.stringify(R06_ADMISSION_MIGRATION))throw Error('POST28_R06_REVIEWED_MIGRATION_TRANSITION_REQUIRED');
 const base='docs/reviews/evidence/post28/dd1b122a6aad078c62b88fb5dffec7d1b0f9b91c/r05-local-closure';
 verifyEvidenceIndex(path.join(root,base,'evidence-index.json'),{root});
 const closure=JSON.parse(fs.readFileSync(path.join(root,base,'closure.json'),'utf8'));
 if(closure.status!=='PASS_LOCAL'||closure.localAcceptance!==true||closure.upgrade110Executed!==true||closure.productionAcceptance!==false)throw Error('POST28_R06_R05_LOCAL_CLOSURE_REQUIRED');
 return {schemaUnchanged:true,historicalPrefixMatched:prefix.length,reviewedAppendOnlyMigration:R06_ADMISSION_MIGRATION,scope:'LOCAL_SYNTHETIC_ONLY',productionAuthorized:false};
}
