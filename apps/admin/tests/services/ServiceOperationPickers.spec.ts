import { describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
import { serviceOperationOptions } from '../../src/api/serviceOperationPickers';
describe('Operation relationship search', () => {
  it('sends the search to the server instead of filtering just the current page', async () => {
    state.request.mockResolvedValue({
      data: [
        { id: 'provider-42', displayName: 'Consultation', publicId: 'PRO-42', status: 'QUALIFIED' },
      ],
      total: 25,
    });
    const result = await serviceOperationOptions('providers', ' PRO-42 ', 2);
    expect(state.request).toHaveBeenCalledWith(
      '/admin/services/operations/providers?page=2&search=PRO-42',
    );
    expect(result.options[0].id).toBe('provider-42');
    expect(result.nextCursor).toBeNull();
  });
  it('does not invent an active status for discount references without a lifecycle', async () => {
    state.request.mockResolvedValue({data:[{id:'discount-1',publicId:'DSC-1'}],total:1});
    const result = await serviceOperationOptions('discounts');
    expect(result.options[0].lifecycle).toBe('REFERENCE');
  });
});
