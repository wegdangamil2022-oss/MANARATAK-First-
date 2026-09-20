export interface ICacheExecutionGateway {
  put(scope: string, key: string, payload: any, ttlSeconds: number): Promise<void>;
  get(scope: string, key: string): Promise<any | null>;
  invalidate(scope: string, key: string): Promise<void>;
}
