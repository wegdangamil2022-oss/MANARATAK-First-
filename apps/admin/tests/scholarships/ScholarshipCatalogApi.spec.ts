import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
import { scholarshipCatalogApi } from '../../src/api/scholarshipCatalog';
beforeEach(() => state.request.mockReset());
describe('Scholarship conditional owner writes', () => {
  it('sends the loaded revision and reason on a catalog update', () => {
    scholarshipCatalogApi.update('one', { displayName: 'Changed' }, 'Correct source name', 7);
    expect(state.request).toHaveBeenCalledWith(
      '/admin/scholarships/one',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'If-Match': '7', 'X-Review-Reason': 'Correct source name' },
      }),
    );
  });
  it.each(['publish', 'unpublish', 'mark-ready', 'mark-publishable', 'archive'] as const)(
    'protects %s with the same owner precondition',
    (command) => {
      scholarshipCatalogApi.command('one', command, 'Reviewed source', 12);
      expect(state.request).toHaveBeenCalledWith(
        '/admin/scholarships/one/' + command,
        expect.objectContaining({
          headers: { 'If-Match': '12', 'X-Review-Reason': 'Reviewed source' },
        }),
      );
    },
  );
  it.each([undefined, 0, -1, 1.5, NaN])(
    'does not issue a mutation without a valid owner revision (%s)',
    (revision) => {
      expect(() => scholarshipCatalogApi.update('one', {}, 'Reviewed source', revision)).toThrow(
        'SCHOLARSHIP_REVISION_PRECONDITION_REQUIRED',
      );
      expect(state.request).not.toHaveBeenCalled();
    },
  );
});
