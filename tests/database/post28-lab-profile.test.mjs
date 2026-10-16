import test from 'node:test';
import assert from 'node:assert/strict';
import {localLabProfile,preflightDeclarations} from '../../scripts/database/post28-lab-profile.mjs';
test('default lab remains exactly G migration and S shadow',()=>{
 const p=localLabProfile();assert.equal(p.primary,'DB-G');assert.equal(p.secondary,'DB-S');assert.deepEqual(p.roles,['migrator','shadow']);
 assert.deepEqual(p.targets.map(t=>[t.label,t.kind,t.role,t.roleKind]),[['DB-G','greenfield','migrator','MIGRATION'],['DB-S','shadow','shadow','SHADOW']]);
});
test('upgrade and backup verification have their own labels databases and limited roles',()=>{
 const p=localLabProfile('upgrade');assert.equal(p.primary,'DB-U');assert.equal(p.secondary,'DB-V');
 assert.deepEqual(p.targets.map(t=>[t.label,t.kind,t.roleKind]),[['DB-U','upgrade','MIGRATION'],['DB-V','upgrade_verify','MIGRATION']]);
 assert.notEqual(p.targets[0].role,p.targets[1].role);assert.equal(p.targets.some(t=>['DB-G','DB-S','DB-R','DB-T'].includes(t.label)),false);
});
for(const name of ['restore','production','neon','',null])test('unknown lab profile rejected '+name,()=>assert.throws(()=>localLabProfile(name),/PROFILE_INVALID/));
test('upgrade pair cannot fall back to greenfield URLs',()=>{
 const env={GREENFIELD_DATABASE_URL:'g',GREENFIELD_SHADOW_DATABASE_URL:'s',UPGRADE_DATABASE_URL:'u',UPGRADE_VERIFY_DATABASE_URL:'v'};
 assert.deepEqual(preflightDeclarations(['--upgrade-pair'],env),[{label:'DB-U',url:'u'},{label:'DB-V',url:'v'}]);
 assert.deepEqual(preflightDeclarations(['--pair'],env),[{label:'DB-G',url:'g'},{label:'DB-S',url:'s'}]);
 assert.deepEqual(preflightDeclarations(['--upgrade-pair'],{}),[{label:'DB-U',url:undefined},{label:'DB-V',url:undefined}]);
 assert.throws(()=>preflightDeclarations(['--pair','--upgrade-pair'],env),/PAIR_CONFLICT/);
});
