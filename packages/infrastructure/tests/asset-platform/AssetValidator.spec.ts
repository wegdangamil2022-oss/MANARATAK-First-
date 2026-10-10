import { describe, it, expect } from 'vitest';
import { AssetValidator } from '../../../application/src/asset-platform/utils/AssetValidator';

describe('AssetValidator', () => {
  it('passes validation for valid files', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: 'document.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024,
        pathKey: 'uploads/doc.pdf'
      });
    }).not.toThrow();

    expect(() => {
      AssetValidator.validate({
        originalFilename: 'image.png',
        mimeType: 'image/png',
        fileExtension: 'png',
        byteSize: 1024 * 1024
      });
    }).not.toThrow();
  });

  it('fails for empty filename', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: '',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024
      });
    }).toThrow('Original filename is required');
  });

  it('fails for empty or invalid file sizes', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: 'empty.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 0
      });
    }).toThrow('File is empty or missing');

    expect(() => {
      AssetValidator.validate({
        originalFilename: 'empty.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: -5
      });
    }).toThrow('File is empty or missing');
  });

  it('fails for oversized files', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: 'large.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 20 * 1024 * 1024 // 20MB
      });
    }).toThrow('File size exceeds maximum limit');
  });

  it('fails for unsupported file extensions', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: 'unsafe.zip',
        mimeType: 'application/pdf',
        fileExtension: 'zip',
        byteSize: 1024
      });
    }).toThrow('Unsupported file extension');
  });

  it('fails for unsupported mime types', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: 'unsafe.pdf',
        mimeType: 'application/octet-stream',
        fileExtension: 'pdf',
        byteSize: 1024
      });
    }).toThrow('Unsupported mime type');
  });

  it('fails for path traversal attempts', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: '../../etc/passwd',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024
      });
    }).toThrow('Path traversal attempt detected');

    expect(() => {
      AssetValidator.validate({
        originalFilename: 'safe.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024,
        pathKey: 'uploads/../passwd'
      });
    }).toThrow('Path traversal attempt detected');
  });

  it('fails for unsafe absolute paths', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: '/usr/bin/some-file.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024
      });
    }).toThrow('Unsafe absolute path detected');

    expect(() => {
      AssetValidator.validate({
        originalFilename: 'C:\\Windows\\System32\\file.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024
      });
    }).toThrow('Unsafe absolute path detected');
  });

  it('fails for null byte attempts', () => {
    expect(() => {
      AssetValidator.validate({
        originalFilename: 'safe.pdf\0.exe',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        byteSize: 1024
      });
    }).toThrow('Null byte detected');
  });
  it('rejects executable uploads and contradictory extension/MIME metadata by default', () => {
    expect(() => AssetValidator.validate({
      originalFilename: 'run.exe', mimeType: 'application/x-msdownload', fileExtension: 'exe', byteSize: 123,
    })).toThrow('Unsupported file extension');
    expect(() => AssetValidator.validate({
      originalFilename: 'document.pdf', mimeType: 'image/png', fileExtension: 'pdf', byteSize: 123,
    })).toThrow('ASSET_DECLARED_EXTENSION_MIME_MISMATCH');
  });

  it('disallows upload callers from setting archived or soft-deleted retention categories', () => {
    const valid = {
      originalFilename: 'draft.pdf', mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 50,
    };
    expect(() => AssetValidator.validate({ ...valid, retentionCategory: 'ARCHIVED' as any }))
      .toThrow('ASSET_UPLOAD_RETENTION_CATEGORY_FORBIDDEN');
    expect(() => AssetValidator.validate({ ...valid, retentionCategory: 'SOFT_DELETED' as any }))
      .toThrow('ASSET_UPLOAD_RETENTION_CATEGORY_FORBIDDEN');
  });

  it('requires an explicit, valid future expiration for temporary uploads', () => {
    const valid = {
      originalFilename: 'draft.pdf', mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 50,
      retentionCategory: 'TEMPORARY' as const,
    };
    expect(() => AssetValidator.validate(valid)).toThrow('ASSET_TEMPORARY_EXPIRY_REQUIRED');
    expect(() => AssetValidator.validate({ ...valid, expiresAt: 'tomorrow' }))
      .toThrow('ASSET_RETENTION_EXPIRY_INVALID');
    expect(() => AssetValidator.validate({ ...valid, expiresAt: '2026-10-09' }))
      .toThrow('ASSET_RETENTION_EXPIRY_INVALID');
    expect(() => AssetValidator.validate({ ...valid, expiresAt: new Date(Date.now() - 60_000).toISOString() }))
      .toThrow('ASSET_RETENTION_EXPIRY_NOT_FUTURE');
    expect(() => AssetValidator.validate({
      ...valid, expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    })).not.toThrow();
  });

});
