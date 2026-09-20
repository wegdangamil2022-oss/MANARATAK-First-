import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat } from 'fs/promises';
import * as path from 'path';
import {
  IAssetStorageGateway,
  AssetStorageLocator,
  AssetStorageZone
} from '@manaratak/domain';

export class LocalAssetStorageGateway implements IAssetStorageGateway {
  constructor(
    private readonly localBucketName: string = 'local-dev-bucket',
    private readonly localRoot: string = path.resolve(process.cwd(), 'storage', 'assets'),
    productionLike: boolean = false,
  ) {
    if (productionLike) {
      throw new Error('LOCAL_ASSET_STORAGE_DEVELOPMENT_ONLY');
    }
  }

  async generateUploadLocator(zone?: AssetStorageZone): Promise<AssetStorageLocator> {
    const targetZone = zone || AssetStorageZone.QUARANTINE;
    const pathKey = `uploads/${randomUUID()}`;
    return new AssetStorageLocator(targetZone, this.localBucketName, pathKey);
  }

  async moveToCleanZone(quarantineLocator: AssetStorageLocator): Promise<AssetStorageLocator> {
    if (quarantineLocator.storageZone !== AssetStorageZone.QUARANTINE) throw new Error('ASSET_STORAGE_QUARANTINE_LOCATOR_REQUIRED');
    const cleanPathKey = quarantineLocator.pathKey.replace(/^uploads\//, 'clean/');
    const cleanLocator = new AssetStorageLocator(AssetStorageZone.CLEAN, this.localBucketName, cleanPathKey);
    const source = this.resolveLocator(quarantineLocator);
    const destination = this.resolveLocator(cleanLocator);
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(source, destination);
    return cleanLocator;
  }

  async read(locator: AssetStorageLocator, maxBytes: number): Promise<Uint8Array> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
      throw new Error('ASSET_READ_MAX_BYTES_INVALID');
    }
    if (locator.bucketName !== this.localBucketName) {
      throw new Error(`ASSET_STORAGE_BUCKET_NOT_AVAILABLE:${locator.bucketName}`);
    }

    const resolvedPath = this.resolveLocator(locator);

    const metadata = await stat(resolvedPath);
    if (!metadata.isFile()) {
      throw new Error('ASSET_STORAGE_LOCATOR_NOT_FILE');
    }
    if (metadata.size > maxBytes) {
      throw new Error(`ASSET_READ_SIZE_LIMIT_EXCEEDED:${metadata.size}:${maxBytes}`);
    }

    const data = await readFile(resolvedPath);
    if (data.byteLength > maxBytes) {
      throw new Error(`ASSET_READ_SIZE_LIMIT_EXCEEDED:${data.byteLength}:${maxBytes}`);
    }
    return new Uint8Array(data);
  }

  async archive(locator: AssetStorageLocator): Promise<void> {
    await rename(this.resolveLocator(locator), this.archivePath(locator));
  }

  async restore(locator: AssetStorageLocator): Promise<void> {
    await rename(this.archivePath(locator), this.resolveLocator(locator));
  }

  async delete(locator: AssetStorageLocator): Promise<void> {
    await rm(this.resolveLocator(locator), { force: true });
    await rm(this.archivePath(locator), { force: true });
  }

  private resolveLocator(locator: AssetStorageLocator): string {
    if (locator.bucketName !== this.localBucketName) throw new Error(`ASSET_STORAGE_BUCKET_NOT_AVAILABLE:${locator.bucketName}`);
    const bucketRoot = path.resolve(this.localRoot, locator.bucketName);
    const resolved = path.resolve(bucketRoot, locator.pathKey);
    if (resolved !== bucketRoot && !resolved.startsWith(`${bucketRoot}${path.sep}`)) throw new Error('ASSET_STORAGE_PATH_OUTSIDE_ROOT');
    return resolved;
  }

  private archivePath(locator: AssetStorageLocator): string {
    return `${this.resolveLocator(locator)}.archived`;
  }
}
