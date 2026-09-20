import * as crypto from 'node:crypto';
import { ITokenProvider, AuthTokens, TokenPayload } from '@manaratak/core';

export interface JwtSigningKeySet {
  readonly activeKeyId: string;
  readonly privateKeyPem: string;
  readonly publicKeys: Readonly<Record<string, string>>;
}

export interface JwtTokenProviderOptions {
  readonly accessTokenTtl?: number;
  readonly issuer?: string;
  readonly audience?: string;
}

export interface JsonWebKeySet {
  readonly keys: readonly Record<string, unknown>[];
}

const ACCESS_TOKEN_MAX_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_BYTES = 32;
const REFRESH_TOKEN_PREFIX = 'mrt_';
const REFRESH_TOKEN_PATTERN = /^mrt_[A-Za-z0-9_-]{43}$/;

function assertStableKeyId(keyId: string): void {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(keyId)) {
    throw new Error('JWT active key id is invalid');
  }
}

function parseJsonSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

export function generateEphemeralJwtKeySet(keyId = 'dev-ephemeral'): JwtSigningKeySet {
  assertStableKeyId(keyId);
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return Object.freeze({
    activeKeyId: keyId,
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeys: Object.freeze({
      [keyId]: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    }),
  });
}

/**
 * Canonical authentication token provider.
 *
 * Access credentials are short-lived RS256 JWTs. Refresh credentials are
 * cryptographically-random opaque values; session persistence is the sole
 * authority that resolves/consumes them.
 */
export class JwtTokenProvider implements ITokenProvider {
  private readonly activePrivateKey: crypto.KeyObject;
  private readonly verificationKeys = new Map<string, crypto.KeyObject>();
  private readonly accessTokenTtl: number;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    keySet: JwtSigningKeySet,
    options: JwtTokenProviderOptions = {},
  ) {
    assertStableKeyId(keySet.activeKeyId);
    if (!keySet.privateKeyPem.trim()) throw new Error('JWT private signing key is required');
    if (!keySet.publicKeys[keySet.activeKeyId]?.trim()) throw new Error('JWT active public verification key is required');

    this.accessTokenTtl = options.accessTokenTtl ?? ACCESS_TOKEN_MAX_TTL_SECONDS;
    if (!Number.isInteger(this.accessTokenTtl) || this.accessTokenTtl < 60 || this.accessTokenTtl > ACCESS_TOKEN_MAX_TTL_SECONDS) {
      throw new Error(`Access-token TTL must be between 60 and ${ACCESS_TOKEN_MAX_TTL_SECONDS} seconds`);
    }

    this.issuer = options.issuer || 'manaratak-api';
    this.audience = options.audience || 'manaratak-browser';
    this.activePrivateKey = crypto.createPrivateKey(keySet.privateKeyPem);

    for (const [kid, publicKeyPem] of Object.entries(keySet.publicKeys)) {
      assertStableKeyId(kid);
      if (!publicKeyPem?.trim()) throw new Error(`JWT public key '${kid}' is empty`);
      this.verificationKeys.set(kid, crypto.createPublicKey(publicKeyPem));
    }

    // Fail startup if the active private/public pair does not match.
    const probe = Buffer.from('manaratak-jwt-key-pair-probe');
    const signature = crypto.sign('RSA-SHA256', probe, this.activePrivateKey);
    const activePublicKey = this.verificationKeys.get(keySet.activeKeyId)!;
    if (!crypto.verify('RSA-SHA256', probe, activePublicKey, signature)) {
      throw new Error('JWT active private/public key pair does not match');
    }

    this.activeKeyId = keySet.activeKeyId;
  }

  private readonly activeKeyId: string;

  public async generateAccessToken(payload: TokenPayload): Promise<string> {
    const header = { alg: 'RS256', typ: 'JWT', kid: this.activeKeyId };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + this.accessTokenTtl;
    const fullPayload = {
      userId: payload.userId,
      ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
      tokenType: 'access',
      iss: this.issuer,
      aud: this.audience,
      jti: crypto.randomUUID(),
      iat,
      exp,
    };

    const headerSegment = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadSegment = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signatureInput = `${headerSegment}.${payloadSegment}`;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), this.activePrivateKey).toString('base64url');
    return `${signatureInput}.${signature}`;
  }

  public async generateRefreshToken(): Promise<string> {
    return `${REFRESH_TOKEN_PREFIX}${crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')}`;
  }

  public async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(),
    ]);
    return { accessToken, refreshToken };
  }

  public async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
        throw new Error('Invalid token format');
      }
      const [headerSegment, payloadSegment, signatureSegment] = parts;
      const header = parseJsonSegment(headerSegment) as Record<string, unknown>;
      const payload = parseJsonSegment(payloadSegment) as Record<string, unknown>;

      if (header.alg !== 'RS256' || header.typ !== 'JWT' || typeof header.kid !== 'string') {
        throw new Error('Unexpected JWT algorithm or header');
      }
      const publicKey = this.verificationKeys.get(header.kid);
      if (!publicKey) throw new Error('Unknown or retired JWT key');

      const signatureInput = `${headerSegment}.${payloadSegment}`;
      const signature = Buffer.from(signatureSegment, 'base64url');
      if (!crypto.verify('RSA-SHA256', Buffer.from(signatureInput), publicKey, signature)) {
        throw new Error('Invalid signature');
      }

      const now = Math.floor(Date.now() / 1000);
      if (
        !payload ||
        typeof payload.userId !== 'string' || !payload.userId ||
        typeof payload.jti !== 'string' || !payload.jti ||
        payload.tokenType !== 'access' ||
        payload.iss !== this.issuer || payload.aud !== this.audience ||
        typeof payload.iat !== 'number' || !Number.isInteger(payload.iat) ||
        typeof payload.exp !== 'number' || !Number.isInteger(payload.exp) ||
        payload.exp <= payload.iat || payload.exp < now ||
        payload.exp - payload.iat > ACCESS_TOKEN_MAX_TTL_SECONDS
      ) {
        throw new Error('Invalid token claims');
      }

      return {
        userId: payload.userId,
        ...(typeof payload.sessionId === 'string' && payload.sessionId ? { sessionId: payload.sessionId } : {}),
      };
    } catch {
      throw new Error('Invalid access token');
    }
  }

  public async validateRefreshToken(token: string): Promise<void> {
    if (!REFRESH_TOKEN_PATTERN.test(token)) {
      throw new Error('Invalid refresh token');
    }
  }

  public getJwks(): JsonWebKeySet {
    const keys = Array.from(this.verificationKeys.entries()).map(([kid, key]) => {
      const jwk = key.export({ format: 'jwk' }) as Record<string, unknown>;
      return Object.freeze({ ...jwk, kid, alg: 'RS256', use: 'sig' });
    });
    return Object.freeze({ keys: Object.freeze(keys) });
  }
}
