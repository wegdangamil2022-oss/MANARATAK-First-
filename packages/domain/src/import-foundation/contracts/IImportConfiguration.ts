export interface IImportConfiguration {
  /**
   * Retrieves the generic parameters for this configuration.
   */
  getParameters(): Record<string, unknown>;

  /**
   * Validates the configuration. Throws an error if invalid.
   */
  validate(): void;
}
