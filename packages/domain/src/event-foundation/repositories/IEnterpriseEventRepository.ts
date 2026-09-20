import { EnterpriseEvent } from '../aggregates/EnterpriseEvent';
import { ISpecification } from '@manaratak/core';

export interface IEnterpriseEventRepository {
  save(event: EnterpriseEvent): Promise<void>;
  findBy(specification: ISpecification<EnterpriseEvent>): Promise<EnterpriseEvent[]>;
}
