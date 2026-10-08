import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat } from 'fs/promises';
import * as path from 'path';
import {
  IAssetStorageGateway,
  AssetStorageLocator,
  AssetStorageZone,
  AssetUploadVerificationRequest,
  VerifiedAssetUpload
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

  async verifyUploadedObject(locator: AssetStorageLocator, request: AssetUploadVerificationRequest): Promise<VerifiedAssetUpload> {
    if (locator.storageZone !== AssetStorageZone.QUARANTINE) throw new Error('ASSET_UPLOAD_VERIFICATION_QUARANTINE_REQUIRED');
    const content = await this.read(locator, 10 * 1024 * 1024);
    const bytes = Buffer.from(content);
    const prefix = bytes.subarray(0, 8);
    const declared = request.declaredMimeType;
    const text = ['text/plain', 'text/csv', 'application/json'].includes(declared);
    let matches = false;
    if (declared === 'application/pdf') matches = bytes.subarray(0, 5).equals(Buffer.from('%PDF-'));
    else if (declared === 'image/png') matches = prefix.equals(Buffer.from([137,80,78,71,13,10,26,10]));
    else if (declared === 'image/jpeg') matches = bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    else if (text) {
      try {
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        matches = !decoded.includes('\0');
        if (declared === 'application/json' && matches) JSON.parse(decoded);
      } catch { matches = false; }
    }
    if (!matches || (request.expectedByteSize !== undefined && bytes.length !== request.expectedByteSize)) throw new Error('ASSET_UPLOAD_VERIFICATION_FAILED');
    return {
      byteSize: bytes.length,
      verifiedMimeType: declared,
      checksumSha256: createHash('sha256').update(bytes).digest('hex'),
      verifiedAt: new Date().toISOString(),
      signatureVerified: true,
    };
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
