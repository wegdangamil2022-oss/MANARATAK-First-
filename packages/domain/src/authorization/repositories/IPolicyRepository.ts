import { Policy } from '../aggregates/Policy';
import { ISpecification } from '@manaratak/core';

export interface IPolicyRepository {
  findById(id: string): Promise<Policy | null>;
  save(policy: Policy): Promise<void>;
  findBy(specification: ISpecification<Policy>): Promise<Policy[]>;
  delete(id: string): Promise<void>;
}
