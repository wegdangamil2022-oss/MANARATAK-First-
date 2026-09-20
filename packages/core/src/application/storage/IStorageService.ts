import { FileMetadata } from './FileMetadata';

export interface UploadRequest {
  path: string;
  buffer: Buffer;
  metadata: FileMetadata;
}

export interface IStorageService {
  uploadFile(request: UploadRequest): Promise<string>;
  downloadFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  getPresignedUrl(path: string, expiresInSeconds: number): Promise<string>;
}
