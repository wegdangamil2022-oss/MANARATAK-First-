import { ApiService } from '../aggregates/ApiService';
import { ISpecification } from '@manaratak/core';

export interface IApiServiceRepository {
  save(apiService: ApiService): Promise<void>;
  findBy(specification: ISpecification<ApiService>): Promise<ApiService[]>;
}
