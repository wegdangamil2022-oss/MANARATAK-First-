import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { PrismaClient, type Prisma } from '@prisma/client';
import { AssetId, AssetStorageLocator, AssetStorageZone, AssetSecurityClassification, AssetRetentionCategory, UniversalImportHandoff } from '@manaratak/domain';
import { referenceImportPayloadDigest, type ReferenceOwnerReview } from '@manaratak/application';
import { AtomicAuditedOutboxMutationExecutor, AtomicDomainMutationCoordinator, ReferenceOwnerReviewUseCases, ReferenceDataUseCases,
  ReferenceDataScreeningHandoffConsumer, ImportHandoffDispatcher, IngestAssetUseCase, ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { PrismaAtomicPersistenceUnitOfWork, PrismaAuditRecordRepository, PrismaTransactionalOutboxStore, PrismaReferenceOwnerReviewGateway,
  PrismaReferenceDataRepository, PrismaImportScreeningReceiptStore, PrismaAssetRecordRepository, LocalAssetStorageGateway, PrismaAssetUsageRegistryGateway } from '@manaratak/infrastructure';
import { screeningReceiptIdentity } from '../../packages/infrastructure/src/import-foundation/PrismaImportScreeningReceiptStore';
import { referenceSeedPlan, referenceSeedPayload, hash, type SeedInput } from './post28-reference-seed-plan';
import { ManagedReferenceAssetSecurity } from './managed-reference-asset-security';
// @ts-expect-error Operator ESM policy has no TS declaration.
import { validateManagedReferenceSeed, validateManagedSeedIdentity } from './managed-reference-seed-policy.mjs';
// @ts-expect-error Operator ESM guard has no TS declaration.
import { privateSeedDirectory, writeSeedEvidence } from './managed-reference-seed-files.mjs';
// @ts-expect-error Existing read-only probe has no TS declaration.
import { readDatabaseIdentity } from './post28-preflight.mjs';
// @ts-expect-error Shared mutation gate has no TS declaration.
import { requireDatabaseMutationGate } from '../lib/database-mutation-gate.mjs';
// @ts-expect-error PostgreSQL TLS probe has no TS declaration.
import { verifyManagedPostgresTls } from './verify-managed-postgres-tls.mjs';
// @ts-expect-error Operator ESM recovery guard has no TS declaration.
import { recoveryHash, validateSeedRecovery, seedReviewAction, cachedSeedReceipt, managedReferenceTransactionOptions } from './managed-reference-seed-recovery.mjs';
let diagnosticPath:string|undefined;
const recentQueryTimings:Array<{at:string;durationMs:number}>=[];

async function main(){
 const mode=process.argv[2];
 if(!['preflight','inspect-recovery','apply','resume'].includes(mode)||Number(process.versions.node.split('.')[0])!==22)throw new Error('MANAGED_SEED_MODE_OR_NODE_INVALID');
 const root=process.cwd(),sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('MANAGED_SEED_CLEAN_SOURCE_REQUIRED');
 const configFile=process.env.MANAGED_REFERENCE_SEED_CONFIG!;
 const directory=privateSeedDirectory(configFile,root),config=JSON.parse(fs.readFileSync(configFile,'utf8'));
 const inputs=await referenceSeedPlan(root),schemaPath='packages/infrastructure/prisma/schema.prisma';
 const source={sourceSha,schemaSha256:hash(fs.readFileSync(schemaPath)),manifestSha256:hash(fs.readFileSync('scripts/database/greenfield-seed.manifest.json')),inputs};
 const {target,actorId,runId}=validateManagedReferenceSeed(config.approval,source,process.env.DATABASE_URL,process.env);
 const schemaProof=JSON.parse(fs.readFileSync(config.schemaProof,'utf8'));
 assert.equal(schemaProof.status,'PASS');assert.equal(schemaProof.exitCode,0);assert.equal(schemaProof.databaseWrites,0);
 assert.equal(schemaProof.projectId,target.projectId);assert.equal(schemaProof.branchId,target.branchId);assert.equal(schemaProof.schemaSha256,source.schemaSha256);
 execFileSync('git',['merge-base','--is-ancestor',schemaProof.sourceSha,sourceSha],{stdio:'pipe'});
 execFileSync('git',['diff','--exit-code',schemaProof.sourceSha,sourceSha,'--',schemaPath,'packages/infrastructure/prisma/migrations'],{stdio:'pipe'});
 if(['apply','resume'].includes(mode))requireDatabaseMutationGate('managed-reference-seed',{allowedPurposes:['seed']});
 const output=path.join(directory,'managed-reference-'+runId);fs.mkdirSync(output,{recursive:true,mode:0o700});
 diagnosticPath=path.join(output,'failure-'+Date.now()+'.json');
 const bucket='managed-reference-'+runId,storageRoot=path.join(output,'assets');fs.mkdirSync(storageRoot,{recursive:true,mode:0o700});
 const security=new ManagedReferenceAssetSecurity(storageRoot,bucket,config.scanner);
 // Scan each actual canonical packet before creating any database record.
 for(const input of inputs){
  const locator=new AssetStorageLocator(AssetStorageZone.QUARANTINE,bucket,'preflight/'+input.id+'.json');
  const filename=path.join(storageRoot,bucket,locator.pathKey);fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  fs.writeFileSync(filename,JSON.stringify(input.records),{mode:0o600});await security.sanitize(locator);await security.scan(locator);
 }
 const live=await readDatabaseIdentity(process.env.DATABASE_URL,{provider:'NEON'});
 // A managed endpoint includes network round trips inside the existing owner
 // transaction. Bound this operator client only; retain all atomicity/lock guards.
 const db=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}},log:[{emit:'event',level:'query'}],errorFormat:'minimal',transactionOptions:managedReferenceTransactionOptions});
 // Keep only bounded timings, never SQL or parameters, for intermittent remote stalls.
 db.$on('query',event=>{recentQueryTimings.push({at:new Date().toISOString(),durationMs:event.duration});if(recentQueryTimings.length>64)recentQueryTimings.shift();});
 try{
  await db.$connect();
  const transport=await verifyManagedPostgresTls(process.env.DATABASE_URL);
  const [{access}]=await db.$queryRaw<Array<{access:boolean}>>`SELECT has_table_privilege(current_user,'public._prisma_migrations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS access`;
  validateManagedSeedIdentity(target,live,access,transport);
  const preflight={mode:'PREFLIGHT',pass:true,sourceSha,runId,target,records:inputs.reduce((n,x)=>n+x.records.length,0),databaseWrites:0,
   schemaSha256:source.schemaSha256,schemaProofSha256:hash(fs.readFileSync(config.schemaProof)),scannerReceipts:security.receipts,transport,live};
  writeSeedEvidence(path.join(output,'preflight.json'),preflight);
  if(mode==='preflight'){console.log(JSON.stringify(preflight));return;}
  if(mode==='inspect-recovery'){
   const stateFile=path.join(output,'state.json'),state=JSON.parse(fs.readFileSync(stateFile,'utf8')),snapshot=await recoverySnapshot(db);
   writeSeedEvidence(path.join(output,'recovery-candidate.json'),{kind:'DELEGATED_REVIEWED_SAME_RUN_RECOVERY',runId,sourceSha,priorSourceSha:state.sourceSha,stateSha256:hash(fs.readFileSync(stateFile)),snapshotSha256:recoveryHash(snapshot),snapshot,databaseWrites:0});return;
  }
  const lock=path.join(output,'operator.lock');const fd=fs.openSync(lock,'wx');fs.closeSync(fd);
  try{await applyReferences(db,{inputs,security,storageRoot,bucket,output,sourceSha,runId,actorId,configFile,resume:mode==='resume',recovery:config.recovery});}
  finally{fs.unlinkSync(lock);}
 }finally{await db.$disconnect();}
}

async function recoverySnapshot(db:PrismaClient){
 const tables=await db.$queryRaw<Array<{tablename:string}>>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE 'Reference%' OR tablename IN ('AssetRecord','ImportScreeningReceipt','AuditRecord','TransactionalOutboxRecord')) ORDER BY tablename`;
 const queries=tables.map(({tablename})=>`SELECT '${tablename.replaceAll("'","''")}' AS name,count(*)::integer AS count,md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM public."${tablename.replaceAll('"','""')}" t`);
 return {rows:await db.$queryRawUnsafe(queries.join(' UNION ALL ')+' ORDER BY name'),protectedRows:await protectedRows(db)};
}

async function protectedRows(db:PrismaClient){
 const tables=await db.$queryRaw<Array<{tablename:string}>>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ~* '(student|certificate|financial|payment|wallet|ledger)' ORDER BY tablename`;
 const queries=tables.map(({tablename})=>`SELECT '${tablename.replaceAll("'","''")}' AS name,count(*)::integer AS count,md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM public."${tablename.replaceAll('"','""')}" t`);
 return db.$queryRawUnsafe(queries.join(' UNION ALL ')+' ORDER BY name');
}

interface ApplyOptions {
 inputs:SeedInput[];security:ManagedReferenceAssetSecurity;storageRoot:string;bucket:string;output:string;
 sourceSha:string;runId:string;actorId:string;configFile:string;resume:boolean;recovery:unknown;
}
async function applyReferences(db:PrismaClient,options:ApplyOptions){
 const {inputs,security,storageRoot,bucket,output,sourceSha,runId,actorId,configFile}=options;
 const statePath=path.join(output,'state.json');
 if(fs.existsSync(statePath)&&!options.resume)throw new Error('MANAGED_SEED_EXISTING_RUN_REQUIRES_REVIEW');
 const counts=await Promise.all([db.referenceCurrency.count(),db.referenceLanguage.count(),db.referenceCountry.count()]);
 if(!options.resume)assert.deepEqual(counts,[0,0,0],'MANAGED_SEED_NONEMPTY_REFERENCE_TARGET');
 const protectedBefore=await protectedRows(db);
 const state={sourceSha,runId,completed:false,applied:0,aliasCommands:0,protectedBefore,scannerReceipts:security.receipts};
 const save=()=>writeSeedEvidence(statePath,state);
 // Atomic creation prevents two operators from both starting an empty run.
 if(options.resume){
  const previous=fs.readFileSync(statePath),prior=JSON.parse(previous.toString());
  validateSeedRecovery(options.recovery,prior,await recoverySnapshot(db),hash(previous),runId);
  assert.deepEqual(protectedBefore,prior.protectedBefore,'MANAGED_SEED_PROTECTED_ROWS_CHANGED');
  execFileSync('git',['merge-base','--is-ancestor',prior.sourceSha,sourceSha],{stdio:'pipe'});
  writeSeedEvidence(path.join(output,'recovery-start-'+Date.now()+'.json'),{sourceSha,priorState:prior,authorizationSha256:hash(fs.readFileSync(configFile))},{exclusive:true});
 }else writeSeedEvidence(statePath,state,{exclusive:true});
 const baseUnitOfWork=new PrismaAtomicPersistenceUnitOfWork(db);
 const boundedUnitOfWork:Pick<typeof baseUnitOfWork,'execute'>={execute:work=>baseUnitOfWork.execute(async context=>{
  const tx=(context as typeof context & {transactionClient:Prisma.TransactionClient}).transactionClient;
  // Bound server waits too: a lost client must not leave advisory locks open.
  await tx.$queryRaw`SELECT set_config('statement_timeout','10000',true) AS statement_timeout, set_config('lock_timeout','3000',true) AS lock_timeout, set_config('idle_in_transaction_session_timeout','30000',true) AS idle_timeout`;
  return work(context);
 })};
 const executor=new AtomicAuditedOutboxMutationExecutor(boundedUnitOfWork,new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db));
 const reviewGateway=new PrismaReferenceOwnerReviewGateway(db);
 const reviews=new ReferenceOwnerReviewUseCases(reviewGateway,new AtomicDomainMutationCoordinator(executor));
 const repository=new PrismaReferenceDataRepository(db),author=new ReferenceDataUseCases(repository,undefined,undefined,executor);
 const dispatcher=new ImportHandoffDispatcher({REFERENCE_DATA:new ReferenceDataScreeningHandoffConsumer()},new PrismaImportScreeningReceiptStore(db,managedReferenceTransactionOptions));
 const storage=new LocalAssetStorageGateway(bucket,storageRoot),assets=new PrismaAssetRecordRepository(db);
 const ingest=new IngestAssetUseCase(assets,storage),lifecycle=new ProcessAssetLifecycleUseCase(assets,storage,new PrismaAssetUsageRegistryGateway(db),security,security);
 const context={actorId,actorType:'DELEGATED_PROJECT_OPERATOR',source:'managed-development-reference-seed',correlationId:runId};
 const packets=new Map(inputs.map(input=>{
  const bytes=Buffer.from(JSON.stringify(input.records));
  return [input.id,{bytes,artifactHash:hash(bytes),assetId:'managed-seed-'+hash(runId+input.id)}] as const;
 }));
 const handoffFor=(input:SeedInput,index:number):UniversalImportHandoff=>{
  const {artifactHash,assetId}=packets.get(input.id)!;
  return {handoffId:input.id+':'+index,ownerDomain:'REFERENCE_DATA',artifact:{sourceId:input.id,artifactId:assetId},normalizedPayload:referenceSeedPayload(input,input.records[index]),
   provenance:{sourceSystem:'managed-development-reviewed-manifest',contentHash:artifactHash,sourceRowNumber:index+1},validation:{state:'VALID',issues:[]},
   execution:{executionId:runId,dryRun:false,attempt:1,idempotencyKey:input.id+':'+index},referenceMetadata:{referenceEntityType:input.type,sourceVersion:input.sourceVersion}};
 };
 // Recovery already proved an exact live snapshot under the exclusive operator
 // lock. Load its bounded receipts and owner plans once instead of paying three
 // remote lookups for every completed row. Missing/pending rows still use the
 // original transactional owner commands, version guards and durable receipt store.
 const keys=inputs.flatMap(input=>input.records.map((_,index)=>screeningReceiptIdentity(handoffFor(input,index)).handoffKey));
 assert.equal(keys.length,622);assert.equal(new Set(keys).size,keys.length,'MANAGED_SEED_HANDOFF_IDENTITY_COLLISION');
 const previousReceiptRows=options.resume?await db.importScreeningReceipt.findMany({where:{ownerDomain:'REFERENCE_DATA',handoffKey:{in:keys}},take:keys.length+1}):[];
 assert.ok(previousReceiptRows.length<=keys.length,'MANAGED_SEED_RECOVERY_RECEIPT_COUNT_INVALID');
 const previousReceipts=new Map(previousReceiptRows.map(row=>[row.handoffKey,row]));
 const previousPlanRows=options.resume&&previousReceiptRows.length?await db.referenceOwnerImportReview.findMany({where:{receiptId:{in:previousReceiptRows.map(row=>row.id)}},take:keys.length+1}):[];
 assert.ok(previousPlanRows.length<=previousReceiptRows.length,'MANAGED_SEED_RECOVERY_REVIEW_COUNT_INVALID');
 const previousPlans=new Map(previousPlanRows.map(row=>[row.id,row as unknown as ReferenceOwnerReview]));
 for(const input of inputs){
  const {bytes,artifactHash,assetId}=packets.get(input.id)!;
  const existing=await assets.findById(new AssetId(assetId));
  if(existing){
   assert.ok(options.resume,'MANAGED_SEED_EXISTING_ASSET_REQUIRES_RECOVERY');existing.assertCanDeliver();
   assert.equal(existing.reference.value,runId+':'+input.id);assert.equal(existing.owner.ownerId,runId);assert.equal(existing.owner.ownerType,'REFERENCE_DATA');
   assert.equal(existing.checksum?.hash,artifactHash);assert.equal(existing.classification,'INTERNAL');assert.equal(existing.retention.category,'PERMANENT');
   assert.equal(hash(await storage.read(existing.locator,10*1024*1024)),artifactHash);await security.sanitize(existing.locator);await security.scan(existing.locator);
  }else{
  const upload=await ingest.requestUploadLocator({assetId,assetReference:runId+':'+input.id,ownerId:runId,ownerType:'REFERENCE_DATA',originalFilename:input.id+'.json',mimeType:'application/json',fileExtension:'json',byteSize:bytes.length,classification:AssetSecurityClassification.INTERNAL,retentionCategory:AssetRetentionCategory.PERMANENT});
  const filename=path.join(storageRoot,upload.bucketName,upload.pathKey);fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});fs.writeFileSync(filename,bytes,{mode:0o600,flag:'wx'});
  await lifecycle.finalizeUploadedAsset({assetId});await lifecycle.validateAsset({assetId});await lifecycle.sanitizeAsset({assetId});await lifecycle.activateAsset({assetId});
  const asset=await assets.findById(new AssetId(assetId));assert.ok(asset);asset.assertCanDeliver();assert.equal(asset.checksum?.hash,artifactHash);
  assert.equal(hash(await storage.read(asset.locator,10*1024*1024)),artifactHash);
  }
  for(const [index,record] of input.records.entries()){
   const payload=referenceSeedPayload(input,record);
   const handoff=handoffFor(input,index),identity=screeningReceiptIdentity(handoff);
   // A reviewed recovery reuses durable receipts through their content-hash check.
   // Starting another write transaction for a receipt already accepted adds no proof.
   const priorReceipt=options.resume?cachedSeedReceipt(previousReceipts,identity):null;
   const screened=priorReceipt?priorReceipt.result:await dispatcher.dispatch(handoff);assert.ok(screened&&typeof screened==='object'&&'state' in screened&&'issues' in screened);
   assert.equal(screened.state,'NEEDS_OWNER_REVIEW');assert.ok(Array.isArray(screened.issues));assert.equal(screened.issues.length,0);
   const receipt=priorReceipt??await db.importScreeningReceipt.findUniqueOrThrow({where:{ownerDomain_handoffKey:{ownerDomain:identity.ownerDomain,handoffKey:identity.handoffKey}}});
   const reviewId='p7-review-'+referenceImportPayloadDigest({value:receipt.id});
   const priorPlan=options.resume?previousPlans.get(reviewId):null;
   let plan=priorPlan??await reviews.preview(receipt.id,context);assert.deepEqual(plan.preview.issues,[]);
   assert.equal(plan.receiptId,receipt.id);assert.equal(plan.sourceHash,receipt.requestHash);assert.equal(plan.entityType,input.type);
   const action=seedReviewAction(plan,actorId,referenceImportPayloadDigest(plan.payload),referenceImportPayloadDigest(payload));
   if(action==='REVIEW')plan=await reviews.review(plan.id,{expectedVersion:plan.version,previewHash:plan.previewHash,decision:'APPROVE',reason:`Delegated project-owner development bootstrap; source=${input.sourceHash}; authorization=${hash(fs.readFileSync(configFile))}`},context);
   // An APPLIED plan already completed the owner transaction. Keep its decision,
   // Audit and Outbox intact; only pending plans invoke the owner mutation again.
   if(action!=='REUSE')await reviews.apply(plan.id,{expectedVersion:plan.version,previewHash:plan.previewHash},context);
   if(input.type==='LANGUAGE'&&record.aliases?.length){
    const current=await repository.getLanguage(record.isoCode);assert.ok(current);
    const aliases=await db.referenceAliasRecord.findMany({where:{referenceId:current.id,entityType:'LANGUAGE'},select:{alias:true,locale:true,aliasType:true}});
    if(aliases.length){assert.ok(options.resume);const normalize=(x:{alias:string;locale?:string|null;aliasType?:string})=>JSON.stringify([x.alias,x.locale??null,x.aliasType]);assert.deepEqual(aliases.map(normalize).sort(),record.aliases.map(normalize).sort());}
    else await author.upsertLanguage({...payload,id:current.id,expectedVersion:current.versionNumber,aliases:record.aliases} as Parameters<ReferenceDataUseCases['upsertLanguage']>[0],context);state.aliasCommands++;
   }
   state.applied++;save();if(state.applied%5===0)console.log(JSON.stringify({phase:input.id,applied:state.applied,expected:622}));
  }
  save();console.log(JSON.stringify({phase:input.id,completed:true,applied:state.applied}));
 }
 assert.deepEqual(await protectedRows(db),protectedBefore,'MANAGED_SEED_PROTECTED_ROWS_CHANGED');
 const after=await Promise.all([db.referenceCurrency.count(),db.referenceLanguage.count(),db.referenceCountry.count()]);assert.deepEqual(after,[168,260,194]);
 const [{reviewsApplied}]=await db.$queryRaw<Array<{reviewsApplied:number}>>`SELECT count(*)::integer AS "reviewsApplied" FROM "ReferenceOwnerImportReview" WHERE status='APPLIED' AND reviewer=${actorId}`;
 assert.equal(reviewsApplied,622);
 const audit=await db.auditRecord.count({where:{correlationReference:runId}}),outbox=await db.transactionalOutboxRecord.count({where:{correlationId:runId}});
 assert.equal(audit,622*3+state.aliasCommands);assert.equal(outbox,audit);
 state.completed=true;save();
 const result={sourceSha,runId,pass:true,counts:after,applied:state.applied,aliasCommands:state.aliasCommands,reviewsApplied,audit,outbox,protectedRowsUnchanged:true,
  scannerReceipts:security.receipts,assets:'PRIVATE_LOCAL_DEVELOPMENT_ONLY',otherRequiredSeedsApplied:false,productionReady:false};
 writeSeedEvidence(path.join(output,'result.json'),result);console.log(JSON.stringify(result));
}
main().catch(error=>{
 if(diagnosticPath){
  let detail=error instanceof Error?error.stack??error.message:String(error);
  detail=detail.replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[REDACTED_URI]');
  if(process.env.DATABASE_URL){const password=decodeURIComponent(new URL(process.env.DATABASE_URL).password);if(password)detail=detail.split(password).join('[REDACTED]');}
  writeSeedEvidence(diagnosticPath,{at:new Date().toISOString(),code:error?.code??null,phase:error?.phase??null,detail:detail.slice(0,6000),recentQueryTimings});
 }
 const message=error instanceof Error?error.message:'';
 console.error(/^(MANAGED_SEED_|DEFENDER_|POST28_|ASSET_|REFERENCE_)[A-Z0-9_]+$/.test(message)?message:'MANAGED_SEED_OPERATION_FAILED_REVIEW_PRIVATE_STATE');
 process.exitCode=1;
});
