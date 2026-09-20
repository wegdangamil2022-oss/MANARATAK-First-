export interface FileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  extension: string;
  customMetadata?: Record<string, string>;
}
