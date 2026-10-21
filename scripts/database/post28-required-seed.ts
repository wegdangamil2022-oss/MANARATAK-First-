import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { AssetId, AssetSecurityClassification, AssetRetentionCategory, UniversalImportHandoff } from '@manaratak/domain';
import { AtomicAuditedOutboxMutationExecutor, AtomicDomainMutationCoordinator, ReferenceOwnerReviewUseCases, ReferenceDataUseCases,
  ReferenceDataScreeningHandoffConsumer, ImportHandoffDispatcher, IngestAssetUseCase, ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { PrismaAtomicPersistenceUnitOfWork, PrismaAuditRecordRepository, PrismaTransactionalOutboxStore, PrismaReferenceOwnerReviewGateway,
  PrismaReferenceDataRepository, PrismaImportScreeningReceiptStore, PrismaAssetRecordRepository, LocalAssetStorageGateway, PrismaAssetUsageRegistryGateway } from '@manaratak/infrastructure';
import { referenceSeedPlan, referenceSeedPayload, hash } from './post28-reference-seed-plan';
import { Post28SeedAssetSecurity, scannerImage } from './post28-seed-asset-security';
// @ts-expect-error Operational ESM guard has no TS declaration.
import { preflightTargets } from './post28-isolation.mjs';
// @ts-expect-error Operational ESM guard has no TS declaration.
import { readDatabaseIdentity } from './post28-preflight.mjs';
// @ts-expect-error Operational ESM guard has no TS declaration.
import { requirePost28LocalExecution } from './post28-neon-policy.mjs';
// @ts-expect-error Operational ESM guard has no TS declaration.
import { requireDatabaseMutationGate } from '../lib/database-mutation-gate.mjs';
// @ts-expect-error Operational ESM source inspection has no TS declaration.
import { inspectSeedManifest } from './seed-manifest-inspection.mjs';
// @ts-expect-error Operational ESM validation has no TS declaration.
import { validateSeedApproval } from './post28-seed-approval.mjs';
const root=process.cwd(),mode=process.argv[2]??'plan';
if(!['plan','apply'].includes(mode))throw new Error('POST28_SEED_MODE_INVALID');
const manifest=JSON.parse(fs.readFileSync('scripts/database/greenfield-seed.manifest.json','utf8'));
const inspection=inspectSeedManifest(manifest,root);
if(inspection.sourceErrors.length)throw new Error('POST28_SEED_SOURCE_INVALID');
if(inspection.blockers.length)throw new Error('POST28_SEED_SOURCE_REVIEW_BLOCKED');
const inputs=await referenceSeedPlan(root);
if(mode==='plan'){
 console.log(JSON.stringify({mode:'PLAN',databaseWrites:0,sourceReady:true,approvalRequired:true,scannerImage,
  references:inputs.map(x=>({id:x.id,type:x.type,records:x.records.length,sourceHash:x.sourceHash})),
  orderedSteps:[...inputs.map(x=>x.id),...manifest.steps.filter((s:any)=>!s.id.startsWith('reference-')).map((s:any)=>s.id)]}));
}else{
 if(Number(process.versions.node.split('.')[0])!==22)throw new Error('POST28_NODE22_REQUIRED');
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
 const contractPath=process.env.POST28_TARGET_CONTRACT_FILE!;
 const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));requirePost28LocalExecution(contract);
 requireDatabaseMutationGate('post28-required-seed',{allowedPurposes:['seed']});
 const lab=path.dirname(fs.realpathSync(contractPath));
 if(lab===root||lab.startsWith(root+path.sep))throw new Error('POST28_SEED_PRIVATE_DIRECTORY_REQUIRED');
 const approvalPath=path.join(lab,'seed-approval.json');
 if(fs.statSync(approvalPath).mode&0o077)throw new Error('POST28_SEED_PRIVATE_APPROVAL_REQUIRED');
 const approval=JSON.parse(fs.readFileSync(approvalPath,'utf8'));
 // POST28_LOCAL_REQUIRED_SEED_APPROVAL is restricted to this run and local source.
 validateSeedApproval(approval,{sourceSha:sha,runId:contract.runId,manifestSha256:hash(fs.readFileSync('scripts/database/greenfield-seed.manifest.json')),steps:manifest.steps});
 const parity=JSON.parse(fs.readFileSync(path.join(lab,'R04-greenfield/GREENFIELD_MIGRATION_PARITY.json'),'utf8'));
 assert.equal(parity.sourceSha,sha);assert.equal(parity.pass,true);assert.equal(parity.idempotentRedeployVerified,true);
 await preflightTargets(contract,[{label:'DB-G',url:process.env.GREENFIELD_DATABASE_URL},{label:'DB-S',url:process.env.GREENFIELD_SHADOW_DATABASE_URL}],process.env,sha,readDatabaseIdentity,{requireValidatedCatalog:true});
 process.env.DATABASE_URL=process.env.GREENFIELD_DATABASE_URL;process.env.DIRECT_URL=process.env.GREENFIELD_DATABASE_URL;
 const db=new PrismaClient({log:[],errorFormat:'minimal'});
 const output=path.join(lab,'R04-required-seed');fs.mkdirSync(output,{recursive:true,mode:0o700});
 const statePath=path.join(output,'state.json');
 const state: any=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{sourceSha:sha,runId:contract.runId,steps:{}};
 assert.equal(state.sourceSha,sha);assert.equal(state.runId,contract.runId);
 if(fs.existsSync(statePath)&&!state.completed)throw new Error('POST28_SEED_PARTIAL_RUN_REQUIRES_REVIEW');
 const save=()=>fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n',{mode:0o600});
 async function fingerprint(){
  return db.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
   const tables=await tx.$queryRawUnsafe<Array<{name:string}>>("SELECT tablename AS name FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
   const results=[];
   for(const {name} of tables){
    const identifier='"'+name.replaceAll('"','""')+'"';
    const rows=await tx.$queryRawUnsafe(`SELECT count(*)::integer AS count,encode(sha256(convert_to(COALESCE(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),'' ORDER BY encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')),''),'UTF8')),'hex') AS digest FROM public.${identifier} t`);
    results.push({table:name,...(rows as any[])[0]});
   }
   return results;
  },{isolationLevel:'RepeatableRead',timeout:60000});
 }
 try{
  const before=await fingerprint();
  if(state.completed){assert.equal(hash(JSON.stringify(before)),state.finalFingerprint,'POST28_SEED_STATE_CHANGED');}
  if(!state.completed)save();
  fs.writeFileSync(path.join(output,state.completed?'before-reapply.json':'baseline.json'),JSON.stringify(before,null,2)+'\n',{mode:0o600});
  const executor=new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(db),new PrismaAuditRecordRepository(db),new PrismaTransactionalOutboxStore(db));
  const reviews=new ReferenceOwnerReviewUseCases(new PrismaReferenceOwnerReviewGateway(db),new AtomicDomainMutationCoordinator(executor));
  const repository=new PrismaReferenceDataRepository(db);
  const author=new ReferenceDataUseCases(repository,undefined,undefined,executor);
  const receipts=new PrismaImportScreeningReceiptStore(db);
  const dispatcher=new ImportHandoffDispatcher({REFERENCE_DATA:new ReferenceDataScreeningHandoffConsumer()},receipts);
  const bucket='post28-seed-'+contract.runId;
  const storageRoot=path.join(output,'assets');fs.mkdirSync(storageRoot,{recursive:true,mode:0o700});
  const storage=new LocalAssetStorageGateway(bucket,storageRoot),assets=new PrismaAssetRecordRepository(db);
  const security=new Post28SeedAssetSecurity(storageRoot,bucket);
  const ingest=new IngestAssetUseCase(assets,storage);
  const lifecycle=new ProcessAssetLifecycleUseCase(assets,storage,new PrismaAssetUsageRegistryGateway(db),security,security);
  const context={actorId:approval.actorId,actorType:'LOCAL_TEST_OPERATOR',source:'post28-required-seed',correlationId:contract.runId};
  let applied=0,replayed=0,aliasCommands=0;
  for(const input of inputs){
   const bytes=Buffer.from(JSON.stringify(input.records)),artifactHash=hash(bytes);
   const assetId='post28-seed-'+hash(contract.runId+input.id),assetReference='post28-seed:'+contract.runId+':'+input.id;
   const existing=await assets.findById(new AssetId(assetId));
   if(!existing){
    const upload=await ingest.requestUploadLocator({assetId,assetReference,ownerId:contract.runId,ownerType:'REFERENCE_DATA',originalFilename:input.id+'.json',mimeType:'application/json',fileExtension:'json',byteSize:bytes.length,classification:AssetSecurityClassification.INTERNAL,retentionCategory:AssetRetentionCategory.PERMANENT});
    const filename=path.join(storageRoot,upload.bucketName,upload.pathKey);fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});fs.writeFileSync(filename,bytes,{mode:0o600,flag:'wx'});
    await lifecycle.finalizeUploadedAsset({assetId});await lifecycle.validateAsset({assetId});await lifecycle.sanitizeAsset({assetId});await lifecycle.activateAsset({assetId});
   }
   const asset=await assets.findById(new AssetId(assetId));asset!.assertCanDeliver();assert.equal(asset!.checksum?.hash,artifactHash);
   assert.equal(hash(await storage.read(asset!.locator,10*1024*1024)),artifactHash);
   for(const [index,record] of input.records.entries()){
    const {aliases}=record;
    const payload=referenceSeedPayload(input,record);
    const handoff:UniversalImportHandoff={handoffId:input.id+':'+index,ownerDomain:'REFERENCE_DATA',artifact:{sourceId:input.id,artifactId:assetId},normalizedPayload:payload,provenance:{sourceSystem:'post28-local-governed-manifest',contentHash:artifactHash,sourceRowNumber:index+1},validation:{state:'VALID',issues:[]},execution:{executionId:contract.runId,dryRun:false,attempt:1,idempotencyKey:input.id+':'+index},referenceMetadata:{referenceEntityType:input.type,sourceVersion:input.sourceVersion}};
    const screened:any=await dispatcher.dispatch(handoff);assert.equal(screened.state,'NEEDS_OWNER_REVIEW');assert.equal(screened.issues.length,0);
    // Read the real dispatcher-created receipt; never synthesize an approval row.
    const identity=(await import('../../packages/infrastructure/src/import-foundation/PrismaImportScreeningReceiptStore')).screeningReceiptIdentity(handoff);
    const receipt=await db.importScreeningReceipt.findUniqueOrThrow({where:{ownerDomain_handoffKey:{ownerDomain:identity.ownerDomain,handoffKey:identity.handoffKey}}});
    let plan=await reviews.preview(receipt.id,context);
    const wasApplied=plan.status==='APPLIED';
    if(plan.status==='PREVIEWED')plan=await reviews.review(plan.id,{expectedVersion:plan.version,previewHash:plan.previewHash,decision:'APPROVE',reason:`User-authorized local R04 only; source=${input.sourceHash}; approval=${hash(fs.readFileSync(approvalPath))}`},context);
    await reviews.apply(plan.id,{expectedVersion:plan.version,previewHash:plan.previewHash},context);
    if(wasApplied)replayed++;else applied++;
    if(input.type==='LANGUAGE'&&aliases?.length){
     const current=await repository.getLanguage(record.isoCode);assert.ok(current);
     const details=await repository.getReferenceGovernanceDetails('LANGUAGE',current.id);
     const normalized=(xs:any[])=>JSON.stringify(xs.map(x=>({alias:x.alias,aliasType:x.aliasType??'COMMON',locale:x.locale??null})).sort((a,b)=>a.alias.localeCompare(b.alias)));
     if(normalized(details.aliases)!==normalized(aliases)){
      if(wasApplied&&state.completed)throw new Error('POST28_SEED_ALIAS_DRIFT');
      // Aliases are a deliberate P7 owner authoring command, never a P6 field.
      await author.upsertLanguage({...payload,id:current.id,expectedVersion:current.versionNumber,aliases} as any,context);aliasCommands++;
     }
    }
   }
  }
  for(const step of manifest.steps.filter((s:any)=>!s.id.startsWith('reference-'))){
   if(state.steps[step.id]){assert.equal(state.steps[step.id].sourceHash,step.sourceSha256);continue;}
   const emptyModels:Record<string,string[]>={'degree-levels':['DegreeLevel'],'academic-taxonomy-isced-f':['AcademicTaxonomyNode','AcademicTaxonomyEdge','AcademicTaxonomyAlias'],'student-tools-registry':['StudentToolDefinitionRecord']};
   for(const model of emptyModels[step.id]??[]){const rows=await db.$queryRawUnsafe<Array<{count:number}>>(`SELECT count(*)::integer AS count FROM public."${model}"`);assert.equal(rows[0].count,0,'POST28_SEED_NONEMPTY_OWNER_TARGET');}
   const result=spawnSync(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),step.script],{env:process.env,encoding:'utf8',timeout:120000});
   fs.writeFileSync(path.join(output,step.id+'.log'),String(result.stdout)+String(result.stderr),{mode:0o600});
   if(result.status!==0)throw new Error('POST28_SEED_STEP_FAILED:'+step.id);
   state.steps[step.id]={sourceHash:step.sourceSha256,applied:true};save();
  }
  const reconciliation=spawnSync(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),'scripts/database/verify-seed-reconciliation.ts'],{env:process.env,encoding:'utf8'});
  fs.writeFileSync(path.join(output,'reconciliation.json'),reconciliation.stdout,{mode:0o600});
  if(reconciliation.status!==0)throw new Error('POST28_SEED_RECONCILIATION_FAILED');
  const after=await fingerprint();
  if(state.completed)assert.deepEqual(after,before,'POST28_SEED_REAPPLY_CHANGED_DATABASE');
  const repeated=Boolean(state.completed);state.completed=true;state.finalFingerprint=hash(JSON.stringify(after));save();
  fs.writeFileSync(path.join(output,repeated?'after-reapply.json':'after-first-apply.json'),JSON.stringify(after,null,2)+'\n',{mode:0o600});
  const result={sourceSha:sha,runId:contract.runId,kind:'POST28_LOCAL_REQUIRED_SEED',pass:true,repeated,applied,replayed,aliasCommands,seedSetVersion:manifest.seedSetVersion,scannerImage,approvalSha256:hash(fs.readFileSync(approvalPath)),databaseFingerprint:state.finalFingerprint,wholeDatabaseUnchangedOnReapply:repeated};
  fs.writeFileSync(path.join(output,repeated?'reapply-result.json':'apply-result.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
 }finally{await db.$disconnect();}
}
