import {describe, expect, it, vi} from 'vitest';
import {StudentApplicationTrackerUseCases} from '../../src/students/use-cases/StudentApplicationTrackerUseCases';

const deadline = new Date('2027-01-15T00:00:00Z');
function fixture() {
  const before = {
    id:'tracker-1', studentReferenceId:'student-1',scholarshipId:'sch-1',version:1,
    deadlineAt:deadline,status:'ACTIVE',stage:'DOCUMENTS',
  };
  const after = {...before,version:2,stage:'APPLIED'};
  const repository = {
    create:vi.fn().mockResolvedValue(before),
    findById:vi.fn().mockResolvedValue(before),
    update:vi.fn().mockResolvedValue(after),
    archive:vi.fn().mockResolvedValue({...after,status:'ARCHIVED'}),
    remove:vi.fn().mockResolvedValue(undefined),
    setChecklistItem:vi.fn(),
    list:vi.fn(),
    listSupportPage:vi.fn(),
  };
  const scholarships={resolve:vi.fn().mockResolvedValue({id:'sch-1',slug:'sch',available:true,deadlineAt:deadline})};
  const reminders={schedule:vi.fn().mockResolvedValue(undefined),cancel:vi.fn().mockResolvedValue(undefined)};
  const service=new StudentApplicationTrackerUseCases(repository as any,scholarships as any,reminders as any);
  return {service,repository,scholarships,reminders,before,after};
}

describe('StudentApplicationTrackerUseCases reminder failure isolation',()=>{
  it('reports a successful create despite post-commit notification outage',async()=>{
    const {service,reminders,repository}=fixture();
    reminders.schedule.mockRejectedValue(new Error('notification outage'));
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>undefined);
    try {
      await expect(service.create({studentReferenceId:'student-1',scholarshipId:'sch-1'})).resolves.toHaveProperty('id','tracker-1');
      expect(repository.create).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalledWith('STUDENT_APPLICATION_REMINDER_RECONCILIATION_PENDING');
    } finally {warn.mockRestore();}
  });

  it('rotates versioned reminder identities even when the deadline has not changed',async()=>{
    const {service,reminders}=fixture();
    await service.update('student-1','tracker-1',{expectedVersion:1,stage:'APPLIED'});
    expect(reminders.schedule).toHaveBeenCalledWith(expect.objectContaining({trackerId:'tracker-1',trackerVersion:2}));
    expect(reminders.cancel).toHaveBeenCalledWith('tracker-1',1);
  });

  it('does not cancel the previous reminder when tracker deletion is rejected',async()=>{
    const {service,reminders,repository}=fixture();
    repository.remove.mockRejectedValue(new Error('TRACKER_DELETE_FAILED'));
    await expect(service.remove('student-1','tracker-1')).rejects.toThrow('TRACKER_DELETE_FAILED');
    expect(reminders.cancel).not.toHaveBeenCalled();
  });

  it('returns an archived tracker even if reminder cancellation is unavailable',async()=>{
    const {service,reminders}=fixture();
    reminders.cancel.mockRejectedValue(new Error('notification outage'));
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>undefined);
    try {
      await expect(service.archive('student-1','tracker-1',1)).resolves.toMatchObject({status:'ARCHIVED'});
      expect(warn).toHaveBeenCalledWith('STUDENT_APPLICATION_REMINDER_RECONCILIATION_PENDING');
    } finally {warn.mockRestore();}
  });
});
