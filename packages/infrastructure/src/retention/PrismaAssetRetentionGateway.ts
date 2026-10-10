import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { IRetentionOwnerGateway, ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { RetentionCandidate, RetentionDecision, RetentionDisposition, RetentionOwner } from '@manaratak/domain';

export class PrismaAssetRetentionGateway implements IRetentionOwnerGateway {
  readonly owner = RetentionOwner.ASSET;
  constructor(private readonly prisma: PrismaClient, private readonly lifecycle: ProcessAssetLifecycleUseCase) {}
  async listDue(now: Date, limit: number): Promise<RetentionCandidate[]> {
    const rows=await (this.prisma as any).assetRecord.findMany({ where:{ retentionExpiresAt:{lte:now}, retentionProcessedAt:null, AND: [{ OR: [{ malwareScanStatus: { equals: Prisma.DbNull } }, { malwareScanStatus: { path: ['archiveOperation'], equals: Prisma.AnyNull } }, { malwareScanStatus: { path: ['archiveOperation', 'phase'], equals: 'COMPLETED' } }] }, { OR: [{ malwareScanStatus: { equals: Prisma.DbNull } }, { malwareScanStatus: { path: ['restoreOperation'], equals: Prisma.AnyNull } }, { malwareScanStatus: { path: ['restoreOperation', 'phase'], equals: 'COMPLETED' } }, { malwareScanStatus: { path: ['restoreOperation', 'phase'], equals: 'CANCELLED' } }] }], OR:[{retentionClaimUntil:null},{retentionClaimUntil:{lte:now}}] }, orderBy:{retentionExpiresAt:'asc'}, take:limit, select:{id:true,retentionExpiresAt:true,legalHoldUntil:true,retentionCategory:true,lifecycleState:true} });
    return rows.map((row:any)=>({owner:this.owner,recordId:row.id,expiresAt:new Date(row.retentionExpiresAt),legalHoldUntil:row.legalHoldUntil?new Date(row.legalHoldUntil):null,retentionCategory:row.retentionCategory,lifecycleState:row.lifecycleState}));
  }
  async applyDecision(candidate: RetentionCandidate, decision: RetentionDecision): Promise<'APPLIED'|'SKIPPED'> {
    if (![RetentionDisposition.ARCHIVE, RetentionDisposition.PURGE].includes(decision.disposition)) return 'SKIPPED';
    const token=randomUUID(); const claimUntil=new Date(decision.decidedAt.getTime()+5*60_000);
    const isPurge = decision.disposition === RetentionDisposition.PURGE;
    const claimed = await (this.prisma as any).assetRecord.updateMany({
      where: {
        id: candidate.recordId,
        retentionExpiresAt: { lte: decision.decidedAt },
        retentionProcessedAt: null,
        lifecycleState: isPurge ? { notIn: ['INITIATED'] } : { not: 'PURGED' },
        AND: [
          { OR: [{ retentionClaimUntil: null }, { retentionClaimUntil: { lte: decision.decidedAt } }] },
          ...(isPurge ? [{ OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: decision.decidedAt } }] }] : []),
        ],
      },
      data: { retentionClaimToken: token, retentionClaimUntil: claimUntil },
    });
    if(claimed.count!==1)return 'SKIPPED';
    try {
      if (decision.disposition === RetentionDisposition.ARCHIVE) {
        await this.lifecycle.archiveAsset({assetId:candidate.recordId});
      } else {
        if (candidate.lifecycleState !== 'PURGED') {
          if (candidate.lifecycleState !== 'DELETED') await this.lifecycle.softDeleteAsset({assetId:candidate.recordId});
        }
        // PURGED is durable cleanup-pending; retry provider deletion with the same leased flow.
        await this.lifecycle.purgeAsset({assetId:candidate.recordId, retentionClaimToken:token});
      }
      const updated=await (this.prisma as any).assetRecord.updateMany({where:{id:candidate.recordId,retentionProcessedAt:null,retentionClaimToken:token},data:{retentionProcessedAt:decision.decidedAt,retentionClaimToken:null,retentionClaimUntil:null}});
      return updated.count===1?'APPLIED':'SKIPPED';
    } catch(error) {
      await (this.prisma as any).assetRecord.updateMany({where:{id:candidate.recordId,retentionClaimToken:token},data:{retentionClaimToken:null,retentionClaimUntil:null}}); throw error;
    }
  }
}
