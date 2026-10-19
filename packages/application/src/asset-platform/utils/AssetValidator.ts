import { AssetRetentionCategory } from '@absheer/domain';

export class AssetValidator {
  private static readonly ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/json',
    'text/plain',
  ]);

  private static readonly ALLOWED_EXTENSIONS = new Set([
    'pdf',
    'jpeg',
    'jpg',
    'png',
    'csv',
    'json',
    'txt',
  ]);

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  public static validateGeneratedCertificate(
    input: Parameters<typeof AssetValidator.validate>[0] & {
      ownerType: string;
      assetReference: string;
      kind: 'PDF' | 'PREVIEW' | 'QR';
      renderFingerprint: string;
      bytes: Uint8Array;
    },
  ): void {
    if (
      !['PDF', 'PREVIEW', 'QR'].includes(input.kind) ||
      input.ownerType !== 'Certificate' ||
      !/^[a-f0-9]{64}$/.test(input.renderFingerprint) ||
      !new RegExp(
        `^certificate:[A-Za-z0-9_-]+:render:${input.renderFingerprint}:${input.kind.toLowerCase()}$`,
      ).test(input.assetReference) ||
      input.byteSize !== input.bytes.byteLength ||
      input.byteSize < 1 ||
      input.byteSize > this.MAX_FILE_SIZE
    )
      throw new Error('CERTIFICATE_GENERATED_UPLOAD_INVALID');
    if (input.kind === 'PDF') {
      this.validate(input);
      if (
        input.mimeType !== 'application/pdf' ||
        new TextDecoder().decode(input.bytes.subarray(0, 5)) !== '%PDF-'
      )
        throw new Error('CERTIFICATE_GENERATED_PDF_INVALID');
      return;
    }
    if (
      input.mimeType !== 'image/svg+xml' ||
      input.fileExtension !== 'svg' ||
      !input.originalFilename.toLowerCase().endsWith('.svg')
    )
      throw new Error('CERTIFICATE_GENERATED_SVG_INVALID');
    this.validatePath(input.originalFilename, 'originalFilename');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(input.bytes);
    if (
      !/^\s*<svg[\s>]/i.test(text) ||
      /<!DOCTYPE|<!ENTITY|<\?|<\s*\/?(?:script|foreignObject|iframe|object|embed)\b|<[^>]*\s+on[a-z]+\s*=/i.test(
        text,
      )
    )
      throw new Error('CERTIFICATE_GENERATED_SVG_UNSAFE');
    for (const match of text.matchAll(
      /(?:href|xlink:href)\s*=\s*["']([^"']*)["']/gi,
    ))
      if (
        !/^(?:#[A-Za-z0-9_-]+|data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+)$/.test(
          match[1],
        )
      )
        throw new Error('CERTIFICATE_GENERATED_SVG_EXTERNAL_REFERENCE');
    for (const match of text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi))
      if (
        !/^(?:#[A-Za-z0-9_-]+|data:(?:font\/(?:ttf|otf|woff2?)|image\/(?:png|jpeg));base64,[A-Za-z0-9+/=]+)$/.test(
          match[1],
        )
      )
        throw new Error('CERTIFICATE_GENERATED_SVG_EXTERNAL_REFERENCE');
    if (input.kind === 'QR' && /<\s*(?:text|tspan|image|style)\b/i.test(text))
      throw new Error('CERTIFICATE_GENERATED_QR_PERSONAL_CONTENT_FORBIDDEN');
  }

  public static validate(input: {
    originalFilename: string;
    mimeType: string;
    fileExtension: string;
    byteSize: number;
    pathKey?: string;
    retentionCategory?: AssetRetentionCategory;
    expiresAt?: string | Date;
  }): void {
    if (!input.originalFilename) {
      throw new Error('Original filename is required');
    }

    if (input.byteSize <= 0) {
      throw new Error('File is empty or missing');
    }
    if (input.byteSize > this.MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum limit: ${input.byteSize} bytes`,
      );
    }

    // Reject traversal/absolute paths and NUL bytes before extension/MIME comparisons,
    // preserving the stronger security diagnostics on malicious filenames.
    this.validatePath(input.originalFilename, 'originalFilename');
    if (input.pathKey) this.validatePath(input.pathKey, 'pathKey');

    const ext = input.fileExtension.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file extension: ${input.fileExtension}`);
    }

    const mime = input.mimeType.toLowerCase();
    if (!this.ALLOWED_MIME_TYPES.has(mime)) {
      throw new Error(`Unsupported mime type: ${input.mimeType}`);
    }
    const extensionMime: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      csv: 'text/csv',
      json: 'application/json',
      txt: 'text/plain',
    };
    if (
      extensionMime[ext] !== mime ||
      !input.originalFilename.toLowerCase().endsWith(`.${ext}`)
    ) {
      throw new Error('ASSET_DECLARED_EXTENSION_MIME_MISMATCH');
    }

    const category =
      input.retentionCategory ?? AssetRetentionCategory.PERMANENT;
    if (
      category !== AssetRetentionCategory.PERMANENT &&
      category !== AssetRetentionCategory.TEMPORARY
    ) {
      throw new Error('ASSET_UPLOAD_RETENTION_CATEGORY_FORBIDDEN');
    }
    if (
      category === AssetRetentionCategory.TEMPORARY &&
      input.expiresAt == null
    ) {
      throw new Error('ASSET_TEMPORARY_EXPIRY_REQUIRED');
    }
    if (input.expiresAt != null) {
      const value = input.expiresAt;
      const validFormat =
        value instanceof Date ||
        (typeof value === 'string' &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,3})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
            value,
          ));
      const millis =
        value instanceof Date
          ? value.getTime()
          : typeof value === 'string'
            ? Date.parse(value)
            : Number.NaN;
      if (!validFormat || !Number.isFinite(millis)) {
        throw new Error('ASSET_RETENTION_EXPIRY_INVALID');
      }
      if (millis <= Date.now()) {
        throw new Error('ASSET_RETENTION_EXPIRY_NOT_FUTURE');
      }
    }
  }

  public static validatePath(pathStr: string, fieldName: string): void {
    if (!pathStr) {
      return;
    }

    if (pathStr.startsWith('/') || /^[a-zA-Z]:\\/.test(pathStr)) {
      throw new Error(
        `Unsafe absolute path detected in ${fieldName}: ${pathStr}`,
      );
    }

    if (
      pathStr.includes('..') ||
      pathStr.includes('\\..') ||
      pathStr.includes('../') ||
      pathStr.includes('..\\')
    ) {
      throw new Error(
        `Path traversal attempt detected in ${fieldName}: ${pathStr}`,
      );
    }

    if (pathStr.includes('\0')) {
      throw new Error(`Null byte detected in ${fieldName}`);
    }
  }
}
