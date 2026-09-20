import { Integration } from '@manaratak/domain';

/**
 * Interface for communicating with physical integration execution infrastructure.
 * Responsible for physical transport, networking, and external communication orchestration.
 */
export interface IIntegrationExecutionGateway {
  /**
   * Synchronizes the logical integration definition with physical execution systems.
   */
  synchronize(integration: Integration): Promise<void>;

  /**
   * Decommissions logical integration from physical execution infrastructure.
   */
  decommission(integration: Integration): Promise<void>;
}
