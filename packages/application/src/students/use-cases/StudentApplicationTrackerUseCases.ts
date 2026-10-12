import {
  CreateStudentApplicationTrackerDto, IStudentApplicationScholarshipGateway,
  IStudentApplicationTrackerRepository, UpdateStudentApplicationTrackerDto,
} from '@manaratak/domain';

/** Reminder intents are now exclusively driven by the tracker's transactional P15 outbox. */
export class StudentApplicationTrackerUseCases {
  constructor(private readonly repository:IStudentApplicationTrackerRepository,
    private readonly scholarships:IStudentApplicationScholarshipGateway) {}
  private reconciliationCursor: string | undefined;
  async create(input:Omit<CreateStudentApplicationTrackerDto,'deadlineAt'> & {deadlineAt?:Date|null}){
    const owner=await this.scholarships.resolve(input.scholarshipId);
    if(!owner)throw new Error('SCHOLARSHIP_NOT_FOUND');
    if(!owner.available)throw new Error('SCHOLARSHIP_NOT_AVAILABLE');
    const tracker=await this.repository.create({...input,
      scholarshipId: owner.id,
      scholarshipSlug: owner.slug??null,
      deadlineAt: owner.deadlineAt??null});
    return {...tracker,owner};
  }
  async listSupportPage(studentReferenceId:string,input:{limit?:number;cursor?:string}){
    if(!studentReferenceId.trim())throw new Error('STUDENT_REFERENCE_REQUIRED');
    return this.repository.listSupportPage(studentReferenceId,input);
  }
  /** P15-only, read-only and privacy-minimal tracker change history. */
  async listSupportHistory(studentReferenceId:string,trackerId:string,limit=20,cursor?:string){
    if(!studentReferenceId.trim()||!trackerId.trim())throw new Error('STUDENT_REFERENCE_REQUIRED');
    return this.repository.listSupportHistory(studentReferenceId,trackerId,limit,cursor);
  }
  async list(studentReferenceId:string){
    const items=await this.repository.list(studentReferenceId);
    return Promise.all(items.map(async (tracker) => {
        let owner;
        try {
          owner = await this.scholarships.resolve(tracker.scholarshipId)} catch {
          owner = null;
        }
        return {
          ...tracker,
          snapshotDeadlineAt: tracker.deadlineAt,
          deadlineAt: owner?.available ? (owner.deadlineAt ?? null) : null,
          scholarshipSlug: owner?.available ? (owner.slug ?? null) : null,
          owner,
          reconciliationState:
            (tracker.deadlineAt?.toISOString() ?? null) ===
            (owner?.available ? (owner.deadlineAt?.toISOString() ?? null) : null)
              ? 'CURRENT'
              : 'PENDING_OWNER_PULL',
          applicationMode: 'MANUAL_PLANNING' as const,
          eligibilityState: 'UNKNOWN' as const,
          ownerState: owner ? (owner.available ? 'AVAILABLE' : 'HISTORY_ONLY') : 'UNAVAILABLE',
          cycleSupport: 'SINGLE_OWNER_TRACKER_CYCLE_MODEL_PENDING' as const,
        };
      }));
  }
  /** Full catalog pass repeats at EOF/restart. Failed/CAS-conflicting rows retry next pass. */
  async reconcileOwnerPage() {
    if (!this.repository.listOwnerReconciliationPage || !this.repository.reconcileOwnerFacts)
      throw new Error('STUDENT_OWNER_RECONCILIATION_NOT_INTEGRATED');
    const page = await this.repository.listOwnerReconciliationPage(this.reconciliationCursor, 50);
    let changed = 0,
      failed = 0;
    for (const tracker of page.items) {
      try {
        const owner = await this.scholarships.resolve(tracker.scholarshipId);
        if (owner && owner.id !== tracker.scholarshipId)
          throw new Error('STUDENT_TRACKER_OWNER_ALIAS_REVIEW_REQUIRED');
        if (
          await this.repository.reconcileOwnerFacts(
            tracker.studentReferenceId,
            tracker.id,
            tracker.version,
            {
              scholarshipId: tracker.scholarshipId,
              slug: owner?.available ? (owner.slug ?? null) : null,
              deadlineAt: owner?.available ? (owner.deadlineAt ?? null) : null,
            },
          ))
          ++changed;
      } catch {
        ++failed;
      }
    }
    this.reconciliationCursor = page.nextCursor ?? undefined;
    return { scanned: page.items.length, changed, failed, hasMore: Boolean(page.nextCursor) };
  }
  async update(studentReferenceId:string,trackerId:string,input:UpdateStudentApplicationTrackerDto){
    if (input.deadlineAt !== undefined)
      throw new Error('STUDENT_OFFICIAL_DEADLINE_OWNER_CONTROLLED');
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
