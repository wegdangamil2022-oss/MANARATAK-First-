import {describe,expect,it,vi} from 'vitest';
import {StudentApplicationReminderDeliveryPolicy} from '../../src/students/use-cases/StudentApplicationReminderDeliveryPolicy';
import {NotificationDeliveryBackgroundJobHandler} from '../../src/background-jobs/handlers/NotificationDeliveryBackgroundJobHandler';
function fixture(){
  const candidate={id:'student-application-deadline-t-1-v2',templateId:'student-application-deadline-v1',
    recipientReference:'s-1',variables:{trackerId:'t-1',trackerVersion:'2',scholarshipId:'sch-1',deadlineAt:'2027-01-20T00:00:00.000Z'},channels:['IN_APP'],attempt:1,maxAttempts:3};
  const trackers={findById:vi.fn().mockResolvedValue({id:'t-1',studentReferenceId:'s-1',scholarshipId:'sch-1',version:2,status:'ACTIVE',deadlineAt:new Date(candidate.variables.deadlineAt)})};
  const identities={findById:vi.fn().mockResolvedValue({type:'Human',status:'ACTIVE'})};
  const roles={findByIdentityId:vi.fn().mockResolvedValue([{roleId:'student'}])};
  return {candidate,trackers,identities,roles,policy:new StudentApplicationReminderDeliveryPolicy(trackers as any,identities as any,roles as any)};
}
describe('P15 reminder delivery owner guard',()=>{
  it('permits the current active recipient and only a matching source version',async()=>{
    const {policy,candidate,trackers}=fixture();
    expect(await policy.isEligible(candidate as any)).toBe(true);
    expect(trackers.findById).toHaveBeenCalledWith('s-1','t-1');
  });
  it.each([{version:3},{status:'ARCHIVED'},{studentReferenceId:'foreign'},{deadlineAt:new Date('2027-01-25')}])
    ('suppresses a claimed reminder invalidated by an owner edit',async change=>{
      const {policy,candidate,trackers}=fixture();
      const current=await trackers.findById();trackers.findById.mockResolvedValue({...current,...change});
      expect(await policy.isEligible(candidate as any)).toBe(false);
    });
  it('suppresses deleted trackers and revoked student roles',async()=>{
    const {policy,candidate,trackers,roles}=fixture();
    roles.findByIdentityId.mockResolvedValue([]);
    expect(await policy.isEligible(candidate as any)).toBe(false);
    trackers.findById.mockResolvedValue(null);
    expect(await policy.isEligible(candidate as any)).toBe(false);
  });
  it('suppresses legacy unversioned reminders rather than trusting obsolete state',async()=>{
    const {policy,candidate}=fixture();
    expect(await policy.isEligible({...candidate,variables:{scholarshipId:'sch-1',deadlineAt:candidate.variables.deadlineAt}} as any)).toBe(false);
  });
  it('checks eligibility after claiming and never sends a stale reminder',async()=>{
    const {candidate}=fixture();
    const repository={claimDue:vi.fn().mockResolvedValue([candidate]),markSuppressed:vi.fn().mockResolvedValue(true),markFailed:vi.fn().mockResolvedValue(true),markDelivered:vi.fn()};
    const gateway={deliver:vi.fn()};const policy={isEligible:vi.fn().mockResolvedValue(false)};
    const handler=new NotificationDeliveryBackgroundJobHandler(repository as any,gateway as any,{hasOptedOut:vi.fn().mockResolvedValue(false)} as any,policy);
    await handler.handle({}, {signal:new AbortController().signal,jobReference:'job',attempt:1} as any);
    expect(repository.markSuppressed).toHaveBeenCalledWith(candidate,'NOTIFICATION_OWNER_STATE_CHANGED',expect.any(Date));
    expect(gateway.deliver).not.toHaveBeenCalled();
  });
  it('keeps an owner outage retryable without delivering or pretending suppression',async()=>{
    const {candidate}=fixture();
    const repository={claimDue:vi.fn().mockResolvedValue([candidate]),markSuppressed:vi.fn(),markFailed:vi.fn().mockResolvedValue(true),markDelivered:vi.fn()};
    const gateway={deliver:vi.fn()};const policy={isEligible:vi.fn().mockRejectedValue(new Error('OWNER_UNAVAILABLE'))};
    await new NotificationDeliveryBackgroundJobHandler(repository as any,gateway as any,{hasOptedOut:vi.fn().mockResolvedValue(false)} as any,policy)
      .handle({}, {signal:new AbortController().signal,jobReference:'job',attempt:1} as any);
    expect(repository.markFailed).toHaveBeenCalled();expect(repository.markSuppressed).not.toHaveBeenCalled();expect(gateway.deliver).not.toHaveBeenCalled();
  });
});
