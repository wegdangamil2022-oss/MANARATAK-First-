import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { ImportSourceDefinition } from '@manaratak/domain';
import type { IImportSourceObservationGateway, StoredImportRawSnapshot } from '@manaratak/application';
export class PrismaImportSourceObservationGateway implements IImportSourceObservationGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async cached(source: ImportSourceDefinition) {
    const row = await this.prisma.importSourceObservation.findUnique({ where: { sourceId: source.sourceId } });
    return row && row.sourceRevision.toISOString() === source.updatedAt?.toISOString() ? { artifactId: row.artifactId } : null;
  }
  async remember(source: ImportSourceDefinition, snapshot: StoredImportRawSnapshot) {
    if (!source.updatedAt) throw new Error('IMPORT_SOURCE_REVISION_REQUIRED');
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`import-governance:observation:${source.sourceId}`}, 0))`;
      const current = await tx.importSourceRegistryEntry.findUnique({ where: { sourceId: source.sourceId } });
      if (!current || current.updatedAt.toISOString() !== source.updatedAt!.toISOString() || current.status !== 'ACTIVE') throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
      const prior = await tx.importSourceObservation.findUnique({ where: { sourceId: source.sourceId } });
      const reset = prior && prior.sourceRevision.toISOString() !== source.updatedAt!.toISOString();
      const data = { sourceRevision: source.updatedAt!, artifactId: snapshot.artifactId, contentHash: snapshot.contentHash,
        byteSize: snapshot.byteSize, etag: snapshot.etag ?? null, lastModified: snapshot.lastModified ?? null,
        ...(reset ? { shapeHash: null, shape: Prisma.JsonNull, pendingShapeHash: null, pendingShape: Prisma.JsonNull,
          driftState: 'BASELINE', fallbackSourceId: null, fallbackSourceRevision: null } : {}) };
      await tx.importSourceObservation.upsert({ where: { sourceId: source.sourceId }, create: { sourceId: source.sourceId, ...data }, update: data });
    });
  }
  async observeShape(source: ImportSourceDefinition, shape: Record<string, string[]>) {
    const hash = createHash('sha256').update(JSON.stringify(shape)).digest('hex');
    const allowed = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`import-governance:observation:${source.sourceId}`}, 0))`;
      const row = await tx.importSourceObservation.findUnique({ where: { sourceId: source.sourceId } });
      if (!row || row.sourceRevision.toISOString() !== source.updatedAt?.toISOString()) throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
      if (row.shapeHash === hash) return true;
      if (!row.shapeHash) {
        await tx.importSourceObservation.update({ where: { sourceId: source.sourceId }, data: { shapeHash: hash, shape, driftState: 'BASELINE' } });
        return true;
      }
      if (row.pendingShapeHash !== hash || !['REVIEW_REQUIRED','REJECTED'].includes(row.driftState))
        await tx.importSourceObservation.update({ where: { sourceId: source.sourceId }, data: {
          pendingShapeHash: hash, pendingShape: shape, driftState: 'REVIEW_REQUIRED', decisionActorId: null, decisionReason: null } });
      return false;
    });
    // Persist drift before failing the acquisition/staging command.
    if (!allowed) throw new Error('IMPORT_SOURCE_DRIFT_REVIEW_REQUIRED');
  }
  async fallback(source: ImportSourceDefinition) {
    const row = await this.prisma.importSourceObservation.findUnique({ where: { sourceId: source.sourceId } });
    return row?.fallbackSourceId && row.fallbackSourceRevision && row.sourceRevision.toISOString() === source.updatedAt?.toISOString()
      ? { sourceId: row.fallbackSourceId, sourceRevision: row.fallbackSourceRevision.toISOString() } : null;
  }
}
