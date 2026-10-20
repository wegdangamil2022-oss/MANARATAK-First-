import test from 'node:test';
import assert from 'node:assert/strict';
import {captureDatabaseSnapshot, validateDatabaseSnapshot, verifyDatabaseSnapshot} from '../../scripts/recovery/DatabaseSnapshot.mjs';
const checksum='a'.repeat(64);
function client({digest=checksum, tables=['AssetRecord','Certificate'], assets=[], sequenceValue}={}) {
 const commands=[];
 return {commands,async $transaction(fn){return fn(this);},async $executeRawUnsafe(sql){commands.push(sql);},async $queryRawUnsafe(sql){
  commands.push(sql);
  if(sql.includes('pg_catalog.pg_tables'))return tables.map(name=>({name}));
  if(sql.includes('pg_catalog.pg_attribute'))return [{table:'Certificate',column:'id',type:'text',nullable:false}];
  if(sql.includes('pg_catalog.pg_constraint'))return [];
  if(sql.includes('pg_catalog.pg_indexes'))return [];
  if(sql.includes('pg_catalog.pg_sequences'))return sequenceValue===undefined?[]:[{name:'counter',start_value:'1',increment_by:'1',min_value:'1',max_value:'10000',cache_size:'1',cycle:false}];
  if(sql.startsWith('SELECT last_value'))return [{last_value:String(sequenceValue),is_called:true}];
  if(sql.includes('"cleanStorageLocator"'))return assets;
  return [{rowCount:'2',sha256:digest}];
 }};
}
test('snapshot measures all public tables in one read-only transaction without mutation SQL',async()=>{
 const db=client(),snapshot=await captureDatabaseSnapshot(db);
 assert.equal(snapshot.tables.length,2);assert.equal(snapshot.tables[1].rowCount,'2');
 assert.equal(db.commands[0],'SET TRANSACTION READ ONLY');
 assert.ok(db.commands.every(sql=>/^(SET|SELECT)\b/.test(sql)));
 assert.ok(db.commands.some(sql=>sql.includes('ORDER BY payload COLLATE "C"')));
});
test('row digest mismatch cannot be accepted even when counts and schema match',async()=>{
 const snapshot=await captureDatabaseSnapshot(client());
 await assert.rejects(()=>verifyDatabaseSnapshot(client({digest:'b'.repeat(64)}),snapshot,[]),/DATABASE_PARITY/);
});
test('a missing table cannot be accepted',async()=>{
 const snapshot=await captureDatabaseSnapshot(client());
 await assert.rejects(()=>verifyDatabaseSnapshot(client({tables:['AssetRecord']}),snapshot,[]),/DATABASE_PARITY/);
});
test('changed sequence state is rejected even when every table is unchanged',async()=>{
 const snapshot=await captureDatabaseSnapshot(client({sequenceValue:4}));
 await assert.rejects(()=>verifyDatabaseSnapshot(client({sequenceValue:5}),snapshot,[]),/DATABASE_PARITY/);
});
test('invalid expected identity fails before any database operation',async()=>{
 const db=client();await assert.rejects(()=>verifyDatabaseSnapshot(db,{tables:[]},[]),/SNAPSHOT_INVALID/);assert.equal(db.commands.length,0);
});
test('manifest duplicates and forged snapshot hashes are rejected',async()=>{
 const snapshot=await captureDatabaseSnapshot(client());
 assert.throws(()=>validateDatabaseSnapshot({...snapshot,tables:[snapshot.tables[0],snapshot.tables[0]]}),/SNAPSHOT_INVALID/);
 assert.throws(()=>validateDatabaseSnapshot({...snapshot,sha256:'0'.repeat(64)}),/SNAPSHOT_INVALID/);
});
test('ACTIVE asset identity checksum and locator must match actual restored rows',async()=>{
 const assets=[{id:'asset-1',cleanStorageLocator:'clean:bucket/file.pdf',checksumHash:checksum}],db=client({assets}),snapshot=await captureDatabaseSnapshot(db);
 const manifest=[{assetId:'asset-1',locator:'clean:bucket/file.pdf',sha256:checksum}];
 assert.equal((await verifyDatabaseSnapshot(client({assets}),snapshot,manifest)).assetReferencesMatched,true);
 await assert.rejects(()=>verifyDatabaseSnapshot(client({assets}),snapshot,[{...manifest[0],assetId:'foreign'}]),/ASSET_REFERENCE/);
 await assert.rejects(()=>verifyDatabaseSnapshot(client({assets}),snapshot,[]),/ASSET_REFERENCE/);
});
