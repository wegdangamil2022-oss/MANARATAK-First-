import { BackgroundJob } from '../aggregates/BackgroundJob';
import { JobReference } from '../value-objects/JobReference';
import { BackgroundJobStatus } from '../enums/BackgroundJobStatus';
import { ISpecification } from '@manaratak/core';
import { JobOwnerReference } from '../value-objects/JobOwnerReference';

export class BackgroundJobSpecification implements ISpecification<BackgroundJob> {
  private constructor(
    private readonly reference?: JobReference,
    private readonly ownerReference?: JobOwnerReference,
    private readonly status?: BackgroundJobStatus
  ) {}

  public static byReference(reference: JobReference): BackgroundJobSpecification {
    return new BackgroundJobSpecification(reference);
  }

  public static byOwnerReference(ownerReference: JobOwnerReference): BackgroundJobSpecification {
    return new BackgroundJobSpecification(undefined, ownerReference);
  }

  public static byStatus(status: BackgroundJobStatus): BackgroundJobSpecification {
    return new BackgroundJobSpecification(undefined, undefined, status);
  }

  public getReference(): JobReference | undefined { return this.reference; }
  public getOwnerReference(): JobOwnerReference | undefined { return this.ownerReference; }
  public getStatus(): BackgroundJobStatus | undefined { return this.status; }

  public isSatisfiedBy(job: BackgroundJob): boolean {
    if (this.reference && !job.getReference().equals(this.reference)) return false;
    if (this.ownerReference) {
      const jobOwner = job.getOwnerReference();
      if (!jobOwner || !jobOwner.equals(this.ownerReference)) return false;
    }
    if (this.status && job.getStatus() !== this.status) return false;
    return true;
  }
}
