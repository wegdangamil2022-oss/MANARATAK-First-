import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { AssetId, AssetStorageLocator, AssetStorageZone, UniversalImportHandoff } from '@manaratak/domain';
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

async function main(){
 const mode=process.argv[2];
 if(!['preflight','apply'].includes(mode)||Number(process.versions.node.split('.')[0])!==22)throw new Error('MANAGED_SEED_MODE_OR_NODE_INVALID');
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
 if(mode==='apply')requireDatabaseMutationGate('managed-reference-seed',{allowedPurposes:['seed']});
 const output=path.join(directory,'managed-reference-'+runId);fs.mkdirSync(output,{recursive:true,mode:0o700});
 const bucket='managed-reference-'+runId,storageRoot=path.join(output,'assets');fs.mkdirSync(storageRoot,{recursive:true,mode:0o700});
 const security=new ManagedReferenceAssetSecurity(storageRoot,bucket,config.scanner);
 // Scan each actual canonical packet before creating any database record.
 for(const input of inputs){
  const locator=new AssetStorageLocator(AssetStorageZone.QUARANTINE,bucket,'preflight/'+input.id+'.json');
  const filename=path.join(storageRoot,bucket,locator.pathKey);fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  fs.writeFileSync(filename,JSON.stringify(input.records),{mode:0o600});await security.sanitize(locator);await security.scan(locator);
 }
 const transport=await verifyManagedPostgresTls(process.env.DATABASE_URL);
 const live=await readDatabaseIdentity(process.env.DATABASE_URL,{provider:'NEON'});
 const db=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}},log:[],errorFormat:'minimal'});
 try{
  const [{access}]=await db.$queryRaw<Array<{access:boolean}>>`SELECT has_table_privilege(current_user,'public._prisma_migrations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS access`;
  validateManagedSeedIdentity(target,live,access,transport);
  const preflight={mode:'PREFLIGHT',pass:true,sourceSha,runId,target,records:inputs.reduce((n,x)=>n+x.records.length,0),databaseWrites:0,
   schemaSha256:source.schemaSha256,schemaProofSha256:hash(fs.readFileSync(config.schemaProof)),scannerReceipts:security.receipts,transport,live};
  writeSeedEvidence(path.join(output,'preflight.json'),preflight);
  if(mode==='preflight'){console.log(JSON.stringify(preflight));return;}
  await applyReferences(db,{inputs,security,storageRoot,bucket,output,sourceSha,runId,actorId,configFile});
 }finally{await db.$disconnect();}
}

async function protectedRows(db:PrismaClient){
 const tables=await db.$queryRaw<Array<{tablename:string}>>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ~* '(student|certificate|financial|payment|wallet|ledger)' ORDER BY tablename`;
 const queries=tables.map(({tablename})=>`SELECT '${tablename.replaceAll("'","''")}' AS name,count(*)::integer AS count,md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM public."${tablename.replaceAll('"','""')}" t`);
 return db.$queryRawUnsafe(queries.join(' UNION ALL ')+' ORDER BY name');
}

interface ApplyOptions {
 inputs:SeedInput[];security:ManagedReferenceAssetSecurity;storageRoot:string;bucket:string;output:string;
 sourceSha:string;runId:string;actorId:string;configFile:string;
}
async function applyReferences(db:PrismaClient,options:ApplyOptions){
 const {inputs,security,storageRoot,bucket,output,sourceSha,runId,actorId,configFile}=options;
 const statePath=path.join(output,'state.json');
 if(fs.existsSync(statePath))throw new Error('MANAGED_SEED_EXISTING_RUN_REQUIRES_REVIEW');
 const counts=await Promise.all([db.referenceCurrency.count(),db.referenceLanguage.count(),db.referenceCountry.count()]);
 assert.deepEqual(counts,[0,0,0],'MANAGED_SEED_NONEMPTY_REFERENCE_TARGET');
 const protectedBefore=await protectedRows(db);
 const state={sourceSha,runId,completed:false,applied:0,aliasCommands:0,protectedBefore,scannerReceipts:security.receipts};
 const save=()=>writeSeedEvidence(statePath,state);
 // Atomic creation prevents two operators from both starting an empty run.
 writeSeedEvidence(statePath,state,{exclusive:true});
 const executor=new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(db),new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db));
 const reviews=new ReferenceOwnerReviewUseCases(new PrismaReferenceOwnerReviewGateway(db),new AtomicDomainMutationCoordinator(executor));
 const repository=new PrismaReferenceDataRepository(db),author=new ReferenceDataUseCases(repository,undefined,undefined,executor);
 const dispatcher=new ImportHandoffDispatcher({REFERENCE_DATA:new ReferenceDataScreeningHandoffConsumer()},new PrismaImportScreeningReceiptStore(db));
 const storage=new LocalAssetStorageGateway(bucket,storageRoot),assets=new PrismaAssetRecordRepository(db);
 const ingest=new IngestAssetUseCase(assets,storage),lifecycle=new ProcessAssetLifecycleUseCase(assets,storage,new PrismaAssetUsageRegistryGateway(db),security,security);
 const context={actorId,actorType:'DELEGATED_PROJECT_OPERATOR',source:'managed-development-reference-seed',correlationId:runId};
 for(const input of inputs){
  const bytes=Buffer.from(JSON.stringify(input.records)),artifactHash=hash(bytes),assetId='managed-seed-'+hash(runId+input.id);
  const upload=await ingest.requestUploadLocator({assetId,assetReference:runId+':'+input.id,ownerId:runId,ownerType:'REFERENCE_DATA',originalFilename:input.id+'.json',mimeType:'application/json',fileExtension:'json',byteSize:bytes.length,classification:'INTERNAL',retentionCategory:'PERMANENT'});
  const filename=path.join(storageRoot,upload.bucketName,upload.pathKey);fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});fs.writeFileSync(filename,bytes,{mode:0o600,flag:'wx'});
  await lifecycle.finalizeUploadedAsset({assetId});await lifecycle.validateAsset({assetId});await lifecycle.sanitizeAsset({assetId});await lifecycle.activateAsset({assetId});
  const asset=await assets.findById(new AssetId(assetId));assert.ok(asset);asset.assertCanDeliver();assert.equal(asset.checksum?.hash,artifactHash);
  assert.equal(hash(await storage.read(asset.locator,10*1024*1024)),artifactHash);
  for(const [index,record] of input.records.entries()){
   const payload=referenceSeedPayload(input,record);
   const handoff:UniversalImportHandoff={handoffId:input.id+':'+index,ownerDomain:'REFERENCE_DATA',artifact:{sourceId:input.id,artifactId:assetId},normalizedPayload:payload,
    provenance:{sourceSystem:'managed-development-reviewed-manifest',contentHash:artifactHash,sourceRowNumber:index+1},validation:{state:'VALID',issues:[]},
    execution:{executionId:runId,dryRun:false,attempt:1,idempotencyKey:input.id+':'+index},referenceMetadata:{referenceEntityType:input.type,sourceVersion:input.sourceVersion}};
   const screened=await dispatcher.dispatch(handoff);assert.equal(screened.state,'NEEDS_OWNER_REVIEW');assert.equal(screened.issues.length,0);
   const identity=screeningReceiptIdentity(handoff),receipt=await db.importScreeningReceipt.findUniqueOrThrow({where:{ownerDomain_handoffKey:{ownerDomain:identity.ownerDomain,handoffKey:identity.handoffKey}}});
   let plan=await reviews.preview(receipt.id,context);assert.equal(plan.status,'PREVIEWED');assert.deepEqual(plan.preview.issues,[]);
   plan=await reviews.review(plan.id,{expectedVersion:plan.version,previewHash:plan.previewHash,decision:'APPROVE',reason:`Delegated project-owner development bootstrap; source=${input.sourceHash}; authorization=${hash(fs.readFileSync(configFile))}`},context);
   await reviews.apply(plan.id,{expectedVersion:plan.version,previewHash:plan.previewHash},context);
   if(input.type==='LANGUAGE'&&record.aliases?.length){
    const current=await repository.getLanguage(record.isoCode);assert.ok(current);
    await author.upsertLanguage({...payload,id:current.id,expectedVersion:current.versionNumber,aliases:record.aliases} as Parameters<ReferenceDataUseCases['upsertLanguage']>[0],context);state.aliasCommands++;
   }
   state.applied++;if(state.applied%25===0){save();console.log(JSON.stringify({phase:input.id,applied:state.applied,expected:622}));}
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
 const message=error instanceof Error?error.message:'';
 console.error(/^(MANAGED_SEED_|DEFENDER_|POST28_|ASSET_|REFERENCE_)[A-Z0-9_]+$/.test(message)?message:'MANAGED_SEED_OPERATION_FAILED_REVIEW_PRIVATE_STATE');
 process.exitCode=1;
});
