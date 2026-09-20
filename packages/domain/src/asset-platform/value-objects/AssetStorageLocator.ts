import { AssetStorageZone } from '../enums/AssetStorageZone';

export class AssetStorageLocator {
  constructor(
    public readonly storageZone: AssetStorageZone,
    public readonly bucketName: string,
    public readonly pathKey: string
  ) {
    if (!bucketName || bucketName.trim() === '') {
      throw new Error('AssetStorageLocator bucketName cannot be empty');
    }
    if (!pathKey || pathKey.trim() === '') {
      throw new Error('AssetStorageLocator pathKey cannot be empty');
    }
  }

  get value(): string {
    return `${this.storageZone.toLowerCase()}://${this.bucketName}/${this.pathKey.replace(/^\/+/, '')}`;
  }
}
