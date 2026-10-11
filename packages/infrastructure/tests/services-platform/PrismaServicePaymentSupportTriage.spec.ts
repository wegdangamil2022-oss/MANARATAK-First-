import {describe,expect,it,vi} from 'vitest';
import {PrismaServicePlatformRepository} from '../../src/services-platform/PrismaServicePlatformRepository';

describe('P20 owner-scoped support payment triage',()=>{
  it('returns distinct student references and an exact owner total without request PII',async()=>{
    const requestRows=[
      {studentReferenceId:'student-1',_count:{_all:3}},
      {studentReferenceId:'student-2',_count:{_all:1}},
      {studentReferenceId:'student-3',_count:{_all:2}},
    ];
    const prisma={
      serviceRequestRecord:{groupBy:vi.fn().mockResolvedValue(requestRows)},
      $queryRaw:vi.fn().mockResolvedValue([{total:18n}]),
    };
    const repo=new PrismaServicePlatformRepository(prisma as any);
    const result=await repo.listSupportAwaitingPaymentStudents(2,2);
    expect(result).toEqual({
      items:[{studentReferenceId:'student-1'},{studentReferenceId:'student-2'}],
      total:18,hasMore:true,nextPage:3,
    });
    expect(prisma.serviceRequestRecord.groupBy).toHaveBeenCalledWith({
      by:['studentReferenceId'],where:{status:'AWAITING_PAYMENT'},
      orderBy:{studentReferenceId:'asc'},skip:2,take:3,
    });
    expect(JSON.stringify(result)).not.toContain('_count');
    expect(JSON.stringify(result)).not.toContain('requestParameters');
  });
  it('refuses page-size abuse before consulting the owner database',async()=>{
    const prisma={serviceRequestRecord:{groupBy:vi.fn()},$queryRaw:vi.fn()};
    const owner=new PrismaServicePlatformRepository(prisma as any);
    await expect(owner.listSupportAwaitingPaymentStudents(1,100))
      .rejects.toThrow('SERVICE_SUPPORT_TRIAGE_QUERY_INVALID');
    expect(prisma.serviceRequestRecord.groupBy).not.toHaveBeenCalled();
  });
});
