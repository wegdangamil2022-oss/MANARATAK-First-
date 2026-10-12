import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { IRetentionOwnerGateway } from '@manaratak/application';
import { RetentionCandidate, RetentionDecision, RetentionDisposition, RetentionOwner } from '@manaratak/domain';

export class PrismaAuditRetentionGateway implements IRetentionOwnerGateway {
  readonly owner = RetentionOwner.AUDIT;
  constructor(private readonly prisma: PrismaClient, private readonly caseHoldsEnabled = false) {}
  async listDue(now: Date, limit: number): Promise<RetentionCandidate[]> {
    if (this.caseHoldsEnabled) {
      const rows = await this.prisma.$queryRaw<Array<{id:string;retentionExpiresAt:Date;legalHoldUntil:Date|null;lifecycleState:string}>>(Prisma.sql`
        SELECT a."id", a."retentionExpiresAt", a."legalHoldUntil", a."lifecycleState" FROM "AuditRecord" a
        WHERE a."retentionExpiresAt" <= ${now} AND a."retentionProcessedAt" IS NULL
          AND (a."legalHoldUntil" IS NULL OR a."legalHoldUntil" <= ${now})
          AND (a."retentionClaimUntil" IS NULL OR a."retentionClaimUntil" <= ${now})
          AND NOT EXISTS (SELECT 1 FROM "AuditWorkspaceRecord" c WHERE c.kind='CASE'
            AND c.data->'references' @> jsonb_build_array(a.reference)
            AND (c.data->>'legalHoldUntil')::timestamptz > ${now})
        ORDER BY a."retentionExpiresAt",a.id LIMIT ${Math.min(100,Math.max(1,limit))}`);
      return rows.map(row=>({owner:this.owner,recordId:row.id,expiresAt:row.retentionExpiresAt,legalHoldUntil:row.legalHoldUntil,lifecycleState:row.lifecycleState}));
    }
    const rows = await (this.prisma as any).auditRecord.findMany({ where: { retentionExpiresAt: { lte: now }, retentionProcessedAt: null, AND: [{ OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }] }], OR: [{ retentionClaimUntil: null }, { retentionClaimUntil: { lte: now } }] }, orderBy: [{ retentionExpiresAt: 'asc' }, { id: 'asc' }], take: limit, select: { id:true, retentionExpiresAt:true, legalHoldUntil:true, lifecycleState:true } });
    return rows.map((row:any)=>({ owner:this.owner, recordId:row.id, expiresAt:new Date(row.retentionExpiresAt), legalHoldUntil:row.legalHoldUntil?new Date(row.legalHoldUntil):null, lifecycleState:row.lifecycleState }));
  }
  async applyDecision(candidate: RetentionCandidate, decision: RetentionDecision): Promise<'APPLIED'|'SKIPPED'> {
    if (decision.disposition !== RetentionDisposition.ARCHIVE) throw new Error('AUDIT_RETENTION_DISPOSITION_UNSUPPORTED');
    if (candidate.owner !== RetentionOwner.AUDIT || decision.owner !== RetentionOwner.AUDIT || candidate.recordId !== decision.recordId || candidate.expiresAt.getTime() !== decision.expiresAt.getTime()) throw new Error('AUDIT_RETENTION_OWNER_MISMATCH');
    if (candidate.expiresAt > decision.decidedAt || (candidate.legalHoldUntil && candidate.legalHoldUntil > decision.decidedAt)) return 'SKIPPED';
    if (this.caseHoldsEnabled) return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'audit-case-retention'},0))::text`);
      const rows=await tx.$queryRaw<Array<{held:boolean}>>(Prisma.sql`SELECT EXISTS (
        SELECT 1 FROM "AuditWorkspaceRecord" c JOIN "AuditRecord" a ON c.data->'references' @> jsonb_build_array(a.reference)
        WHERE a.id=${candidate.recordId} AND c.kind='CASE' AND (c.data->>'legalHoldUntil')::timestamptz > ${decision.decidedAt}) AS held`);
      if(rows[0]?.held!==false)return 'SKIPPED';
      const changed=await tx.auditRecord.updateMany({where:{id:candidate.recordId,retentionProcessedAt:null,retentionExpiresAt:candidate.expiresAt,AND:[{OR:[{legalHoldUntil:null},{legalHoldUntil:{lte:decision.decidedAt}}]},{OR:[{retentionClaimUntil:null},{retentionClaimUntil:{lte:decision.decidedAt}}]}]},data:{lifecycleState:'ARCHIVED',retentionProcessedAt:decision.decidedAt,retentionClaimToken:null,retentionClaimUntil:null}});
      return changed.count===1?'APPLIED':'SKIPPED';
    });
    const holdCondition = { OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: decision.decidedAt } }] };
    const token=randomUUID(); const claimUntil=new Date(decision.decidedAt.getTime()+5*60_000);
    const claimed=await (this.prisma as any).auditRecord.updateMany({where:{id:candidate.recordId,retentionProcessedAt:null,retentionExpiresAt:candidate.expiresAt,AND:[holdCondition],OR:[{retentionClaimUntil:null},{retentionClaimUntil:{lte:decision.decidedAt}}]},data:{retentionClaimToken:token,retentionClaimUntil:claimUntil}});
    if(claimed.count!==1)return 'SKIPPED';
    try {
      const updated=await (this.prisma as any).auditRecord.updateMany({where:{id:candidate.recordId,retentionProcessedAt:null,retentionClaimToken:token,retentionExpiresAt:candidate.expiresAt,AND:[holdCondition]},data:{lifecycleState:'ARCHIVED',retentionProcessedAt:decision.decidedAt,retentionClaimToken:null,retentionClaimUntil:null}});
      if (updated.count !== 1) await (this.prisma as any).auditRecord.updateMany({where:{id:candidate.recordId,retentionClaimToken:token},data:{retentionClaimToken:null,retentionClaimUntil:null}});
      return updated.count===1?'APPLIED':'SKIPPED';
    } catch(error) {
      await (this.prisma as any).auditRecord.updateMany({where:{id:candidate.recordId,retentionClaimToken:token},data:{retentionClaimToken:null,retentionClaimUntil:null}}); throw error;
    }
  }
}
