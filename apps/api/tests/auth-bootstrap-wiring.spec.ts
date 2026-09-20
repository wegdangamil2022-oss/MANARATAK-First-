import { describe, it, expect, vi } from 'vitest';
import { createApiApp } from '../src/app';
import { container } from '../src/infrastructure/di/container';
import { PrismaCredentialVerifier } from '@manaratak/infrastructure';
import { AuthService } from '@manaratak/application';

describe('WP1-E.1.1 DI Container & Auth Wiring Smoke Test', () => {
  it('successfully boots the API container and resolves the real PrismaCredentialVerifier', async () => {
    // 1. Trigger the real Express API bootstrap
    const app = await createApiApp({
      connectExternalServices: false,
      databaseClient: { $queryRaw: vi.fn().mockRejectedValue(new Error('database intentionally unavailable in source-only test')) },
    });
    expect(app).toBeDefined();

    // 2. Resolve credentials verifier and auth service from the Awilix DI container
    const credentialVerifier = container.resolve('credentialVerifier');
    const authService = container.resolve('authService');

    expect(credentialVerifier).toBeDefined();
    expect(authService).toBeDefined();

    // 3. Prove that PrismaCredentialVerifier is the active runtime verifier
    expect(credentialVerifier).toBeInstanceOf(PrismaCredentialVerifier);
    expect(authService).toBeInstanceOf(AuthService);

    // Verify internal credentialVerifier property on AuthService is our PrismaCredentialVerifier
    const internalVerifier = (authService as any).credentialVerifier;
    expect(internalVerifier).toBeDefined();
    expect(internalVerifier).toBeInstanceOf(PrismaCredentialVerifier);
    
    // Prove it is NOT the fallback DenyAllCredentialVerifier
    expect(internalVerifier.constructor.name).not.toBe('DenyAllCredentialVerifier');

    console.log('[SMOKE TEST SUCCESS] Runtime credential verifier is successfully wired and resolved.');
  });
});
