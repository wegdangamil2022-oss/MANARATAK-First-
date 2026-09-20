export interface IExecutionState {
  /**
   * The conceptual condition or state of the execution lifecycle.
   */
  readonly status: string;

  /**
   * Generic metrics or parameters related to the execution's current condition.
   */
  readonly parameters: Readonly<Record<string, unknown>>;
}
