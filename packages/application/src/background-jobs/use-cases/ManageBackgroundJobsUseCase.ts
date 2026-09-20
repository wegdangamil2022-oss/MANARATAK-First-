import {
  BackgroundJob,
  BackgroundJobId,
  JobReference,
  JobOwnerReference,
  JobDefinition,
  JobParameters,
  JobPriority,
  JobScheduleMetadata,
  JobExecutionPolicy,
  JobRetryPolicy,
  JobMetadata,
  IBackgroundJobRepository,
  BackgroundJobSpecification
} from '@manaratak/domain';
import { IBackgroundJobExecutionGateway } from '../gateways/IBackgroundJobExecutionGateway';
import { CancelJobDto, EnqueueJobDto, EnsureRecurringJobDto, GetJobStatusDto } from '../dtos/BackgroundJobsDtos';
import { nextCronOccurrence, validateCronExpression } from '../services/CronScheduleCalculator';

export class ManageBackgroundJobsUseCase {
  constructor(
    private readonly jobRepository: IBackgroundJobRepository,
    private readonly executionGateway: IBackgroundJobExecutionGateway
  ) {}

  public async enqueueJob(dto: EnqueueJobDto): Promise<string> {
    this.validateSchedule(dto);
    const id = BackgroundJobId.generate();
    const reference = JobReference.generate();
    const job = this.buildJob(id, reference, dto);
    // CREATED is persisted before queue scheduling. Workers claim SCHEDULED only,
    // so a failed scheduling write cannot accidentally execute a half-created job.
    await this.jobRepository.save(job);
    await this.scheduleExecution(reference.getValue(), dto);
    return reference.getValue();
  }

  /**
   * Idempotent system-scheduler registration. A stable JobReference prevents
   * duplicate recurring jobs across process restarts and horizontally scaled API instances.
   */
  public async ensureRecurringJob(dto: EnsureRecurringJobDto): Promise<string> {
    validateCronExpression(dto.cronExpression);
    const reference = JobReference.from(dto.stableReference);
    const existing = await this.jobRepository.findBy(BackgroundJobSpecification.byReference(reference));
    if (existing.length > 0) {
      // Repair the only safe partial-registration state: the durable aggregate was
      // committed but scheduling failed before it became worker-visible.
      if (existing[0].getStatus() === 'CREATED') {
        const firstRunAt = nextCronOccurrence(dto.cronExpression, new Date());
        await this.executionGateway.scheduleRecurring(reference.getValue(), dto.cronExpression, firstRunAt);
      }
      return reference.getValue();
    }

    const id = BackgroundJobId.from(`system:${dto.stableReference}`);
    const job = this.buildJob(id, reference, dto);
    await this.jobRepository.save(job);
    const firstRunAt = nextCronOccurrence(dto.cronExpression, new Date());
    await this.executionGateway.scheduleRecurring(reference.getValue(), dto.cronExpression, firstRunAt);
    return reference.getValue();
  }

  public async cancelJob(dto: CancelJobDto): Promise<void> {
    const spec = BackgroundJobSpecification.byReference(JobReference.from(dto.jobReference));
    const jobs = await this.jobRepository.findBy(spec);
    if (jobs.length === 0) throw new Error('Job not found');
    const job = jobs[0];
    job.cancel();
    await this.jobRepository.save(job);
    await this.executionGateway.cancel(job.getReference().getValue());
  }

  public async getJobStatus(dto: GetJobStatusDto): Promise<string> {
    const spec = BackgroundJobSpecification.byReference(JobReference.from(dto.jobReference));
    const jobs = await this.jobRepository.findBy(spec);
    if (jobs.length === 0) throw new Error('Job not found');
    return jobs[0].getStatus();
  }

  private buildJob(id: BackgroundJobId, reference: JobReference, dto: EnqueueJobDto): BackgroundJob {
    const definition = JobDefinition.create(dto.jobType);
    const parameters = JobParameters.create(dto.parameters);
    const ownerReference = dto.ownerReference ? JobOwnerReference.from(dto.ownerReference) : undefined;
    const priority = JobPriority.create(dto.priority ?? 0);
    const schedule = dto.cronExpression
      ? JobScheduleMetadata.recurring(dto.cronExpression)
      : dto.runAt
        ? JobScheduleMetadata.scheduled(new Date(dto.runAt))
        : JobScheduleMetadata.immediate();
    const executionPolicy = JobExecutionPolicy.create(dto.timeoutSeconds, dto.concurrentLimits);
    const retryPolicy = JobRetryPolicy.create(dto.maxAttempts ?? 3, dto.backoffType ?? 'exponential');
    const metadata = JobMetadata.create(priority, schedule, executionPolicy, retryPolicy);
    return BackgroundJob.create(id, reference, definition, parameters, metadata, ownerReference);
  }

  private async scheduleExecution(jobReference: string, dto: EnqueueJobDto): Promise<void> {
    if (dto.cronExpression) {
      await this.executionGateway.scheduleRecurring(jobReference, dto.cronExpression, nextCronOccurrence(dto.cronExpression, new Date()));
      return;
    }
    if (dto.runAt) {
      const runAt = new Date(dto.runAt);
      if (runAt.getTime() > Date.now()) {
        await this.executionGateway.schedule(jobReference, runAt);
        return;
      }
    }
    await this.executionGateway.enqueue(jobReference, dto.parameters, dto.priority ?? 0);
  }

  private validateSchedule(dto: EnqueueJobDto): void {
    if (dto.cronExpression && dto.runAt) throw new Error('BACKGROUND_JOB_SCHEDULE_CONFLICT');
    if (dto.cronExpression) validateCronExpression(dto.cronExpression);
    if (dto.runAt && Number.isNaN(new Date(dto.runAt).getTime())) throw new Error('BACKGROUND_JOB_RUN_AT_INVALID');
  }
}
