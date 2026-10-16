#!/usr/bin/env node
// Validates catalog completeness only. Never certifies runtime or owner approval.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const directory='docs/remediation/post28-readiness-20261016';
const read=name=>JSON.parse(fs.readFileSync(`${directory}/${name}.json`,'utf8'));
const documents=['relationships','cases','fixtures','tasks','decisions'].map(read);
for(const doc of documents) {
  for(const [file,hash] of [[doc.plan,doc.planSha256],[doc.matrix,doc.matrixSha256]])
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,'POST28_CATALOG_INPUT_CHANGED');
  assert.equal(doc.runtimeExecuted,false);
  assert.match(doc.baselineSourceSha,/^[a-f0-9]{40}$/);
}
const [relationships,cases,fixtures,tasks,decisions]=documents;
const sequence=(prefix,count)=>Array.from({length:count},(_,i)=>`${prefix}-${String(i+1).padStart(3,'0')}`);
assert.deepEqual(relationships.rows.map(row=>row.matrixRowId).sort(),[...sequence('R',69),...sequence('X',8)]);
assert.deepEqual(cases.cases.map(row=>row.caseId).sort(),sequence('CD',42));
assert.deepEqual(decisions.decisions.map(row=>row.decisionId).sort(),Array.from({length:7},(_,i)=>`DEC-0${i+1}`));
const caseIds=new Set(cases.cases.map(row=>row.caseId));
for(const row of relationships.rows) {
  assert.ok(row.owner && row.sourceStatus && row.caseIds.length);
  assert.ok(row.caseIds.every(id=>caseIds.has(id)));
  assert.equal(row.runtimeStatus,'NOT_EXECUTED');
  assert.equal(row.scopeApproval,null);
  assert.deepEqual(row.evidence,[]);
}
for(const row of cases.cases) {
  assert.ok(row.expected && row.owners.length);
  assert.equal(row.status,'NOT_EXECUTED');
  assert.equal(row.suiteCommand,null);
  assert.equal(row.expectedExecuted,null);
  for(const key of ['executed','passed','failed','skipped'])assert.equal(row[key],0);
}
assert.equal(fixtures.fixtures.length,13);
assert.equal(new Set(fixtures.fixtures.map(row=>row.fixtureId)).size,13);
for(const row of fixtures.fixtures)assert.equal(row.executed,false);
const source=JSON.parse(fs.readFileSync('config/release/section-task-inventory.json','utf8'));
const expected=source.sections.flatMap(section=>section.taskIds.map(id=>`section-${String(section.section).padStart(2,'0')}/${id}`));
assert.deepEqual(tasks.tasks.map(row=>row.identity),expected);
assert.equal(new Set(expected).size,expected.length);
assert.equal(tasks.candidateCount,expected.length);
console.log(JSON.stringify({kind:'POST28_CATALOG_STRUCTURE_CHECK',relationships:77,cases:42,fixtures:13,taskCandidates:expected.length,decisions:7,runtimeExecuted:false,ownerApproval:false,stageVerdict:'BLOCKED_PENDING_ACCEPTANCE_REQUIREMENTS'}));
