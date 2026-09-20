import { BackgroundJob, IBackgroundJobRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export class InMemoryBackgroundJobRepository implements IBackgroundJobRepository {
  private readonly jobs = new Map<string, BackgroundJob>();

  public async save(job: BackgroundJob): Promise<void> {
    this.jobs.set(job.getReference().getValue(), job);
  }

  public async findBy(specification: ISpecification<BackgroundJob>): Promise<BackgroundJob[]> {
    const results: BackgroundJob[] = [];
    for (const job of this.jobs.values()) {
      if (specification.isSatisfiedBy(job)) {
        results.push(job);
      }
    }
    return results;
  }

  public clear(): void {
    this.jobs.clear();
  }
}
