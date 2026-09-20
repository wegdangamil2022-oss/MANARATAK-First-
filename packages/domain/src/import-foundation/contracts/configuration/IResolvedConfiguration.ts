export interface IResolvedConfiguration {
  /**
   * The resolved and immutable configuration properties for consumption by runtime components.
   */
  readonly properties: Readonly<Record<string, unknown>>;
}
