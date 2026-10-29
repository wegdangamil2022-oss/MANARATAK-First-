import {describe,expect,it,vi} from 'vitest';
import {PrismaStaffLifecycleRepository} from '../../src/identity/PrismaStaffLifecycleRepository';
describe('Fresh staff access snapshot',()=>{
  it('checks the current access result on every call in one query',async()=>{
    const query=vi.fn().mockResolvedValueOnce([{allowed:true}]).mockResolvedValueOnce([{allowed:false}]);
    const repo=new PrismaStaffLifecycleRepository({$queryRaw:query} as never,async()=>false);
    expect(await repo.adminAccessAllowed('staff')).toBe(true);expect(await repo.adminAccessAllowed('staff')).toBe(false);expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0].text).toContain('clock_timestamp()');
  });
  it('retains missing-table compatibility but propagates other storage failures',async()=>{
    const query=vi.fn().mockRejectedValueOnce({code:'P2010',meta:{code:'42P01'}}).mockResolvedValueOnce([{present:false,memberships:false}]);
    const repo=new PrismaStaffLifecycleRepository({$queryRaw:query} as never,async()=>false);
    expect(await repo.adminAccessAllowed('existing-owner')).toBe(true);
    query.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(repo.adminAccessAllowed('existing-owner')).rejects.toThrow('storage unavailable');
  });
});
