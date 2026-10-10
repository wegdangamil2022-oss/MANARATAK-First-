import { ITransactionalOutboxDispatcher, OutboxDispatchResult } from '@manaratak/domain';

export interface CertificateCompletionOutboxWorkerOptions {
  batchSize?: number;
  claimDurationMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

/**
 * Source-wired worker protocol for P13 completion delivery into P14. Runtime
 * scheduling is opt-in at the API bootstrap boundary; DB proof remains pending.
 */
export class CertificateCompletionOutboxWorker {
  constructor(
    private readonly dispatcher: ITransactionalOutboxDispatcher,
    private readonly options: CertificateCompletionOutboxWorkerOptions = {},
    private readonly maintenance?: {expireDue(asOf:Date,actor:string):Promise<number>},
    private readonly artifactDispatcher?: ITransactionalOutboxDispatcher,
  ) {}

  public async runOnce(workerId: string): Promise<OutboxDispatchResult> {
    if (!workerId.trim()) throw new Error('CERTIFICATE_COMPLETION_WORKER_ID_REQUIRED');
    const dispatched = await this.dispatcher.dispatchBatch({
      workerId: workerId.trim(),
      batchSize: this.options.batchSize ?? 25,
      claimDurationMs: this.options.claimDurationMs ?? 30_000,
      maxAttempts: this.options.maxAttempts ?? 8,
      baseBackoffMs: this.options.baseBackoffMs ?? 1_000,
      maxBackoffMs: this.options.maxBackoffMs ?? 60_000,
      domain: 'COURSES',
      eventTypes: ['CourseCompleted', 'LearningPathCompleted'],
    });
    if (this.maintenance) await this.maintenance.expireDue(new Date(), workerId);
    if(!this.artifactDispatcher) return dispatched;
    const artifacts=await this.artifactDispatcher.dispatchBatch({workerId:workerId.trim()+':artifacts',batchSize:this.options.batchSize??25,claimDurationMs:this.options.claimDurationMs??30000,maxAttempts:this.options.maxAttempts??8,baseBackoffMs:this.options.baseBackoffMs??1000,maxBackoffMs:this.options.maxBackoffMs??60000,domain:'CERTIFICATES',eventTypes:['CertificateRenderRequested']});
    return {claimed:dispatched.claimed+artifacts.claimed,processed:dispatched.processed+artifacts.processed,failed:dispatched.failed+artifacts.failed,exhausted:dispatched.exhausted+artifacts.exhausted,leaseLost:(dispatched.leaseLost??0)+(artifacts.leaseLost??0)};
  }
}
