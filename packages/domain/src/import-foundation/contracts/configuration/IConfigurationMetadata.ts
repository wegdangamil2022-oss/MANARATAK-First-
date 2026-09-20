import { IConfigurationIdentity } from './IConfigurationIdentity';
import { IConfigurationCompatibility } from './IConfigurationCompatibility';

export interface IConfigurationMetadata {
  /**
   * The identity of the configuration.
   */
  readonly identity: IConfigurationIdentity;
  
  /**
   * Conceptual display information describing the configuration.
   */
  readonly displayInformation: Readonly<Record<string, string>>;

  /**
   * The declared compatibility model of the configuration.
   */
  readonly compatibility: IConfigurationCompatibility;
}
