import {digest} from './post28-migration-inventory.mjs';
export async function measureUpgradeCatalog(client){
 return client.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe("SET LOCAL statement_timeout='10s'");
  const tables=await tx.$queryRawUnsafe("SELECT tablename AS name FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  for(const table of tables){
   const id='"'+table.name.replaceAll('"','""')+'"';
   const [row]=await tx.$queryRawUnsafe(`SELECT count(*)::text AS count,encode(sha256(convert_to(COALESCE(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),'' ORDER BY encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')),''),'UTF8')),'hex') AS hash FROM public.${id} t`);
   Object.assign(table,row);
  }
  const constraints=await tx.$queryRawUnsafe(`SELECT t.relname AS table,c.conname AS name,c.contype AS type,c.convalidated AS validated,pg_get_constraintdef(c.oid,true) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,c.conname`);
  const indexes=await tx.$queryRawUnsafe(`SELECT t.relname AS table,i.relname AS name,x.indisvalid AS valid,x.indisready AS ready,x.indislive AS live,pg_get_indexdef(i.oid) AS definition FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,i.relname`);
  const triggers=await tx.$queryRawUnsafe(`SELECT t.relname AS table,tr.tgname AS name,tr.tgenabled AS enabled,pg_get_triggerdef(tr.oid,true) AS definition FROM pg_trigger tr JOIN pg_class t ON t.oid=tr.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND NOT tr.tgisinternal ORDER BY t.relname,tr.tgname`);
  const functions=await tx.$queryRawUnsafe(`SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)`);
  const columns=await tx.$queryRawUnsafe(`SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`);
  const catalog={constraints,indexes,triggers,functions,columns};
  return {tables,catalog,tableContentSha256:digest(JSON.stringify(tables)),catalogSha256:digest(JSON.stringify(catalog)),readOnly:true};
 },{isolationLevel:'RepeatableRead',timeout:60000});
}
