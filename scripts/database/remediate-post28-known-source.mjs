// Diagnostic synthetic lab executor. Does not execute or authorize a migration.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {AssetId,AssetStorageLocator} from '@manaratak/domain';
import {preflightTargets} from './post28-isolation.mjs';
import {readDatabaseIdentity} from './post28-preflight.mjs';
import {requirePost28LocalExecution} from './post28-neon-policy.mjs';
import {assertNativeLabState} from './post28-native-lab-policy.mjs';
import {requireDatabaseMutationGate} from '../lib/database-mutation-gate.mjs';
import {IngestAssetUseCase} from '../../packages/application/src/asset-platform/use-cases/IngestAssetUseCase.ts';
import {ProcessAssetLifecycleUseCase} from '../../packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts';
import {PrismaAssetRecordRepository} from '../../packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts';
import {PrismaAssetUsageRegistryGateway} from '../../packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts';
import {PrismaAuditRecordRepository} from '../../packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts';
import {LocalAssetStorageGateway} from '../../packages/infrastructure/src/asset-platform/LocalAssetStorageGateway.ts';
import {realPdfProviders,sha256} from '../../tests/database/helpers/realPdfProviders.mjs';
import {requireKnownSourceTrust} from './post28-r05-trust-policy.mjs';
import {fixedKnownSourceDecision,R05AuditStagingRepository,stagedAssetRow,snapshotDigest} from './post28-r05-staging.mjs';
const fail=code=>{throw Error('POST28_R05_'+code);};
const json=value=>JSON.parse(JSON.stringify(value));
export async function runKnownSourceRemediation({applicationUrl}){
 const root=fs.realpathSync(process.cwd()),sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(Number(process.versions.node.split('.')[0])!==22||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())fail('CLEAN_NODE22_SOURCE_REQUIRED');
 const contractFile=fs.realpathSync(process.env.POST28_TARGET_CONTRACT_FILE),lab=path.dirname(contractFile);
 if(lab===root||lab.startsWith(root+path.sep))fail('PRIVATE_LAB_REQUIRED');
 const read=file=>JSON.parse(fs.readFileSync(path.join(lab,file),'utf8'));
 const contract=read('targets.json');requirePost28LocalExecution(contract);
 requireDatabaseMutationGate('synthetic R05 known-source remediation',{allowedPurposes:['maintenance']});
 await preflightTargets(contract,[{label:'DB-U',url:process.env.UPGRADE_DATABASE_URL},{label:'DB-V',url:process.env.UPGRADE_VERIFY_DATABASE_URL}],process.env,sourceSha,readDatabaseIdentity);
 const native=read('lab-state.json'),target=contract.targets['DB-U'];
 assertNativeLabState(native,contract,sourceSha,lab);
 if(native.kind!=='POST28_NATIVE_LOCAL_LAB'||native.scope!=='DISPOSABLE'||native.sourceSha!==sourceSha||native.runId!==contract.runId||fs.realpathSync(native.directory)!==fs.realpathSync(lab))fail('NATIVE_LAB_REQUIRED');
 const packet=read('R05-baseline/known-source/source-packet.json'),manifest=read('R05-baseline/fixture-manifest.json');
 const baseline=read('R05-baseline/result.json'),backup=read('R05-backup/verification-result.json'),negative=read('R05-preupgrade/result.json');
 if(packet.sourceSha!==sourceSha||packet.runId!==contract.runId||manifest.sourcePacket?.source?.sha256!==packet.source.sha256||baseline.sourceSha!==sourceSha||baseline.runId!==contract.runId||baseline.fixtureProof?.manifestSha256!==sha256(JSON.stringify(manifest))||backup.sourceSha!==sourceSha||backup.runId!==contract.runId||!backup.sourceUnchanged||!backup.allRowContentMatched||!backup.allCatalogDefinitionsMatched||negative.gate!=='BLOCKED'||negative.upgradeExecuted!==false)fail('BASELINE_BACKUP_NEGATIVE_PROOF_REQUIRED');
 if(negative.audits.filter(x=>x.violations!=='0').length!==1||!negative.audits.some(x=>x.constraint==='StudentApplicationDocumentBinding_assetId_fkey'&&x.violations==='1'))fail('ONLY_DECLARED_ORPHAN_REQUIRED');
 const url=new URL(applicationUrl);
 if(!['postgresql:','postgres:'].includes(url.protocol)||url.hash||[...url.searchParams].some(([key,value])=>key!=='schema'||value!=='public')||url.hostname!=='127.0.0.1'||Number(url.port)!==target.port||url.pathname!=='/'+target.database||url.username!=='post28_app'||url.password!==process.env.POST28_APP_PASSWORD)fail('LIMITED_APPLICATION_CONNECTION_REQUIRED');
 const db=new PrismaClient({datasources:{db:{url:url.href}},log:[],errorFormat:'minimal'});
 try{
  const [identity]=await db.$queryRaw`SELECT current_user AS role, current_database() AS database, (SELECT system_identifier::text FROM pg_control_system()) AS server, (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid, (SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()) AS marker, r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls FROM pg_roles r WHERE r.rolname=current_user`;
  if(identity.role!=='post28_app'||identity.database!==target.database||identity.server!==target.serverIdentity||identity.oid!==target.databaseOid||identity.marker!==`POST28_DISPOSABLE:${contract.runId}:DB-U:${target.nonce}`||['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls'].some(k=>identity[k]))fail('LIMITED_APPLICATION_IDENTITY_REQUIRED');
  const [privileges]=await db.$queryRaw`SELECT has_schema_privilege(current_user,'public','CREATE') AS ddl,has_table_privilege(current_user,'public."_prisma_migrations"','SELECT') AS ledger,has_table_privilege(current_user,'public."StudentApplicationDocumentBinding"','UPDATE') AS binding_write,has_table_privilege(current_user,'public."AuditRecord"','UPDATE') AS audit_update,has_table_privilege(current_user,'public."AssetRecord"','UPDATE') AS asset_update`;
  if(Object.values(privileges).some(Boolean))fail('APPLICATION_PRIVILEGES_EXCESSIVE');
  const directory=path.join(lab,'R05-remediation');fs.mkdirSync(directory,{recursive:true});
  const stateFile=path.join(directory,'operation.json');
  let operation;
  if(fs.existsSync(stateFile))operation=JSON.parse(fs.readFileSync(stateFile,'utf8'));
  else{
   const historical=await history(db);
   operation={sourceSha,runId:contract.runId,operationId:contract.runId,manifestSha256:sha256(JSON.stringify(manifest)),packetSha256:sha256(JSON.stringify(packet)),decision:fixedKnownSourceDecision(packet,historical.bindings.find(x=>x.id===packet.bindingId)?.expiresAt),historical};
   fs.writeFileSync(stateFile,JSON.stringify(operation,null,2)+'\n',{flag:'wx'});
  }
  if(operation.sourceSha!==sourceSha||operation.runId!==contract.runId||operation.manifestSha256!==sha256(JSON.stringify(manifest))||operation.packetSha256!==sha256(JSON.stringify(packet)))fail('OPERATION_BINDING_MISMATCH');
  const original=operation.historical.bindings.find(x=>x.id===packet.bindingId);
  const tracker=operation.historical.trackers.find(x=>x.id===original?.trackerId);
  if(!original||original.assetId!==packet.assetId||tracker?.studentReferenceId!==packet.owner.ownerId)fail('HISTORICAL_OWNER_MISMATCH');
  const audit=new PrismaAuditRecordRepository(db),assets=new PrismaAssetRecordRepository(db);
  const staged=new R05AuditStagingRepository({client:db,auditRepository:audit,operationId:operation.operationId,assetId:packet.assetId,ownerId:packet.owner.ownerId,manifestSha256:operation.manifestSha256,decision:operation.decision});
  const config=read('real-pdf-provider.json'),storage=new LocalAssetStorageGateway(config.bucket,config.storageRoot),provider=await realPdfProviders(lab,storage);
  if(sha256(provider.source)!==packet.source.sha256)fail('PROVIDER_SOURCE_MISMATCH');
  const ingest=new IngestAssetUseCase(staged,storage),lifecycle=new ProcessAssetLifecycleUseCase(staged,storage,new PrismaAssetUsageRegistryGateway(db),provider.scanner,provider.sanitizer);
  let asset=await staged.findById(new AssetId(packet.assetId));
  if(!asset){
   if(await db.assetRecord.findUnique({where:{id:packet.assetId}}))fail('TARGET_ALREADY_EXISTS');
   const grant=await ingest.requestUploadLocator({assetId:packet.assetId,assetReference:'STUDENT-DOCUMENT-R05-'+operation.operationId,ownerId:packet.owner.ownerId,ownerType:'STUDENT',originalFilename:packet.source.filename,mimeType:'application/pdf',fileExtension:'pdf',byteSize:packet.source.byteSize,classification:operation.decision.classification,retentionCategory:operation.decision.retentionCategory,expiresAt:operation.decision.expiresAt});
   const file=provider.resolve(new AssetStorageLocator('QUARANTINE',grant.bucketName,grant.pathKey));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,provider.source,{flag:'wx'});
   asset=await staged.findById(new AssetId(packet.assetId));
  }
  if(asset.state==='INITIATED'){
   const sourceFile=provider.resolve(asset.locator);
   if(!fs.existsSync(sourceFile)){fs.mkdirSync(path.dirname(sourceFile),{recursive:true});fs.writeFileSync(sourceFile,provider.source,{flag:'wx'});}
   if(sha256(fs.readFileSync(sourceFile))!==packet.source.sha256)fail('QUARANTINE_SOURCE_CHANGED');
   await lifecycle.finalizeUploadedAsset({assetId:packet.assetId});
  }
  asset=await staged.findById(new AssetId(packet.assetId));
  if(asset.state==='QUARANTINED')await lifecycle.validateAsset({assetId:packet.assetId});
  asset=await staged.findById(new AssetId(packet.assetId));
  if(asset.state==='VALIDATING')await lifecycle.sanitizeAsset({assetId:packet.assetId});
  asset=await staged.findById(new AssetId(packet.assetId));
  if(asset.state==='SANITIZING')await lifecycle.activateAsset({assetId:packet.assetId});
  asset=await staged.findById(new AssetId(packet.assetId));
  if(asset.state!=='ACTIVE')fail('PROVIDER_RECOVERY_REQUIRED');
  const journal=fs.readFileSync(path.join(lab,'real-pdf-proof/operations.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));
  const raster=journal.find(x=>x.kind==='MUPDF_RASTER_SANITIZATION'&&x.sanitizedSha256===asset.checksum.hash);
  const preScan=journal.find(x=>x.kind==='DEFENDER_SCAN'&&x.sha256===packet.source.sha256),postScan=journal.find(x=>x.kind==='DEFENDER_SCAN'&&x.sha256===asset.checksum.hash);
  const providerProof={...raster,preScan,postScan,storageReadbackSha256:sha256(await storage.read(asset.locator,10*1024*1024))};
  let trust;
  const verifyWithinTransaction=async(tx,snapshot,existing)=>{
   const expected=stagedAssetRow(snapshot);
   if(existing){
    for(const [key,value] of Object.entries(expected))assert.deepEqual(json(existing[key]),value,`R05 replay asset mismatch: ${key}`);
   }
   const historicalAfter=await history(tx);
   const readback=sha256(await storage.read(asset.locator,10*1024*1024));
   assert.equal(readback,providerProof.storageReadbackSha256);
   trust=requireKnownSourceTrust({asset:expected,packet,decision:operation.decision,providerProof,historicalBefore:operation.historical,historicalAfter});
  };
  // Inject a real transaction failure after canonical Asset insertion. Its Audit
  // completion must roll back too. The durable ACTIVE stage remains retryable.
  const latest=await staged.latest();let rollbackProof=null;
  if(latest.action!=='R05_REMEDIATION_COMPLETED'){
   const before=await db.auditRecord.count();
   const faultAudit={saveInTransaction:async(record,context)=>{await audit.saveInTransaction(record,context);throw Error('POST28_R05_INJECTED_COMPLETION_FAILURE');}};
   const fault=new R05AuditStagingRepository({client:db,auditRepository:faultAudit,operationId:operation.operationId,assetId:packet.assetId,ownerId:packet.owner.ownerId,manifestSha256:operation.manifestSha256,decision:operation.decision});
   await assert.rejects(fault.complete({assetRepository:assets,verifyWithinTransaction}),/INJECTED_COMPLETION_FAILURE/);
   assert.equal(await db.assetRecord.count({where:{id:packet.assetId}}),0);assert.equal(await db.auditRecord.count(),before);
   rollbackProof={assetAbsent:true,completionAuditAbsent:true,durableActiveStagePreserved:true};
  }
  const completion=await staged.complete({assetRepository:assets,verifyWithinTransaction});
  const beforeReplay=await db.auditRecord.count(),assetBeforeReplay=json(await db.assetRecord.findUnique({where:{id:packet.assetId}}));
  const replay=await staged.complete({assetRepository:assets,verifyWithinTransaction});
  assert.equal(replay.replayed,true);assert.equal(await db.auditRecord.count(),beforeReplay);assert.deepEqual(json(await db.assetRecord.findUnique({where:{id:packet.assetId}})),assetBeforeReplay);
  const audits=await db.auditRecord.findMany({where:{source:'POST28_R05_REMEDIATION',correlationReference:operation.operationId},orderBy:{timestamp:'asc'}});
  const result={kind:'POST28_R05_KNOWN_SOURCE_REMEDIATION',sourceSha,runId:contract.runId,identity,privileges,operationId:operation.operationId,manifestSha256:operation.manifestSha256,decision:operation.decision,trust,providerProof,completion,replay,rollbackProof,auditRecords:audits.length,auditActions:audits.map(x=>x.action),historicalRowsUnchanged:snapshotDigest(await history(db))===snapshotDigest(operation.historical),assetId:packet.assetId,originalNegativeEvidencePreserved:true,independentTechnicalReview:'PENDING',upgradeExecuted:false,R05Accepted:false};
  const resultFile=path.join(directory,completion.replayed?'replay-result.json':'result.json');fs.writeFileSync(resultFile,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  return result;
 }finally{await db.$disconnect();}
}
async function history(client){
 return json({bindings:await client.studentApplicationDocumentBinding.findMany({orderBy:{id:'asc'}}),trackers:await client.studentApplicationTracker.findMany({orderBy:{id:'asc'}}),consent:await client.studentPrivacyConsentDecision.findMany({orderBy:{id:'asc'}})});
}
