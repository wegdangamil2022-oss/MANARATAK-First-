import { FileMetadata } from './FileMetadata';

export interface IStorageProvider {
  upload(path: string, buffer: Buffer, metadata: FileMetadata): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getSignedUrl?(path: string, expiresInSeconds: number): Promise<string>;
}
