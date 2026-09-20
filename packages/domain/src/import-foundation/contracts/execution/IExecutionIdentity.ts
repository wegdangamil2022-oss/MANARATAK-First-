export interface IExecutionIdentity {
  /**
   * The globally unique and stable identifier for the execution definition.
   */
  readonly id: string;

  /**
   * The version of this execution identity.
   */
  readonly version: string;
}
