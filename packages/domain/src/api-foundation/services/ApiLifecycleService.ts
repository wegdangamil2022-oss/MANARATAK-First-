import { ApiService } from '../aggregates/ApiService';
import { ApiLifecycleState } from '../enums/ApiLifecycleState';

export class ApiLifecycleService {
  /**
   * Orchestrates the transition of an API Service to a new lifecycle state.
   */
  public static transitionTo(apiService: ApiService, targetState: ApiLifecycleState): void {
    const currentState = apiService.getLifecycleState();

    if (currentState === targetState) {
      return;
    }

    switch (targetState) {
      case ApiLifecycleState.ACTIVATED:
        apiService.activate();
        break;

      case ApiLifecycleState.DEPRECATED:
        apiService.deprecate();
        break;

      case ApiLifecycleState.ARCHIVED:
        apiService.archive();
        break;

      case ApiLifecycleState.CREATED:
        throw new Error('Cannot transition an existing ApiService back to CREATED state');

      default:
        throw new Error(`Unsupported lifecycle state: ${targetState}`);
    }
  }
}
