import { AssetRecord } from '@manaratak/domain';
import { AssetRecordDto } from '../dtos/AssetDtos';

export class AssetRecordMapper {
  public static toDto(record: AssetRecord): AssetRecordDto {
    return {
      id: record.id.value,
      reference: record.reference.value,
      storageLocator: record.locator.value,
      storageZone: record.locator.storageZone,
      bucketName: record.locator.bucketName,
      pathKey: record.locator.pathKey,
      owner: {
        ownerId: record.owner.ownerId,
        ownerType: record.owner.ownerType
      },
      metadata: {
        originalFilename: record.metadata.originalFilename,
        mimeType: record.metadata.mimeType,
        fileExtension: record.metadata.fileExtension,
        byteSize: record.metadata.byteSize,
        width: record.metadata.width,
        height: record.metadata.height,
        duration: record.metadata.duration
      },
      retention: {
        category: record.retention.category,
        expiresAt: record.retention.expiresAt ? record.retention.expiresAt.toISOString() : undefined
      },
      classification: record.classification,
      state: record.state,
      checksum: record.checksum
        ? {
            algorithm: record.checksum.algorithm,
            hash: record.checksum.hash
          }
        : undefined,
      sanitization: record.sanitization
        ? {
            exifStripped: record.sanitization.exifStripped,
            sanitizedAt: record.sanitization.sanitizedAt
              ? record.sanitization.sanitizedAt.toISOString()
              : undefined,
            sanitizerNotes: record.sanitization.sanitizerNotes ?? undefined
          }
        : undefined
    };
  }
}
