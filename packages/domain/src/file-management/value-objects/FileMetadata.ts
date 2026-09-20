export class FileMetadata {
  constructor(
    public readonly originalFilename: string,
    public readonly mimeType: string,
    public readonly fileExtension: string,
    public readonly byteSize: number
  ) {
    if (byteSize < 0) {
      throw new Error('Byte size cannot be negative');
    }
  }
}
