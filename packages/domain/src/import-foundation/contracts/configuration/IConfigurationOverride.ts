import { IConfigurationScope } from './IConfigurationScope';

export interface IConfigurationOverride {
  /**
   * The scope in which this override applies.
   */
  readonly scope: IConfigurationScope;

  /**
   * The generic overriding properties.
   */
  readonly overrides: Readonly<Record<string, unknown>>;
}
