import { describe, expect, it } from 'vitest';
import { identityListQuerySchema } from '../../../src/presentation/validation/StrictControlPlaneSchemas';

describe('privileged identity list query contract', () => {
  it('normalizes the two declared pagination forms', () => {
    expect(identityListQuerySchema.parse({ page: '3', pageSize: '10' })).toMatchObject({ limit: 10, offset: 20 });
    expect(identityListQuerySchema.parse({ limit: '5', offset: '15' })).toMatchObject({ limit: 5, offset: 15 });
    expect(identityListQuerySchema.parse({})).toMatchObject({ limit: 20, offset: 0 });
  });
  it.each([{ limti: '20' }, { includePasswords: 'true' }, { limit: '101' }, { offset: '-1' }, { page: '0' }])('rejects undeclared or invalid options: %j', (query) => {
    expect(identityListQuerySchema.safeParse(query).success).toBe(false);
  });
});
