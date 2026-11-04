import { IValidationContext } from './IValidationContext';
import { Result } from '../../core/Result';

export interface IValidationPipeline {
  execute<T>(context: IValidationContext, schema: ValidationSchema<T> | null | undefined): Promise<Result<T>>;
}

export interface ValidationSchema<T> {
  parseAsync(payload: unknown): Promise<T>;
}
