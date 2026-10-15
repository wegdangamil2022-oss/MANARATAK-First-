import type {
  IStudentApplicationScholarshipGateway,
  IIdentityRepository, IRoleAssignmentRepository, IStudentApplicationTrackerRepository,
  INotificationDeliveryEligibilityPolicy, NotificationDeliveryCandidate,
} from '@manaratak/domain';

/** P15 authorizes its reminder immediately before P23 delivery, using current owner facts. */
export class StudentApplicationReminderDeliveryPolicy implements INotificationDeliveryEligibilityPolicy {
  constructor(private readonly trackers:IStudentApplicationTrackerRepository,
    private readonly identities:IIdentityRepository,private readonly roles:IRoleAssignmentRepository,
    private readonly scholarships?: IStudentApplicationScholarshipGateway,
  ) {}
  async isEligible(candidate:NotificationDeliveryCandidate):Promise<boolean> {
    if(candidate.templateId!=='student-application-deadline-v1')return true;
    const {trackerId,trackerVersion,scholarshipId,deadlineAt}=candidate.variables;
    const version=Number(trackerVersion);
    if(!trackerId||!trackerVersion||!Number.isSafeInteger(version)||version<1||
      String(version)!==trackerVersion||candidate.id!==`student-application-deadline-${trackerId}-v${version}`)
      return false;
    const tracker=await this.trackers.findById(candidate.recipientReference,trackerId);
    if(!tracker||tracker.cycleReferenceId === 'LEGACY'||!tracker.deadlineAt||!deadlineAt||tracker.studentReferenceId!==candidate.recipientReference||tracker.status!=='ACTIVE'||
      tracker.version!==version||tracker.scholarshipId!==scholarshipId||
      tracker.deadlineAt?.toISOString()!==deadlineAt||tracker.deadlineAt.getTime()<=Date.now())return false;
    if (!this.scholarships) throw new Error('STUDENT_REMINDER_SCHOLARSHIP_READER_REQUIRED');
    const owner = await this.scholarships.resolve(tracker.scholarshipId, tracker.cycleReferenceId && tracker.cycleReferenceId !== 'LEGACY' ? tracker.cycleReferenceId : undefined);
    if (
      !owner?.available ||
      owner.id !== tracker.scholarshipId ||
      owner.deadlineAt?.toISOString() !== deadlineAt
    )
      return false;
    const identity=await this.identities.findById(candidate.recipientReference);
    if(identity?.type!=='Human'||identity.status!=='ACTIVE')return false;
    const assignments=await this.roles.findByIdentityId(candidate.recipientReference);
    return assignments.some((role) =>role.roleId==='student');
  }
}
