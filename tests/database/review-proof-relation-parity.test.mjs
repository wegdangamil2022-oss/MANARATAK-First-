import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema = fs.readFileSync('packages/infrastructure/prisma/schema.prisma', 'utf8');
for (const [model, migration] of [
  ['CourseSourceApproval', '20261117000300_course_source_approvals'],
  ['StudyDestinationRevision', '20261117000400_study_destination_history_policy'],
]) {
  test(`${model} keeps the immutable SQL's restrictive update/delete policy`, () => {
    const body = schema.split(`model ${model} {`)[1].split('\n}')[0];
    assert.match(body, /onDelete:\s*Restrict\s*,\s*onUpdate:\s*NoAction/);
    const sql = fs.readFileSync(`packages/infrastructure/prisma/migrations/${migration}/migration.sql`, 'utf8');
    assert.match(sql, /REFERENCES[\s\S]*?ON DELETE RESTRICT/);
    assert.doesNotMatch(sql, /ON UPDATE CASCADE/);
  });
}
