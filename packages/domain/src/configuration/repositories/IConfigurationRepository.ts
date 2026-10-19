import { Configuration } from '../aggregates/Configuration';
import { ISpecification } from '@absheer/core';

export interface IConfigurationRepository {
  save(config: Configuration): Promise<void>;
  findBy(specification: ISpecification<Configuration>): Promise<Configuration[]>;
}
