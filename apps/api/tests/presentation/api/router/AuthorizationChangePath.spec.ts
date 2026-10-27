import { describe, it, expect } from 'vitest';
import { authorizationChangeTargetSchema } from '../../../../src/presentation/api/router/AuthorizationChangeRequests';
describe('authorization change owner paths', () => {
  it('canonicalizes encoded IDs without changing existing role identity', () => {
    const raw = { method: 'PATCH', body: {}, changeTicket: 'CHANGE-123' };
    expect(
      authorizationChangeTargetSchema.parse({ ...raw, path: '/roles/custom:reviewer' }).path,
    ).toBe('/roles/custom%3Areviewer');
    expect(
      authorizationChangeTargetSchema.parse({ ...raw, path: '/roles/custom%3areviewer' }).path,
    ).toBe('/roles/custom%3Areviewer');
  });
  it.each([
    '/roles/%2e%2e',
    '/roles/a%2fb',
    '/roles/a%5cb',
    '/roles/%252e%252e',
    '/roles/a?b',
    '//roles/id',
  ])('rejects traversal or nested path %s', (path) => {
    expect(
      authorizationChangeTargetSchema.safeParse({
        method: 'PATCH',
        path,
        body: {},
        changeTicket: '',
      }).success,
    ).toBe(false);
  });
});
