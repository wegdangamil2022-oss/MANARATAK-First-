import { describe, expect, it } from 'vitest';
import { generateEphemeralJwtKeySet, JwtTokenProvider } from '../../src/auth/JwtTokenProvider';

function createProvider(keyId = 'test-key') {
  return new JwtTokenProvider(generateEphemeralJwtKeySet(keyId), {
    accessTokenTtl: 900,
    issuer: 'manaratak-test',
    audience: 'manaratak-test-client',
  });
}

describe('JwtTokenProvider infrastructure adapter', () => {
  it('issues RS256 access JWTs and opaque refresh credentials', async () => {
    const provider = createProvider();
    const tokens = await provider.generateTokens({ userId: 'user-123', sessionId: 'session-123' });
    const header = JSON.parse(Buffer.from(tokens.accessToken.split('.')[0], 'base64url').toString('utf8'));
    expect(header).toMatchObject({ alg: 'RS256', typ: 'JWT', kid: 'test-key' });
    expect(tokens.refreshToken).toMatch(/^mrt_[A-Za-z0-9_-]{43}$/);
    expect(tokens.refreshToken.split('.')).toHaveLength(1);
    await expect(provider.verifyAccessToken(tokens.accessToken)).resolves.toMatchObject({ userId: 'user-123', sessionId: 'session-123' });
    await expect(provider.validateRefreshToken(tokens.refreshToken)).resolves.toBeUndefined();
  });

  it('rejects algorithm confusion and refresh/access swapping', async () => {
    const provider = createProvider();
    const tokens = await provider.generateTokens({ userId: 'user-123', sessionId: 'session-123' });
    await expect(provider.verifyAccessToken(tokens.refreshToken)).rejects.toThrow(/^Invalid access token$/);
    await expect(provider.validateRefreshToken(tokens.accessToken)).rejects.toThrow(/^Invalid refresh token$/);
  });

  it('rejects a tampered JWT signature', async () => {
    const provider = createProvider();
    const { accessToken } = await provider.generateTokens({ userId: 'user-123' });
    const parts = accessToken.split('.');
    const tampered = `${parts[0]}.eyJ1c2VySWQiOiJ1c2VyLTQ1NiJ9.${parts[2]}`;
    await expect(provider.verifyAccessToken(tampered)).rejects.toThrow(/Invalid access token/);
  });

  it('refuses access-token lifetimes above 15 minutes', () => {
    expect(() => new JwtTokenProvider(generateEphemeralJwtKeySet(), { accessTokenTtl: 901 })).toThrow(/900/);
  });

  it('publishes only public key material through JWKS', () => {
    const provider = createProvider('rotation-key');
    const jwks = provider.getJwks();
    expect(jwks.keys[0]).toMatchObject({ kid: 'rotation-key', alg: 'RS256', use: 'sig', kty: 'RSA' });
    expect(jwks.keys[0]).not.toHaveProperty('d');
  });
});
