import { assertImportReviewLease } from '../import-foundation/ImportReviewLeaseGuard';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { IScholarshipImportCanonicalResolutionDecisionPort, IScholarshipImportVerificationDecisionPort, ScholarshipImportCanonicalResolutionDecision, ScholarshipImportVerificationDecision } from '@manaratak/application';

export class PrismaScholarshipImportVerificationDecisionPort implements IScholarshipImportVerificationDecisionPort {
  constructor(private readonly prisma: PrismaClient) {}
  async record(input: ScholarshipImportVerificationDecision) { return this.prisma.$transaction(async tx => { await assertImportReviewLease(tx, input.recordId, input.actorId); const created = await tx.scholarshipImportVerificationDecision.create({ data: { id: randomUUID(), recordId: input.recordId, state: input.state, actorId: input.actorId, reason: input.reason, evidence: input.evidence as object | undefined, correlationId: input.correlationId } }); return { decisionId: created.id, recordedAt: created.createdAt.toISOString() }; }); }
  async latest(recordId: string) { const row = await this.prisma.scholarshipImportVerificationDecision.findFirst({ where: { recordId }, orderBy: { createdAt: 'desc' } }); return row ? { decisionId: row.id, recordId: row.recordId, state: row.state as ScholarshipImportVerificationDecision['state'], actorId: row.actorId, reason: row.reason, evidence: row.evidence as Record<string, unknown> | undefined, correlationId: row.correlationId ?? undefined, recordedAt: row.createdAt.toISOString() } : null; }
  async list(recordId: string) { const rows = await this.prisma.scholarshipImportVerificationDecision.findMany({ where: { recordId }, orderBy: { createdAt: 'asc' } }); return rows.map((row) => ({ decisionId: row.id, recordId: row.recordId, state: row.state as ScholarshipImportVerificationDecision['state'], actorId: row.actorId, reason: row.reason, evidence: row.evidence as Record<string, unknown> | undefined, correlationId: row.correlationId ?? undefined, recordedAt: row.createdAt.toISOString() })); }
}

export class PrismaScholarshipImportCanonicalResolutionDecisionPort implements IScholarshipImportCanonicalResolutionDecisionPort {
  constructor(private readonly prisma: PrismaClient) {}
  async record(input: ScholarshipImportCanonicalResolutionDecision) { return this.prisma.$transaction(async tx => { await assertImportReviewLease(tx, input.recordId, input.actorId); const created = await tx.scholarshipImportCanonicalResolutionDecision.create({ data: { id: randomUUID(), ...input } }); return { decisionId: created.id, recordedAt: created.createdAt.toISOString() }; }); }
  async list(recordId: string) { const rows = await this.prisma.scholarshipImportCanonicalResolutionDecision.findMany({ where: { recordId }, orderBy: { createdAt: 'asc' } }); return rows.map((row) => ({ decisionId: row.id, recordId: row.recordId, fieldOrRequirementKey: row.fieldOrRequirementKey, canonicalEntityType: row.canonicalEntityType, canonicalId: row.canonicalId ?? undefined, rawValue: row.rawValue, resolutionType: row.resolutionType as ScholarshipImportCanonicalResolutionDecision['resolutionType'], actorId: row.actorId, reason: row.reason ?? undefined, correlationId: row.correlationId ?? undefined, recordedAt: row.createdAt.toISOString() })); }
}
