import { describe, it, expect, vi } from 'vitest';
import { PrismaServiceOperationsRepository } from '../../src/services-platform/PrismaServiceOperationsRepository';
function fixture(kind = 'serviceProviderRecord') {
  const findMany = vi.fn().mockResolvedValue([]),
    count = vi.fn().mockResolvedValue(0);
  return {
    repository: new PrismaServiceOperationsRepository({ [kind]: { findMany, count } } as any),
    findMany,
    count,
  };
}
describe('Service operation search boundaries', () => {
  it('searches before pagination with the same criteria for results and counts', async () => {
    const f = fixture();
    await f.repository.listOperations('providers', 2, 'actor', ' Consultation ');
    const args = f.findMany.mock.calls[0][0];
    expect(args.take).toBe(20);
    expect(args.skip).toBe(20);
    expect(args.where.OR).toContainEqual({
      displayName: { contains: 'Consultation', mode: 'insensitive' },
    });
    expect(f.count).toHaveBeenCalledWith({ where: args.where });
  });
  it('retains assigned request scope while searching bookings', async () => {
    const f = fixture('serviceBookingRecord');
    await f.repository.listOperations('bookings', 1, 'actor', 'SVC-123');
    expect(f.findMany.mock.calls[0][0].where).toMatchObject({
      request: { assignedStaffId: 'actor' },
      OR: expect.any(Array),
    });
    expect(JSON.stringify(f.findMany.mock.calls[0][0].where)).not.toContain('inputSnapshot');
  });
  it('does not search nonexistent public IDs or student data on delivery artifacts', async () => {
    const f = fixture('serviceDeliveryArtifactRecord');
    await f.repository.listOperations('deliveries', 1, 'actor', 'REPORT');
    const where = f.findMany.mock.calls[0][0].where;
    expect(where.booking).toEqual({ request: { assignedStaffId: 'actor' } });
    expect(Object.keys(where.OR[1])).toEqual(['artifactType']);
    expect(where.OR).toHaveLength(2);
  });
  it('rejects unbounded searches before touching the database', async () => {
    const f = fixture();
    await expect(
      f.repository.listOperations('providers', 1, undefined, 'x'.repeat(121)),
    ).rejects.toThrow('SERVICE_OPERATION_QUERY_INVALID');
    expect(f.findMany).not.toHaveBeenCalled();
    expect(f.count).not.toHaveBeenCalled();
  });
});
