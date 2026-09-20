import { SecurityPolicy } from '@manaratak/domain';

/**
 * Interface for communicating with physical security infrastructure.
 * As per ADR-5, this gateway isolates the physical enforcement of security intent.
 */
export interface ISecurityEnforcementGateway {
  /**
   * Synchronizes the logical security policy with the physical enforcement engine (e.g. IAM, firewall, encryption engine).
   */
  synchronize(policy: SecurityPolicy): Promise<void>;

  /**
   * Decommissions logical policy from physical enforcement infrastructure.
   */
  decommission(policy: SecurityPolicy): Promise<void>;
}
