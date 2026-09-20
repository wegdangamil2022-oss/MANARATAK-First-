import { IConfigurationMetadata } from './IConfigurationMetadata';

export interface IConfigurationDefinition {
  /**
   * The immutable metadata describing this configuration definition.
   */
  readonly metadata: IConfigurationMetadata;

  /**
   * The immutable baseline configuration properties.
   */
  readonly properties: Readonly<Record<string, unknown>>;
}
