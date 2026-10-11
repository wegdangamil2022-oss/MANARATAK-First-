import {describe,expect,it,vi} from 'vitest';
import {StudentApplicationReminderOutboxDeliveryGateway} from '../../src/students/use-cases/StudentApplicationReminderOutboxDeliveryGateway';

function fixture(){
  const reminders={schedule:vi.fn().mockResolvedValue(undefined),cancel:vi.fn().mockResolvedValue(undefined)};
  const trackers={findById:vi.fn().mockResolvedValue({
    id:'tracker-1',studentReferenceId:'student-1',scholarshipId:'sch-1',status:'ACTIVE',version:2,
    deadlineAt:new Date('2027-01-15T00:00:00Z'),
  })};
  const gateway=new StudentApplicationReminderOutboxDeliveryGateway(reminders as any,trackers as any);
  const entry={
    id:'outbox-2',domain:'STUDENT_APPLICATIONS',eventType:'StudentApplicationReminderReconcileRequested',
    aggregate:{aggregateType:'StudentApplicationTracker',aggregateId:'tracker-1'},
    metadata:{sourcePhase:'Phase15',schemaVersion:'1.0'},
    payload:{trackerId:'tracker-1',studentReferenceId:'student-1',scholarshipId:'sch-1',
      trackerVersion:2,previousVersion:1,status:'ACTIVE',deadlineAt:'2027-01-15T00:00:00.000Z'},
  };
  return {reminders,trackers,gateway,entry};
}
describe('StudentApplicationReminderOutboxDeliveryGateway',()=>{
  it('schedules the current version and cancels the prior intent',async()=>{
    const {gateway,entry,reminders}=fixture();
    await gateway.deliver(entry as any,{idempotencyKey:'outbox-2'});
    expect(reminders.cancel).toHaveBeenCalledWith('tracker-1',1);
    expect(reminders.schedule).toHaveBeenCalledWith(expect.objectContaining({
      trackerId:'tracker-1',trackerVersion:2,studentReferenceId:'student-1',
    }));
  });
  it('cancels a just-created reminder if another update commits while scheduling',async()=>{
    const {gateway,entry,reminders,trackers}=fixture();
    trackers.findById.mockResolvedValueOnce({
      id:'tracker-1',studentReferenceId:'student-1',scholarshipId:'sch-1',
      status:'ACTIVE',version:2,deadlineAt:new Date('2027-01-15T00:00:00Z'),
    }).mockResolvedValueOnce({
      id:'tracker-1',studentReferenceId:'student-1',scholarshipId:'sch-1',
      status:'ACTIVE',version:3,deadlineAt:new Date('2027-01-18T00:00:00Z'),
    });
    await gateway.deliver(entry as any,{idempotencyKey:'outbox-2'});
    expect(trackers.findById).toHaveBeenCalledTimes(2);
    expect(reminders.schedule).toHaveBeenCalledTimes(1);
    expect(reminders.cancel).toHaveBeenCalledWith('tracker-1',2);
  });

  it('does not revive an old reminder after a newer version exists',async()=>{
    const {gateway,entry,reminders}=fixture();
    await gateway.deliver({...entry,payload:{...entry.payload,trackerVersion:1,previousVersion:null}}
      as any,{idempotencyKey:'outbox-2'});
    expect(reminders.cancel).toHaveBeenCalledWith('tracker-1',1);
    expect(reminders.schedule).not.toHaveBeenCalled();
  });
  it('does not schedule deleted/archived records',async()=>{
    const {gateway,entry,reminders,trackers}=fixture();
    trackers.findById.mockResolvedValue(null);
    await gateway.deliver({...entry,payload:{...entry.payload,status:'DELETED'}} as any,{idempotencyKey:'outbox-2'});
    expect(reminders.schedule).not.toHaveBeenCalled();
    expect(reminders.cancel).toHaveBeenCalledWith('tracker-1',2);
  });
  it('rejects forged source metadata, aggregate and deadlines',async()=>{
    const {gateway,entry,reminders}=fixture();
    await expect(gateway.deliver({...entry,metadata:{sourcePhase:'Other'}} as any,{idempotencyKey:'outbox-2'}))
      .rejects.toThrow('STUDENT_REMINDER_EVENT_SOURCE_INVALID');
    await expect(gateway.deliver({...entry,aggregate:{aggregateType:'StudentApplicationTracker',aggregateId:'other'}} as any,
      {idempotencyKey:'outbox-2'})).rejects.toThrow('STUDENT_REMINDER_EVENT_PAYLOAD_INVALID');
    await expect(gateway.deliver({...entry,payload:{...entry.payload,deadlineAt:'2027-02-01T00:00:00Z'}} as any,
      {idempotencyKey:'outbox-2'})).rejects.toThrow('STUDENT_REMINDER_EVENT_STALE_DEADLINE');
    expect(reminders.schedule).not.toHaveBeenCalled();
  });
  it('propagates notification outages for dispatcher backoff instead of silent loss',async()=>{
    const {gateway,entry,reminders}=fixture();
    reminders.cancel.mockRejectedValue(new Error('DB_OUTAGE'));
    await expect(gateway.deliver(entry as any,{idempotencyKey:'outbox-2'})).rejects.toThrow('DB_OUTAGE');
  });
});
