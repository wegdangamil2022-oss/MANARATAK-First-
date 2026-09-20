import { IEventPublishingGateway } from '@manaratak/application';
import { EnterpriseEvent } from '@manaratak/domain';

export type EnterpriseEventListener = (event: EnterpriseEvent) => Promise<void> | void;

export class InMemoryEventPublishingGateway implements IEventPublishingGateway {
  public readonly persistenceClassification = 'DEVELOPMENT_ONLY' as const;
  private readonly listeners: EnterpriseEventListener[] = [];
  private readonly publishedEvents: EnterpriseEvent[] = [];

  public registerListener(listener: EnterpriseEventListener): void {
    this.listeners.push(listener);
  }

  public async publish(event: EnterpriseEvent): Promise<void> {
    this.publishedEvents.push(event);
    for (const listener of this.listeners) {
      await listener(event); // Executed synchronously. Error will propagate up.
    }
  }

  public getPublishedEvents(): EnterpriseEvent[] {
    return [...this.publishedEvents];
  }

  public clear(): void {
    this.listeners.length = 0;
    this.publishedEvents.length = 0;
  }
}
