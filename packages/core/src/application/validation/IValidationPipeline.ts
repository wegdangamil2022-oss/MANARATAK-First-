import { IValidationContext } from './IValidationContext';
import { Result } from '../../core/Result';

export interface IValidationPipeline {
  execute<T>(context: IValidationContext, schema: any): Promise<Result<T>>;
}
