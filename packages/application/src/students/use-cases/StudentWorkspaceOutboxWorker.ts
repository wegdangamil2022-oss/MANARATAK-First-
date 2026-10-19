import { StudentApplicationTrackerUseCases } from './StudentApplicationTrackerUseCases';
import { ITransactionalOutboxDispatcher, OutboxDispatchResult } from '@absheer/domain';
import { StudentWorkspaceUseCases } from './StudentWorkspaceUseCases';

export interface StudentWorkspaceOutboxWorkerOptions {
  batchSize?: number;
  claimDurationMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

export class StudentWorkspaceOutboxWorker {
  public constructor(
    private readonly dispatcher: ITransactionalOutboxDispatcher,
    private readonly options: StudentWorkspaceOutboxWorkerOptions = {},
    private readonly workspaceRecovery?: StudentWorkspaceUseCases,
    private readonly reminderDispatcher?: ITransactionalOutboxDispatcher,
    private readonly trackerOwners?: StudentApplicationTrackerUseCases,
  ) {}

  public async runIdentityOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'IDENTITY', ['IdentityStatusChanged.v1']);
  }

  public async runRoleOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'AUTHORIZATION', ['RoleAssignmentCreated', 'RoleAssignmentRevoked']);
  }

  public async runLearningOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'COURSES', ['CourseEnrolled', 'CourseProgressUpdated', 'CourseCompleted']);
  }

  /** Lifecycle events only: certificate render jobs remain owned by the P14 artifact worker. */
  public async runCertificatesOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'CERTIFICATES', ['CertificateIssued', 'CertificateRevoked', 'CertificateReissued', 'CertificateRenewed', 'CertificateExpired', 'CertificateArtifactsRendered', 'CertificateArchived']);
  }

  /** P15 durable owner-catchup continuation, bounded per run. */
  public async runCatchupOnce(workerId:string):Promise<OutboxDispatchResult>{
    return this.run(workerId,'STUDENT_WORKSPACE_CATCHUP',
      ['StudentOwnerCatchupContinuationRequested']);
  }

  public async runTrackerOwnersOnce(workerId: string) {
    if (!workerId.trim()) throw new Error('STUDENT_OWNER_RECONCILIATION_WORKER_REQUIRED');
    if (!this.trackerOwners) throw new Error('STUDENT_OWNER_RECONCILIATION_NOT_INTEGRATED');
    const result = await this.trackerOwners.reconcileOwnerPage();
    if (result.failed) throw new Error('STUDENT_OWNER_RECONCILIATION_PARTIAL');
    return result;
  }

  public async runRemindersOnce(workerId:string):Promise<OutboxDispatchResult>{
    if(!workerId.trim())throw new Error('STUDENT_REMINDER_WORKER_ID_REQUIRED');
    if(!this.reminderDispatcher)return {claimed:0,processed:0,failed:0,exhausted:0,leaseLost:0};
    return this.reminderDispatcher.dispatchBatch({
      workerId:workerId.trim(),domain:'STUDENT_APPLICATIONS',
      eventTypes:['StudentApplicationReminderReconcileRequested'],
      batchSize:this.options.batchSize??50,claimDurationMs:this.options.claimDurationMs??60_000,
      maxAttempts:this.options.maxAttempts??8,baseBackoffMs:this.options.baseBackoffMs??1_000,
      maxBackoffMs:this.options.maxBackoffMs??120_000,
    });
  }

  public async runReplayOnce(workerId: string): Promise<{processed:number;failed:number}> {
    if (!workerId.trim()) throw new Error('STUDENT_WORKSPACE_REPLAY_WORKER_ID_REQUIRED');
    if (!this.workspaceRecovery) return {processed:0,failed:0};
    return this.workspaceRecovery.replayParkedEvents(Math.min(25, this.options.batchSize ?? 25));
  }

  private run(workerId: string, domain: string, eventTypes: readonly string[]): Promise<OutboxDispatchResult> {
    if (!workerId.trim()) throw new Error('STUDENT_WORKSPACE_OUTBOX_WORKER_ID_REQUIRED');
    return this.dispatcher.dispatchBatch({
      workerId: workerId.trim(), domain, eventTypes,
      batchSize: this.options.batchSize ?? 50,
      claimDurationMs: this.options.claimDurationMs ?? 60_000,
      maxAttempts: this.options.maxAttempts ?? 8,
      baseBackoffMs: this.options.baseBackoffMs ?? 1_000,
      maxBackoffMs: this.options.maxBackoffMs ?? 120_000,
    });
  }
}
