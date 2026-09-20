export interface IArtifactContext {
  /**
   * The unique identifier for this artifact context.
   */
  readonly contextId: string;

  /**
   * Arbitrary generic contextual state provided for the artifact resolution boundary.
   */
  readonly state: Readonly<Record<string, unknown>>;
}
