import { EnterpriseEvent, IEnterpriseEventRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export class InMemoryEnterpriseEventRepository implements IEnterpriseEventRepository {
  public readonly persistenceClassification = 'DEVELOPMENT_ONLY' as const;
  private readonly events = new Map<string, EnterpriseEvent>();

  public async save(event: EnterpriseEvent): Promise<void> {
    this.events.set(event.getReference().getValue(), event);
  }

  public async findBy(specification: ISpecification<EnterpriseEvent>): Promise<EnterpriseEvent[]> {
    const results: EnterpriseEvent[] = [];
    for (const event of this.events.values()) {
      if (specification.isSatisfiedBy(event)) {
        results.push(event);
      }
    }
    return results;
  }

  public clear(): void {
    this.events.clear();
  }
}
