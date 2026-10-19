import { BackgroundJob } from '../aggregates/BackgroundJob';
import { ISpecification } from '@absheer/core';

export interface IBackgroundJobRepository {
  save(job: BackgroundJob): Promise<void>;
  findBy(specification: ISpecification<BackgroundJob>): Promise<BackgroundJob[]>;
}
