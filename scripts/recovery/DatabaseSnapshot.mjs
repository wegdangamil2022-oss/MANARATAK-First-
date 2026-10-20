import {hash, DIGEST} from '../release/lib/ReleaseContracts.mjs';

const identity = snapshot => ({version:1,scope:'PUBLIC_APPLICATION_TABLES',catalogSha256:snapshot.catalogSha256,tables:snapshot.tables});
export function validateDatabaseSnapshot(snapshot) {
  if(snapshot?.version!==1 || snapshot.scope!=='PUBLIC_APPLICATION_TABLES' ||
    !DIGEST.test(snapshot.catalogSha256??'') || !Array.isArray(snapshot.tables) ||
    snapshot.tables.length<1 || snapshot.tables.length>1024 ||
    new Set(snapshot.tables.map(t=>t.name)).size!==snapshot.tables.length ||
    snapshot.tables.some(t=>typeof t.name!=='string'||!t.name.length||t.name.includes('\0')||Buffer.byteLength(t.name)>63||!/^(0|[1-9][0-9]*)$/.test(t.rowCount)||!DIGEST.test(t.sha256??'')) ||
    snapshot.sha256!==hash(JSON.stringify(identity(snapshot))))throw Error('RECOVERY_DATABASE_SNAPSHOT_INVALID');
  return snapshot;
}

/** No application test suite, marker row, DDL, or mutation is used as restore evidence. */
async function measure(tx) {
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  await tx.$executeRawUnsafe("SET LOCAL timezone = 'UTC'");
  await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '30s'");
  const tables=await tx.$queryRawUnsafe("SELECT tablename::text AS name FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename COLLATE \"C\"");
  const columns=await tx.$queryRawUnsafe(`SELECT c.relname::text AS "table",a.attname::text AS "column",pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS "notNull",pg_get_expr(d.adbin,d.adrelid) AS "default" FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname COLLATE "C",a.attnum`);
  const constraints=await tx.$queryRawUnsafe(`SELECT c.relname::text AS "table",k.conname::text AS name,k.convalidated AS validated,pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname COLLATE "C",k.conname COLLATE "C"`);
  const indexes=await tx.$queryRawUnsafe(`SELECT tablename::text,indexname::text,indexdef FROM pg_catalog.pg_indexes WHERE schemaname='public' ORDER BY tablename COLLATE "C",indexname COLLATE "C"`);
  const rows=[];
  for(const {name} of tables) {
    const quoted='"'+name.replaceAll('"','""')+'"';
    const [result]=await tx.$queryRawUnsafe(`SELECT count(*)::text AS "rowCount",encode(sha256(convert_to(coalesce(string_agg(payload,E'\\n' ORDER BY payload COLLATE "C"),''),'UTF8')),'hex') AS sha256 FROM (SELECT to_jsonb(t)::text AS payload FROM public.${quoted} t) snapshot_rows`);
    rows.push({name,rowCount:result.rowCount,sha256:result.sha256});
  }
  const snapshot=identity({catalogSha256:hash(JSON.stringify({columns,constraints,indexes})),tables:rows});
  return {...snapshot,sha256:hash(JSON.stringify(snapshot))};
}
const transaction=(client,fn)=>client.$transaction(fn,{isolationLevel:'RepeatableRead',timeout:120000,maxWait:10000});
export async function captureDatabaseSnapshot(client) {
  return transaction(client,measure);
}
export async function verifyDatabaseSnapshot(client,expected,files) {
  validateDatabaseSnapshot(expected);
  if(!Array.isArray(files)||files.some(f=>typeof f.assetId!=='string'||!f.assetId||typeof f.locator!=='string'||!f.locator||!DIGEST.test(f.sha256??''))||new Set(files.map(f=>f.assetId)).size!==files.length)throw Error('RECOVERY_ASSET_REFERENCE_MANIFEST_INVALID');
  return transaction(client,async tx=>{
    const actual=await measure(tx);
    if(actual.sha256!==expected.sha256)throw Error('RECOVERY_DATABASE_PARITY_INVALID');
    const assets=await tx.$queryRawUnsafe(`SELECT id,"cleanStorageLocator","checksumHash" FROM public."AssetRecord" WHERE "lifecycleState"='ACTIVE' ORDER BY id COLLATE "C"`);
    const byId=new Map(files.map(f=>[f.assetId,f]));
    if(assets.length!==files.length||assets.some(a=>{const f=byId.get(a.id);return !f||f.locator!==a.cleanStorageLocator||f.sha256!==a.checksumHash;}))throw Error('RECOVERY_ASSET_REFERENCE_PARITY_INVALID');
    return {databaseSnapshotMatched:true,assetReferencesMatched:true,databaseSnapshotSha256:actual.sha256,tableCount:actual.tables.length,assetCount:assets.length,readOnly:true};
  });
}
