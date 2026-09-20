import { EnterpriseEvent } from '@manaratak/domain';

export interface IEventPublishingGateway {
  publish(event: EnterpriseEvent): Promise<void>;
}
