import {
  IOutboxDeliveryGateway, OutboxDeliveryContext, TransactionalOutboxEntry,
  IStudentApplicationReminderGateway, IStudentApplicationTrackerRepository,
} from '@manaratak/domain';

/** Retryable P15 owner fact -> versioned notification intent. Never trusts event status alone. */
export class StudentApplicationReminderOutboxDeliveryGateway implements IOutboxDeliveryGateway {
  constructor(
    private readonly reminders:IStudentApplicationReminderGateway,
    private readonly trackers:IStudentApplicationTrackerRepository,
  ) {}

  async deliver(entry:TransactionalOutboxEntry,context:OutboxDeliveryContext):Promise<void>{
    if(context.idempotencyKey!==entry.id)throw new Error('STUDENT_REMINDER_IDEMPOTENCY_KEY_MISMATCH');
    if(entry.domain!=='STUDENT_APPLICATIONS' ||
       entry.eventType!=='StudentApplicationReminderReconcileRequested' ||
       entry.metadata?.sourcePhase!=='Phase15' || entry.metadata?.schemaVersion!=='1.0' ||
       entry.aggregate?.aggregateType!=='StudentApplicationTracker')
      throw new Error('STUDENT_REMINDER_EVENT_SOURCE_INVALID');
    const data=entry.payload;
    const {trackerId,studentReferenceId,scholarshipId,trackerVersion,previousVersion,status,deadlineAt}=data;
    if(typeof trackerId!=='string'||!trackerId||trackerId!==entry.aggregate.aggregateId||
       typeof studentReferenceId!=='string'||!studentReferenceId||
       typeof scholarshipId!=='string'||!scholarshipId||
       typeof trackerVersion!=='number'||!Number.isSafeInteger(trackerVersion)||trackerVersion<1||
       (previousVersion!==null && (typeof previousVersion!=='number'||!Number.isSafeInteger(previousVersion)||previousVersion<1))||
       !['ACTIVE','ARCHIVED','DELETED'].includes(String(status)) ||
       !(deadlineAt===null || typeof deadlineAt==='string'))
      throw new Error('STUDENT_REMINDER_EVENT_PAYLOAD_INVALID');

    const current=await this.trackers.findById(studentReferenceId,trackerId);
    if(current && current.scholarshipId!==scholarshipId)throw new Error('STUDENT_REMINDER_OWNER_MISMATCH');

    // Repeatable cancellation is safe; replaying a stale event cannot create a new reminder.
    if(previousVersion!==null && previousVersion!==trackerVersion)
      await this.reminders.cancel(trackerId,previousVersion);
    if(!current||current.status!=='ACTIVE'||current.version!==trackerVersion){
      await this.reminders.cancel(trackerId,trackerVersion);
      return;
    }
    const actualDeadline=current.deadlineAt?.toISOString()??null;
    if(deadlineAt!==actualDeadline)throw new Error('STUDENT_REMINDER_EVENT_STALE_DEADLINE');
    if(actualDeadline){
      await this.reminders.schedule({
        trackerId,trackerVersion,studentReferenceId,scholarshipId,deadlineAt:current.deadlineAt!,
      });
      // Protect an out-of-order worker race: a tracker edit may commit between
      // the version check above and notification intent persistence. The newer
      // owner version must not leave this older intent scheduled.
      const afterSchedule=await this.trackers.findById(studentReferenceId,trackerId);
      if(!afterSchedule || afterSchedule.status!=='ACTIVE' ||
        afterSchedule.version!==trackerVersion ||
        afterSchedule.scholarshipId!==scholarshipId ||
        (afterSchedule.deadlineAt?.toISOString()??null)!==actualDeadline)
        await this.reminders.cancel(trackerId,trackerVersion);
    } else await this.reminders.cancel(trackerId,trackerVersion);
  }
}
