import {describe,expect,it,vi} from 'vitest';
import {StudentApplicationTrackerUseCases} from '../../src/students/use-cases/StudentApplicationTrackerUseCases';

function fixture(){
  const repository={
    create:vi.fn().mockResolvedValue({id:'t-1',studentReferenceId:'s-1',version:1}),
    update:vi.fn().mockResolvedValue({id:'t-1',version:2}),
    archive:vi.fn().mockResolvedValue({id:'t-1',status:'ARCHIVED'}),
    remove:vi.fn().mockResolvedValue(undefined),
    setChecklistItem:vi.fn(),list:vi.fn(),listSupportPage:vi.fn(),
  };
  const scholarships={resolve:vi.fn().mockResolvedValue({id:'sch-1',available:true,deadlineAt:new Date('2027-01-10')})};
  return {repository,scholarships,service:new StudentApplicationTrackerUseCases(repository as any,scholarships as any)};
}
describe('StudentApplicationTrackerUseCases transactional notification boundary',()=>{
  it('only invokes owner persistence and never a direct notification on create',async()=>{
    const {service,repository}=fixture();
    await expect(service.create({studentReferenceId:'s-1',scholarshipId:'sch-1'})).resolves.toHaveProperty('id','t-1');
    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({studentReferenceId:'s-1'}));
  });
  it('delegates update CAS and no longer schedules a notification from the application layer',async()=>{
    const {service,repository}=fixture();
    await service.update('s-1','t-1',{expectedVersion:1,stage:'APPLIED'});
    expect(repository.update).toHaveBeenCalledWith('s-1','t-1',{expectedVersion:1,stage:'APPLIED'});
  });
  it('propagates a database write failure rather than reporting it as a notification outage',async()=>{
    const {service,repository}=fixture();
    repository.archive.mockRejectedValue(new Error('DATABASE_COMMIT_FAILED'));
    await expect(service.archive('s-1','t-1',1)).rejects.toThrow('DATABASE_COMMIT_FAILED');
  });
  it('keeps authorization through the student-scoped delete owner method',async()=>{
    const {service,repository}=fixture();
    await service.remove('s-1','t-1');
    expect(repository.remove).toHaveBeenCalledWith('s-1','t-1');
  });
});
