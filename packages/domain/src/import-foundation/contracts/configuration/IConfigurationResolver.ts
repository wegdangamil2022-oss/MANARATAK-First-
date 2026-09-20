import { IConfigurationDefinition } from './IConfigurationDefinition';
import { IConfigurationOverride } from './IConfigurationOverride';
import { IConfigurationContext } from './IConfigurationContext';
import { IResolvedConfiguration } from './IResolvedConfiguration';

export interface IConfigurationResolver {
  /**
   * Resolves a configuration definition with applicable overrides into a runtime resolved configuration.
   *
   * @param definition The baseline configuration definition.
   * @param overrides The applicable configuration overrides.
   * @param context The immutable execution context for resolution.
   * @returns A promise resolving to the immutable resolved configuration.
   */
  resolve(
    definition: IConfigurationDefinition, 
    overrides: ReadonlyArray<IConfigurationOverride>, 
    context: IConfigurationContext
  ): Promise<IResolvedConfiguration>;
}
