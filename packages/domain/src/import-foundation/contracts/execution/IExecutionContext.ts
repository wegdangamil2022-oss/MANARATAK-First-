export interface IExecutionContext {
  /**
   * The unique identifier for this execution context.
   */
  readonly contextId: string;

  /**
   * Arbitrary generic contextual state provided for the execution resolution boundary.
   */
  readonly state: Readonly<Record<string, unknown>>;
}
