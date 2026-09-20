import { IImportConfiguration } from './IImportConfiguration';

export interface IImportProvider {
  /**
   * Gets the unique logical identifier for the import provider.
   */
  getProviderId(): string;

  /**
   * Returns the generic default configuration required by this provider.
   */
  getDefaultConfiguration(): IImportConfiguration;
}
