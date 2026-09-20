import { EndpointDefinition } from './EndpointDefinition';
import { OperationDefinition } from './OperationDefinition';

export class ApiServiceDefinition {
  constructor(
    private readonly endpoints: readonly EndpointDefinition[],
    private readonly operationsByEndpoint: ReadonlyMap<string, readonly OperationDefinition[]>
  ) {
    if (!endpoints || endpoints.length === 0) {
      throw new Error('ApiServiceDefinition must have at least one endpoint');
    }
  }

  public getEndpoints(): readonly EndpointDefinition[] {
    return this.endpoints;
  }

  public getOperationsForEndpoint(endpointName: string): readonly OperationDefinition[] {
    return this.operationsByEndpoint.get(endpointName) || [];
  }

  public getOperationsByEndpointMap(): ReadonlyMap<string, readonly OperationDefinition[]> {
    return this.operationsByEndpoint;
  }

  public equals(other: ApiServiceDefinition): boolean {
    if (this.endpoints.length !== other.getEndpoints().length) return false;
    for (let i = 0; i < this.endpoints.length; i++) {
      if (!this.endpoints[i].equals(other.getEndpoints()[i])) return false;
    }
    
    const otherMap = other.getOperationsByEndpointMap();
    if (this.operationsByEndpoint.size !== otherMap.size) return false;

    for (const [key, value] of this.operationsByEndpoint.entries()) {
      const otherValue = otherMap.get(key);
      if (!otherValue) return false;
      if (value.length !== otherValue.length) return false;
      for (let i = 0; i < value.length; i++) {
        if (!value[i].equals(otherValue[i])) return false;
      }
    }

    return true;
  }
}
