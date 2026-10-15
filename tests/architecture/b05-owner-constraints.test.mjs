import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectB05OwnerConstraints } from '../../scripts/architecture/inspect-b05-owner-constraints.mjs';
const read = (file) => readFileSync(file, 'utf8');
test('B05 preserves eight existing restrictive governance FKs and all four immutable-history triggers', () => {
  const facts = inspectB05OwnerConstraints();
  assert.equal(facts.constraints.length, 8);
  assert.equal(facts.immutableTriggers.length, 4);
  assert.ok(
    facts.constraints.every((item) => item.onDelete === 'RESTRICT' && item.occurrences === 1),
  );
  assert.equal(facts.databaseQueried, false);
  assert.deepEqual(
    JSON.parse(read('docs/reviews/evidence/b05-owner-constraint-inventory-2026-10-15.json')),
    facts,
  );
});
test('B05 scholarships do not issue direct program ORM, nested program joins, or raw joins to owner tables', () => {
  for (const file of [
    'PrismaScholarshipRepository.ts',
    'PrismaScholarshipCanonicalLookupGateway.ts',
  ]) {
    const source = read('packages/infrastructure/src/scholarships/' + file);
    assert.doesNotMatch(source, /\.universityAcademicProgram\s*\./);
    assert.doesNotMatch(source, /JOIN\s+"(?:UniversityAcademicProgram|MajorLevelProfile)"/);
    assert.ok(source.includes('this.programReads.'));
  }
});
test('B05 source-only expansion adds the missing child FK and serializes both sides without replacing old guard functions', () => {
  const sql = read(
    'packages/infrastructure/prisma/migrations/20261015100000_student_document_asset_boundary/migration.sql',
  );
  assert.match(sql, /ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID/);
  assert.match(sql, /BEFORE INSERT OR UPDATE OF "assetId"/);
  assert.match(sql, /manaratak_require_active_asset_reference\('assetId'/);
  assert.match(sql, /BEFORE DELETE OR UPDATE OF "lifecycleState", "id"/);
  assert.match(sql, /transaction_isolation.*<> 'read committed'/);
  assert.match(sql, /FROM %I\."StudentApplicationDocumentBinding" WHERE "assetId" = \$1/);
  assert.doesNotMatch(
    sql,
    /CREATE OR REPLACE|DROP (?:TABLE|FUNCTION|TRIGGER)|DELETE FROM|UPDATE "StudentApplicationDocumentBinding"/,
  );
  const schema = read('packages/infrastructure/prisma/schema.prisma');
  assert.match(
    schema,
    /asset AssetRecord @relation\(fields: \[assetId\], references: \[id\], onDelete: Restrict, onUpdate: Restrict\)/,
  );
});
test('B05 data audit remains a read-only transaction without data rewrite or document content access', () => {
  const sql = read('docs/remediation/sql/B05_READ_ONLY_DATA_AUDIT_2026-10-15.sql').replace(
    /^--.*$/gm,
    '',
  );
  assert.match(sql, /BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  assert.match(sql, /statement_timeout = '15s'/);
  assert.doesNotMatch(sql, /\b(?:INSERT INTO|DELETE FROM|ALTER TABLE|DROP TABLE|UPDATE ")/i);
  assert.ok(sql.includes('"_prisma_migrations"'));
  assert.ok(sql.includes('pg_constraint'));
});
