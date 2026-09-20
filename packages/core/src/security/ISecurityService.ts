import { IRateLimiter } from './IRateLimiter';

export interface ISecurityService {
  readonly isProductionReady?: boolean;
  readonly kind?: 'real' | 'demo';
  getRateLimiter(): IRateLimiter;
  generateCsrfToken(sessionBinding: string): string;
  validateCsrfToken(token: string, sessionBinding: string): boolean;
}
