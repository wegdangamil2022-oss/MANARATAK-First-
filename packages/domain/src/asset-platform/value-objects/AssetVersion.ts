import { AssetStorageLocator } from './AssetStorageLocator';
import { AssetChecksum } from './AssetChecksum';

export class AssetVersion {
  constructor(
    public readonly versionNumber: number,
    public readonly createdAt: Date,
    public readonly storageLocator: AssetStorageLocator,
    public readonly checksum?: AssetChecksum,
    public readonly changelog?: string
  ) {
    if (versionNumber < 1) {
      throw new Error('AssetVersion versionNumber must be greater than or equal to 1');
    }
  }
}
