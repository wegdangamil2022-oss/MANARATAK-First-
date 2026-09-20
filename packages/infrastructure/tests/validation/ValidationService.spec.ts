import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ValidationService } from '../../src/validation/ValidationService';

describe('ValidationService', () => {
  const service = new ValidationService();

  it('rejects invalid request and returns structured errors', async () => {
    const schema = z.object({
      name: z.string().min(3),
      age: z.number().min(18)
    });

    const context = { payload: { name: 'Bo', age: 16 } };
    const result = await service.execute(context, schema);

    expect(result.isFailure).toBe(true);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(result.error?.details?.errors).toBeDefined();
    
    const errors = result.error?.details?.errors as any[];
    expect(errors.length).toBe(2);
    expect(errors[0].path).toBe('name');
    expect(errors[1].path).toBe('age');
  });

  it('fails closed when missing schema', async () => {
    const context = { payload: { name: 'ValidName' } };
    const result = await service.execute(context, null);

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain('Schema is missing unexpectedly');
  });

  it('accepts valid request and preserves data', async () => {
    const schema = z.object({
      name: z.string().min(3),
      bio: z.string()
    });

    const context = { payload: { name: 'ValidName', bio: '# Hello in Markdown\n**Bold**' } };
    const result = await service.execute(context, schema);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().name).toBe('ValidName');
    expect(result.getValue().bio).toBe('# Hello in Markdown\n**Bold**');
  });

  it('preserves Arabic input during sanitization', async () => {
    const schema = z.object({
      text: z.string()
    });

    const context = { payload: { text: 'مرحبا بالعالم' } };
    const result = await service.execute(context, schema);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().text).toBe('مرحبا بالعالم');
  });
});
