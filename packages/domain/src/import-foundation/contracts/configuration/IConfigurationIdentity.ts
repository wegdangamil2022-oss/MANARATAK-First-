export interface IConfigurationIdentity {
  /**
   * The stable and unique identifier for this configuration definition.
   */
  readonly id: string;

  /**
   * The version of this configuration identity.
   */
  readonly version: string;
}
