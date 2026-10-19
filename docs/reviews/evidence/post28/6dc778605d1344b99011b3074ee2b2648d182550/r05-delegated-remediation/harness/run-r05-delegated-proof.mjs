import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const [labInput,stage]=process.argv.slice(2),lab=fs.realpathSync(labInput),root=path.resolve('work/r07-filtered');
const env=Object.fromEntries(fs.readFileSync(path.join(lab,'lab.env'),'utf8').trim().split(/\r?\n/).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)];}));
Object.assign(process.env,env,{DATABASE_MUTATION_PURPOSE:'maintenance'});process.chdir(root);
const load=p=>import(pathToFileURL(path.join(root,p)).href);
const {assertNativeLabState}=await load('scripts/database/post28-native-lab-policy.mjs');
const state=JSON.parse(fs.readFileSync(path.join(lab,'lab-state.json'))),contract=JSON.parse(fs.readFileSync(path.join(lab,'targets.json')));
const {execFileSync,spawnSync}=await import('node:child_process');const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assertNativeLabState(state,contract,sha,lab);
const {preflightTargets}=await load('scripts/database/post28-isolation.mjs'),{readDatabaseIdentity}=await load('scripts/database/post28-preflight.mjs');
await preflightTargets(contract,[{label:'DB-U',url:env.UPGRADE_DATABASE_URL},{label:'DB-V',url:env.UPGRADE_VERIFY_DATABASE_URL}],process.env,sha,readDatabaseIdentity);
const {PrismaClient}=await load('node_modules/@prisma/client/default.js'),{measureUpgradeCatalog}=await load('scripts/database/post28-upgrade-catalog.mjs');
const read=file=>JSON.parse(fs.readFileSync(path.join(lab,file),'utf8')),write=(file,data)=>fs.writeFileSync(path.join(lab,file),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const db=new PrismaClient({datasources:{db:{url:env.UPGRADE_DATABASE_URL}},errorFormat:'minimal',log:[]});
try{
 if(stage==='inspect'){ const rows=await db.auditRecord.findMany({where:{source:'POST28_R05_REMEDIATION'},select:{reference:true,contextMetadata:true},orderBy:{timestamp:'asc'}}); console.log(JSON.stringify(rows)); }else if(stage==='prepare'){
  const negative=read('R05-preupgrade/result.json');assert.equal(negative.gate,'BLOCKED');assert.equal(negative.upgradeExecuted,false);
  const snapshot=await measureUpgradeCatalog(db);
  const originals={assets:await db.assetRecord.findMany({orderBy:{id:'asc'}}),audits:await db.auditRecord.findMany({orderBy:{id:'asc'}})};
  write('remediation-before-catalog.json',snapshot);write('remediation-original-rows.json',originals);
  const tables=await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`;
  for(const {tablename} of tables)await db.$executeRawUnsafe('GRANT SELECT ON public."'+tablename.replaceAll('"','""')+'" TO post28_app');
  await db.$executeRawUnsafe('GRANT INSERT ON public."AssetRecord",public."AuditRecord" TO post28_app');
  const previous=JSON.parse(fs.readFileSync(path.resolve('../native-pg16-W722PK/real-pdf-provider.json'),'utf8'));
  const storageRoot=path.join(lab,'real-pdf-storage');fs.mkdirSync(storageRoot);
  write('real-pdf-provider.json',{...previous,storageRoot,sourcePdf:path.join(lab,'R05-baseline/known-source/new-synthetic-historical-document.pdf')});
  console.log(JSON.stringify({stage,sourceSha:sha,runId:contract.runId,grants:'SELECT on existing application tables; INSERT only Asset and Audit',existingTables:snapshot.tables.length}));
 }else if(stage==='execute'){
  const application=new URL(env.UPGRADE_DATABASE_URL);application.username='post28_app';application.password=env.POST28_APP_PASSWORD;
  const {runKnownSourceRemediation}=await load('scripts/database/remediate-post28-known-source.mjs');
  const result=await runKnownSourceRemediation({applicationUrl:application.href});
  console.log(JSON.stringify({stage,sourceSha:sha,runId:contract.runId,trustChecksPassed:result.trust.trustChecksPassed,completion:result.completion,replay:result.replay,rollbackProof:result.rollbackProof,historicalRowsUnchanged:result.historicalRowsUnchanged,auditRecords:result.auditRecords,upgradeExecuted:false,R05Accepted:false}));
 }else if(stage==='delta'){
  const before=read('remediation-before-catalog.json'),originals=read('remediation-original-rows.json'),result=read('R05-remediation/result.json'),after=await measureUpgradeCatalog(db);
  assert.equal(after.catalogSha256,before.catalogSha256);assert.equal(after.tables.length,before.tables.length);
  const unchanged=[];for(const table of before.tables){if(['AssetRecord','AuditRecord'].includes(table.name))continue;assert.deepEqual(after.tables.find(x=>x.name===table.name),table);unchanged.push(table.name);}
  const normalize=value=>JSON.parse(JSON.stringify(value));
  for(const row of originals.assets)assert.deepEqual(normalize(await db.assetRecord.findUnique({where:{id:row.id}})),row);
  for(const row of originals.audits)assert.deepEqual(normalize(await db.auditRecord.findUnique({where:{id:row.id}})),row);
  assert.equal(await db.assetRecord.count(),originals.assets.length+1);
  assert.equal(await db.auditRecord.count(),originals.audits.length+result.auditRecords);
  const {UPGRADE_AUDITS,requireZeroUpgradeAudits}=await load('scripts/database/post28-upgrade-measurement.mjs');
  const audits=[];for(const [constraint,sql] of UPGRADE_AUDITS)audits.push({constraint,...(await db.$queryRawUnsafe(sql))[0]});requireZeroUpgradeAudits(audits);
  const [ledger]=await db.$queryRaw`SELECT count(*)::text AS total,count(*) FILTER(WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL)::text AS failed FROM public._prisma_migrations`;assert.equal(ledger.total,'109');assert.equal(ledger.failed,'0');
  const proof={sourceSha:sha,runId:contract.runId,catalogUnchanged:true,unchangedTableCount:unchanged.length,unchangedTables:unchanged,previousAssetRowsPreserved:originals.assets.length,previousAuditRowsPreserved:originals.audits.length,assetDelta:1,auditDelta:result.auditRecords,audits,ledger,financialRowsUnchanged:true,allOtherExistingRowsUnchanged:true,upgradeExecuted:false,R05Accepted:false};
  write('R05-remediation/delta-proof.json',proof);write('R05-remediation/after-catalog.json',after);console.log(JSON.stringify(proof));
 }else if(stage==='compatibility'){
  const {createRequire}=await import('node:module'),PreviousClient=createRequire(import.meta.url)(path.join(lab,'R05-baseline/previous-client/index.js')).PrismaClient;
  const application=new URL(env.UPGRADE_DATABASE_URL);application.username='post28_app';application.password=env.POST28_APP_PASSWORD;
  const app=new PrismaClient({datasources:{db:{url:application.href}},log:[],errorFormat:'minimal'}),old=new PreviousClient({datasources:{db:{url:application.href}},log:[],errorFormat:'minimal'});
  try{
   const manifest=read('R05-baseline/fixture-manifest.json'),packet=read('R05-baseline/known-source/source-packet.json'),operation=read('R05-remediation/operation.json');
   const probes=await old.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');for(const row of manifest.rows){const value=await tx[row.model[0].toLowerCase()+row.model.slice(1)].findUnique({where:{id:row.data.id}});assert.ok(value);for(const [key,expected] of Object.entries(row.data))assert.deepEqual(JSON.parse(JSON.stringify(value[key])),expected);}return manifest.rows.length;});
   const {PrismaAssetRecordRepository}=await load('packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts'),{PrismaAssetUsageRegistryGateway}=await load('packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts'),{LocalAssetStorageGateway}=await load('packages/infrastructure/src/asset-platform/LocalAssetStorageGateway.ts'),{ProcessAssetLifecycleUseCase}=await load('packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts'),{AssetReferencePolicy}=await load('packages/application/src/asset-platform/AssetReferencePolicy.ts');
   const config=read('real-pdf-provider.json'),repository=new PrismaAssetRecordRepository(app),lifecycle=new ProcessAssetLifecycleUseCase(repository,new LocalAssetStorageGateway(config.bucket,config.storageRoot),new PrismaAssetUsageRegistryGateway(app));
   const delivery=await lifecycle.readAuthenticatedDelivery(packet.assetId);assert.equal(delivery.checksumSha256,read('R05-remediation/result.json').providerProof.sanitizedSha256);
   const policy=new AssetReferencePolicy(repository);await assert.rejects(policy.assertUsable(packet.assetId,{purpose:'SYNTHETIC_STUDENT',expectedOwnerId:'different-synthetic-student',allowedClassifications:['CONFIDENTIAL']}),/OWNER_MISMATCH/);
   await assert.rejects(policy.assertUsable(packet.assetId,{purpose:'PUBLIC_DOCUMENT',publicPublication:true}),/CLASSIFICATION_NOT_ALLOWED/);
   const {PrismaStudentApplicationTrackerRepository}=await load('packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts'),{ScholarshipStudentApplicationTrackerGateway}=await load('packages/infrastructure/src/students/ScholarshipStudentApplicationTrackerGateway.ts'),{PrismaScholarshipRepository}=await load('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts'),{StudentDocumentReviewUseCases}=await load('packages/application/src/students/use-cases/StudentDocumentReviewUseCases.ts');
   const review=new StudentDocumentReviewUseCases(new PrismaStudentApplicationTrackerRepository(app),new ScholarshipStudentApplicationTrackerGateway(new PrismaScholarshipRepository(app)),policy,lifecycle);
   await assert.rejects(review.open(packet.bindingId,'synthetic-reviewer'),/STUDENT_DOCUMENT_REVIEW_UNAVAILABLE/);
   const bindings=JSON.parse(JSON.stringify(await app.studentApplicationDocumentBinding.findMany({orderBy:{id:'asc'}})));assert.deepEqual(bindings,operation.historical.bindings);
   const proof={sourceSha:sha,runId:contract.runId,previousClientVersion:'5.22.0',fixtureReadProbes:probes,allDeclaredHistoricalFieldsMatched:true,role:'post28_app',phase:'AFTER_REMEDIATION_BEFORE_UPGRADE',canonicalAuthenticatedDelivery:{bytes:delivery.bytes.length,mimeType:delivery.mimeType,sha256:delivery.checksumSha256},crossStudentDenied:true,confidentialPublicReferenceDenied:true,legacyStudentReviewDenied:true,consentAndBindingUnchanged:true,upgradeExecuted:false,R05Accepted:false};write('R05-remediation/compatibility.json',proof);console.log(JSON.stringify(proof));
  }finally{await app.$disconnect();await old.$disconnect();}
 }else if(stage==='after-backup'){
  const {randomBytes}=await import('node:crypto'),{verificationRestoreList}=await load('scripts/database/post28-backup-contract.mjs'),{nativePgEnvironment}=await load('scripts/database/post28-native-lab-policy.mjs'),{digest}=await load('scripts/database/post28-migration-inventory.mjs');
  const destination='manaratak_post28_known_source_verify_test',nonce=randomBytes(32).toString('hex'),directory=path.join(lab,'R05-after-remediation-backup');fs.mkdirSync(directory);
  const sql=input=>{const r=spawnSync(path.join(state.pgBin,'psql.exe'),['-X','-v','ON_ERROR_STOP=1','-At'],{env:{SystemRoot:process.env.SystemRoot,PATH:state.pgBin+';'+process.env.SystemRoot+'\\System32',PGHOST:'127.0.0.1',PGPORT:String(state.port),PGUSER:'post28_bootstrap',PGPASSWORD:fs.readFileSync(path.join(lab,'bootstrap-password'),'utf8').trim(),PGDATABASE:'postgres',PGSSLMODE:'disable'},input,windowsHide:true,encoding:'utf8',timeout:30000});if(r.status!==0)throw Error('OWNED_NEW_RESTORE_TARGET_PROVISIONING_FAILED');return r.stdout.trim();};
  sql(`CREATE DATABASE ${destination} OWNER post28_bootstrap TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'; REVOKE ALL ON DATABASE ${destination} FROM PUBLIC; GRANT CONNECT ON DATABASE ${destination} TO post28_verifier; COMMENT ON DATABASE ${destination} IS 'POST28_DISPOSABLE:${contract.runId}:DB-V:${nonce}';`);
  const verifyUrl=new URL(env.UPGRADE_VERIFY_DATABASE_URL);verifyUrl.pathname='/'+destination;
  // Provision schema/extension in this new empty database using its existing limited verifier.
  const bootstrapEnv={...nativePgEnvironment(state,verifyUrl.href),PGUSER:'post28_bootstrap',PGPASSWORD:fs.readFileSync(path.join(lab,'bootstrap-password'),'utf8').trim()};
  const provision=spawnSync(path.join(state.pgBin,'psql.exe'),['-X','-v','ON_ERROR_STOP=1','-At'],{env:bootstrapEnv,input:'CREATE EXTENSION pg_trgm; REVOKE ALL ON SCHEMA public FROM PUBLIC; ALTER SCHEMA public OWNER TO post28_verifier; GRANT USAGE,CREATE ON SCHEMA public TO post28_verifier; GRANT EXECUTE ON FUNCTION pg_control_system() TO post28_verifier;',encoding:'utf8',windowsHide:true,timeout:30000});if(provision.status!==0)throw Error('OWNED_NEW_RESTORE_SCHEMA_FAILED');
  const verifier=new PrismaClient({datasources:{db:{url:verifyUrl.href}},log:[],errorFormat:'minimal'});
  try{
   const [identity]=await verifier.$queryRaw`SELECT (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid`;
   const nextContract={...contract,targets:{...contract.targets,'DB-V':{...contract.targets['DB-V'],database:destination,databaseOid:identity.oid,nonce}}};write('targets-after-remediation.json',nextContract);
   await preflightTargets(nextContract,[{label:'DB-V',url:verifyUrl.href}],process.env,sha,readDatabaseIdentity,{requireEmpty:true});
   const source=await measureUpgradeCatalog(db);
   const pg=(url,program,args,input,readOnly=false)=>{assertNativeLabState(state,nextContract,sha,lab);const r=spawnSync(path.join(state.pgBin,program+'.exe'),args,{env:nativePgEnvironment(state,url,{readOnly}),input,windowsHide:true,timeout:120000,maxBuffer:64*1024*1024});if(r.status!==0)throw Error('AFTER_REMEDIATION_'+program.toUpperCase()+'_FAILED');return r.stdout;};
   const archive=pg(env.UPGRADE_DATABASE_URL,'pg_dump',['--format=custom','--no-owner','--no-acl'],undefined,true);assert.equal(archive.subarray(0,5).toString(),'PGDMP');fs.writeFileSync(path.join(directory,'predecessor.dump'),archive,{flag:'wx'});
   const list=verificationRestoreList(pg(env.UPGRADE_DATABASE_URL,'pg_restore',['--list'],archive,true).toString()),listFile=path.join(directory,'verification-list.txt');fs.writeFileSync(listFile,list.text,{flag:'wx'});
   pg(verifyUrl.href,'pg_restore',['--single-transaction','--exit-on-error','--no-owner','--no-acl','--use-list='+listFile,'--dbname='+destination],archive);
   const restored=await measureUpgradeCatalog(verifier),sourceAfter=await measureUpgradeCatalog(db);assert.deepEqual(restored,source);assert.deepEqual(sourceAfter,source);
   const proof={kind:'POST28_R05_AFTER_REMEDIATION_BACKUP',sourceSha:sha,runId:contract.runId,archiveSha256:digest(archive),bytes:archive.length,restoredTables:restored.tables.length,allRowContentMatched:true,allCatalogDefinitionsMatched:true,sourceUnchanged:true,tableContentSha256:source.tableContentSha256,catalogSha256:source.catalogSha256,newEmptyRestoreTarget:destination,originalBackupAndRestoreTargetUnchanged:true,upgradeExecuted:false,R05Accepted:false};write('R05-after-remediation-backup/result.json',proof);write('R05-after-remediation-backup/source-snapshot.json',source);write('R05-after-remediation-backup/restored-snapshot.json',restored);console.log(JSON.stringify(proof));
  }finally{await verifier.$disconnect();}
 }else if(stage==='stop'){
  const pidFile=path.join(state.dataDirectory,'postmaster.pid');assert.equal(Number(fs.readFileSync(pidFile,'utf8').split(/\r?\n/)[0]),state.postmasterPid);
  await db.$disconnect();const r=spawnSync(path.join(state.pgBin,'pg_ctl.exe'),['-D',state.dataDirectory,'-m','fast','-w','stop'],{encoding:'utf8',windowsHide:true,timeout:30000});
  fs.writeFileSync(path.join(lab,'delegated-stop.log'),(r.stdout??'')+(r.stderr??''),{flag:'wx'});const proof={sourceSha:sha,runId:contract.runId,postmasterPid:state.postmasterPid,port:state.port,exitCode:r.status,pidFileRemoved:!fs.existsSync(pidFile)};write('delegated-stop.json',proof);assert.equal(r.status,0);assert.equal(proof.pidFileRemoved,true);console.log(JSON.stringify(proof));
 }else throw Error('STAGE_REQUIRED');
}catch(error){console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]'));process.exitCode=1;}finally{await db.$disconnect();}
