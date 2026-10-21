import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const digest = data => createHash('sha256').update(data).digest('hex');
const fail=code=>{throw new Error(code);};
export function migrationInventory(root=process.cwd()) {
  const directory=path.join(root,'packages/infrastructure/prisma/migrations');
  const migrations=fs.readdirSync(directory,{withFileTypes:true}).filter(row=>row.isDirectory()).map(row=>row.name).sort().map(name=>{
    if(!/^\d{14}_[a-z0-9_]+$/.test(name))fail('POST28_MIGRATION_NAME_INVALID');
    const file=path.join(directory,name,'migration.sql');
    if(!fs.statSync(file).isFile())fail('POST28_MIGRATION_SQL_MISSING');
    const sql=fs.readFileSync(file);
    return {name,checksum:digest(sql),bytes:sql.length};
  });
  if(!migrations.length)fail('POST28_MIGRATION_CHAIN_EMPTY');
  return {version:1,kind:'POST28_SOURCE_MIGRATION_INVENTORY',schemaSha256:digest(fs.readFileSync(path.join(root,'packages/infrastructure/prisma/schema.prisma'))),
    chainSha256:digest(JSON.stringify(migrations.map(({name,checksum})=>({name,checksum})))),migrations};
}
export function verifyMigrationLedger(inventory,rows) {
  if(!Array.isArray(inventory?.migrations)||!inventory.migrations.length||!Array.isArray(rows)||rows.length!==inventory.migrations.length)
    fail('POST28_MIGRATION_LEDGER_SET_MISMATCH');
  const names=new Set();
  rows.forEach((row,index)=>{
    const expected=inventory.migrations[index];
    if(names.has(row.migration_name)||row.migration_name!==expected.name)fail('POST28_MIGRATION_LEDGER_ORDER_OR_DUPLICATE');
    names.add(row.migration_name);
    if(row.checksum!==expected.checksum)fail('POST28_MIGRATION_CHECKSUM_MISMATCH');
    const started=typeof row.started_at==='string'?Date.parse(row.started_at):NaN;
    const finished=typeof row.finished_at==='string'?Date.parse(row.finished_at):NaN;
    if(row.rolled_back_at!==null||!Number.isFinite(started)||!Number.isFinite(finished)||finished<started||
        !Number.isSafeInteger(row.applied_steps_count)||row.applied_steps_count<1)
      fail('POST28_MIGRATION_LEDGER_PARTIAL_OR_FAILED');
    if(index && started<Date.parse(rows[index-1].finished_at))fail('POST28_MIGRATION_LEDGER_EXECUTION_ORDER');
  });
  return {expected:inventory.migrations.length,applied:rows.length,checksumsMatched:rows.length,partial:0,rolledBack:0};
}
