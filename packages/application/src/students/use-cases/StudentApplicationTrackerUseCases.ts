import { CreateStudentApplicationTrackerDto, IStudentApplicationReminderGateway, IStudentApplicationScholarshipGateway, IStudentApplicationTrackerRepository, UpdateStudentApplicationTrackerDto } from '@manaratak/domain';

export class StudentApplicationTrackerUseCases {
  constructor(private readonly repository:IStudentApplicationTrackerRepository, private readonly scholarships:IStudentApplicationScholarshipGateway, private readonly reminders?:IStudentApplicationReminderGateway) {}
  async create(input:Omit<CreateStudentApplicationTrackerDto,'deadlineAt'> & {deadlineAt?:Date|null}){
    const owner=await this.scholarships.resolve(input.scholarshipId); if(!owner) throw new Error('SCHOLARSHIP_NOT_FOUND'); if(!owner.available) throw new Error('SCHOLARSHIP_NOT_AVAILABLE');
    const tracker=await this.repository.create({...input,scholarshipSlug:input.scholarshipSlug ?? owner.slug ?? null,deadlineAt:input.deadlineAt ?? owner.deadlineAt ?? null});
    await this.schedule(tracker); return {...tracker,owner};
  }
  async list(studentReferenceId:string){ const items=await this.repository.list(studentReferenceId); return Promise.all(items.map(async tracker=>({...tracker,owner:await this.scholarships.resolve(tracker.scholarshipId)}))); }
  async update(studentReferenceId:string,trackerId:string,input:UpdateStudentApplicationTrackerDto){ const before=await this.repository.findById(studentReferenceId,trackerId); if(!before) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); const tracker=await this.repository.update(studentReferenceId,trackerId,input); if(before.deadlineAt?.getTime()!==tracker.deadlineAt?.getTime()){ await this.reminders?.cancel(before.id,before.version); await this.schedule(tracker); } return tracker; }
  async setChecklistItem(studentReferenceId:string,trackerId:string,itemId:string,completed:boolean,expectedVersion:number){ return this.repository.setChecklistItem(studentReferenceId,trackerId,itemId,completed,expectedVersion); }
  async archive(studentReferenceId:string,trackerId:string,expectedVersion:number){ const before=await this.repository.findById(studentReferenceId,trackerId); if(!before) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); const tracker=await this.repository.archive(studentReferenceId,trackerId,expectedVersion); await this.reminders?.cancel(before.id,before.version); return tracker; }
  async remove(studentReferenceId:string,trackerId:string){ const before=await this.repository.findById(studentReferenceId,trackerId); if(before) await this.reminders?.cancel(before.id,before.version); return this.repository.remove(studentReferenceId,trackerId); }
  private async schedule(tracker:any){ if(tracker.deadlineAt && this.reminders) await this.reminders.schedule({trackerId:tracker.id,trackerVersion:tracker.version,studentReferenceId:tracker.studentReferenceId,scholarshipId:tracker.scholarshipId,deadlineAt:tracker.deadlineAt}); }
}
