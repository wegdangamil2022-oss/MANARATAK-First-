import { ValidationErrorDetail } from '../../domain/exceptions/ValidationException';

export interface ValidationResultModel<T> {
  isValid: boolean;
  errors: ValidationErrorDetail[];
  value?: T;
}

export interface IValidationProvider {
  validate<T>(schema: any, data: unknown): ValidationResultModel<T>;
}
