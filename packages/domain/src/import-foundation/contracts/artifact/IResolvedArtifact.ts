export interface IResolvedArtifact {
  /**
   * The immutable properties representing the resolved artifact information.
   */
  readonly properties: Readonly<Record<string, unknown>>;
}
