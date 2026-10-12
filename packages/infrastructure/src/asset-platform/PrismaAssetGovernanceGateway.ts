import { Prisma, type PrismaClient } from '@prisma/client';
import { AssetId, type AssetRights, type AtomicPersistenceContext } from '@manaratak/domain';
import type { IAssetGovernanceGateway, AssetRendition } from '@manaratak/application';
import { PrismaAssetRecordRepository } from './PrismaAssetRecordRepository';
export class PrismaAssetGovernanceGateway implements IAssetGovernanceGateway {
  constructor(private readonly db: PrismaClient) {}
  private tx(context: AtomicPersistenceContext) {
    const tx = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('ASSET_GOVERNANCE_TRANSACTION_REQUIRED');
    return tx;
  }
  async load(assetId: string) {
    const details = await new PrismaAssetRecordRepository(this.db).findAdminDetails(
      new AssetId(assetId),
    );
    if (!details) throw new Error('ASSET_NOT_FOUND');
    return { asset: details.asset, revision: details.governance.updatedAt.toISOString() };
  }
  async rights(
    assetId: string,
    rights: AssetRights,
    expectedRevision: string,
    reason: string,
    actorId: string,
    context: AtomicPersistenceContext,
  ) {
    const tx = this.tx(context),
      repository = new PrismaAssetRecordRepository(tx as unknown as PrismaClient);
    const details = await repository.findAdminDetails(new AssetId(assetId));
    if (!details) throw new Error('ASSET_NOT_FOUND');
    if (details.governance.updatedAt.toISOString() !== expectedRevision)
      throw new Error('ASSET_GOVERNANCE_REVISION_CONFLICT');
    details.asset.setRights(rights, actorId, reason);
    await repository.save(details.asset);
  }
  async renditions(assetId: string): Promise<AssetRendition[]> {
    const rows = await this.db.assetRenditionRecord.findMany({
      where: { assetId },
      orderBy: { variantKey: 'asc' },
      take: 101,
    });
    if (rows.length > 100) throw new Error('ASSET_RENDITION_LIMIT');
    return rows as unknown as AssetRendition[];
  }
  async deleteRendition(
    assetId: string,
    variantKey: string,
    expectedVersion: number,
    context: AtomicPersistenceContext,
  ) {
    const tx = this.tx(context);
    await tx.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'asset-rendition:' + assetId},0))::text`,
    );
    const changed = await tx.assetRenditionRecord.deleteMany({
      where: { assetId, variantKey, version: expectedVersion },
    });
    if (changed.count !== 1) throw new Error('ASSET_GOVERNANCE_REVISION_CONFLICT');
  }
  async saveRendition(
    row: AssetRendition,
    expectedVersion: number,
    context: AtomicPersistenceContext,
  ) {
    const tx = this.tx(context);
    await tx.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${'asset-rendition:' + row.assetId},0))::text`,
    );
    const ids = [row.assetId, ...(row.generatedAssetId ? [row.generatedAssetId] : [])].sort();
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "AssetRecord" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR SHARE`,
    );
    const repo = new PrismaAssetRecordRepository(tx as unknown as PrismaClient);
    const parent = await repo.findById(new AssetId(row.assetId));
    if (!parent) throw new Error('ASSET_NOT_FOUND');
    parent.assertCanDeliver();
    if (parent.checksum?.hash !== row.sourceSha256)
      throw new Error('ASSET_GOVERNANCE_REVISION_CONFLICT');
    if (row.generatedAssetId) {
      const child = await repo.findById(new AssetId(row.generatedAssetId));
      if (!child) throw new Error('ASSET_NOT_FOUND');
      child.assertCanDeliver();
      if (
        !row.evidence ||
        child.checksum?.hash !== row.evidence.checksumSha256 ||
        child.metadata.byteSize !== row.evidence.byteSize ||
        child.metadata.mimeType !== row.evidence.mimeType ||
        child.owner.ownerId !== parent.owner.ownerId ||
        child.owner.ownerType !== parent.owner.ownerType ||
        (parent.classification === 'PUBLIC' && child.classification !== 'PUBLIC')
      )
        throw new Error('ASSET_RENDITION_EVIDENCE_INVALID');
    }
    const data = {
      ...row,
      evidence: row.evidence
        ? (JSON.parse(JSON.stringify(row.evidence)) as Prisma.InputJsonValue)
        : Prisma.DbNull,
    };
    if (!expectedVersion) {
      const count = await tx.assetRenditionRecord.count({ where: { assetId: row.assetId } });
      if (count >= 100) throw new Error('ASSET_RENDITION_LIMIT');
      try {
        await tx.assetRenditionRecord.create({ data });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002')
          throw new Error('ASSET_GOVERNANCE_REVISION_CONFLICT');
        throw error;
      }
    } else {
      const changed = await tx.assetRenditionRecord.updateMany({
        where: { id: row.id, assetId: row.assetId, version: expectedVersion },
        data,
      });
      if (changed.count !== 1) throw new Error('ASSET_GOVERNANCE_REVISION_CONFLICT');
    }
  }
}
