export interface IRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface IRateLimiter {
  readonly isProductionReady?: boolean;
  readonly kind?: 'real' | 'demo' | 'process-local';
  consume(key: string, points?: number, windowMs?: number): Promise<IRateLimitResult>;
  reset?(key?: string): void;
}
