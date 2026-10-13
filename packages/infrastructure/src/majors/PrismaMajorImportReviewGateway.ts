import { Prisma, PrismaClient } from '@prisma/client';
import { AssetId, ImportRecordStatus, MajorDeduplicationService, type AtomicPersistenceContext, type MajorImportPayload } from '@manaratak/domain';
import { MajorImportPromotionUseCase, type CanonicalMajorReferenceService, type IMajorImportReviewGateway, type MajorImportReview } from '@manaratak/application';
import { PrismaAssetRecordRepository } from '../asset-platform/PrismaAssetRecordRepository';
import { PrismaMajorRepository } from './PrismaMajorRepository';
export class PrismaMajorImportReviewGateway implements IMajorImportReviewGateway {
 constructor(private readonly prisma:PrismaClient,private readonly references:CanonicalMajorReferenceService,private readonly bound=false){}
 withTransaction(context:AtomicPersistenceContext){const tx=(context as AtomicPersistenceContext&{transactionClient?:Prisma.TransactionClient}).transactionClient;if(!context.boundaryId||!tx)throw new Error('MAJOR_IMPORT_TRANSACTION_REQUIRED');return new PrismaMajorImportReviewGateway(tx as unknown as PrismaClient,this.references,true);}
 async lock(){if(!this.bound)throw new Error('MAJOR_IMPORT_TRANSACTION_REQUIRED');await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'major-import:owner-review'},0))`;}
 async screening(id:string){const receipt=await this.prisma.importScreeningReceipt.findUnique({where:{id}});return receipt&&['MAJOR','MAJORS'].includes(receipt.ownerDomain)?{requestHash:receipt.requestHash,result:receipt.result}:null;}
 async verifyArtifact(id:string,sha256:string){if(!this.bound)throw new Error('MAJOR_IMPORT_TRANSACTION_REQUIRED');await this.prisma.$queryRaw`SELECT id FROM "AssetRecord" WHERE id=${id} FOR SHARE`;const asset=await new PrismaAssetRecordRepository(this.prisma).findById(new AssetId(id));if(!asset)throw new Error('MAJOR_IMPORT_SOURCE_UNAVAILABLE');asset.assertCanDeliver();if(asset.checksum?.algorithm.toUpperCase()!=='SHA256'||asset.checksum.hash.toLowerCase()!==sha256.toLowerCase())throw new Error('MAJOR_IMPORT_SOURCE_HASH_CONFLICT');}
 async inspect(payload:MajorImportPayload){
  if(!this.bound)throw new Error('MAJOR_IMPORT_TRANSACTION_REQUIRED');
  await this.references.assertPayloadReferencesActive(payload);
  const key=MajorDeduplicationService.generateKey(payload);
  await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`major-import:identity:${key}`},0))`;
  const repo=new PrismaMajorRepository(this.prisma,false,true);const target=await repo.findByDedupKey(key);
  if(target){if(!Number.isSafeInteger(target.revision))throw new Error('MAJOR_IMPORT_TARGET_REVISION_REQUIRED');await repo.lockForRevision(target.id,target.revision!);}
  return {targetId:target?.id??null,targetRevision:target?.revision??null};
 }
 async get(id:string){const rows=await this.prisma.$queryRaw<MajorImportReview[]>`SELECT * FROM "MajorImportOwnerReview" WHERE id=${id}`;return rows[0]??null;}
 async save(plan:MajorImportReview,version?:number){
  if(!this.bound)throw new Error('MAJOR_IMPORT_TRANSACTION_REQUIRED');
  if(version===undefined){await this.prisma.$executeRaw`INSERT INTO "MajorImportOwnerReview" (id,"receiptId","requestHash",payload,preview,"previewHash",version,status,"updatedAt") VALUES (${plan.id},${plan.receiptId},${plan.requestHash},${JSON.stringify(plan.payload)}::jsonb,${JSON.stringify(plan.preview)}::jsonb,${plan.previewHash},${plan.version},${plan.status},NOW())`;return;}
  const changed=await this.prisma.$executeRaw`UPDATE "MajorImportOwnerReview" SET preview=${JSON.stringify(plan.preview)}::jsonb,"previewHash"=${plan.previewHash},version=${plan.version},status=${plan.status},reviewer=${plan.reviewer??null},reason=${plan.reason??null},result=${JSON.stringify(plan.result??null)}::jsonb,"updatedAt"=NOW() WHERE id=${plan.id} AND version=${version}`;if(changed!==1)throw new Error('MAJOR_IMPORT_REVIEW_CONFLICT');
 }
 async apply(plan:MajorImportReview,context:AtomicPersistenceContext){
  if(!this.bound||!context.boundaryId)throw new Error('MAJOR_IMPORT_TRANSACTION_REQUIRED');
  const receipt=await this.screening(plan.receiptId);const origin=(receipt?.result as any)?.origin;
  if(!origin?.batchId||!origin?.sourceDedupKey)throw new Error('MAJOR_IMPORT_SOURCE_RECORD_REQUIRED');
  const records=await this.prisma.$queryRaw<Array<{id:string}>>`SELECT r.id FROM "ImportRecord" r JOIN "ImportBatch" b ON b.id=r."batchId" WHERE r."batchId"=${origin.batchId} AND r."sourceDedupKey"=${origin.sourceDedupKey} AND UPPER(b."dataType") IN ('MAJOR','MAJORS') AND r.status IN ('VALID','COMPLETE','NEEDS_REVIEW') FOR SHARE OF r,b`;
  if(records.length!==1)throw new Error('MAJOR_IMPORT_SOURCE_RECORD_UNAVAILABLE');
  const repository=new PrismaMajorRepository(this.prisma,false,true);
  const result=await new MajorImportPromotionUseCase(repository,undefined,undefined,this.references).promote({id:records[0].id,status:ImportRecordStatus.NEEDS_REVIEW,normalizedPayload:plan.payload,rawPayload:plan.payload,metadata:{ownerReviewId:plan.id}});
  if(!['CREATED','VERSION_CREATED'].includes(result.type))throw new Error('MAJOR_IMPORT_PROMOTION_REJECTED');
  return result;
 }
 private offset(page:number){if(!Number.isSafeInteger(page)||page<1||page>1000)throw new Error('MAJOR_IMPORT_PAGE_INVALID');return (page-1)*25;}
 async list(page:number){const offset=this.offset(page);const[data,counts]=await Promise.all([this.prisma.$queryRaw<MajorImportReview[]>`SELECT * FROM "MajorImportOwnerReview" ORDER BY "updatedAt" DESC,id LIMIT 25 OFFSET ${offset}`,this.prisma.$queryRaw<Array<{total:bigint}>>`SELECT COUNT(*) AS total FROM "MajorImportOwnerReview"`]);return {data,total:Number(counts[0]?.total??0)};}
 async screenings(page:number){const offset=this.offset(page);const from=Prisma.sql`FROM "ImportScreeningReceipt" s WHERE s."ownerDomain" IN ('MAJOR','MAJORS') AND NOT EXISTS(SELECT 1 FROM "MajorImportOwnerReview" p WHERE p."receiptId"=s.id)`;const[data,counts]=await Promise.all([this.prisma.$queryRaw<Array<{id:string;createdAt:Date;result:unknown}>>(Prisma.sql`SELECT s.id,s."createdAt",s.result ${from} ORDER BY s."createdAt" DESC,s.id LIMIT 25 OFFSET ${offset}`),this.prisma.$queryRaw<Array<{total:bigint}>>(Prisma.sql`SELECT COUNT(*) AS total ${from}`)]);return {data,total:Number(counts[0]?.total??0)};}
}
