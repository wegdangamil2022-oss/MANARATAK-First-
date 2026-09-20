import { Configuration } from '../aggregates/Configuration';
import { ISpecification } from '@manaratak/core';

export interface IConfigurationRepository {
  save(config: Configuration): Promise<void>;
  findBy(specification: ISpecification<Configuration>): Promise<Configuration[]>;
}
