import { Configuration } from '@manaratak/domain';

/**
 * Interface for communicating with physical configuration infrastructure.
 * Responsible for physical resolution, loading, and distribution.
 */
export interface IConfigurationResolutionGateway {
  /**
   * Synchronizes the logical configuration intent with physical configuration resolution systems.
   */
  synchronize(config: Configuration): Promise<void>;

  /**
   * Decommissions logical configuration from physical resolution infrastructure.
   */
  decommission(config: Configuration): Promise<void>;
}
