export interface IArtifactIdentity {
  /**
   * The globally unique and stable identifier for the artifact definition.
   */
  readonly id: string;

  /**
   * The version of this artifact identity.
   */
  readonly version: string;
}
