import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  ScholarshipReferenceState,
  ScholarshipReferenceTransitionDto,
} from '@manaratak/domain';
/** P12 writes only its own rows. Caller supplies the owner's already-bound atomic transaction. */
export class ScholarshipReferenceLifecycle {
  constructor(
    private readonly db: PrismaClient,
    private readonly bound = false,
  ) {}
  private table() {
    return (this.db as any).scholarshipReferenceTransition;
  }
  list(sourceOwnerId: string): Promise<ScholarshipReferenceTransitionDto[]> {
    return this.table().findMany({
      where: { sourceOwnerId },
      orderBy: { sourceRevision: 'desc' },
      take: 20,
    });
  }
  async state(ownerId: string): Promise<ScholarshipReferenceState | null> {
    const row = await this.table().findFirst({
      where: { sourceOwnerId: ownerId, status: 'APPROVED' },
      orderBy: { sourceRevision: 'desc' },
    });
    return row ? this.project(row) : null;
  }
  async stateBySlug(sourceSlug: string): Promise<ScholarshipReferenceState | null> {
    const row = await this.table().findFirst({
      where: { sourceSlug, status: 'APPROVED' },
      orderBy: { sourceRevision: 'desc' },
    });
    return row ? this.project(row) : null;
  }
  private async project(
    row: ScholarshipReferenceTransitionDto,
  ): Promise<ScholarshipReferenceState> {
    let replacement: ScholarshipReferenceState['replacement'];
    if (row.changeType === 'MERGE' && row.targetOwnerId) {
      const target = await this.db.scholarship.findFirst({
        where: {
          id: row.targetOwnerId,
          status: 'PUBLISHED',
          publicationStatus: 'PUBLISHED',
          verificationStatus: 'VERIFIED',
          completenessStatus: 'COMPLETE',
          versions: { some: { status: 'PUBLISHED' } },
        },
        select: { id: true, publicId: true, slug: true, displayName: true },
      });
      const targetState = target
        ? await this.table().findFirst({
            where: { sourceOwnerId: target.id, status: 'APPROVED' },
            orderBy: { sourceRevision: 'desc' },
          })
        : null;
      if (target && (!targetState || targetState.changeType === 'RESTORE'))
        replacement = {
          ownerId: target.id,
          publicId: target.publicId,
          slug: target.slug,
          displayName: target.displayName,
        };
    }
    return {
      ownerId: row.sourceOwnerId,
      state:
        row.changeType === 'MERGE'
          ? 'MERGED'
          : row.changeType === 'TOMBSTONE'
            ? 'TOMBSTONE'
            : 'RESTORED',
      ownerRevision: row.sourceRevision + 1,
      effectiveAt: row.reviewedAt!.toISOString(),
      ...(replacement ? { replacement } : {}),
    };
  }
  private requireBound() {
    if (!this.bound) throw new Error('SCHOLARSHIP_ATOMIC_TRANSACTION_REQUIRED');
  }
  private async lock(ids: string[]) {
    for (const id of [...new Set(ids)].sort())
      await this.db.$queryRaw(Prisma.sql`SELECT id FROM "Scholarship" WHERE id=${id} FOR UPDATE`);
  }
  private async target(id: string, sourceId: string) {
    if (id === sourceId) throw new Error('SCHOLARSHIP_REFERENCE_CYCLE');
    const target = await this.db.scholarship.findUnique({
      where: { id },
      include: { versions: { where: { status: 'PUBLISHED' }, take: 1 } },
    });
    const transition = await this.table().findFirst({
      where: { sourceOwnerId: id, status: 'APPROVED' },
      orderBy: { sourceRevision: 'desc' },
    });
    if (
      !target ||
      target.status !== 'PUBLISHED' ||
      target.publicationStatus !== 'PUBLISHED' ||
      target.verificationStatus !== 'VERIFIED' ||
      target.completenessStatus !== 'COMPLETE' ||
      !target.versions.length ||
      (transition && transition.changeType !== 'RESTORE')
    )
      throw new Error('SCHOLARSHIP_REFERENCE_TARGET_NOT_PUBLIC');
    return target;
  }
  async propose(input: {
    sourceOwnerId: string;
    sourceRevision: number;
    changeType: 'MERGE' | 'TOMBSTONE' | 'RESTORE';
    targetOwnerId?: string;
    actorId: string;
    reason: string;
  }): Promise<ScholarshipReferenceTransitionDto> {
    this.requireBound();
    await this.lock([input.sourceOwnerId, ...(input.targetOwnerId ? [input.targetOwnerId] : [])]);
    const source = await this.db.scholarship.findUnique({
      where: { id: input.sourceOwnerId },
      include: { versions: { where: { publishedAt: { not: null } }, take: 1 } },
    });
    if (!source || source.revision !== input.sourceRevision || !source.versions.length)
      throw new Error('SCHOLARSHIP_REFERENCE_SOURCE_UNVERIFIED');
    if (
      (input.changeType === 'MERGE') !== Boolean(input.targetOwnerId) ||
      !['MERGE', 'TOMBSTONE', 'RESTORE'].includes(input.changeType)
    )
      throw new Error('SCHOLARSHIP_REFERENCE_COMMAND_INVALID');
    const target = input.targetOwnerId ? await this.target(input.targetOwnerId, source.id) : null;
    await this.table().updateMany({
      where: { sourceOwnerId: source.id, status: 'PENDING' },
      data: { status: 'SUPERSEDED' },
    });
    await this.db.scholarship.update({
      where: { id: source.id },
      data: { revision: { increment: 1 } },
    });
    return this.table().create({
      data: {
        id: randomUUID(),
        sourceOwnerId: source.id,
        sourcePublicId: source.publicId,
        sourceSlug: source.slug,
        sourceRevision: source.revision + 1,
        targetOwnerId: target?.id ?? null,
        targetRevision: target?.revision ?? null,
        changeType: input.changeType,
        proposedBy: input.actorId,
        reason: input.reason.trim(),
      },
    });
  }
  async approve(
    sourceOwnerId: string,
    transitionId: string,
    sourceRevision: number,
    actorId: string,
    reason: string,
  ) {
    this.requireBound();
    const proposal = await this.table().findUnique({ where: { id: transitionId } });
    if (
      !proposal ||
      proposal.sourceOwnerId !== sourceOwnerId ||
      proposal.status !== 'PENDING' ||
      proposal.proposedBy === actorId
    )
      throw new Error('SCHOLARSHIP_REFERENCE_INDEPENDENT_REVIEW_REQUIRED');
    await this.lock([sourceOwnerId, ...(proposal.targetOwnerId ? [proposal.targetOwnerId] : [])]);
    const source = await this.db.scholarship.findUnique({ where: { id: sourceOwnerId } });
    if (!source || source.revision !== sourceRevision || proposal.sourceRevision !== sourceRevision)
      throw new Error('SCHOLARSHIP_STALE_REVISION');
    if (proposal.targetOwnerId) {
      const target = await this.target(proposal.targetOwnerId, sourceOwnerId);
      if (target.revision !== proposal.targetRevision)
        throw new Error('SCHOLARSHIP_REFERENCE_TARGET_CHANGED');
    }
    const changed = await this.table().updateMany({
      where: { id: transitionId, status: 'PENDING' },
      data: {
        status: 'APPROVED',
        reviewedBy: actorId,
        reviewedAt: new Date(),
        reason: reason.trim(),
      },
    });
    if (changed.count !== 1) throw new Error('SCHOLARSHIP_STALE_REVISION');
    await this.db.scholarship.update({
      where: { id: sourceOwnerId },
      data: {
        revision: { increment: 1 },
        status: proposal.changeType === 'RESTORE' ? 'READY_TO_REVIEW' : 'ARCHIVED',
        publicationStatus: proposal.changeType === 'RESTORE' ? 'DRAFT' : 'ARCHIVED',
      },
    });
  }
}
