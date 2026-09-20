import { Configuration } from '../aggregates/Configuration';
import { ISpecification } from '@manaratak/core';

export class ConfigurationReferenceSpecification implements ISpecification<Configuration> {
  constructor(private readonly referenceValue: string) {}
  public isSatisfiedBy(candidate: Configuration): boolean {
    return candidate.getReference().getValue() === this.referenceValue;
  }
}

export class ConfigurationOwnerSpecification implements ISpecification<Configuration> {
  constructor(private readonly ownerReferenceValue: string) {}
  public isSatisfiedBy(candidate: Configuration): boolean {
    return candidate.getOwnerReference().getValue() === this.ownerReferenceValue;
  }
}
