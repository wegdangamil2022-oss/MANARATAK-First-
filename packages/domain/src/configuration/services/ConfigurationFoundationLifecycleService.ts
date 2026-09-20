import { Configuration } from '../aggregates/Configuration';
import { ConfigurationLifecycleState } from '../enums/ConfigurationLifecycleState';

export class ConfigurationFoundationLifecycleService {
  private static readonly allowedTransitions: Record<string, ConfigurationLifecycleState[]> = {
    [ConfigurationLifecycleState.CREATED]: [ConfigurationLifecycleState.ACTIVATED, ConfigurationLifecycleState.ARCHIVED],
    [ConfigurationLifecycleState.ACTIVATED]: [ConfigurationLifecycleState.DEPRECATED, ConfigurationLifecycleState.ARCHIVED],
    [ConfigurationLifecycleState.DEPRECATED]: [ConfigurationLifecycleState.ARCHIVED],
    [ConfigurationLifecycleState.ARCHIVED]: []
  };

  public static transitionTo(config: Configuration, newState: ConfigurationLifecycleState): void {
    const currentState = config.getLifecycleState();
    const allowed = this.allowedTransitions[currentState] || [];

    if (!allowed.includes(newState)) {
      throw new Error(`Configuration transition from ${currentState} to ${newState} is not permitted.`);
    }

    config.setLifecycleState(newState);
  }
}
