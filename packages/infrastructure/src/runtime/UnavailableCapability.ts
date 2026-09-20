export class UnavailableCapabilityError extends Error {
  public readonly code = 'CAPABILITY_UNAVAILABLE';
  public readonly status = 'UNAVAILABLE';

  constructor(public readonly capability: string) {
    super(`${capability} is unavailable because no persistent runtime implementation is configured`);
    this.name = 'UnavailableCapabilityError';
  }
}

export function createUnavailableCapability<T extends object>(capability: string): T {
  return new Proxy({} as T, {
    get(_target, property) {
      if (property === 'capabilityStatus') return 'UNAVAILABLE';
      if (property === 'isProductionReady') return false;
      if (property === 'kind') return 'unavailable';
      if (property === 'then') return undefined;
      return async () => {
        throw new UnavailableCapabilityError(`${capability}.${String(property)}`);
      };
    }
  });
}
