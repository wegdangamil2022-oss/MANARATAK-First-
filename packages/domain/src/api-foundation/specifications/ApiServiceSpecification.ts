import { ApiService } from '../aggregates/ApiService';
import { ISpecification } from '@manaratak/core';

export class ApiServiceSpecification implements ISpecification<ApiService> {
  constructor(
    private readonly criteria: {
      reference?: string;
      ownerReference?: string;
      lifecycleState?: string;
    }
  ) {}

  public isSatisfiedBy(apiService: ApiService): boolean {
    if (this.criteria.reference && apiService.getReference().getValue() !== this.criteria.reference) {
      return false;
    }
    if (this.criteria.ownerReference && apiService.getOwnerReference().getValue() !== this.criteria.ownerReference) {
      return false;
    }
    if (this.criteria.lifecycleState && apiService.getLifecycleState() !== this.criteria.lifecycleState) {
      return false;
    }
    return true;
  }
}
