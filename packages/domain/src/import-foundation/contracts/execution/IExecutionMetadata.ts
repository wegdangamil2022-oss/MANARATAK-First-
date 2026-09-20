import { IExecutionIdentity } from './IExecutionIdentity';
import { IExecutionCompatibility } from './IExecutionCompatibility';

export interface IExecutionMetadata {
  /**
   * The identity of the execution definition.
   */
  readonly identity: IExecutionIdentity;
  
  /**
   * Conceptual display information for the execution.
   */
  readonly displayInformation: Readonly<Record<string, string>>;

  /**
   * The declared compatibility model of the execution.
   */
  readonly compatibility: IExecutionCompatibility;
}
