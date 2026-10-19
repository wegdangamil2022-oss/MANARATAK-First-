import { taxonomyRevisionHash as hash } from '../../academic-taxonomy/services/TaxonomyRevisionHash';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import type { AtomicPersistenceContext } from '@absheer/domain';
import { parseMajorOwnerPayload } from '../services/MajorImportScreeningConsumer';
import type { IMajorImportReviewGateway, MajorImportReview } from '../services/IMajorImportReviewGateway';
export class MajorOwnerImportUseCases {
 constructor(private readonly gateway:IMajorImportReviewGateway,private readonly atomic:AtomicDomainMutationCoordinator){}
 screenings(page:number){return this.gateway.screenings(page);}list(page:number){return this.gateway.list(page);}
 private command<T>(id:string,action:string,context:AtomicMutationRequestContext,work:(gateway:IMajorImportReviewGateway,tx:AtomicPersistenceContext)=>Promise<T>,record?:(value:T)=>boolean){
  if(!context.actorId?.trim())throw new Error('MAJOR_IMPORT_ACTOR_REQUIRED');
  return this.atomic.execute({domain:'MAJORS',aggregateType:'MAJOR_IMPORT_REVIEW',aggregateId:id,action,context},async tx=>{const gateway=this.gateway.withTransaction(tx);await gateway.lock();return work(gateway,tx);},record);
 }
 private async evidence(gateway:IMajorImportReviewGateway,receiptId:string){
  const receipt=await gateway.screening(receiptId);const result=receipt?.result as any;
  if(!receipt||result?.owner!=='MAJORS'||result?.schemaVersion!==1||result?.state!=='NEEDS_OWNER_REVIEW'||result?.dryRun!==false)throw new Error('MAJOR_IMPORT_SCREENING_REQUIRED');
  if(typeof result.source?.artifactId!=='string'||!result.source.artifactId.trim()||typeof result.source?.sha256!=='string'||!/^[a-f0-9]{64}$/i.test(result.source.sha256))throw new Error('MAJOR_IMPORT_SOURCE_REQUIRED');
  if(typeof result.origin?.batchId!=='string'||!result.origin.batchId.trim()||typeof result.origin?.sourceDedupKey!=='string'||!result.origin.sourceDedupKey.trim())throw new Error('MAJOR_IMPORT_SOURCE_RECORD_REQUIRED');
  await gateway.verifyArtifact(result.source.artifactId,result.source.sha256);
  const payload=parseMajorOwnerPayload(result.payload);const preview=await gateway.inspect(payload);
  return {receipt,payload,preview,previewHash:hash({payload,preview,origin:result.origin,source:{artifactId:result.source.artifactId,sha256:result.source.sha256.toLowerCase()}})};
 }
 async preview(receiptId:string,context:AtomicMutationRequestContext){
  const id='major-import-'+hash(receiptId);
  return this.command(id,'MAJOR_IMPORT_PREVIEWED',context,async gateway=>{const prior=await gateway.get(id);if(prior)return {plan:prior,replay:true};const evidence=await this.evidence(gateway,receiptId);
   const plan:MajorImportReview={id,receiptId,requestHash:evidence.receipt.requestHash,payload:evidence.payload,preview:evidence.preview,previewHash:evidence.previewHash,version:1,status:'PREVIEWED'};await gateway.save(plan);return {plan,replay:false};},value=>!value.replay).then(value=>value.plan);
 }
 async refresh(id:string,version:number,context:AtomicMutationRequestContext){return this.command(id,'MAJOR_IMPORT_REFRESHED',context,async gateway=>{
  const plan=await gateway.get(id);if(!plan||plan.version!==version||plan.status==='APPLIED')throw new Error('MAJOR_IMPORT_REVIEW_CONFLICT');const evidence=await this.evidence(gateway,plan.receiptId);
  if(evidence.receipt.requestHash!==plan.requestHash||hash(evidence.payload)!==hash(plan.payload))throw new Error('MAJOR_IMPORT_SOURCE_CONFLICT');
  const next={...plan,preview:evidence.preview,previewHash:evidence.previewHash,status:'PREVIEWED' as const,version:version+1,reviewer:null,reason:null};await gateway.save(next,version);return next;
 });}
 async review(id:string,input:{expectedVersion:number;previewHash:string;decision:'APPROVE'|'REJECT';reason:string},context:AtomicMutationRequestContext){
  if(!input.reason.trim()||input.reason.length>2000)throw new Error('MAJOR_IMPORT_REASON_REQUIRED');
  return this.command(id,'MAJOR_IMPORT_REVIEWED',context,async gateway=>{const plan=await gateway.get(id);if(!plan||plan.version!==input.expectedVersion||plan.previewHash!==input.previewHash||plan.status!=='PREVIEWED')throw new Error('MAJOR_IMPORT_REVIEW_CONFLICT');
   const next={...plan,status:input.decision==='APPROVE'?'APPROVED' as const:'REJECTED' as const,reviewer:context.actorId,reason:input.reason.trim(),version:plan.version+1};await gateway.save(next,plan.version);return next;
  });
 }
 async apply(id:string,input:{expectedVersion:number;previewHash:string},context:AtomicMutationRequestContext){return this.command(id,'MAJOR_IMPORT_APPLIED',context,async(gateway,tx)=>{
  const plan=await gateway.get(id);if(!plan||plan.previewHash!==input.previewHash)throw new Error('MAJOR_IMPORT_REVIEW_CONFLICT');
  if(plan.status==='APPLIED')return {result:plan.result,replay:true};if(plan.status!=='APPROVED'||plan.version!==input.expectedVersion||!plan.reviewer||!plan.reason)throw new Error('MAJOR_IMPORT_APPROVAL_REQUIRED');
  const evidence=await this.evidence(gateway,plan.receiptId);if(evidence.receipt.requestHash!==plan.requestHash||evidence.previewHash!==plan.previewHash)throw new Error('MAJOR_IMPORT_STALE_PREVIEW');
  const result=await gateway.apply(plan,tx);await gateway.save({...plan,result,status:'APPLIED',version:plan.version+1},plan.version);return {result,replay:false};
 },value=>!value.replay).then(value=>value.result);}
}
