import { BackgroundJob } from '../aggregates/BackgroundJob';
import { ISpecification } from '@manaratak/core';

export interface IBackgroundJobRepository {
  save(job: BackgroundJob): Promise<void>;
  findBy(specification: ISpecification<BackgroundJob>): Promise<BackgroundJob[]>;
}
