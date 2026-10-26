import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {migrationInventory} from '../../scripts/database/post28-migration-inventory.mjs';
import {requireReviewedR06MigrationTransition} from '../../scripts/database/post28-r06-migration-transition.mjs';
import {reviewedR06SourceFixture} from './post28-reviewed-source-fixture.mjs';
const root=process.cwd(),fixture=reviewedR06SourceFixture(root),accepted=JSON.parse(fs.readFileSync('docs/reviews/evidence/post28/467d1369e8da0a93ea3444bc1ef6a56c5e53d57d/r04-closure/migration-inventory.json')),current=migrationInventory(fixture.root);
after(()=>fixture.dispose());
test('reviewed transition retains exact110 prefix/schema and verified R05 closure, allowing only named111',()=>{
 const proof=requireReviewedR06MigrationTransition(root,accepted,current);assert.equal(proof.historicalPrefixMatched,110);assert.equal(proof.productionAuthorized,false);
});
test('historical R06 approval does not authorize the later Dashboard schema or migration',()=>{
 assert.throws(()=>requireReviewedR06MigrationTransition(root,accepted,migrationInventory(root)),/REVIEWED_MIGRATION_TRANSITION_REQUIRED/);
});
for(const [name,change] of [
 ['historical checksum',x=>{x.migrations[0].checksum='0'.repeat(64);}],
 ['new migration checksum',x=>{x.migrations.at(-1).checksum='0'.repeat(64);}],
 ['new migration name',x=>{x.migrations.at(-1).name='20261019000200_other';}],
 ['schema digest',x=>{x.schemaSha256='0'.repeat(64);}],
 ['extra migration',x=>{x.migrations.push({...x.migrations.at(-1)});}]
])test('transition rejects '+name,()=>{const altered=structuredClone(current);change(altered);assert.throws(()=>requireReviewedR06MigrationTransition(root,accepted,altered),/REVIEWED_MIGRATION_TRANSITION_REQUIRED/);});
