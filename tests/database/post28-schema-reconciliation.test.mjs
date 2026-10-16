import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const schema=fs.readFileSync('packages/infrastructure/prisma/schema.prisma','utf8');
const sql=fs.readFileSync('packages/infrastructure/prisma/migrations/20261016150000_post28_schema_reconciliation/migration.sql','utf8');
test('defaults preserve certificate creation and CMS approval lifecycle',()=>{
 assert.match(schema,/model CertificateAuthorityDelegation \{[^}]*updatedAt DateTime @default\(now\(\)\) @updatedAt/s);
 assert.match(sql,/ALTER COLUMN "status" SET DEFAULT 'DRAFT'/);
 assert.doesNotMatch(sql,/DROP DEFAULT/);
});
test('publication snapshot uses the published version identity',()=>{
 const model=schema.split('model InternationalTestPublicationSnapshot {')[1].split('\n}')[0];
 assert.match(model,/version InternationalTestVersion @relation\("PublicationSnapshotVersion", fields:\[id\], references:\[id\]/);
 assert.match(model,/test InternationalTest @relation/);
});
test('nine validations retain audits, time limits and no destructive fallback',()=>{
 assert.equal((sql.match(/VALIDATE CONSTRAINT/g)||[]).length,9);
 assert.equal((sql.match(/RAISE EXCEPTION 'POST28_AUDIT_FAILED/g)||[]).length,9);
 assert.equal((sql.match(/SELECT count\(\*\)/g)||[]).length,9);
 assert.match(sql,/SET LOCAL lock_timeout = '3s'/);
 assert.doesNotMatch(sql,/\b(?:DELETE FROM|TRUNCATE|DROP CONSTRAINT|DROP INDEX|DISABLE TRIGGER)\b/i);
 assert.match(sql,/r\."assignmentId"=s\."id" AND r\."id"=s\."currentVersionId"/);
});
test('existing search and service indexes are represented',()=>{
 assert.equal((schema.match(/ops: raw\("gin_trgm_ops"\)/g)||[]).length,10);
 assert.match(schema,/map:"ServiceRequestRecord_staff_due"/);
});
