import { BaseException } from './BaseException';
import { ErrorCode } from './ErrorCode';

export class StorageException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.INFRASTRUCTURE_ERROR, details);
    this.name = 'StorageException';
  }
}

export class FileNotFoundException extends BaseException {
  constructor(message: string = 'File not found', details?: Record<string, unknown>) {
    super(message, ErrorCode.NOT_FOUND, details);
    this.name = 'FileNotFoundException';
  }
}
