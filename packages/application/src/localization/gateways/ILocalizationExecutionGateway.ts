import { Localization } from '@manaratak/domain';

/**
 * Interface for communicating with physical localization execution infrastructure.
 * Responsible for translation execution, language detection negotiation, and content distribution.
 */
export interface ILocalizationExecutionGateway {
  /**
   * Synchronizes the logical localization definition with physical translation systems.
   */
  synchronize(localization: Localization): Promise<void>;

  /**
   * Decommissions logical localization from physical distribution infrastructure.
   */
  decommission(localization: Localization): Promise<void>;
}
