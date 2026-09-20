export interface IConfigurationScope {
  /**
   * The unique identifier for the architectural boundary of applicability.
   */
  readonly scopeId: string;
  
  /**
   * Generic contextual properties defining the bounds of the scope.
   */
  readonly boundaries: Readonly<Record<string, unknown>>;
}
