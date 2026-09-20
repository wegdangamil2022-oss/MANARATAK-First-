export interface IExecutionPolicy {
  /**
   * Indicates if strict sequential ordering is required.
   */
  readonly requiresSequentialOrdering: boolean;

  /**
   * The maximum permitted logical concurrency boundary.
   */
  readonly maxConcurrency: number;

  /**
   * Determines if failure in one logical boundary should immediately isolate and fail the overall process (Fail-Fast),
   * or allow other logical boundaries to continue (Fail-Isolated).
   */
  readonly isFailFast: boolean;
}
