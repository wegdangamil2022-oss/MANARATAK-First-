export class AssetMetadata {
  constructor(
    public readonly originalFilename: string,
    public readonly mimeType: string,
    public readonly fileExtension: string,
    public readonly byteSize: number,
    public readonly width?: number,
    public readonly height?: number,
    public readonly duration?: number,
    public readonly extraMetadata?: Record<string, unknown>
  ) {
    if (!originalFilename || originalFilename.trim() === '') {
      throw new Error('AssetMetadata originalFilename cannot be empty');
    }
    if (!mimeType || mimeType.trim() === '') {
      throw new Error('AssetMetadata mimeType cannot be empty');
    }
    if (byteSize < 0) {
      throw new Error('AssetMetadata byteSize cannot be negative');
    }
  }
}
