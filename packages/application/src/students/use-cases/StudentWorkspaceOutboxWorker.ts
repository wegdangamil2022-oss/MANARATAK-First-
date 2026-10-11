import { ITransactionalOutboxDispatcher, OutboxDispatchResult } from '@manaratak/domain';
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
  ) {}

  public async runIdentityOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'IDENTITY', ['IdentityStatusChanged.v1']);
  }

  public async runRoleOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'AUTHORIZATION', ['RoleAssignmentCreated']);
  }

  public async runLearningOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'COURSES', ['CourseEnrolled', 'CourseProgressUpdated', 'CourseCompleted']);
  }

  /** Lifecycle events only: certificate render jobs remain owned by the P14 artifact worker. */
  public async runCertificatesOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'CERTIFICATES', ['CertificateIssued', 'CertificateRevoked', 'CertificateReissued', 'CertificateRenewed', 'CertificateExpired', 'CertificateArtifactsRendered']);
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
