import { Monitor } from '@manaratak/domain';

/**
 * Interface for communicating with physical monitoring infrastructure.
 * As per ADR-4 and ADR-5, this gateway isolates the execution of monitoring intent.
 */
export interface IMonitoringExecutionGateway {
  /**
   * Synchronizes the logical monitor definition with the physical monitoring system.
   */
  synchronize(monitor: Monitor): Promise<void>;

  /**
   * Disables physical monitoring for the specified monitor.
   */
  decommission(monitor: Monitor): Promise<void>;
}
