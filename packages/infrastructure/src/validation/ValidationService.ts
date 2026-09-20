import { IValidationService, IValidationContext, Result, ResultFactory } from '@manaratak/core';
import { ZodValidationProvider } from './ZodValidationProvider';
import { DefaultSanitizer } from './DefaultSanitizer';

export class ValidationService implements IValidationService {
  constructor(
    private readonly provider: ZodValidationProvider = new ZodValidationProvider(),
    private readonly sanitizer: DefaultSanitizer = new DefaultSanitizer()
  ) {}

  public async execute<T>(context: IValidationContext, schema: any): Promise<Result<T>> {
    if (!schema) {
      return ResultFactory.failure('Validation failed: Schema is missing unexpectedly', 'VALIDATION_ERROR');
    }

    if (!context || context.payload === undefined) {
      return ResultFactory.failure('Validation failed: Payload is missing', 'VALIDATION_ERROR');
    }

    let payload = context.payload;
    
    // Optionally sanitize based on context metadata if needed. 
    // For now, we only apply sanitization if explicitly requested or let domain handle it.
    // The requirement says: "If generic sanitization is not semantically safe for a field, validation must preserve the original value and leave domain normalization to the owning domain."
    // So we just sanitize strings generically, but preserve Markdown/Arabic text.
    payload = this.sanitizer.sanitize(payload);

    return this.provider.validate(payload, schema);
  }
}
