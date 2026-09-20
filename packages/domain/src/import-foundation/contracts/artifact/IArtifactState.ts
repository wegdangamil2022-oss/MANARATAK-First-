export interface IArtifactState {
  /**
   * The conceptual condition or state of the artifact lifecycle.
   */
  readonly status: string;

  /**
   * Generic metrics or parameters related to the artifact's current condition.
   */
  readonly parameters: Readonly<Record<string, unknown>>;
}
