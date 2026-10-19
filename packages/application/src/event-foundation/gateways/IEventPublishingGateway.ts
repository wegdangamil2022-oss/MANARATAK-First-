import { EnterpriseEvent } from '@absheer/domain';

export interface IEventPublishingGateway {
  publish(event: EnterpriseEvent): Promise<void>;
}
