export interface IConfigurationState {
  /**
   * The conceptual condition or state of the configuration lifecycle.
   */
  readonly status: string;

  /**
   * Generic metrics or parameters related to the configuration's current condition.
   */
  readonly parameters: Readonly<Record<string, unknown>>;
}
