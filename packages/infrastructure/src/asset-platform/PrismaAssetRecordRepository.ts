import { PrismaClient } from '@prisma/client';
import {
  IAssetRecordRepository,
  AssetRecord,
  AssetId,
  AssetReference,
  AssetOwnerReference,
  AssetStorageLocator,
  AssetMetadata,
  AssetRetentionMetadata,
  AssetSecurityClassification,
  AssetLifecycleState,
  AssetChecksum,
  AssetSanitizationMetadata,
  AssetStorageZone,
  AssetRetentionCategory
} from '@manaratak/domain';

interface AssetRecordRow {
  id: string;
  reference: string;
  ownerId: string;
  ownerType: string;
  lifecycleState: string;
  securityClassification: string;
  retentionCategory: string;
  retentionExpiresAt: Date | null;
  quarantineStorageLocator: string | null;
  cleanStorageLocator: string | null;
  checksumAlgorithm: string | null;
  checksumHash: string | null;
  metadata: unknown;
  versionChain: unknown | null;
  sanitizationMetadata: unknown | null;
  malwareScanStatus: unknown | null;
}

export class PrismaAssetRecordRepository implements IAssetRecordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(asset: AssetRecord): Promise<void> {
    const data = {
      id: asset.id.value,
      reference: asset.reference.value,
      ownerId: asset.owner.ownerId,
      ownerType: asset.owner.ownerType,
      lifecycleState: asset.state,
      securityClassification: asset.classification,
      retentionCategory: asset.retention.category,
      retentionExpiresAt: asset.retention.expiresAt || null,
      quarantineStorageLocator: asset.locator.storageZone === AssetStorageZone.QUARANTINE ? asset.locator.value : null,
      cleanStorageLocator: asset.locator.storageZone === AssetStorageZone.CLEAN ? asset.locator.value : null,
      checksumAlgorithm: asset.checksum?.algorithm || null,
      checksumHash: asset.checksum?.hash || null,
      metadata: {
        originalFilename: asset.metadata.originalFilename,
        mimeType: asset.metadata.mimeType,
        fileExtension: asset.metadata.fileExtension,
        byteSize: asset.metadata.byteSize,
        width: asset.metadata.width,
        height: asset.metadata.height,
        duration: asset.metadata.duration,
        extraMetadata: asset.metadata.extraMetadata
      } as any,
      versionChain: asset.versionChain ? (asset.versionChain as any) : null,
      sanitizationMetadata: asset.sanitization ? {
        exifStripped: asset.sanitization.exifStripped,
        sanitizedAt: asset.sanitization.sanitizedAt?.toISOString(),
        sanitizerNotes: asset.sanitization.sanitizerNotes
      } as any : null,
      malwareScanStatus: null as any,
    };

    const prismaClient = this.prisma as unknown as {
      assetRecord: {
        upsert: (args: any) => Promise<any>,
        findUnique: (args: any) => Promise<any>,
        findMany: (args: any) => Promise<any>
      }
    };

    await prismaClient.assetRecord.upsert({
      where: { id: asset.id.value },
      update: data,
      create: data
    });
  }

  async findById(id: AssetId): Promise<AssetRecord | null> {
    const prismaClient = this.prisma as unknown as {
      assetRecord: {
        upsert: (args: any) => Promise<any>,
        findUnique: (args: any) => Promise<any>,
        findMany: (args: any) => Promise<any>
      }
    };
    const row = await prismaClient.assetRecord.findUnique({
      where: { id: id.value }
    });
    if (!row) return null;
    return this.mapToDomain(row as AssetRecordRow);
  }

  async findByReference(reference: AssetReference): Promise<AssetRecord | null> {
    const prismaClient = this.prisma as unknown as {
      assetRecord: {
        upsert: (args: any) => Promise<any>,
        findUnique: (args: any) => Promise<any>,
        findMany: (args: any) => Promise<any>
      }
    };
    const row = await prismaClient.assetRecord.findUnique({
      where: { reference: reference.value }
    });
    if (!row) return null;
    return this.mapToDomain(row as AssetRecordRow);
  }

  async findByOwner(owner: AssetOwnerReference): Promise<AssetRecord[]> {
    const prismaClient = this.prisma as unknown as {
      assetRecord: {
        upsert: (args: any) => Promise<any>,
        findUnique: (args: any) => Promise<any>,
        findMany: (args: any) => Promise<any>
      }
    };
    const rows = await prismaClient.assetRecord.findMany({
      where: {
        ownerId: owner.ownerId,
        ownerType: owner.ownerType
      }
    });
    return (rows as AssetRecordRow[]).map(row => this.mapToDomain(row));
  }

  async queryAdmin(input: {
    lifecycleState?: string;
    ownerType?: string;
    ownerId?: string;
    securityClassification?: string;
    mimeTypePrefix?: string;
    createdFrom?: string;
    createdTo?: string;
    q?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 30)));
    const decodedCursor = input.cursor ? Buffer.from(input.cursor, 'base64url').toString('utf8') : null;
    const [cursorCreatedAt, cursorId] = decodedCursor?.split('|') ?? [];
    const where: any = {
      ...(input.lifecycleState ? { lifecycleState: input.lifecycleState } : {}),
      ...(input.ownerType ? { ownerType: input.ownerType } : {}),
      ...(input.ownerId ? { ownerId: input.ownerId } : {}),
      ...(input.securityClassification ? { securityClassification: input.securityClassification } : {}),
      ...(input.mimeTypePrefix ? { metadata: { path: ['mimeType'], string_starts_with: input.mimeTypePrefix } } : {}),
      ...((input.createdFrom || input.createdTo) ? { createdAt: {
        ...(input.createdFrom ? { gte: new Date(input.createdFrom) } : {}),
        ...(input.createdTo ? { lte: new Date(input.createdTo) } : {}),
      } } : {}),
      ...(input.q ? { OR: [
        { id: { contains: input.q, mode: 'insensitive' } },
        { reference: { contains: input.q, mode: 'insensitive' } },
        { ownerId: { contains: input.q, mode: 'insensitive' } },
        { metadata: { path: ['originalFilename'], string_contains: input.q } },
      ] } : {}),
      ...(cursorCreatedAt && cursorId ? {
        OR: [
          { createdAt: { lt: new Date(cursorCreatedAt) } },
          { createdAt: new Date(cursorCreatedAt), id: { lt: cursorId } },
        ],
      } : {}),
    };
    const rows = await (this.prisma as any).assetRecord.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((row: any) => ({
      id: row.id, reference: row.reference, ownerId: row.ownerId, ownerType: row.ownerType,
      lifecycleState: row.lifecycleState, securityClassification: row.securityClassification,
      retentionCategory: row.retentionCategory, retentionExpiresAt: row.retentionExpiresAt,
      metadata: row.metadata, checksumAlgorithm: row.checksumAlgorithm, checksumHash: row.checksumHash,
      createdAt: row.createdAt, updatedAt: row.updatedAt, archivedAt: row.archivedAt, deletedAt: row.deletedAt,
    }));
    const last = items.at(-1);
    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? Buffer.from(`${new Date(last.createdAt).toISOString()}|${last.id}`, 'utf8').toString('base64url') : null,
    };
  }

  private mapToDomain(row: AssetRecordRow): AssetRecord {
    let locator: AssetStorageLocator;
    if (row.cleanStorageLocator) {
      const match = row.cleanStorageLocator.match(/^clean:\/\/(.+?)\/(.+)$/);
      locator = new AssetStorageLocator(AssetStorageZone.CLEAN, match?.[1] || 'unknown', match?.[2] || 'unknown');
    } else if (row.quarantineStorageLocator) {
      const match = row.quarantineStorageLocator.match(/^quarantine:\/\/(.+?)\/(.+)$/);
      locator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, match?.[1] || 'unknown', match?.[2] || 'unknown');
    } else {
      locator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'unknown', 'unknown');
    }

    const metadataObj = row.metadata as any;
    const metadata = new AssetMetadata(
      metadataObj.originalFilename,
      metadataObj.mimeType,
      metadataObj.fileExtension,
      metadataObj.byteSize,
      metadataObj.width,
      metadataObj.height,
      metadataObj.duration,
      metadataObj.extraMetadata
    );

    let sanitization: AssetSanitizationMetadata | undefined;
    if (row.sanitizationMetadata) {
      const sanObj = row.sanitizationMetadata as any;
      sanitization = new AssetSanitizationMetadata(
        sanObj.exifStripped,
        sanObj.sanitizedAt ? new Date(sanObj.sanitizedAt) : undefined,
        sanObj.sanitizerNotes
      );
    }

    return new AssetRecord({
      id: new AssetId(row.id),
      reference: new AssetReference(row.reference),
      locator,
      metadata,
      retention: new AssetRetentionMetadata(
        row.retentionCategory as AssetRetentionCategory,
        row.retentionExpiresAt ? new Date(row.retentionExpiresAt) : null
      ),
      owner: new AssetOwnerReference(row.ownerId, row.ownerType),
      classification: row.securityClassification as AssetSecurityClassification,
      state: row.lifecycleState as AssetLifecycleState,
      checksum: row.checksumAlgorithm && row.checksumHash ? new AssetChecksum(row.checksumAlgorithm, row.checksumHash) : undefined,
      sanitization,
      versionChain: undefined // We are skipping complex versionChain reconstruction for now as it's not strictly required in full unless requested
    });
  }
}
