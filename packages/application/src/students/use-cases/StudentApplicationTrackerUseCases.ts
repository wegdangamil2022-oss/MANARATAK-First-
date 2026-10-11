import {
  CreateStudentApplicationTrackerDto, IStudentApplicationScholarshipGateway,
  IStudentApplicationTrackerRepository, UpdateStudentApplicationTrackerDto,
} from '@manaratak/domain';

/** Reminder intents are now exclusively driven by the tracker's transactional P15 outbox. */
export class StudentApplicationTrackerUseCases {
  constructor(private readonly repository:IStudentApplicationTrackerRepository,
    private readonly scholarships:IStudentApplicationScholarshipGateway) {}
  async create(input:Omit<CreateStudentApplicationTrackerDto,'deadlineAt'> & {deadlineAt?:Date|null}){
    const owner=await this.scholarships.resolve(input.scholarshipId);
    if(!owner)throw new Error('SCHOLARSHIP_NOT_FOUND');
    if(!owner.available)throw new Error('SCHOLARSHIP_NOT_AVAILABLE');
    const tracker=await this.repository.create({...input,scholarshipSlug:input.scholarshipSlug??owner.slug??null,
      deadlineAt:input.deadlineAt??owner.deadlineAt??null});
    return {...tracker,owner};
  }
  async listSupportPage(studentReferenceId:string,input:{limit?:number;cursor?:string}){
    if(!studentReferenceId.trim())throw new Error('STUDENT_REFERENCE_REQUIRED');
    return this.repository.listSupportPage(studentReferenceId,input);
  }
  /** P15-only, read-only and privacy-minimal tracker change history. */
  async listSupportHistory(studentReferenceId:string,trackerId:string,limit=20){
    if(!studentReferenceId.trim()||!trackerId.trim())throw new Error('STUDENT_REFERENCE_REQUIRED');
    return this.repository.listSupportHistory(studentReferenceId,trackerId,limit);
  }
  async list(studentReferenceId:string){
    const items=await this.repository.list(studentReferenceId);
    return Promise.all(items.map(async tracker=>({...tracker,owner:await this.scholarships.resolve(tracker.scholarshipId)})));
  }
  async update(studentReferenceId:string,trackerId:string,input:UpdateStudentApplicationTrackerDto){
    return this.repository.update(studentReferenceId,trackerId,input);
  }
  async setChecklistItem(studentReferenceId:string,trackerId:string,itemId:string,completed:boolean,expectedVersion:number){
    return this.repository.setChecklistItem(studentReferenceId,trackerId,itemId,completed,expectedVersion);
  }
  async archive(studentReferenceId:string,trackerId:string,expectedVersion:number){
    return this.repository.archive(studentReferenceId,trackerId,expectedVersion);
  }
  async remove(studentReferenceId:string,trackerId:string){return this.repository.remove(studentReferenceId,trackerId);}
}
