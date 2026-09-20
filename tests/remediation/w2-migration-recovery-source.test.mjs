import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/database/migration-recovery.manifest.json'),'utf8'));
const dirs=fs.readdirSync(path.join(root,'packages/infrastructure/prisma/migrations'),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
test('MNT-AUD-0079 every migration has explicit recovery classification and existing artifact',()=>{
  assert.deepEqual(Object.keys(manifest.migrations).sort(),dirs);
  for(const id of dirs){ const rule=manifest.migrations[id]; assert.ok(['ROLLBACK_SQL','BACKUP_RESTORE_REQUIRED','FORWARD_FIX_ONLY'].includes(rule.recoveryClass),id); assert.ok(rule.decision?.trim(),id); assert.ok(fs.existsSync(path.join(root,rule.artifact)),`${id}:${rule.artifact}`); }
});
test('MNT-AUD-0079 rollback SQL class is used only when sibling rollback exists',()=>{
  for(const id of dirs){ const rule=manifest.migrations[id]; const rollback=path.join(root,'packages/infrastructure/prisma/migrations',id,'rollback.sql'); if(rule.recoveryClass==='ROLLBACK_SQL') assert.equal(path.resolve(root,rule.artifact),rollback); else assert.equal(fs.existsSync(rollback),false,`${id} has rollback.sql but non-rollback class`); }
});
test('MNT-AUD-0079 gate no longer uses transactional_outbox filename exception',()=>{
  const source=fs.readFileSync(path.join(root,'scripts/db-remediation-gate.ts'),'utf8');
  assert.doesNotMatch(source,/item\.id\.includes\('transactional_outbox'\)/);
  assert.match(source,/validateRecoveryPlanSource/); assert.match(source,/DATABASE_RECOVERY_EVIDENCE_FILE_REQUIRED/); assert.match(source,/migrate', 'diff'/);
});
