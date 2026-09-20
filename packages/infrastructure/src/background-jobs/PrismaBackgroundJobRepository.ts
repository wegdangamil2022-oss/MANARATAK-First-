import type { PrismaClient } from '@prisma/client';
import { ISpecification } from '@manaratak/core';
import {
  BackgroundJob,
  BackgroundJobId,
  BackgroundJobSpecification,
  BackgroundJobStatus,
  IBackgroundJobRepository,
  JobDefinition,
  JobExecutionPolicy,
  JobMetadata,
  JobOwnerReference,
  JobParameters,
  JobPriority,
  JobReference,
  JobRetryPolicy,
  JobScheduleMetadata,
} from '@manaratak/domain';

export class PrismaBackgroundJobRepository implements IBackgroundJobRepository {
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE';
  public readonly persistenceClassification = 'DURABLE';

  public constructor(private readonly prisma: PrismaClient) {}

  public async save(job: BackgroundJob): Promise<void> {
    const metadata = job.getMetadata();
    const schedule = metadata.getSchedule();
    const execution = metadata.getExecutionPolicy();
    const retry = metadata.getRetryPolicy();
    const create = {
      id: job.getId().getValue(),
      reference: job.getReference().getValue(),
      jobType: job.getDefinition().getType(),
      parameters: job.getParameters().getPayload(),
      ownerReference: job.getOwnerReference()?.getValue() ?? null,
      priority: metadata.getPriority().getLevel(),
      runAt: schedule.getRunAt() ?? null,
      cronExpression: schedule.getCronExpression() ?? null,
      timeoutSeconds: execution.getTimeoutSeconds() ?? 300,
      concurrentLimit: execution.getConcurrentLimits() ?? null,
      maxAttempts: Math.max(1, retry.getMaxAttempts() || 1),
      backoffType: retry.getBackoffType() || 'exponential',
      status: job.getStatus(),
      availableAt: schedule.getRunAt() ?? new Date(),
      createdAt: job.getCreatedAt(),
    };
    await this.delegate().upsert({
      where: { reference: job.getReference().getValue() },
      create,
      update: {
        jobType: create.jobType,
        parameters: create.parameters,
        ownerReference: create.ownerReference,
        priority: create.priority,
        runAt: create.runAt,
        cronExpression: create.cronExpression,
        timeoutSeconds: create.timeoutSeconds,
        concurrentLimit: create.concurrentLimit,
        maxAttempts: create.maxAttempts,
        backoffType: create.backoffType,
        status: create.status,
        ...(create.status === BackgroundJobStatus.CANCELLED ? {
          cancelledAt: new Date(), leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null,
        } : {}),
      },
    });
  }

  public async findBy(specification: ISpecification<BackgroundJob>): Promise<BackgroundJob[]> {
    const where: Record<string, unknown> = {};
    if (specification instanceof BackgroundJobSpecification) {
      const reference = specification.getReference();
      const owner = specification.getOwnerReference();
      const status = specification.getStatus();
      if (reference) where.reference = reference.getValue();
      if (owner) where.ownerReference = owner.getValue();
      if (status) where.status = status;
    }
    const rows = await this.delegate().findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map((row: any) => this.toDomain(row)).filter((job: BackgroundJob) => specification.isSatisfiedBy(job));
  }

  private delegate(): any {
    const delegate = (this.prisma as any).backgroundJobRecord;
    if (!delegate) throw new Error('BACKGROUND_JOB_PERSISTENCE_NOT_MIGRATED');
    return delegate;
  }

  private toDomain(row: any): BackgroundJob {
    const schedule = row.cronExpression
      ? JobScheduleMetadata.recurring(row.cronExpression)
      : row.runAt
        ? JobScheduleMetadata.scheduled(new Date(row.runAt))
        : JobScheduleMetadata.immediate();
    const status = Object.values(BackgroundJobStatus).includes(row.status as BackgroundJobStatus)
      ? row.status as BackgroundJobStatus
      : BackgroundJobStatus.FAILED;
    return BackgroundJob.restore(
      BackgroundJobId.from(row.id),
      JobReference.from(row.reference),
      JobDefinition.create(row.jobType),
      JobParameters.create((row.parameters ?? {}) as Record<string, unknown>),
      JobMetadata.create(
        JobPriority.create(Number(row.priority ?? 0)),
        schedule,
        JobExecutionPolicy.create(row.timeoutSeconds ?? undefined, row.concurrentLimit ?? undefined),
        JobRetryPolicy.create(Number(row.maxAttempts ?? 1), String(row.backoffType ?? 'exponential')),
      ),
      { status, createdAt: new Date(row.createdAt) },
      row.ownerReference ? JobOwnerReference.from(row.ownerReference) : undefined,
    );
  }
}
