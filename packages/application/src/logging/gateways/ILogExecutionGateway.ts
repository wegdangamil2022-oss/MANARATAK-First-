import { LogEntry } from '@manaratak/domain';

/**
 * Interface for communicating with physical logging infrastructure.
 * As per ADR-5 and ADR-6, this gateway isolates the realization of logging intent.
 */
export interface ILogExecutionGateway {
  /**
   * Synchronizes the logical log definition with the physical logging system (e.g. configuring filters or templates).
   */
  synchronize(logEntry: LogEntry): Promise<void>;

  /**
   * Disables logical association in physical infrastructure.
   */
  decommission(logEntry: LogEntry): Promise<void>;
}
