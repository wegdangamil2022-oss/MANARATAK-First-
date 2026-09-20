import { BaseException } from './BaseException';
import { ErrorCode } from './ErrorCode';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class ValidationException extends BaseException {
  public readonly errors: ValidationErrorDetail[];

  constructor(message: string, errors: ValidationErrorDetail[] = []) {
    super(message, ErrorCode.VALIDATION_ERROR, { errors });
    this.errors = errors;
  }
}
