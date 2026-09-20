import { ISecurityService, IRateLimiter } from '@manaratak/core';

export class SecurityValidator {
  public static isRealRateLimiter(rateLimiter?: IRateLimiter | null): boolean {
    if (!rateLimiter) {
      return false;
    }
    if (rateLimiter.isProductionReady === false || rateLimiter.kind === 'demo') {
      return false;
    }
    if (rateLimiter.isProductionReady === true || rateLimiter.kind === 'real') {
      return true;
    }
    return typeof rateLimiter.consume === 'function';
  }

  public static isRealSecurityService(securityService?: ISecurityService | null): boolean {
    if (!securityService) {
      return false;
    }
    if (securityService.isProductionReady === false || securityService.kind === 'demo') {
      return false;
    }
    try {
      if (securityService.generateCsrfToken('test-secret') === 'demo-token') {
        return false;
      }
    } catch {
      return false;
    }

    if (securityService.isProductionReady === true || securityService.kind === 'real') {
      return true;
    }

    return typeof securityService.validateCsrfToken === 'function';
  }

  public static assertProductionSecurity(
    env: Record<string, string | undefined>,
    securityService?: ISecurityService | null,
    rateLimiter?: IRateLimiter | null
  ): void {
    const isProduction = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
    if (!isProduction) {
      return;
    }

    if (!rateLimiter || !this.isRealRateLimiter(rateLimiter)) {
      throw new Error(
        '[Production Security Error] Rate limiting is missing or using a demo/stub implementation. Production startup requires a real, production-ready IRateLimiter.'
      );
    }

    if (!securityService || !this.isRealSecurityService(securityService)) {
      throw new Error(
        '[Production Security Error] CSRF protection is missing or using a demo/stub implementation. Production startup requires a real, production-ready ISecurityService.'
      );
    }
  }
}
