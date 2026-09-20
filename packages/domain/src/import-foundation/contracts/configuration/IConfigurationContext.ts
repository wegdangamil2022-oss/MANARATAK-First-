export interface IConfigurationContext {
  /**
   * The unique identifier for this configuration context.
   */
  readonly contextId: string;

  /**
   * Arbitrary generic contextual state provided for runtime evaluation context.
   */
  readonly state: Readonly<Record<string, unknown>>;
}
