import { ISpecification } from '@manaratak/core';
import { EnterpriseEvent } from '../aggregates/EnterpriseEvent';


export class EnterpriseEventSpecification implements ISpecification<EnterpriseEvent> {
  constructor(
    private readonly criteria: {
      reference?: string;
      ownerReference?: string;
      type?: string;
      lifecycleState?: string;
    }
  ) {}

  public getCriteria(): Readonly<{ reference?: string; ownerReference?: string; type?: string; lifecycleState?: string }> {
    return { ...this.criteria };
  }

  public isSatisfiedBy(event: EnterpriseEvent): boolean {
    if (this.criteria.reference && event.getReference().getValue() !== this.criteria.reference) {
      return false;
    }
    if (this.criteria.ownerReference && event.getOwnerReference().getValue() !== this.criteria.ownerReference) {
      return false;
    }
    if (this.criteria.type && event.getDefinition().getType() !== this.criteria.type) {
      return false;
    }
    if (this.criteria.lifecycleState && event.getLifecycleState() !== this.criteria.lifecycleState) {
      return false;
    }
    return true;
  }
}
