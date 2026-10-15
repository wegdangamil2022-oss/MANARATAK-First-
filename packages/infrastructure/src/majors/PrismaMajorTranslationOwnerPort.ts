import type {Prisma,PrismaClient} from '@prisma/client';
import {assertMajorTranslationWorkingVersion,majorTranslationDigest,translationRecord} from './MajorTranslationEvidence';
type Scope={majorId:string;profileId:string;versionId:string};
/** Owner commands share the caller's governed transaction; they never edit a publication snapshot. */
export class PrismaMajorTranslationOwnerPort {
  constructor(private readonly client:PrismaClient|Prisma.TransactionClient,private readonly transactionBound=false){}
  private assertBound(){if(!this.transactionBound)throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');}
  async advanceOwnerRevision(majorId:string){
    this.assertBound();
    await this.client.$executeRaw`UPDATE "Major" SET "updatedAt"=GREATEST(clock_timestamp(),"updatedAt"+interval '1 millisecond') WHERE id=${majorId}`;
  }
  async stageName(scope:Scope,locale:string,value:string,evidence:Prisma.InputJsonObject){
    this.assertBound();
    const version=await assertMajorTranslationWorkingVersion(this.client,scope.majorId,scope.profileId,scope.versionId);
    const metadata=translationRecord(version.metadata);
    await this.client.majorVersion.update({where:{id:version.id},data:{metadata:{...metadata,
      translationNameCandidates:{...translationRecord(metadata.translationNameCandidates),[locale]:{value,reviewStatus:'APPROVED',evidence}},
    }}});
  }
  private async resetReview(scope:Scope,metadata:Record<string,any>){
    await this.client.majorVersion.update({where:{id:scope.versionId},data:{status:'NEEDS_REVIEW',approvedBy:null,metadata:{...metadata,reviewApproval:null}}});
    // Keep any prior live pointer, but require a new owner review of this working version.
    await this.client.majorLevelProfile.update({where:{id:scope.profileId},data:{status:'READY_TO_REVIEW',completenessStatus:'NEEDS_REVIEW'}});
    await this.advanceOwnerRevision(scope.majorId);
  }
  async acceptName(scope:Scope,locale:string,value:string,sourceDigest:string,approvalId:string){
    this.assertBound();
    const version=await assertMajorTranslationWorkingVersion(this.client,scope.majorId,scope.profileId,scope.versionId);
    const metadata=translationRecord(version.metadata);const candidates={...translationRecord(metadata.translationNameCandidates)};delete candidates[locale];
    await this.resetReview(scope,{...metadata,translationNameCandidates:candidates,translationNames:{...translationRecord(metadata.translationNames),[locale]:{
      value,ownerSourceDigest:sourceDigest,valueDigest:majorTranslationDigest([locale,value]),publicationApprovalId:approvalId,
    }}});
  }
  async acceptSection(scope:Scope,sectionId:string,locale:string,value:string,sourceDigest:string,approvalId:string,metadata:Prisma.JsonObject){
    this.assertBound();
    const version=await assertMajorTranslationWorkingVersion(this.client,scope.majorId,scope.profileId,scope.versionId);
    const {pendingTranslationContent:_pending,...publishedMetadata}=metadata;
    await this.client.majorContentSection.update({where:{id:sectionId,profileId:scope.profileId,versionId:scope.versionId,locale},data:{content:value,reviewStatus:'COMPLETE',metadata:{...publishedMetadata,
      ownerTranslation:{ownerSourceDigest:sourceDigest,valueDigest:majorTranslationDigest([locale,value]),publicationApprovalId:approvalId},publishedTranslationApprovalId:approvalId,
    }}});
    await this.resetReview(scope,translationRecord(version.metadata));
  }
}
