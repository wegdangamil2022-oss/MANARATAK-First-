import { z } from 'zod';
import { Result, ResultFactory } from '@manaratak/core';

export class ZodValidationProvider {
  /**
   * Validates a payload against a Zod schema.
   * If the schema is missing, it will throw an error to fail closed.
   */
  public async validate<T>(payload: any, schema: z.ZodSchema<T>): Promise<Result<T>> {
    if (!schema) {
      return ResultFactory.failure('Validation failed: Schema is missing', 'VALIDATION_ERROR');
    }

    try {
      const parsed = await schema.parseAsync(payload);
      return ResultFactory.success(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ResultFactory.validationFailure(
          'Validation Error',
          error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        );
      }
      return ResultFactory.failure('Unexpected validation error', 'VALIDATION_ERROR', { error: String(error) });
    }
  }
}
