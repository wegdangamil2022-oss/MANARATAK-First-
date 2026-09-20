export class AssetValidator {
  private static readonly ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/json',
    'text/plain',
    'application/x-msdownload'
  ]);

  private static readonly ALLOWED_EXTENSIONS = new Set([
    'pdf',
    'jpeg',
    'jpg',
    'png',
    'csv',
    'json',
    'txt',
    'exe'
  ]);

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  public static validate(input: {
    originalFilename: string;
    mimeType: string;
    fileExtension: string;
    byteSize: number;
    pathKey?: string;
  }): void {
    if (!input.originalFilename) {
      throw new Error('Original filename is required');
    }

    if (input.byteSize <= 0) {
      throw new Error('File is empty or missing');
    }
    if (input.byteSize > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit: ${input.byteSize} bytes`);
    }

    const ext = input.fileExtension.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file extension: ${input.fileExtension}`);
    }

    const mime = input.mimeType.toLowerCase();
    if (!this.ALLOWED_MIME_TYPES.has(mime)) {
      throw new Error(`Unsupported mime type: ${input.mimeType}`);
    }

    this.validatePath(input.originalFilename, 'originalFilename');
    if (input.pathKey) {
      this.validatePath(input.pathKey, 'pathKey');
    }
  }

  public static validatePath(pathStr: string, fieldName: string): void {
    if (!pathStr) {
      return;
    }

    if (pathStr.startsWith('/') || /^[a-zA-Z]:\\/.test(pathStr)) {
      throw new Error(`Unsafe absolute path detected in ${fieldName}: ${pathStr}`);
    }

    if (
      pathStr.includes('..') ||
      pathStr.includes('\\..') ||
      pathStr.includes('../') ||
      pathStr.includes('..\\')
    ) {
      throw new Error(`Path traversal attempt detected in ${fieldName}: ${pathStr}`);
    }

    if (pathStr.includes('\0')) {
      throw new Error(`Null byte detected in ${fieldName}`);
    }
  }
}
