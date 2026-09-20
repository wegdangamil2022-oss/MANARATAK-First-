import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { IRetentionOwnerGateway, ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { RetentionCandidate, RetentionDecision, RetentionDisposition, RetentionOwner } from '@manaratak/domain';

export class PrismaAssetRetentionGateway implements IRetentionOwnerGateway {
  readonly owner = RetentionOwner.ASSET;
  constructor(private readonly prisma: PrismaClient, private readonly lifecycle: ProcessAssetLifecycleUseCase) {}
  async listDue(now: Date, limit: number): Promise<RetentionCandidate[]> {
    const rows=await (this.prisma as any).assetRecord.findMany({ where:{ retentionExpiresAt:{lte:now}, retentionProcessedAt:null, lifecycleState:{not:'PURGED'}, OR:[{retentionClaimUntil:null},{retentionClaimUntil:{lte:now}}] }, orderBy:{retentionExpiresAt:'asc'}, take:limit, select:{id:true,retentionExpiresAt:true,legalHoldUntil:true,retentionCategory:true,lifecycleState:true} });
    return rows.map((row:any)=>({owner:this.owner,recordId:row.id,expiresAt:new Date(row.retentionExpiresAt),legalHoldUntil:row.legalHoldUntil?new Date(row.legalHoldUntil):null,retentionCategory:row.retentionCategory,lifecycleState:row.lifecycleState}));
  }
  async applyDecision(candidate: RetentionCandidate, decision: RetentionDecision): Promise<'APPLIED'|'SKIPPED'> {
    if (![RetentionDisposition.ARCHIVE, RetentionDisposition.PURGE].includes(decision.disposition)) return 'SKIPPED';
    const token=randomUUID(); const claimUntil=new Date(decision.decidedAt.getTime()+5*60_000);
    const claimed=await (this.prisma as any).assetRecord.updateMany({where:{id:candidate.recordId,retentionProcessedAt:null,OR:[{retentionClaimUntil:null},{retentionClaimUntil:{lte:decision.decidedAt}}]},data:{retentionClaimToken:token,retentionClaimUntil:claimUntil}});
    if(claimed.count!==1)return 'SKIPPED';
    try {
      if (decision.disposition === RetentionDisposition.ARCHIVE) {
        if (candidate.lifecycleState !== 'ARCHIVED') await this.lifecycle.archiveAsset({assetId:candidate.recordId});
      } else {
        if (candidate.lifecycleState !== 'DELETED') await this.lifecycle.softDeleteAsset({assetId:candidate.recordId});
        await this.lifecycle.purgeAsset({assetId:candidate.recordId});
      }
      const updated=await (this.prisma as any).assetRecord.updateMany({where:{id:candidate.recordId,retentionProcessedAt:null,retentionClaimToken:token},data:{retentionProcessedAt:decision.decidedAt,retentionClaimToken:null,retentionClaimUntil:null}});
      return updated.count===1?'APPLIED':'SKIPPED';
    } catch(error) {
      await (this.prisma as any).assetRecord.updateMany({where:{id:candidate.recordId,retentionClaimToken:token},data:{retentionClaimToken:null,retentionClaimUntil:null}}); throw error;
    }
  }
}
