import {
  CreateStudentApplicationTrackerDto,
  IStudentApplicationReminderGateway,
  IStudentApplicationScholarshipGateway,
  IStudentApplicationTrackerRepository,
  UpdateStudentApplicationTrackerDto,
} from '@manaratak/domain';

/**
 * P15 owns tracker mutations. Notification delivery is a separate owner domain.
 * Until durable reminder intents are transactionally emitted, a delivery outage
 * must not make a successfully committed tracker update look rolled back.
 */
export class StudentApplicationTrackerUseCases {
  constructor(
    private readonly repository: IStudentApplicationTrackerRepository,
    private readonly scholarships: IStudentApplicationScholarshipGateway,
    private readonly reminders?: IStudentApplicationReminderGateway,
  ) {}

  async create(input: Omit<CreateStudentApplicationTrackerDto,'deadlineAt'> & {deadlineAt?:Date|null}) {
    const owner = await this.scholarships.resolve(input.scholarshipId);
    if (!owner) throw new Error('SCHOLARSHIP_NOT_FOUND');
    if (!owner.available) throw new Error('SCHOLARSHIP_NOT_AVAILABLE');
    const tracker = await this.repository.create({
      ...input, scholarshipSlug: input.scholarshipSlug ?? owner.slug ?? null,
      deadlineAt: input.deadlineAt ?? owner.deadlineAt ?? null,
    });
    await this.tryReminder(() => this.schedule(tracker));
    return { ...tracker, owner };
  }

  /** The support projection remains P15-owned and excludes notes, documents and checklist. */
  async listSupportPage(studentReferenceId: string, input: {limit?:number;cursor?:string}) {
    if (!studentReferenceId.trim()) throw new Error('STUDENT_REFERENCE_REQUIRED');
    return this.repository.listSupportPage(studentReferenceId, input);
  }

  async list(studentReferenceId: string) {
    const items = await this.repository.list(studentReferenceId);
    return Promise.all(items.map(async tracker => ({
      ...tracker, owner: await this.scholarships.resolve(tracker.scholarshipId),
    })));
  }

  async update(studentReferenceId: string, trackerId: string, input: UpdateStudentApplicationTrackerDto) {
    const before = await this.repository.findById(studentReferenceId, trackerId);
    if (!before) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
    const tracker = await this.repository.update(studentReferenceId, trackerId, input);
    // Reminder ids contain the tracker version. A non-deadline edit also advances
    // that version, so the previous intent must not remain active after archival.
    await this.tryReminder(async () => {
      await this.schedule(tracker);
      await this.reminders?.cancel(before.id, before.version);
    });
    return tracker;
  }

  async setChecklistItem(studentReferenceId: string, trackerId: string, itemId: string, completed: boolean, expectedVersion: number) {
    return this.repository.setChecklistItem(studentReferenceId, trackerId, itemId, completed, expectedVersion);
  }

  async archive(studentReferenceId: string, trackerId: string, expectedVersion: number) {
    const before = await this.repository.findById(studentReferenceId, trackerId);
    if (!before) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
    const tracker = await this.repository.archive(studentReferenceId, trackerId, expectedVersion);
    await this.tryReminder(() => this.reminders?.cancel(before.id, before.version));
    return tracker;
  }

  async remove(studentReferenceId: string, trackerId: string) {
    const before = await this.repository.findById(studentReferenceId, trackerId);
    // Do not cancel a real reminder before the owner confirms the delete succeeded.
    await this.repository.remove(studentReferenceId, trackerId);
    if (before) await this.tryReminder(() => this.reminders?.cancel(before.id, before.version));
  }

  private async schedule(tracker: {id:string;version:number;studentReferenceId:string;scholarshipId:string;deadlineAt?:Date|null}) {
    if (tracker.deadlineAt && this.reminders) {
      await this.reminders.schedule({
        trackerId: tracker.id, trackerVersion: tracker.version,
        studentReferenceId: tracker.studentReferenceId, scholarshipId: tracker.scholarshipId,
        deadlineAt: tracker.deadlineAt,
      });
    }
  }

  private async tryReminder(delivery: () => Promise<unknown> | undefined): Promise<void> {
    try { await delivery(); }
    catch {
      // Safe, content-free operational signal. Still NOT a durable retry solution.
      console.warn('STUDENT_APPLICATION_REMINDER_RECONCILIATION_PENDING');
    }
  }
}
