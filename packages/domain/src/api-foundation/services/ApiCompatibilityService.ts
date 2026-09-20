import { ApiServiceDefinition } from '../value-objects/ApiServiceDefinition';

export class ApiCompatibilityService {
  /**
   * Validates if the newDefinition is logically backward compatible with the oldDefinition.
   */
  public static isBackwardCompatible(
    oldDefinition: ApiServiceDefinition,
    newDefinition: ApiServiceDefinition
  ): boolean {
    const newEndpoints = newDefinition.getEndpoints();
    const newEndpointNames = new Set(newEndpoints.map(e => e.getName()));

    for (const oldEndpoint of oldDefinition.getEndpoints()) {
      if (!newEndpointNames.has(oldEndpoint.getName())) {
        return false;
      }

      const oldOps = oldDefinition.getOperationsForEndpoint(oldEndpoint.getName());
      const newOps = newDefinition.getOperationsForEndpoint(oldEndpoint.getName());
      const newOpMap = new Map(newOps.map(op => [op.getName(), op]));

      for (const oldOp of oldOps) {
        const newOp = newOpMap.get(oldOp.getName());
        if (!newOp) {
          return false;
        }

        if (oldOp.getInputType() !== newOp.getInputType()) {
          return false;
        }
        if (oldOp.getOutputType() !== newOp.getOutputType()) {
          return false;
        }
      }
    }

    return true;
  }
}
