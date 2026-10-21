import {describe,it,expect,vi} from 'vitest';
import {PrismaApiIdempotencyStore} from '../../src/api-foundation/PrismaApiIdempotencyStore';

const input={scopeHash:'scope',principalId:'owner',method:'POST',routeKey:'/command',keyHash:'key',requestFingerprint:'body',ttlSeconds:600,leaseSeconds:30};
describe('API command identity aborted transaction recovery',()=>{
  it('restarts the whole serializable transaction after P2034 and keeps its isolation',async()=>{
    const create=vi.fn().mockResolvedValue({}),findUnique=vi.fn().mockResolvedValue(null);
    const transaction=vi.fn().mockRejectedValueOnce({code:'P2034'}).mockImplementation(work=>work({apiIdempotencyRecord:{findUnique,create}}));
    expect(await new PrismaApiIdempotencyStore({$transaction:transaction}).begin(input)).toMatchObject({kind:'STARTED'});
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction.mock.calls.every(call=>call[1].isolationLevel==='Serializable')).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('reads a competing completed scope in a fresh transaction after its insert aborts',async()=>{
    const findUnique=vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({requestFingerprint:'body',state:'COMPLETED',expiresAt:new Date(Date.now()+60000),statusCode:201,responseBody:{id:'persisted'}});
    const create=vi.fn().mockRejectedValue({code:'P2002'});
    const transaction=vi.fn().mockImplementation(work=>work({apiIdempotencyRecord:{findUnique,create}}));
    expect(await new PrismaApiIdempotencyStore({$transaction:transaction}).begin(input)).toEqual({kind:'REPLAY',statusCode:201,responseBody:{id:'persisted'}});
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('stops after five serialization failures without claiming a started command',async()=>{
    const error={code:'P2034'},transaction=vi.fn().mockRejectedValue(error);
    await expect(new PrismaApiIdempotencyStore({$transaction:transaction}).begin(input)).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(5);
  });
  it('does not retry a permission or connection failure',async()=>{
    const error={code:'P1010'},transaction=vi.fn().mockRejectedValue(error);
    await expect(new PrismaApiIdempotencyStore({$transaction:transaction}).begin(input)).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
